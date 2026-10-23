import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import type { NavigationTab, Pet, SavedLink, Note, ChatMessage, DailyGoal, LinkStatus, CosmeticSlot, CosmeticId, StudyProgress } from './lib/types';
import { initialPet, initialSavedLinks, initialNotes, initialChatMessages } from './lib/mockData';
import { feedPet, awardXp, calculateTimeDecay, togglePetSleep, type FeedResult } from './features/pet/engine/petEngine';
import { loadStoredPet, saveStoredPet } from './features/pet/engine/petStorage';
import { getAllLinks, createLink, updateLink, deleteLink } from './lib/db/linksRepository';
import { getAllNotes, getNotesCount, createNote, updateNote, deleteNote } from './lib/db/notesRepository';
import { recordStudyAction, getStudyProgress, getStudyStats } from './lib/db/studyEventsRepository';
import { equipCosmetic, unequipCosmetic, syncPetCosmeticUnlocks } from './features/pet/engine/cosmetics';
import { initializeDatabase } from './lib/db/seed';
import {
  recordRewardClaim,
  claimDailyLinkReward,
  claimDailyReviewReward,
  claimDailyNoteReward,
  claimLearningVarietyBonus,
  releaseRewardClaim,
  type LinkRewardResult
} from './lib/db/rewardLedgerRepository';
import { usePageVisible } from './lib/perf/usePageVisible';
import { loadStoredDailyGoals, saveStoredDailyGoals, getTodayDateString } from './features/dashboard/dailyGoalsStorage';
import { AppLayout } from './app/layout/AppLayout';
import { SolidSproutIcon } from './components/common/SolidSproutIcon';
import { DashboardPage } from './features/dashboard/DashboardPage';
// R2-PERF-01: halaman non-home dimuat lazy agar entry chunk tetap ringan.
const VaultPage = lazy(() => import('./features/vault/VaultPage').then(m => ({ default: m.VaultPage })));
const NotesPage = lazy(() => import('./features/notes/NotesPage').then(m => ({ default: m.NotesPage })));
const AssistantPage = lazy(() => import('./features/assistant/AssistantPage').then(m => ({ default: m.AssistantPage })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
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
  const [notesCount, setNotesCount] = useState(0);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const notesLoadPromiseRef = useRef<Promise<Note[]> | null>(null);
  const notesVersionRef = useRef(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>(() => loadStoredDailyGoals());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isNightMode, setIsNightMode] = useState<boolean>(() => Boolean(pet.isSleeping));
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [studyProgress, setStudyProgress] = useState<StudyProgress | undefined>(undefined);
  const [studyStats, setStudyStats] = useState<{ totalReviews: number; totalNotes: number; allTimeEventsCount: number }>({
    totalReviews: 0,
    totalNotes: 0,
    allTimeEventsCount: 0,
  });
  const pageVisible = usePageVisible();

  const ensureNotesLoaded = useCallback((): Promise<Note[]> => {
    if (notesLoaded) return Promise.resolve(notes);
    if (!notesLoadPromiseRef.current) {
      const version = notesVersionRef.current;
      notesLoadPromiseRef.current = getAllNotes().then(loaded => {
        if (version === notesVersionRef.current) {
          setNotes(loaded);
          setNotesCount(loaded.length);
          setNotesLoaded(true);
        }
        return loaded;
      }).catch(err => {
        if (version === notesVersionRef.current) notesLoadPromiseRef.current = null;
        throw err;
      });
    }
    return notesLoadPromiseRef.current;
  }, [notes, notesLoaded]);

  // PWA Update notification listener (Sol ADR-002)
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ registration: ServiceWorkerRegistration }>;
      setSwRegistration(customEvent.detail?.registration || null);
    };
    window.addEventListener('petalife:update-available', handleUpdate);
    return () => window.removeEventListener('petalife:update-available', handleUpdate);
  }, []);

  // Synchronize Telegram Mini App header and background with Petalife theme
  useEffect(() => {
    try {
      const tg = (window as unknown as {
        Telegram?: {
          WebApp?: {
            setHeaderColor?: (color: string) => void;
            setBackgroundColor?: (color: string) => void;
          };
        };
      })?.Telegram?.WebApp;
      if (tg) {
        const bg = isNightMode ? '#EBE2D6' : '#FAF7F2';
        tg.setHeaderColor?.(bg);
        tg.setBackgroundColor?.(bg);
      }
    } catch {
      // Ignored outside Telegram environment
    }
  }, [isNightMode]);

  // AUDIT-FIX (P1): the old version ran `setIsNightMode` inside the `setPet`
  // updater. React may invoke an updater twice (StrictMode / concurrent replay),
  // and side effects inside an updater are never safe. Compute the next pet
  // once, then commit it through the single write-through path.
  const handleToggleNightMode = () => {
    const next = togglePetSleep(petRef.current);
    setIsNightMode(Boolean(next.isSleeping));
    persistPetChange(() => next);
  };

  // Re-check and rollover daily habits when date crosses midnight without manual reload
  const activeDateRef = useRef<string>(getTodayDateString());
  useEffect(() => {
    const checkMidnightRollover = async () => {
      const currentDate = getTodayDateString();
      if (currentDate !== activeDateRef.current) {
        activeDateRef.current = currentDate;
        setDailyGoals(loadStoredDailyGoals());
      }
      try {
        const progress = await getStudyProgress();
        setStudyProgress(progress);
        setPet(prev => {
          const synced = syncPetCosmeticUnlocks(prev, progress);
          if (synced.streakDays !== progress.currentStreakDays || synced !== prev) {
            const updated = { ...synced, streakDays: progress.currentStreakDays };
            saveStoredPet(updated);
            return updated;
          }
          return prev;
        });
      } catch (err) {
        console.error('[App] Failed to refresh streak on rollover/focus:', err);
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

  // Home needs the note count, not every note body. Load bodies on first use.
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setIsLoading(true);
        // Idempotent seed if database is empty on first boot
        await initializeDatabase();
        const [loadedLinks, count, progress, stats] = await Promise.all([
          getAllLinks(),
          getNotesCount(),
          getStudyProgress(),
          getStudyStats(),
        ]);
        if (isMounted) {
          setSavedLinks(loadedLinks);
          setNotesCount(count);
          setStudyProgress(progress);
          setStudyStats(stats);
          setPet(prev => {
            const synced = syncPetCosmeticUnlocks(prev, progress);
            if (synced.streakDays !== progress.currentStreakDays || synced !== prev) {
              const updated = { ...synced, streakDays: progress.currentStreakDays };
              saveStoredPet(updated);
              return updated;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('[App] Failed to load from IndexedDB:', err);
        if (isMounted) {
          setStorageError('Operating in temporary session mode: local IndexedDB is unavailable in this environment.');
          setSavedLinks(initialSavedLinks);
          setNotes(initialNotes);
          setNotesCount(initialNotes.length);
          setNotesLoaded(true);
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

  useEffect(() => {
    if (isLoading || currentTab !== 'notes' || notesLoaded) return;
    // Load the code chunk alongside the IndexedDB read on the first visit.
    void import('./features/notes/NotesPage');
    void ensureNotesLoaded().catch(err => {
      console.error('[App] Failed to load notes:', err);
      setStorageError('Catatan gagal dimuat. Buka ulang tab Catatan untuk mencoba lagi.');
    });
  }, [currentTab, isLoading, notesLoaded, ensureNotesLoaded]);

  // R2-DATA-01: ref agar mutasi XP tidak bergantung pada flush useEffect.
  const petRef = useRef<Pet>(pet);

  // Sync pet state changes to versioned localStorage
  useEffect(() => {
    petRef.current = pet;
    saveStoredPet(pet);
  }, [pet]);

  /**
   * R2-DATA-01 — Write-through persistence.
   * Reward ledger (IndexedDB) sudah commit sebelum fungsi ini dipanggil; jika XP hanya
   * hidup di state React, menutup tab atau kuota localStorage yang habis akan menghanguskan
   * XP secara permanen. Karena itu persistensi dilakukan SINKRON di sini, bukan menunggu useEffect.
   */
  const persistPetChange = (mutator: (current: Pet) => Pet): boolean => {
    const next = mutator(petRef.current);
    petRef.current = next;
    const persisted = saveStoredPet(next);
    if (!persisted) {
      setStorageError('Progres XP gagal disimpan di perangkat ini (penyimpanan penuh atau mode privat). Muat ulang halaman sebelum melanjutkan.');
    }
    setPet(next);
    return persisted;
  };

  /**
   * R3-DATA-01: klaim ledger hanya sah bila XP benar-benar tersimpan di perangkat.
   * Ledger sudah commit lebih dulu (durabel) dan bersifat idempoten, sehingga bila
   * persistensi gagal kita WAJIB membatalkan klaim — kalau tidak, percobaan ulang
   * ditolak selamanya dan XP pengguna hangus permanen.
   */
  const applyClaimedReward = async (ledgerKey: string, xpAmount: number): Promise<boolean> => {
    if (!xpAmount || xpAmount <= 0) return true;
    if (persistPetChange(current => awardXp(current, xpAmount).pet)) return true;
    await releaseRewardClaim(ledgerKey);
    return false;
  };

  /**
   * Drops a transient pose ('happy', 'feeding') back to idle/sleeping.
   * AUDIT-FIX (P1): the review reward scheduled a bare `setPet` timeout that was
   * never cleared — it fired after unmount and, worse, rebuilt the pet from a
   * snapshot taken before any XP earned in the meantime.
   */
  const scheduleIdlePose = (delayMs: number) => {
    if (transientStateTimerRef.current) clearTimeout(transientStateTimerRef.current);
    transientStateTimerRef.current = setTimeout(() => {
      transientStateTimerRef.current = null;
      persistPetChange(current => ({
        ...current,
        state: current.isSleeping ? 'sleeping' : 'idle',
      }));
    }, delayMs);
  };

  // Periodic passive decay while user keeps application open (every 60 seconds).
  // AUDIT-FIX (P1): decay used the plain `setPet` path, leaving `petRef` one
  // render behind. A reward claim landing in that window rebuilt the pet from the
  // stale snapshot and silently erased the decay (or a fresh feed). Every pet
  // mutation now goes through `persistPetChange`.
  useEffect(() => {
    if (!pageVisible) return;
    persistPetChange(prev => calculateTimeDecay(prev));
    const timer = setInterval(() => {
      persistPetChange(prev => calculateTimeDecay(prev));
    }, 60000);
    return () => clearInterval(timer);
  }, [pageVisible]);

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
          await applyClaimedReward(ledgerKey, goal.xpReward);
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

  // AUDIT-FIX (P0): feeding had three compounding defects.
  //   1. `fulfillDailyGoal('goal-2')` ran unconditionally, so a feed rejected by
  //      the engine (full belly / 2s cooldown) still completed the daily habit
  //      and paid its XP every single tap.
  //   2. The engine result was discarded, so PetRoom always announced "+25 XP"
  //      while the real award is 5 XP once per day.
  //   3. Two taps inside one frame both reached the engine before React could
  //      render `state: 'feeding'`; only the engine cooldown prevented a double
  //      feed. An explicit in-flight latch makes the intent local and testable.
  const feedInFlightRef = useRef(false);
  const feedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transientStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (feedResetTimerRef.current) {
      clearTimeout(feedResetTimerRef.current);
      feedResetTimerRef.current = null;
    }
    if (transientStateTimerRef.current) {
      clearTimeout(transientStateTimerRef.current);
      transientStateTimerRef.current = null;
    }
  }, []);

  // 1. Feeding Interaction via Engine (Sol Economy: +5 XP for 1st daily care, 0 XP for repeats)
  const handleFeedPet = (): FeedResult | null => {
    if (feedInFlightRef.current) return null;

    const result = feedPet(petRef.current, Date.now(), getTodayDateString());
    if (!result.success) return result;

    feedInFlightRef.current = true;
    persistPetChange(() => result.pet);

    // Return to idle (or sleeping if pet was sleeping) after the feeding animation
    if (feedResetTimerRef.current) clearTimeout(feedResetTimerRef.current);
    feedResetTimerRef.current = setTimeout(() => {
      feedResetTimerRef.current = null;
      feedInFlightRef.current = false;
      persistPetChange(current => ({
        ...current,
        state: current.isSleeping ? 'sleeping' : 'idle',
      }));
    }, 1600);

    // Only an accepted feed counts as the daily morning-snack habit.
    void fulfillDailyGoal('goal-2');
    return result;
  };

  // 3. Vault Actions with IndexedDB Persistence & Sol XP Economy (5 XP per link save, max 2/day)
  const handleAddLink = async (newLink: SavedLink): Promise<LinkRewardResult> => {
    try {
      const created = await createLink(newLink);
      setSavedLinks(prev => [created, ...prev]);

      const todayKey = getTodayDateString();
      const rewardResult = await claimDailyLinkReward(created.id, todayKey, 2);
      if (rewardResult.awarded) {
        const ledgerKey = `link_save:${todayKey}:${created.id}`;
        const persisted = await applyClaimedReward(ledgerKey, rewardResult.xpAwarded);
        // Variety bonus hanya relevan bila reward utama benar-benar tersimpan.
        if (persisted) {
          const varietyResult = await claimLearningVarietyBonus(todayKey);
          if (varietyResult.awarded) {
            await applyClaimedReward(`variety_bonus:${todayKey}`, varietyResult.xpAwarded);
          }
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
      // AUDIT-FIX (P1): swallow here meant the Vault could not distinguish
      // "deleted" from "failed to delete" — it closed the reading view either way.
      throw err;
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
        try {
          const studyRes = await recordStudyAction('review_completed', id);
          setStudyProgress(studyRes.progress);
          const updatedStats = await getStudyStats();
          setStudyStats(updatedStats);
          persistPetChange(prev => {
            const withCosmetics = syncPetCosmeticUnlocks(prev, studyRes.progress);
            return {
              ...withCosmetics,
              streakDays: studyRes.progress.currentStreakDays,
            };
          });
        } catch (studyErr) {
          console.error('[App] Failed to record study action for review:', studyErr);
        }

        const todayKey = getTodayDateString();
        const reviewResult = await claimDailyReviewReward(id, todayKey, 2);
        if (reviewResult.awarded) {
          const reviewLedgerKey = `link_review:${todayKey}:${id}`;
          const persisted = persistPetChange(prev => {
            const awardResult = awardXp(prev, reviewResult.xpAwarded);
            return {
              ...awardResult.pet,
              mood: Math.min(100, awardResult.pet.mood + 5),
              state: 'happy',
            };
          });
          if (!persisted) {
            await releaseRewardClaim(reviewLedgerKey);
          } else {
            scheduleIdlePose(1800);

            // Check learning variety bonus (10 XP if >= 2 distinct learning categories today)
            const varietyResult = await claimLearningVarietyBonus(todayKey);
            if (varietyResult.awarded) {
              await applyClaimedReward(`variety_bonus:${todayKey}`, varietyResult.xpAwarded);
            }
          }
        }
      }
    } catch (err) {
      console.error('[App] Failed to update link status:', err);
    }
  };

  // 4. Notes Actions with IndexedDB Persistence & Sol XP Economy (15 XP per note, max 2/day)
  const handleAddNote = async (newNote: Note) => {
    // The editor may report success only after the note itself is durable.
    const created = await createNote(newNote);
    setNotes(prev => [created, ...prev]);
    setNotesCount(prev => prev + 1);

    if (created.body && created.body.trim().length > 0) {
      try {
        const studyRes = await recordStudyAction('note_created', created.id);
        setStudyProgress(studyRes.progress);
        const updatedStats = await getStudyStats();
        setStudyStats(updatedStats);
        persistPetChange(prev => {
          const withCosmetics = syncPetCosmeticUnlocks(prev, studyRes.progress);
          return {
            ...withCosmetics,
            streakDays: studyRes.progress.currentStreakDays,
          };
        });
      } catch (studyErr) {
        console.error('[App] Failed to record study action for note:', studyErr);
      }
    }

    try {
      const todayKey = getTodayDateString();
      const noteReward = await claimDailyNoteReward(created.id, todayKey, 2);
      if (noteReward.awarded) {
        const noteLedgerKey = `note_save:${todayKey}:${created.id}`;
        const persisted = await applyClaimedReward(noteLedgerKey, noteReward.xpAwarded);

        // Check learning variety bonus (10 XP if >= 2 distinct learning categories today)
        if (persisted) {
          const varietyResult = await claimLearningVarietyBonus(todayKey);
          if (varietyResult.awarded) {
            await applyClaimedReward(`variety_bonus:${todayKey}`, varietyResult.xpAwarded);
          }
        }
      }

      await fulfillDailyGoal('goal-4');
    } catch (err) {
      // Reward bookkeeping must not turn an already saved note into a false failure.
      console.error('[App] Note saved, but reward bookkeeping failed:', err);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    try {
      const updated = await updateNote(id, updates);
      setNotes(prev => prev.map(n => n.id === id ? updated : n));
    } catch (err) {
      console.error('[App] Failed to update note:', err);
      throw err;
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      setNotesCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[App] Failed to delete note from repository:', err);
      throw err;
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
          await applyClaimedReward(ledgerKey, goal.xpReward);
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
      const [{ queryAssistant }, loadedNotes] = await Promise.all([
        import('./features/assistant/engine/assistantEngine'),
        ensureNotesLoaded(),
      ]);
      const response = await queryAssistant(text, {
        links: savedLinks,
        notes: loadedNotes,
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
    } catch (err) {
      // AUDIT-FIX (P1): this used to swallow the rejection, so the user saw their
      // message but no reply at all. Surface an honest, recoverable bubble.
      console.error('[App] Assistant failed to answer:', err);
      const fallback: ChatMessage = {
        id: `ai-error-${Date.now()}`,
        sender: 'assistant',
        text: 'Mochi belum bisa menjawab sekarang. Periksa koneksi lalu coba lagi ya.',
        timestamp: 'Just now',
      };
      setChatMessages(prev => [...prev, fallback]);
    }
  };

  /**
   * AUDIT-FIX (P0): Settings can now replace the local dataset (import/reset).
   * The React state must be rebuilt from disk, otherwise the UI keeps showing
   * the pre-restore Vault until the Mini App is closed and reopened.
   * Deliberately does NOT call initializeDatabase(): that would re-seed the demo
   * fixtures into a deliberately empty database after a full reset.
   */
  const handleDataRestored = async () => {
    try {
      const [reloadedLinks, reloadedNotes, reloadedProgress, reloadedStats] = await Promise.all([
        getAllLinks(),
        getAllNotes(),
        getStudyProgress(),
        getStudyStats(),
      ]);
      setSavedLinks(reloadedLinks);
      notesVersionRef.current += 1;
      setNotes(reloadedNotes);
      setNotesCount(reloadedNotes.length);
      setNotesLoaded(true);
      notesLoadPromiseRef.current = Promise.resolve(reloadedNotes);
      setStudyProgress(reloadedProgress);
      setStudyStats(reloadedStats);

      const restoredPet = loadStoredPet(initialPet).pet;
      const syncedPet = syncPetCosmeticUnlocks(restoredPet, reloadedProgress);
      petRef.current = syncedPet;
      setPet(syncedPet);
      setIsNightMode(Boolean(syncedPet.isSleeping));
      setStorageError(null);
    } catch (err) {
      console.error('[App] Failed to reload data after restore:', err);
      setStorageError('Data berhasil dipulihkan, tetapi tampilan gagal dimuat ulang. Muat ulang halaman.');
    }
  };

  const handleEquipCosmetic = (slot: CosmeticSlot, id: CosmeticId) => {
    persistPetChange(prev => equipCosmetic(prev, slot, id));
  };

  const handleUnequipCosmetic = (slot: CosmeticSlot) => {
    persistPetChange(prev => unequipCosmetic(prev, slot));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[#FFEFE8] border-2 border-[#FED7C5] flex items-center justify-center mb-3 shadow-xs">
          <SolidSproutIcon className="w-8 h-8" />
        </div>
        <h2 className="text-base sm:text-lg font-extrabold text-[#2E2E3A] mb-1">Menyiapkan ruang belajar Mochi...</h2>
        <p className="text-xs text-[#8A857A]">Memuat Pustaka dan Catatan yang tersimpan.</p>
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

      <div key={currentTab} className={currentTab === 'notes' ? '' : currentTab === 'assistant' ? 'flex-1 min-h-0' : 'anim-page-enter'}>
        <Suspense fallback={<div className="p-6 text-center text-sm font-semibold text-[#8C8275] select-none">Memuat…</div>}>
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
            notesCount={notesCount}
            isNightMode={isNightMode}
            onToggleNightMode={handleToggleNightMode}
            onEquipCosmetic={handleEquipCosmetic}
            onUnequipCosmetic={handleUnequipCosmetic}
            studyProgress={studyProgress}
            totalReviewsCompleted={studyStats.totalReviews}
            totalNotesCreated={studyStats.totalNotes}
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
            equippedCosmetics={pet.identity?.cosmetics?.equipped}
          />
        )}

        {currentTab === 'notes' && (notesLoaded ? (
          <NotesPage
            notes={notes}
            onAddNote={handleAddNote}
            onUpdateNote={handleUpdateNote}
            onDeleteNote={handleDeleteNote}
            isNightMode={isNightMode}
            equippedCosmetics={pet.identity?.cosmetics?.equipped}
          />
        ) : <div className="p-6 text-center text-sm font-semibold text-[#8C8275]">Memuat Catatan…</div>)}

        {currentTab === 'assistant' && (
          <AssistantPage
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onNavigate={handleSelectTab}
            isNightMode={isNightMode}
          />
        )}
        {currentTab === 'settings' && (
          <SettingsPage
            nightMode={isNightMode}
            onToggleNightMode={handleToggleNightMode}
            onDataRestored={handleDataRestored}
          />
        )}
        </Suspense>
      </div>
    </AppLayout>
  );
}

export default App;
