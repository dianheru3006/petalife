import { useState, useEffect, useRef } from 'react';
import type { NavigationTab, Pet, SavedLink, Note, ChatMessage, DailyGoal, LinkStatus } from './lib/types';
import { initialPet, initialSavedLinks, initialNotes, initialChatMessages } from './lib/mockData';
import { feedPet, awardXp, calculateTimeDecay, togglePetSleep } from './features/pet/engine/petEngine';
import { loadStoredPet, saveStoredPet } from './features/pet/engine/petStorage';
import { getAllLinks, createLink, updateLink, deleteLink } from './lib/db/linksRepository';
import { getAllNotes, createNote, updateNote, deleteNote } from './lib/db/notesRepository';
import { initializeDatabase } from './lib/db/seed';
import {
  recordRewardClaim,
  claimDailyLinkReward,
  claimDailyReviewReward,
  claimDailyNoteReward,
  claimLearningVarietyBonus,
  type LinkRewardResult
} from './lib/db/rewardLedgerRepository';
import { queryAssistant } from './features/assistant/engine/assistantEngine';
import { loadStoredDailyGoals, saveStoredDailyGoals, getTodayDateString } from './features/dashboard/dailyGoalsStorage';
import { AppLayout } from './app/layout/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { VaultPage } from './features/vault/VaultPage';
import { NotesPage } from './features/notes/NotesPage';
import { AssistantPage } from './features/assistant/AssistantPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { applyServiceWorkerUpdate } from './registerServiceWorker';

const navigationTabs: NavigationTab[] = ['home', 'vault', 'notes', 'assistant', 'settings'];

function tabFromHash(): NavigationTab {
  const hash = window.location.hash.slice(1);
  return navigationTabs.find(tab => tab === hash) ?? 'home';
}

export function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>(tabFromHash);
  const [pet, setPet] = useState<Pet>(() => loadStoredPet(initialPet).pet);
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>(() => loadStoredDailyGoals());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isNightMode, setIsNightMode] = useState<boolean>(() => Boolean(pet.isSleeping));
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // PWA Update notification listener (Sol ADR-002)
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ registration: ServiceWorkerRegistration }>;
      setSwRegistration(customEvent.detail?.registration || null);
    };
    window.addEventListener('petalife:update-available', handleUpdate);
    return () => window.removeEventListener('petalife:update-available', handleUpdate);
  }, []);

  // Sync night mode when pet sleep state changes
  useEffect(() => {
    if (Boolean(pet.isSleeping) !== isNightMode) {
      setIsNightMode(Boolean(pet.isSleeping));
    }
  }, [pet.isSleeping]);

  const handleToggleNightMode = () => {
    setPet(prev => {
      const updated = togglePetSleep(prev);
      setIsNightMode(Boolean(updated.isSleeping));
      return updated;
    });
  };

  // Re-check and rollover daily habits when date crosses midnight without manual reload
  const activeDateRef = useRef<string>(getTodayDateString());
  useEffect(() => {
    const checkMidnightRollover = () => {
      const currentDate = getTodayDateString();
      if (currentDate !== activeDateRef.current) {
        activeDateRef.current = currentDate;
        setDailyGoals(loadStoredDailyGoals());
      }
    };

    const interval = setInterval(checkMidnightRollover, 15000);
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkMidnightRollover();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, []);

  useEffect(() => {
    const syncTabFromHash = () => setCurrentTab(tabFromHash());
    window.addEventListener('hashchange', syncTabFromHash);
    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, []);

  const handleSelectTab = (tab: NavigationTab) => {
    setCurrentTab(tab);
    window.location.hash = tab;
  };

  // Initialize IndexedDB and load links + notes on mount
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        // Idempotent seed if database is empty on first boot
        await initializeDatabase();
        const [loadedLinks, loadedNotes] = await Promise.all([
          getAllLinks(),
          getAllNotes(),
        ]);
        if (isMounted) {
          setSavedLinks(loadedLinks);
          setNotes(loadedNotes);
        }
      } catch (err) {
        console.error('[App] Failed to load from IndexedDB:', err);
        if (isMounted) {
          setStorageError('Operating in temporary session mode: local IndexedDB is unavailable in this environment.');
          setSavedLinks(initialSavedLinks);
          setNotes(initialNotes);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          // Signal Telegram WebApp that data and UI are completely loaded
          try {
            (window as unknown as { Telegram?: { WebApp?: { ready?: () => void } } })
              .Telegram?.WebApp?.ready?.();
          } catch {
            // Ignored in standard browser
          }
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync pet state changes to versioned localStorage
  useEffect(() => {
    saveStoredPet(pet);
  }, [pet]);

  // Periodic passive decay while user keeps application open (every 60 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setPet(prev => calculateTimeDecay(prev));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Helper to mark daily goals completed and award XP cleanly outside setState
  const fulfillDailyGoal = async (goalId: string) => {
    const todayKey = getTodayDateString();
    const ledgerKey = `goal:${todayKey}:${goalId}`;

    const goal = dailyGoals.find(g => g.id === goalId);
    if (!goal) return;

    if (!goal.hasClaimedXp) {
      try {
        const isNew = await recordRewardClaim(ledgerKey, 'habit', goalId, goal.xpReward);
        if (isNew) {
          setPet(p => awardXp(p, goal.xpReward).pet);
        }
      } catch (err) {
        console.error(`[App] Failed to claim reward for goal ${goalId}:`, err);
      }
    }

    setDailyGoals(prev => {
      const next = prev.map(g => g.id === goalId ? { ...g, isCompleted: true, hasClaimedXp: true } : g);
      saveStoredDailyGoals(next);
      return next;
    });
  };

  // 1. Feeding Interaction via Engine (Sol Economy: +5 XP for 1st daily care, 0 XP for repeats)
  const handleFeedPet = () => {
    setPet(prev => {
      const todayKey = getTodayDateString();
      const result = feedPet(prev, Date.now(), todayKey);
      if (!result.success) {
        return prev;
      }

      // Return to idle (or sleeping if pet was sleeping) after feeding animation completes
      setTimeout(() => {
        setPet(current => ({
          ...current,
          state: current.isSleeping ? 'sleeping' : 'idle',
        }));
      }, 1600);

      return result.pet;
    });

    // Fulfill daily morning snack habit outside setState
    fulfillDailyGoal('goal-2');
  };

  // 3. Vault Actions with IndexedDB Persistence & Sol XP Economy (5 XP per link save, max 2/day)
  const handleAddLink = async (newLink: SavedLink): Promise<LinkRewardResult> => {
    try {
      const created = await createLink(newLink);
      setSavedLinks(prev => [created, ...prev]);

      const todayKey = getTodayDateString();
      const rewardResult = await claimDailyLinkReward(created.id, todayKey, 2);
      if (rewardResult.awarded) {
        setPet(prev => awardXp(prev, rewardResult.xpAwarded).pet);
        // Check learning variety bonus (10 XP if 2 distinct learning categories today)
        const varietyResult = await claimLearningVarietyBonus(todayKey);
        if (varietyResult.awarded) {
          setPet(prev => awardXp(prev, varietyResult.xpAwarded).pet);
        }
      }

      await fulfillDailyGoal('goal-1');
      return rewardResult;
    } catch (err) {
      console.error('[App] Failed to save link to repository:', err);
      throw err;
    }
  };

  const handleUpdateLink = async (id: string, updates: Partial<SavedLink>): Promise<SavedLink> => {
    try {
      const updated = await updateLink(id, updates);
      setSavedLinks(prev => prev.map(l => l.id === id ? updated : l));
      return updated;
    } catch (err) {
      console.error('[App] Failed to update link:', err);
      throw err;
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      await deleteLink(id);
      setSavedLinks(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error('[App] Failed to delete link from repository:', err);
    }
  };

  const handleUpdateStatus = async (id: string, status: LinkStatus) => {
    try {
      const updated = await updateLink(id, { status });
      setSavedLinks(prev => prev.map(l => l.id === id ? updated : l));

      // Fulfill daily goal for reviewing links
      if (status === 'in_progress' || status === 'completed') {
        fulfillDailyGoal('goal-3');
      }

      // Sol Economy: Reward Mochi with +10 XP when material review is completed (max 2/day)
      if (status === 'completed') {
        const todayKey = getTodayDateString();
        const reviewResult = await claimDailyReviewReward(id, todayKey, 2);
        if (reviewResult.awarded) {
          setPet(prev => {
            const awardResult = awardXp(prev, reviewResult.xpAwarded);
            return {
              ...awardResult.pet,
              mood: Math.min(100, awardResult.pet.mood + 5),
              state: 'happy',
            };
          });
          setTimeout(() => {
            setPet(current => ({
              ...current,
              state: current.isSleeping ? 'sleeping' : 'idle',
            }));
          }, 1800);

          // Check learning variety bonus (10 XP if >= 2 distinct learning categories today)
          const varietyResult = await claimLearningVarietyBonus(todayKey);
          if (varietyResult.awarded) {
            setPet(prev => awardXp(prev, varietyResult.xpAwarded).pet);
          }
        }
      }
    } catch (err) {
      console.error('[App] Failed to update link status:', err);
    }
  };

  // 4. Notes Actions with IndexedDB Persistence & Sol XP Economy (15 XP per note, max 2/day)
  const handleAddNote = async (newNote: Note) => {
    try {
      const created = await createNote(newNote);
      setNotes(prev => [created, ...prev]);

      const todayKey = getTodayDateString();
      const noteReward = await claimDailyNoteReward(created.id, todayKey, 2);
      if (noteReward.awarded) {
        setPet(prev => awardXp(prev, noteReward.xpAwarded).pet);

        // Check learning variety bonus (10 XP if >= 2 distinct learning categories today)
        const varietyResult = await claimLearningVarietyBonus(todayKey);
        if (varietyResult.awarded) {
          setPet(prev => awardXp(prev, varietyResult.xpAwarded).pet);
        }
      }

      await fulfillDailyGoal('goal-4');
    } catch (err) {
      console.error('[App] Failed to save note to repository:', err);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    try {
      const updated = await updateNote(id, updates);
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
    } catch (err) {
      console.error('[App] Failed to update note:', err);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('[App] Failed to delete note from repository:', err);
    }
  };

  // 5. Goals Action with Idempotent Anti-Spam Guard (Fix for SEC-02 & Clean State Updater)
  const handleToggleGoal = async (id: string) => {
    const todayKey = getTodayDateString();
    const ledgerKey = `goal:${todayKey}:${id}`;

    const goal = dailyGoals.find(g => g.id === id);
    if (!goal) return;

    const nextState = !goal.isCompleted;
    if (nextState && !goal.hasClaimedXp) {
      try {
        const isNew = await recordRewardClaim(ledgerKey, 'habit', id, goal.xpReward);
        if (isNew) {
          setPet(p => awardXp(p, goal.xpReward).pet);
        }
      } catch (err) {
        console.error('[App] Failed to record reward claim:', err);
      }
      setDailyGoals(prev => {
        const next = prev.map(g => g.id === id ? { ...g, isCompleted: true, hasClaimedXp: true } : g);
        saveStoredDailyGoals(next);
        return next;
      });
    } else {
      setDailyGoals(prev => {
        const next = prev.map(g => g.id === id ? { ...g, isCompleted: nextState } : g);
        saveStoredDailyGoals(next);
        return next;
      });
    }
  };

  // 6. Assistant Actions
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now'
    };

    setChatMessages(prev => [...prev, userMsg]);

    try {
      const response = await queryAssistant(text, {
        links: savedLinks,
        notes,
        pet,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: response.replyText,
        timestamp: 'Just now',
        suggestedAction: response.suggestedAction,
      };

      setChatMessages(prev => [...prev, aiMsg]);
    } catch {
      // In case of unexpected rejection, fall back cleanly
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FFEFE8] border-2 border-[#FED7C5] flex items-center justify-center text-3xl animate-bounce mb-3 shadow-xs">
          🌸
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-[#2E2E3A] mb-1">Opening Mochi's Cozy Brain...</h2>
        <p className="text-xs text-[#8A857A]">Loading your saved materials and reflection notes from IndexedDB</p>
      </div>
    );
  }

  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={handleSelectTab}
      pet={pet}
      isNightMode={isNightMode}
    >
      {storageError && (
        <div className="mb-4 p-3 rounded-2xl bg-[#FFF9E6] border border-[#FFE8B8] text-xs font-semibold text-[#8C6D23] flex items-center justify-between">
          <span>⚠️ {storageError}</span>
          <button
            onClick={() => setStorageError(null)}
            className="text-[#8C6D23] hover:text-black font-bold px-2 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* PWA Update Prompt Banner (Sol ADR-002) */}
      {swRegistration && (
        <div className="bg-[#BA5218] text-white px-4 py-2.5 rounded-2xl mb-3 flex items-center justify-between text-xs font-bold shadow-md animate-fade-in select-none">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <span>Versi baru Petalife tersedia.</span>
          </div>
          <button
            type="button"
            onClick={() => applyServiceWorkerUpdate(swRegistration)}
            className="bg-white text-[#BA5218] px-3 py-1 rounded-xl font-black text-xs hover:bg-[#FAF7EE] active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            Muat Ulang
          </button>
        </div>
      )}

      <div key={currentTab} className="anim-page-enter">
        {currentTab === 'home' && (
          <DashboardPage
            pet={pet}
            savedLinks={savedLinks}
            dailyGoals={dailyGoals}
            onFeedPet={handleFeedPet}
            onToggleGoal={handleToggleGoal}
            onNavigate={handleSelectTab}
            onAddLink={handleAddLink}
            onUpdateLink={handleUpdateLink}
            notesCount={notes.length}
            isNightMode={isNightMode}
            onToggleNightMode={handleToggleNightMode}
          />
        )}

        {currentTab === 'vault' && (
          <VaultPage
            links={savedLinks}
            onAddLink={handleAddLink}
            onUpdateLink={handleUpdateLink}
            onDeleteLink={handleDeleteLink}
            onUpdateStatus={handleUpdateStatus}
            isNightMode={isNightMode}
          />
        )}

        {currentTab === 'notes' && (
          <NotesPage
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            isNightMode={isNightMode}
          />
        )}

        {currentTab === 'assistant' && (
          <AssistantPage
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onNavigate={handleSelectTab}
            isNightMode={isNightMode}
          />
        )}
        {currentTab === 'settings' && <SettingsPage />}
      </div>
    </AppLayout>
  );
}

export default App;
