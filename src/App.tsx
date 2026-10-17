import { useState, useEffect } from 'react';
import type { NavigationTab, Pet, SavedLink, Note, ChatMessage, DailyGoal, LinkStatus } from './lib/types';
import { initialPet, initialSavedLinks, initialNotes, initialChatMessages, initialDailyGoals } from './lib/mockData';
import { feedPet, awardXp, calculateTimeDecay } from './features/pet/engine/petEngine';
import { loadStoredPet, saveStoredPet } from './features/pet/engine/petStorage';
import { getAllLinks, createLink, updateLink, deleteLink } from './lib/db/linksRepository';
import { getAllNotes, createNote, updateNote, deleteNote } from './lib/db/notesRepository';
import { initializeDatabase } from './lib/db/seed';
import { recordRewardClaim } from './lib/db/rewardLedgerRepository';
import { processAssistantMessage } from './features/assistant/engine/assistantEngine';
import { AppLayout } from './app/layout/AppLayout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { VaultPage } from './features/vault/VaultPage';
import { NotesPage } from './features/notes/NotesPage';
import { AssistantPage } from './features/assistant/AssistantPage';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [pet, setPet] = useState<Pet>(() => loadStoredPet(initialPet).pet);
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>(initialDailyGoals);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storageError, setStorageError] = useState<string | null>(null);

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

  // 1. Feeding Interaction via Engine
  const handleFeedPet = () => {
    setPet(prev => {
      const result = feedPet(prev);
      if (!result.success) {
        return prev;
      }

      // Mark daily goal as done
      setDailyGoals(goals => goals.map(g => g.id === 'goal-2' ? { ...g, isCompleted: true, hasClaimedXp: true } : g));

      // Return to idle after feeding animation completes
      setTimeout(() => {
        setPet(current => ({ ...current, state: 'idle' }));
      }, 1600);

      return result.pet;
    });
  };

  // 3. Vault Actions with IndexedDB Persistence
  const handleAddLink = async (newLink: SavedLink) => {
    try {
      const created = await createLink(newLink);
      setSavedLinks(prev => [created, ...prev]);
      setPet(prev => awardXp(prev, 10).pet);
      setDailyGoals(prev => prev.map(g => g.id === 'goal-1' ? { ...g, isCompleted: true, hasClaimedXp: true } : g));
    } catch (err) {
      console.error('[App] Failed to save link to repository:', err);
    }
  };

  const handleUpdateLink = async (id: string, updates: Partial<SavedLink>) => {
    try {
      const updated = await updateLink(id, updates);
      setSavedLinks(prev => prev.map(l => l.id === id ? updated : l));
    } catch (err) {
      console.error('[App] Failed to update link:', err);
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
        setDailyGoals(prev => prev.map(g => g.id === 'goal-3' ? { ...g, isCompleted: true, hasClaimedXp: true } : g));
      }

      // Phase 3C: Reward Mochi with +10 XP if user mastered the material (and not already rewarded)
      if (status === 'completed') {
        const isNew = await recordRewardClaim(`link_mastered:${id}`, 'link_mastered', id, 10);
        if (isNew) {
          setPet(prev => {
            const awardResult = awardXp(prev, 10);
            return {
              ...awardResult.pet,
              mood: Math.min(100, awardResult.pet.mood + 10),
              state: 'happy',
            };
          });
          setTimeout(() => {
            setPet(current => ({ ...current, state: 'idle' }));
          }, 1800);
        }
      }
    } catch (err) {
      console.error('[App] Failed to update link status:', err);
    }
  };

  // 4. Notes Actions with IndexedDB Persistence
  const handleAddNote = async (newNote: Note) => {
    try {
      const created = await createNote(newNote);
      setNotes(prev => [created, ...prev]);
      setPet(prev => awardXp(prev, 15).pet);
      setDailyGoals(prev => prev.map(g => g.id === 'goal-4' ? { ...g, isCompleted: true, hasClaimedXp: true } : g));
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

  // 5. Goals Action with Idempotent Anti-Spam Guard (Fix for SEC-02)
  const handleToggleGoal = (id: string) => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const ledgerKey = `goal:${todayKey}:${id}`;

    setDailyGoals(prev => prev.map(g => {
      if (g.id === id) {
        const nextState = !g.isCompleted;
        // Only award XP if transitioning to completed AND has not yet claimed XP for this goal today
        if (nextState && !g.hasClaimedXp) {
          recordRewardClaim(ledgerKey, 'habit', id, g.xpReward).then(isNew => {
            if (isNew) {
              setPet(p => awardXp(p, g.xpReward).pet);
            }
          });
          return { ...g, isCompleted: true, hasClaimedXp: true };
        }
        return { ...g, isCompleted: nextState };
      }
      return g;
    }));
  };

  // 6. Assistant Actions
  const handleSendMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: 'Just now'
    };

    setChatMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      const response = processAssistantMessage(text, {
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
    }, 400);
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
      onSelectTab={setCurrentTab}
      pet={pet}
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

      {currentTab === 'home' && (
        <DashboardPage
          pet={pet}
          savedLinks={savedLinks}
          dailyGoals={dailyGoals}
          onFeedPet={handleFeedPet}
          onToggleGoal={handleToggleGoal}
          onNavigate={setCurrentTab}
        />
      )}

      {currentTab === 'vault' && (
        <VaultPage
          links={savedLinks}
          onAddLink={handleAddLink}
          onUpdateLink={handleUpdateLink}
          onDeleteLink={handleDeleteLink}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {currentTab === 'notes' && (
        <NotesPage
          notes={notes}
          onAddNote={handleAddNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
        />
      )}

      {currentTab === 'assistant' && (
        <AssistantPage
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onNavigate={setCurrentTab}
        />
      )}
    </AppLayout>
  );
}

export default App;
