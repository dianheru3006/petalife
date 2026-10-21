import type { FC, FormEvent } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Pet, NavigationTab, SavedLink } from '../../lib/types';
import { MochiPet, type MochiAction } from './MochiPet';
import {
  Sparkles,
  CheckCircle2,
  Moon,
  Sun,
  ArrowUp,
  Link2,
  Clipboard,
  Shirt,
  Info,
  Music,
  X,
  ArrowRight,
  PawPrint,
} from 'lucide-react';
import { canFeedPet, getPetContextualStatus, getDisplayStats, type FeedResult } from '../../features/pet/engine/petEngine';
import { normalizeUrl, isValidUrl } from '../../lib/utils/urlUtils';
import { detectPlatform, cn, getUserDisplayName } from '../../lib/utils';
import roomBg from '../../assets/room-bg.jpg';
import roomBgWebp from '../../assets/room-bg.webp';
import { SnackBubble, CircularMeter } from './SnackBubble';
import { SNACK_VARIANTS } from './snackData';
import { TvScreen } from './TvScreen';
import { LiveCalendar } from './LiveCalendar';
import { LiveWallClock } from './LiveWallClock';
import { MochiNoteSheet } from './MochiNoteSheet';
import { synthesizeLink, getPendingActiveJobs, resumeActiveJob } from '../../lib/services/aiSynthesisService';
import type { LinkRewardResult } from '../../lib/db/rewardLedgerRepository';

export interface PetRoomProps {
  pet: Pet;
  /** Returns the engine result so the UI can report the real XP and rejection reason. */
  onFeed: () => FeedResult | null | void;
  onNavigate: (tab: NavigationTab) => void;
  savedLinks?: SavedLink[];
  onAddLink?: (newLink: SavedLink) => Promise<LinkRewardResult | void>;
  onUpdateLink?: (id: string, updates: Partial<SavedLink>) => void;
  notesCount?: number;
  isNightMode?: boolean;
  onToggleNightMode?: () => void;
}

export const PetRoom: FC<PetRoomProps> = ({
  pet,
  onFeed,
  onNavigate,
  savedLinks = [],
  onAddLink,
  onUpdateLink,
  notesCount: _notesCount,
  isNightMode,
  onToggleNightMode,
}) => {
  const isFull = !canFeedPet(pet);
  const isFeeding = pet.state === 'feeding';
  const contextualStatus = getPetContextualStatus(pet);
  const displayStats = getDisplayStats(pet);

  // Dynamic Snack Variety (cycles through Onigiri, Cake, Dango, Baozi, Pancake, Cookie, Pudding, Peach)
  const [snackIndex, setSnackIndex] = useState(0);
  const currentSnack = SNACK_VARIANTS[snackIndex];

  // Note Sheet & Large Paper Presentation State
  const [holdingNoteLink, setHoldingNoteLink] = useState<SavedLink | null>(null);
  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState<boolean>(false);

  // Speech Bubble State: Hidden by default; only appears on direct interaction or occasional whisper
  const [speech, setSpeech] = useState<string>('Kenyang dan senang.');
  const [showSpeech, setShowSpeech] = useState<boolean>(false);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [lastFedText, setLastFedText] = useState<string | null>(null);
  const [localNight, setLocalNight] = useState<boolean>(false);
  const [forcedAction, setForcedAction] = useState<{ id: number; action: MochiAction } | undefined>(undefined);
  const activeNight = isNightMode !== undefined ? isNightMode : localNight;

  const handleToggleNight = () => {
    const willBeNight = !activeNight;
    if (onToggleNightMode) {
      onToggleNightMode();
    } else {
      setLocalNight(prev => !prev);
    }

    if (willBeNight) {
      triggerSpeech(`Hoaaam... Selamat tidur dan mimpi indah, ${getUserDisplayName()}!`, 4000);
    } else {
      triggerSpeech('Selamat pagi! Semangat belajar lagi bareng Mochi!', 4000);
    }
  };

  // Quick Link Capture State & Modal Sheet State
  const [quickUrl, setQuickUrl] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [youtubeStage, setYouTubeStage] = useState<'capturing' | 'transcribing' | 'thinking' | 'ready' | null>(null);
  const youtubeStageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const actionSequenceRef = useRef(0);
  // Keep Mochi awake while it processes a link, including during night mode.
  const effectivePet: Pet = activeNight && !isFeeding && !isSavingLink
    ? { ...pet, state: 'sleeping' }
    : pet;
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isFabClosing, setIsFabClosing] = useState(false);
  const fabCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastShakeTimeRef = useRef<number>(0);
  const [isTerrariumShaking, setIsTerrariumShaking] = useState(false);

  const closeFab = () => {
    if (!isFabOpen || isFabClosing) return;
    setIsFabClosing(true);
    if (fabCloseTimeoutRef.current) clearTimeout(fabCloseTimeoutRef.current);
    fabCloseTimeoutRef.current = setTimeout(() => {
      setIsFabOpen(false);
      setIsFabClosing(false);
    }, 280);
  };

  const handleToggleFab = () => {
    if (isFabClosing) return;
    if (isFabOpen) {
      closeFab();
    } else {
      setIsFabOpen(true);
      setIsFabClosing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (fabCloseTimeoutRef.current) clearTimeout(fabCloseTimeoutRef.current);
      if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
      youtubeStageTimersRef.current.forEach(clearTimeout);
      feedTimersRef.current.forEach(clearTimeout);
    };
  }, []);


  // Accessible Modal & FAB Focus Trap & Restoration Refs
  const wardrobeModalRef = useRef<HTMLDivElement>(null);
  const wardrobeCloseBtnRef = useRef<HTMLButtonElement>(null);
  const wardrobeTriggerRef = useRef<HTMLButtonElement>(null);

  const fabTriggerRef = useRef<HTMLButtonElement>(null);
  const fabContainerRef = useRef<HTMLDivElement>(null);

  // Close FAB Speed Dial on Escape key or outside click
  useEffect(() => {
    if (!isFabOpen || isFabClosing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFab();
        fabTriggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (fabContainerRef.current && !fabContainerRef.current.contains(e.target as Node)) {
        closeFab();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isFabOpen, isFabClosing]);

  // Focus trap, Escape key, and focus restoration for Wardrobe Modal
  useEffect(() => {
    if (!isWardrobeOpen) return;

    const focusTimer = setTimeout(() => {
      wardrobeCloseBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsWardrobeOpen(false);
        return;
      }

      if (e.key === 'Tab') {
        const modal = wardrobeModalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modal.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modal.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      requestAnimationFrame(() => {
        fabTriggerRef.current?.focus();
      });
    };
  }, [isWardrobeOpen]);

  // Live Date & Indonesian Greeting
  const [greeting, setGreeting] = useState<string>('Selamat malam');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      if (hours < 11) setGreeting('Selamat pagi');
      else if (hours < 15) setGreeting('Selamat siang');
      else if (hours < 18) setGreeting('Selamat sore');
      else setGreeting('Selamat malam');
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper to trigger Mochi's speech bubble and auto-hide after duration
  const triggerSpeech = (text: string, durationMs = 3800) => {
    setSpeech(text);
    setShowSpeech(true);
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
    }
    speechTimerRef.current = setTimeout(() => {
      setShowSpeech(false);
    }, durationMs);
  };

  const forceMochiAction = (action: MochiAction) => {
    actionSequenceRef.current += 1;
    setForcedAction({ id: Date.now() + actionSequenceRef.current, action });
  };

  // Sol ADR-003 / Tahap 4: Auto-resume pending async synthesis jobs on WebView launch
  useEffect(() => {
    const pendingJobs = getPendingActiveJobs();
    if (!pendingJobs || pendingJobs.length === 0) return;

    let isCancelled = false;
    const active = pendingJobs[0];

    forceMochiAction('studying');
    triggerSpeech('Mochi melanjutkan intisari yang sempat tertunda... 🔍', 5000);

    resumeActiveJob(active, (_stage, stageLabel) => {
      if (!isCancelled) {
        forceMochiAction('studying');
        triggerSpeech(stageLabel, 6000);
      }
    }).then((res) => {
      if (isCancelled || !res.success || !res.result) return;

      const { content: smart, qualityStatus, evidenceLevel, captureMethod, sourceExcerpt } = res.result;
      const now = Date.now();
      const { platform, domain } = detectPlatform(active.url);

      // P1: Match existing bookmark by canonical URL to update in-place
      const canonicalActive = normalizeUrl(active.url);
      const existingSaved = savedLinks.find(l => normalizeUrl(l.url) === canonicalActive);

      const restoredLink: SavedLink = {
        id: existingSaved ? existingSaved.id : `link-${now}`,
        url: active.url.startsWith('http') ? active.url : `https://${active.url}`,
        title: smart.title,
        thumbnailUrl: smart.thumbnailUrl,
        platform,
        domain,
        tags: smart.tags,
        status: existingSaved ? existingSaved.status : 'to_review',
        dateAdded: existingSaved ? existingSaved.dateAdded : 'Baru saja',
        createdAt: existingSaved ? existingSaved.createdAt : now,
        updatedAt: now,
        notes: smart.notes,
        summary: smart.summary,
        category: smart.category,
        coreThesis: smart.coreThesis,
        keyTakeaways: smart.keyTakeaways,
        actionableInsights: smart.actionableInsights,
        reflectionPrompt: smart.reflectionPrompt,
        author: smart.author,
        captureMethod,
        evidenceLevel,
        qualityStatus,
        provenance: res.result.provenance,
        sourceExcerpt,
        synthesizedAt: res.result.synthesizedAt,
        gatewayHttpStatus: res.result.gatewayHttpStatus,
      };

      setHoldingNoteLink(restoredLink);
      setIsNoteSheetOpen(true);
      forceMochiAction('holding-note');
      triggerSpeech('Mochi selesai menyusun intisari materi kamu! ✨', 7000);
    }).catch(() => {
      // Background auto-resume error ignored gracefully
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const clearYouTubeStages = () => {
    youtubeStageTimersRef.current.forEach(clearTimeout);
    youtubeStageTimersRef.current = [];
  };

  const startYouTubeStages = () => {
    clearYouTubeStages();
    setYouTubeStage('capturing');
    forceMochiAction('hop');
    triggerSpeech('Nyam! Tautan YouTube tertangkap!', 1800);
    youtubeStageTimersRef.current.push(setTimeout(() => {
      setYouTubeStage('transcribing');
      forceMochiAction('studying');
      triggerSpeech('Mencari dan menyalin subtitle video...', 3600);
    }, 1500));
    youtubeStageTimersRef.current.push(setTimeout(() => {
      setYouTubeStage('thinking');
      forceMochiAction('thinking');
      triggerSpeech('Menyaring gagasan dan model mental...', 4200);
    }, 5000));
  };

  // Occasional gentle whisper: Mochi speaks briefly every 45-60 seconds, then hides again
  useEffect(() => {
    const whisperInterval = setInterval(() => {
      if (!isFeeding) {
        if (activeNight) {
          triggerSpeech('Zzz... mimpi manis...', 2800);
        } else {
          const whispers = [
            'Kenyang dan senang.',
            'Rumah Mochi hangat dan nyaman.',
            'Ada materi seru yang mau dipelajari?',
            `Mochi senang bersama ${getUserDisplayName()}!`,
          ];
          if (savedLinks.length > 0) {
            whispers.push(
              `Ada ${savedLinks.length} materi di Pustaka! Mau pelajari satu bareng Mochi?`,
              `Yuk buka Pustaka! Ada ${savedLinks.length} materi seru menunggumu.`
            );
          }
          const randomWhisper = whispers[Math.floor(Math.random() * whispers.length)];
          triggerSpeech(randomWhisper, 4200);
        }
      }
    }, 45000);

    return () => clearInterval(whisperInterval);
  }, [isFeeding, activeNight, savedLinks.length]);

  // Idle gentle food alternation ("kadang onigiri, kadang varian makanan lain")
  useEffect(() => {
    const timer = setInterval(() => {
      setSnackIndex(prev => (prev + 1) % SNACK_VARIANTS.length);
    }, 18000);
    return () => clearInterval(timer);
  }, []);

  const handleCycleNextSnack = () => {
    const nextIdx = (snackIndex + 1) % SNACK_VARIANTS.length;
    setSnackIndex(nextIdx);
    const nextSnack = SNACK_VARIANTS[nextIdx];
    if (isFull) {
      triggerSpeech(`Perut Mochi kenyang! Nanti kita coba ${nextSnack.name} ya.`, 3500);
    } else {
      triggerSpeech(`Mochi mau coba ${nextSnack.name}!`, 3500);
    }
  };

  const handleFeedClick = () => {
    if (isFull) {
      triggerSpeech('Perut Mochi sudah kenyang dan hatiku senang!', 3500);
      return;
    }
    if (isFeeding) {
      return; // Anti-spam guard
    }

    const result = onFeed();

    // AUDIT-FIX (P0): the engine can reject a feed (full belly, 2s cooldown,
    // another feed already in flight). Announcing "+25 XP" on a rejected feed
    // was simply false — the real award is 5 XP once per day.
    if (result && !result.success) {
      triggerSpeech(result.reason ?? 'Mochi belum bisa makan sekarang.', 3500);
      return;
    }

    triggerSpeech(currentSnack.feedSpeech, 4000);
    const xpAwarded = result?.xpAwarded ?? 0;
    setLastFedText(xpAwarded > 0
      ? `+${xpAwarded} XP • ${currentSnack.shortName}!`
      : `${currentSnack.shortName} • Nyam!`);

    // Transition to another delicious snack variant after feeding!
    feedTimersRef.current.push(setTimeout(() => {
      setSnackIndex(prev => (prev + 1) % SNACK_VARIANTS.length);
    }, 1200));

    feedTimersRef.current.push(setTimeout(() => {
      setLastFedText(null);
    }, 2800));
  };

  const handlePetTap = (action?: MochiAction) => {
    if (holdingNoteLink) {
      setIsNoteSheetOpen(true);
      return;
    }

    if (activeNight) {
      triggerSpeech('Ssst... Mochi sedang mimpi indah...', 3500);
      return;
    }

    if (action === 'wiggle') {
      const giggles = [
        'Hehehe, geli!',
        'Kikiki, geli banget!',
        'Geli tapi seru! Jangan berhenti elus ya.',
      ];
      triggerSpeech(giggles[Math.floor(Math.random() * giggles.length)], 3600);
      return;
    }

    if (action === 'spin') {
      const spins = [
        'Wuuush! Putar-putar seru!',
        'Tadaaa! Mochi bisa salto mini!',
        `Penuh energi! Ayo belajar lagi bareng ${getUserDisplayName()}!`,
      ];
      triggerSpeech(spins[Math.floor(Math.random() * spins.length)], 3600);
      return;
    }

    if (action === 'wink') {
      const winks = [
        `Mochi selalu siap menemani ${getUserDisplayName()}!`,
        'Kedip manis buat kamu! Semangat belajarnya!',
        `Psst... ${getUserDisplayName()} rajin banget hari ini!`,
      ];
      triggerSpeech(winks[Math.floor(Math.random() * winks.length)], 3600);
      return;
    }

    if (action === 'dance') {
      const danceLines = [
        'La la la~ Mochi suka menari!',
        `${getUserDisplayName()} lihat! Mochi punya gerakan tarian baru!`,
        'Satu dua tiga, bergoyang gembira!',
        'Musik membuat hati Mochi berbunga-bunga.',
      ];
      triggerSpeech(danceLines[Math.floor(Math.random() * danceLines.length)], 4000);
      return;
    }

    if (action === 'dizzy') {
      const dizzyQuotes = [
        'Whoaa! Gempa bumi kah? Pusing~',
        'Aduh aduh... bumi bergoyang! Mataku muter-muter!',
        'Hehe geli! Jangan kencang-kencang guncangnya ya.',
        'Waaah... kepalaku berputar-putar kayak gasing!',
        'Eeeh?! Ada guncangan hebat! Mochi pegangan karpet!',
      ];
      triggerSpeech(dizzyQuotes[Math.floor(Math.random() * dizzyQuotes.length)], 3800);
      return;
    }

    if (action === 'studying') {
      const studyLines = [
        'Ssst... Mochi lagi fokus mencatat materi baru.',
        'Kacamata Mochi pas banget buat belajar.',
        `Satu catatan lagi, biar makin pintar bareng ${getUserDisplayName()}!`,
      ];
      triggerSpeech(studyLines[Math.floor(Math.random() * studyLines.length)], 4000);
      return;
    }

    if (isFull) {
      triggerSpeech('Perut Mochi kenyang dan hatiku senang!', 3500);
      return;
    }
    const cuteReplies = [
      'Yaaay! Semangat belajar bareng kamu!',
      `Mochi siap menemani ${getUserDisplayName()}!`,
      `Streak belajarmu ${pet.streakDays} hari berturut-turut!`,
      contextualStatus.speechText,
    ];

    if (savedLinks.length > 0) {
      cuteReplies.push(
        `Ada ${savedLinks.length} materi di Pustaka nih! Mau review satu bareng aku?`,
        `Mochi siap belajar! Ada ${savedLinks.length} materi tersimpan di Pustaka.`
      );
    } else {
      cuteReplies.push(
        'Ada video atau materi baru yang seru? Tempel link di bawah ya.'
      );
    }

    triggerSpeech(cuteReplies[Math.floor(Math.random() * cuteReplies.length)], 4000);
  };

  const handleDanceClick = () => {
    if (activeNight) {
      triggerSpeech('Ssst... Mochi sedang mimpi indah... 🌙💤', 3500);
      return;
    }
    setForcedAction({ id: Date.now(), action: 'dance' });
    handlePetTap('dance');
  };

  const triggerShake = useCallback(() => {
    const now = Date.now();
    if (now - lastShakeTimeRef.current < 2200) return; // Cooldown 2.2s
    lastShakeTimeRef.current = now;

    // 1. Device Haptic Vibration (Web Vibration API & Telegram Mini App Haptics)
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 50, 70, 50, 90]);
      }
      (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('warning');
    } catch {
      // Safe fallback if vibrations are unsupported or disabled
    }

    // 2. Terrarium Micro-Tremor Animation
    setIsTerrariumShaking(true);
    feedTimersRef.current.push(setTimeout(() => setIsTerrariumShaking(false), 680));

    // 3. Trigger Mochi Dizzy Action
    setForcedAction({ id: now, action: 'dizzy' });

    // 4. Dizzy Speech Lines
    const dizzyQuotes = [
      'Whoaa! Gempa bumi kah? Pusing~',
      'Aduh aduh... bumi bergoyang! Mataku muter-muter!',
      'Hehe geli! Jangan kencang-kencang guncangnya ya.',
      'Waaah... kepalaku berputar-putar kayak gasing!',
      'Eeeh?! Ada guncangan hebat! Mochi pegangan karpet!',
    ];
    triggerSpeech(dizzyQuotes[Math.floor(Math.random() * dizzyQuotes.length)], 3800);
  }, [triggerSpeech]);

  // Global Shake Sensor Hook (Mobile DeviceMotionEvent + Keyboard 'S' for PC)
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastZ = 0;
    let lastUpdate = 0;
    const SHAKE_THRESHOLD = 18; // m/s² delta threshold

    const handleDeviceMotion = (e: DeviceMotionEvent) => {
      const current = e.accelerationIncludingGravity;
      if (!current) return;

      const now = Date.now();
      if (now - lastUpdate > 100) {
        const diffTime = now - lastUpdate;
        lastUpdate = now;

        const x = current.x ?? 0;
        const y = current.y ?? 0;
        const z = current.z ?? 0;

        const speed = (Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime) * 10000;

        if (speed > SHAKE_THRESHOLD * 25) {
          triggerShake();
        }

        lastX = x;
        lastY = y;
        lastZ = z;
      }
    };

    // Keyboard 'S' or 's' shortcut for PC testing
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 's' || e.key === 'S') {
        triggerShake();
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [triggerShake]);

  const handlePasteToInput = async () => {
    let pasted = false;

    // 1. Try Telegram Mini App Native Clipboard API (Bot API 6.4+)
    const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : undefined;
    if (typeof tg?.readTextFromClipboard === 'function') {
      try {
        tg.readTextFromClipboard((clipText?: string | null) => {
          if (clipText && typeof clipText === 'string' && clipText.trim()) {
            setQuickUrl(clipText.trim());
            setQuickError(null);
            pasted = true;
          }
        });
      } catch (err) {
        console.warn('[PetRoom] Telegram clipboard error:', err);
      }
    }

    // 2. Try Standard Web navigator.clipboard API
    if (!pasted && typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setQuickUrl(text.trim());
          setQuickError(null);
          pasted = true;
          return;
        }
      } catch (err) {
        console.warn('[PetRoom] Standard clipboard error:', err);
      }
    }

    // 3. Fallback: If clipboard read is restricted by browser security policies, focus input
    if (!pasted) {
      const inputEl = document.querySelector<HTMLInputElement>('input[name="quick-url"]');
      inputEl?.focus();
      if (!quickUrl.trim()) {
        setQuickError('Izin clipboard browser dibatasi. Tahan kolom input & pilih Tempel (Paste).');
      }
    }
  };

  const handleQuickAddLink = async (e: FormEvent) => {
    e.preventDefault();
    if (isSavingLink) return;
    const trimmed = quickUrl.trim();
    if (!trimmed) return;

    // Direct AI JSON import from ChatGPT / Sol Codex!
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.title) {
          const now = Date.now();
          const targetUrl = parsed.url || `https://vault.petalife.local/imported-${now}`;
          const { platform, domain } = detectPlatform(targetUrl);
          const newLink: SavedLink = {
            id: `link-${now}`,
            url: targetUrl,
            title: parsed.title,
            platform,
            domain,
            tags: Array.isArray(parsed.tags) ? parsed.tags : ['#ai', '#imported'],
            status: 'to_review',
            dateAdded: 'Baru saja',
            createdAt: now,
            updatedAt: now,
            category: parsed.category,
            coreThesis: parsed.coreThesis,
            keyTakeaways: parsed.keyTakeaways,
            actionableInsights: parsed.actionableInsights,
            reflectionPrompt: parsed.reflectionPrompt,
            notes: parsed.notes || parsed.coreThesis || 'Catatan Ekstraksi',
            summary: parsed.coreThesis || parsed.title,
          };

          if (!onAddLink) {
            setQuickError('Penyimpanan belum siap. Coba lagi sebentar.');
            return;
          }

          setIsSavingLink(true);
          try {
            const rewardRes = await onAddLink(newLink);
            const isAwarded = rewardRes ? rewardRes.awarded : false;
            setQuickUrl('');
            setHoldingNoteLink(newLink);
            setForcedAction({ id: Date.now(), action: 'holding-note' });
            triggerSpeech('Catatan materi berhasil disimpan! Cek catatan Mochi yuk.', 6000);
            if (isAwarded) {
              setQuickSuccess(`🎉 Ringkasan berhasil disimpan! (+10 XP)`);
            } else {
              setQuickSuccess(`🎉 Ringkasan berhasil disimpan ke Pustaka!`);
            }
            feedTimersRef.current.push(setTimeout(() => setQuickSuccess(null), 3500));
            return;
          } finally {
            setIsSavingLink(false);
          }
        }
      } catch {
        // Fall through to standard URL validation
      }
    }

    const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
    const targetUrl = urlMatch ? urlMatch[0] : trimmed;
    const userContext = urlMatch ? trimmed.replace(targetUrl, '').trim() : '';
    if (!isValidUrl(targetUrl)) {
      setQuickError('Masukkan format tautan yang valid (contoh: https://youtube.com/...)');
      return;
    }

    const normalized = normalizeUrl(targetUrl);
    const isDuplicate = savedLinks.some(l => normalizeUrl(l.url) === normalized);
    if (isDuplicate) {
      setQuickError('Tautan ini sudah tersimpan di Pustaka Anda!');
      return;
    }

    setQuickError(null);
    const { platform, domain } = detectPlatform(targetUrl);
    const now = Date.now();

    if (!onAddLink) {
      setQuickError('Penyimpanan belum siap. Coba lagi sebentar.');
      return;
    }

    setHoldingNoteLink(null);
    setIsSavingLink(true);
    const startedAt = Date.now();
    if (platform === 'youtube') {
      startYouTubeStages();
    } else if (platform === 'instagram' || platform === 'tiktok') {
      forceMochiAction('studying');
      triggerSpeech('Mochi sedang mengunduh dan menyimak audio Reel...', 6000);
      youtubeStageTimersRef.current.push(
        setTimeout(() => triggerSpeech('Menganalisis intisari ucapan...', 8000), 6000),
        setTimeout(() => triggerSpeech('Menyusun draf catatan empat lapis...', 10000), 14000)
      );
    } else {
      forceMochiAction('studying');
      triggerSpeech('Aku cek teks yang bisa kubaca...', 3500);
    }

    try {
      // 2. Multi-tier AI Synthesis (Gemini/Groq via Asisten Heru with Sol ADR-001 contract)
      const res = await synthesizeLink(targetUrl, platform, domain, {
        context: userContext,
        onProgress: (_stage, stageLabel) => {
          forceMochiAction('studying');
          triggerSpeech(stageLabel, 6000);
        }
      });
      const { content: smart, qualityStatus, evidenceLevel, captureMethod, sourceExcerpt, isFromRemoteAI } = res;
      if (platform === 'youtube' && qualityStatus === 'grounded') {
        const remaining = 5600 - (Date.now() - startedAt);
        if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
      }

      const newLink: SavedLink = {
        id: `link-${now}`,
        url: targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`,
        title: smart.title,
        thumbnailUrl: smart.thumbnailUrl,
        platform,
        domain,
        tags: smart.tags,
        status: 'to_review',
        dateAdded: 'Baru saja',
        createdAt: now,
        updatedAt: now,
        notes: smart.notes,
        summary: smart.summary,
        category: smart.category,
        coreThesis: smart.coreThesis,
        keyTakeaways: smart.keyTakeaways,
        actionableInsights: smart.actionableInsights,
        reflectionPrompt: smart.reflectionPrompt,
        author: smart.author,
        captureMethod,
        evidenceLevel,
        qualityStatus,
        provenance: res.provenance,
        sourceExcerpt,
        synthesizedAt: res.synthesizedAt,
        gatewayErrorType: res.gatewayErrorType,
        gatewayErrorMessage: res.gatewayErrorMessage,
        gatewayErrorAction: res.gatewayErrorAction,
        gatewayHttpStatus: res.gatewayHttpStatus,
      };

      // Sol ADR-003: Review Draft Before Save Invariant
      // Do NOT call onAddLink immediately. Open MochiNoteSheet draft directly.
      clearYouTubeStages();
      setHoldingNoteLink(newLink);
      setIsNoteSheetOpen(true);
      forceMochiAction('holding-note');
      setQuickUrl('');

      if (platform === 'youtube' && qualityStatus === 'grounded') {
        setYouTubeStage('ready');
      } else {
        setYouTubeStage(null);
      }

      let finishSpeech = 'Draf catatan siap! Tinjau dan simpan ke Pustaka.';
      if (qualityStatus === 'gateway_error') {
        finishSpeech = res.gatewayErrorType === 'unauthorized'
          ? 'Gateway AI butuh sesi Telegram. Tinjau bookmark draf 🔒'
          : 'Gateway AI sedang offline. Tinjau bookmark draf ☁️';
      } else if (qualityStatus === 'needs_context') {
        finishSpeech = 'Mochi butuh konteks post. Mau lengkapi catatan draf?';
      } else if (qualityStatus === 'bookmark_only') {
        finishSpeech = 'Draf tersimpan sebagai bookmark. Mau tinjau sekarang?';
      } else if (isFromRemoteAI) {
        finishSpeech = 'Catatan berhasil dirangkum AI! Tinjau dan simpan ke Pustaka.';
      }
      triggerSpeech(finishSpeech, 4500);

      if (platform === 'youtube' && qualityStatus === 'grounded') {
        youtubeStageTimersRef.current.push(setTimeout(() => setYouTubeStage(null), 4000));
      }
    } catch {
      setQuickError('Gagal menyiapkan catatan. Periksa tautan lalu coba lagi.');
      clearYouTubeStages();
      setYouTubeStage(null);
      forceMochiAction('idle');
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleSaveAndFeed = async (updatedLink: SavedLink) => {
    if (!onAddLink) return;
    try {
      const canonicalTarget = normalizeUrl(updatedLink.url);
      const existingMatch = savedLinks.find(l => l.id === updatedLink.id || normalizeUrl(l.url) === canonicalTarget);

      if (existingMatch && onUpdateLink) {
        // P1: Match existing bookmark by canonical URL or ID, update without 2nd XP!
        await onUpdateLink(existingMatch.id, {
          ...updatedLink,
          id: existingMatch.id,
          updatedAt: Date.now()
        });
        setQuickSuccess('🎉 Catatan berhasil diperbarui di Pustaka!');
      } else {
        const rewardRes = await onAddLink(updatedLink);
        const isAwarded = rewardRes ? rewardRes.awarded : false;
        if (isAwarded) {
          setQuickSuccess(`🎉 Berhasil disimpan ke Pustaka! (+${rewardRes?.xpAwarded || 0} XP)`);
        } else if (rewardRes?.reason === 'storage_error') {
          setQuickSuccess('🎉 Berhasil disimpan ke Pustaka! (Penyimpanan reward offline)');
        } else if (rewardRes?.reason === 'already_claimed') {
          setQuickSuccess('🎉 Berhasil disimpan ke Pustaka! (Tautan ini sudah diklaim hari ini)');
        } else {
          setQuickSuccess('🎉 Berhasil disimpan ke Pustaka! (Kuota reward harian tercapai)');
        }
        handleFeedClick();
      }

      setHoldingNoteLink(null);
      setIsNoteSheetOpen(false);
      setForcedAction({ id: Date.now(), action: 'hop' });
      triggerSpeech(existingMatch ? 'Catatan Pustaka kamu sudah rapi! ✨' : 'Nyam! Mochi kenyang dan makin pintar belajar!', 4500);
    } catch (err) {
      setQuickError('Gagal menyimpan catatan ke Pustaka. Coba lagi.');
      throw err;
    }
  };

  // Life stage name based on level
  const getStageName = (lvl: number) => {
    if (lvl <= 1) return 'Bayi';
    if (lvl <= 3) return 'Anak';
    if (lvl <= 5) return 'Remaja';
    return 'Dewasa';
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* 1. Header: Greeting & Streak Pill */}
      <div className="flex min-h-11 items-center justify-between gap-2 px-2 select-none">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#4E4E5E] font-medium leading-none truncate">
            {greeting},
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-[#2E2E3A] tracking-tight mt-0.5 whitespace-nowrap truncate">
            Rumah Mochi
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Minimalist EXP Pill: ✨ Lv.{pet.level} · {pet.exp}/{pet.expToNextLevel} */}
          <button
            type="button"
            onClick={() => triggerSpeech(`Mochi Level ${pet.level}! Butuh ${pet.expToNextLevel - pet.exp} XP lagi untuk naik level berikutnya.`, 3500)}
            className={cn(
              'flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736] active:scale-95 transition-colors duration-700 border',
              activeNight
                ? 'bg-[#FAF6EE] border-[#DDD2C2] text-[#483696] hover:bg-[#F2ECE0]'
                : 'bg-[#FAF7F2] border-[#EAE3D5] text-[#483696] hover:bg-[#F2ECE0]'
            )}
            title={`Level ${pet.level} • ${pet.exp} / ${pet.expToNextLevel} XP`}
            aria-label={`Level ${pet.level}, ${pet.exp} dari ${pet.expToNextLevel} XP`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#9E410E]" />
            <span className="font-extrabold text-[#2E2E3A]">Lv.{pet.level}</span>
            <span className="text-[#9E410E] font-extrabold">· {pet.exp}/{pet.expToNextLevel}</span>
          </button>

          {/* Subtle streak pill */}
          <button
            type="button"
            onClick={() => triggerSpeech(`Semangat belajar! Streak ${pet.streakDays} hari berturut-turut.`, 3500)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold text-[#9E410E] shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9E410E] active:scale-95 transition-colors duration-700 border',
              activeNight
                ? 'bg-[#FAF6EE] border-[#DDD2C2] hover:bg-[#F2ECE0]'
                : 'bg-[#FAF7F2] border-[#EAE3D5] hover:bg-[#F2ECE0]'
            )}
            title={`Streak: ${pet.streakDays} hari`}
            aria-label={`Streak: ${pet.streakDays} hari`}
          >
            <span>🔥</span>
            <span>{pet.streakDays}d</span>
          </button>
        </div>
      </div>

      {/* 2. Terrarium / Living Diorama Card (CRISP, NO FOG GRADIENT, BORDERED) */}
      <div
        className={cn(
          'relative w-full aspect-[9/13] max-h-[560px] rounded-[32px] overflow-hidden select-none transition-[border-color,background-color] duration-700 ease-out border-2',
          isTerrariumShaking && 'anim-terrarium-shake',
          activeNight
            ? 'border-[#DDD2C2] bg-[#E5D8C3] shadow-[0_16px_48px_rgba(100,80,60,0.12)]'
            : 'border-[#E8DFCF] bg-[#EEE1CD] shadow-md'
        )}
      >
        {/* Background 3D Room Diorama - 100% Crisp, Pure & Warm */}
        {/* R3-PERF-01: WebP 37 KB menggantikan JPEG 193 KB di jalur kritis;
            JPEG tetap menjadi fallback untuk WebView lama. */}
        <picture className="absolute inset-0">
          <source srcSet={roomBgWebp} type="image/webp" />
          <img
            src={roomBg}
            alt="Rumah Mochi 3D Living Room"
            width={768}
            height={1376}
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className="w-full h-full object-cover object-center pointer-events-none"
          />
        </picture>

        {/* Interactive Dynamic Daytime TV & Night Power-off Screen */}
        <TvScreen
          isNightMode={activeNight}
          onTvInteraction={(speechText) => triggerSpeech(speechText, 3600)}
        />

        {/* Live Wall Clock & Flip Calendar Overlay */}
        <svg
          viewBox="0 0 768 1376"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        >
          <LiveWallClock
            onClockClick={(speechText) => triggerSpeech(speechText, 4000)}
          />
          <LiveCalendar
            onCalendarClick={(speechText) => triggerSpeech(speechText, 4000)}
          />
        </svg>

        {/* Floating Action Button (FAB) Speed Dial on Right Edge of Diorama (WCAG 2.2 AA compliant >= 44x44px hit bounds) */}
        <div ref={fabContainerRef} className="absolute top-3.5 right-3 z-30 flex flex-col items-center gap-2 select-none">
          {/* Main FAB Trigger Button */}
          <button
            ref={fabTriggerRef}
            type="button"
            onClick={handleToggleFab}
            className={cn(
              'w-11 h-11 rounded-full shadow-md flex items-center justify-center cursor-pointer transition-all duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-90',
              isFabOpen && !isFabClosing
                ? 'bg-[#2E2E3A] text-white shadow-lg focus-visible:outline-[#2E2E3A]'
                : 'bg-white/95 backdrop-blur-md text-[#BA5218] border border-[#EAE3D5] hover:bg-white hover:border-[#BA5218]/40 hover:shadow-lg focus-visible:outline-[#BA5218]'
            )}
            aria-expanded={isFabOpen}
            aria-haspopup="true"
            title={isFabOpen ? 'Tutup menu aksi Mochi' : 'Buka menu aksi Mochi'}
            aria-label={isFabOpen ? 'Tutup menu aksi Mochi' : 'Buka menu aksi Mochi'}
          >
            <div className={cn('transition-all duration-300 ease-out transform', isFabOpen && !isFabClosing ? 'rotate-90 scale-100' : 'rotate-0 scale-100')}>
              {isFabOpen && !isFabClosing ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <PawPrint className="w-5 h-5 text-[#BA5218]" />
              )}
            </div>
          </button>

          {/* Speed Dial Action Icons (Smooth Cascading Bloom & Collapse Animation) */}
          {isFabOpen && (
            <div className="flex flex-col items-center gap-2 pt-0.5">
              {/* 1. Night / Day Sleep Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  handleToggleNight();
                  closeFab();
                }}
                className={cn(
                  isFabClosing ? 'anim-fab-exit-1' : 'anim-fab-item-1',
                  'w-11 h-11 rounded-full bg-white/95 backdrop-blur-md border border-[#EAE3D5] shadow-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#483696]'
                )}
                title={activeNight ? 'Bangunkan Mochi (Pagi Hari)' : 'Tidurkan Mochi / Istirahat Malam'}
                aria-label={activeNight ? 'Bangunkan Mochi' : 'Tidurkan Mochi'}
              >
                {activeNight ? <Moon className="w-5 h-5 text-[#483696]" /> : <Sun className="w-5 h-5 text-[#9E410E]" />}
              </button>

              {/* 2. Dance Action */}
              <button
                type="button"
                onClick={() => {
                  handleDanceClick();
                  closeFab();
                }}
                className={cn(
                  isFabClosing ? 'anim-fab-exit-2' : 'anim-fab-item-2',
                  'w-11 h-11 rounded-full bg-white/95 backdrop-blur-md border border-[#EAE3D5] shadow-xs flex items-center justify-center text-[#9E410E] hover:text-[#BA5218] active:scale-95 transition-all cursor-pointer hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9E410E]'
                )}
                title="Ajak Mochi Menari 🎵"
                aria-label="Ajak Mochi menari"
              >
                <Music className="w-5 h-5" />
              </button>

              {/* 3. Wardrobe Modal Sheet Trigger */}
              <button
                ref={wardrobeTriggerRef}
                type="button"
                onClick={() => {
                  closeFab();
                  setIsWardrobeOpen(true);
                }}
                className={cn(
                  isFabClosing ? 'anim-fab-exit-3' : 'anim-fab-item-3',
                  'w-11 h-11 rounded-full bg-white/95 backdrop-blur-md border border-[#EAE3D5] shadow-xs flex items-center justify-center text-[#4A4A5A] hover:text-[#2E2E3A] active:scale-95 transition-all cursor-pointer hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A4A5A]'
                )}
                title="Buka Lemari Kostum Mochi"
                aria-label="Buka lemari kostum Mochi"
              >
                <Shirt className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Toast Notification inside Room */}
        {lastFedText && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#57B37C] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md animate-bounce">
            {lastFedText}
          </div>
        )}

        {/* Speech Bubble directly above Mochi (WCAG: hidden from accessibility tree when invisible, semantic button for Pustaka) */}
        <div
          aria-hidden={!showSpeech}
          role="status"
          aria-live="polite"
          className={cn(
            'absolute bottom-[52%] sm:bottom-[53%] left-[49%] -translate-x-1/2 z-30 transition-[opacity,transform] duration-300 ease-out transform',
            showSpeech
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-90 translate-y-2 pointer-events-none'
          )}
        >
          <div
            className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-[#EAE3D5] text-xs font-bold text-[#3A3340] max-w-[220px] sm:max-w-[280px] text-center leading-snug break-words whitespace-normal relative select-none"
          >
            <span>{isFeeding ? 'Nyam nyam! Enak!' : speech}</span>
            {speech.includes('Pustaka') && showSpeech && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('vault');
                }}
                className="flex items-center justify-center gap-1 text-[10px] font-black text-[#BA5218] mt-1.5 mx-auto bg-[#FFEFE8] hover:bg-[#FED7C5] px-2.5 py-1 rounded-full border border-[#FED7C5]/60 shadow-2xs active:scale-95 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-[#BA5218]"
                aria-label="Buka Pustaka sekarang"
              >
                <span>Buka Pustaka yuk</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-[#EAE3D5]" aria-hidden="true" />
          </div>
        </div>

        {/* The Center Mat & Proportional 3D Mochi (Reflects Sleep State when Night Mode Active) */}
        <div className="absolute top-[48%] sm:top-[49%] left-[49%] -translate-x-1/2 z-20 flex flex-col items-center">
          <MochiPet
            pet={effectivePet}
            onPetClick={handlePetTap}
            forcedAction={forcedAction}
            holdingNote={Boolean(holdingNoteLink)}
            onNotePaperClick={() => setIsNoteSheetOpen(true)}
            showBubble={false}
          />
        </div>

        {/* Floating Snack Bubble pointing directly down to Hunger Meter (Hidden during bedtime or when Mochi is full) */}
        {!activeNight && !isFull && (
          <div className="absolute bottom-[66px] left-3 sm:left-4 z-25 animate-fade-in">
            <SnackBubble
              snack={currentSnack}
              onFeed={handleFeedClick}
              onCycleNext={handleCycleNextSnack}
              isFull={isFull}
              isFeeding={isFeeding}
            />
          </div>
        )}

        {/* 3. Status Dock Bar (Inside the Terrarium Border, Clean White Frosted Glass, Spacious Status & Pet Identity) */}
        <div className="absolute bottom-3 left-2.5 right-2.5 sm:left-3 sm:right-3 z-30 bg-white/92 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs px-3 py-2 flex items-center justify-between select-none text-[#2E2E3A]">
          {/* Left: Circular Progress Rings & Life Stage Badge */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CircularMeter
              value={displayStats.hunger}
              color="#D97736"
              iconType="hunger"
              label="Lapar / Makanan"
            />
            <CircularMeter
              value={displayStats.mood}
              color="#E57399"
              iconType="mood"
              label="Senang / Afeksi"
            />
            <CircularMeter
              value={displayStats.energy}
              color="#57B37C"
              iconType="energy"
              label="Energi / Segar"
            />
            <span className="text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border text-[#3E3E4E] bg-[#EFE9DF] border-[#DCD2C2]">
              {getStageName(pet.level)}
            </span>
          </div>

          {/* Right: Pet Name & Info */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black text-xs sm:text-sm text-[#2E2E3A] cursor-pointer hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736] transition-colors"
            onClick={() => handlePetTap()}
            title="Ketuk untuk berinteraksi dengan Mochi"
            aria-label={`Status ${pet.name}, ketuk untuk interaksi`}
          >
            <span>{pet.name}</span>
            <Info className="w-3.5 h-3.5 text-[#4E4E5E]" />
          </button>
        </div>
      </div>

      {/* 4. Quick Link Capture */}
      <div className="pt-2 sm:pt-2.5">
        {quickSuccess && (
          <div role="status" className="mb-2.5 p-2 rounded-xl bg-[#EAF6EE] border border-[#CCEBD6] text-xs font-bold text-[#1E6B3B] flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#1E6B3B] shrink-0" />
            <span>{quickSuccess}</span>
          </div>
        )}
        {quickError && (
          <div id="quick-link-error" role="alert" className="mb-2.5 p-2 rounded-xl bg-[#FDF0F4] border border-[#FED7C5] text-xs font-semibold text-[#A82B53]">
            ⚠️ {quickError}
          </div>
        )}


        <form onSubmit={handleQuickAddLink} className="relative flex items-center">
          {/* Subtle Decorative Link Icon on Left */}
          <Link2 className="absolute left-3.5 sm:left-4 w-5 h-5 text-[#9E9484] pointer-events-none" />

          <input
            type="text"
            name="quick-url"
            inputMode="url"
            autoComplete="url"
            aria-label="Tautan untuk disimpan ke Pustaka"
            aria-invalid={Boolean(quickError)}
            aria-describedby={quickError ? 'quick-link-error' : undefined}
            value={quickUrl}
            onChange={e => {
              setQuickUrl(e.target.value);
              if (quickError) setQuickError(null);
            }}
            placeholder="Tempel tautan materi (YouTube, artikel)..."
            className={cn(
              'w-full text-sm sm:text-base pl-11 pr-12 sm:pr-14 py-3.5 sm:py-4 rounded-full text-[#2E2E3A] placeholder-[#7E786D] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FED7C5] transition-all duration-500 border',
              activeNight
                ? 'bg-[#FAF6EE] border-[#DDD2C2] focus:bg-[#FAF6EE]'
                : 'bg-[#FAF7F2] border-[#EAE3D5] focus:bg-[#FFFDF9]'
            )}
          />

          {/* Dynamic Action Button: Paste when empty, Send when has text */}
          {quickUrl.trim().length > 0 ? (
            <button
              type="submit"
              disabled={isSavingLink}
              className="absolute right-1.5 sm:right-2 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-[#D97736] hover:bg-[#BA5218] text-white shadow-xs cursor-pointer active:scale-95 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736]"
              title="Kirim dan simpan ke Pustaka"
              aria-label={isSavingLink ? 'Menyimpan tautan...' : 'Kirim dan simpan tautan ke Pustaka'}
            >
              {isSavingLink ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePasteToInput}
              className="absolute right-1.5 sm:right-2 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-[#7A6E60] hover:text-[#BA5218] hover:bg-black/5 cursor-pointer active:scale-90 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]"
              title="Tempel link dari Clipboard"
              aria-label="Tempel tautan dari clipboard"
            >
              <Clipboard className="w-5 h-5" />
            </button>
          )}
        </form>
        {youtubeStage && (
          <div role="status" aria-live="polite" className="mt-2 rounded-xl border border-[#E8DFCF] bg-[#FFF9EF] px-3 py-2 text-xs font-semibold text-[#4A3C31]">
            {youtubeStage === 'capturing' && '1/4 · Mochi menangkap tautan video 🎬'}
            {youtubeStage === 'transcribing' && '2/4 · Mochi mencari subtitle video 🎧✍️'}
            {youtubeStage === 'thinking' && '3/4 · Mochi menyaring gagasan dan model mental 🧠✨'}
            {youtubeStage === 'ready' && '4/4 · Catatan emas siap dibuka 📄🌟'}
          </div>
        )}
      </div>

      {/* Modal Sheet: Lemari Kostum Mochi */}
      {isWardrobeOpen && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wardrobe-sheet-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 anim-modal-backdrop pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWardrobeOpen(false);
          }}
        >
          <div
            ref={wardrobeModalRef}
            className="w-full max-w-md bg-[#FAF7F2] rounded-[32px] shadow-[0_24px_50px_rgba(0,0,0,0.35),0_4px_16px_rgba(0,0,0,0.1)] border border-[#EAE3D5] p-5 relative space-y-4 anim-modal-sheet"
          >
            {/* Top Pull Handle Indicator */}
            <div className="pt-0.5 pb-2 flex justify-center sm:hidden">
              <div className="w-10 h-1 bg-[#DDD2C2] rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE3D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFF0F5] flex items-center justify-center text-[#E57399]">
                  <Shirt className="w-4 h-4" />
                </div>
                <div>
                  <h2 id="wardrobe-sheet-title" className="text-base font-black text-[#2E2E3A]">
                    Lemari Kostum Mochi 🌸
                  </h2>
                  <p className="text-xs text-[#4E4E5E]">
                    Aksesoris Mochi menyesuaikan aktivitas belajarmu
                  </p>
                </div>
              </div>
              <button
                ref={wardrobeCloseBtnRef}
                type="button"
                onClick={() => setIsWardrobeOpen(false)}
                className="w-11 h-11 rounded-full bg-[#EFE9DF] hover:bg-[#E5DDD0] text-[#4A4A5A] hover:text-[#2E2E3A] flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#E57399]"
                aria-label="Tutup lemari kostum"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Gear */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4E4E5E]">
                Aksesoris Aktif Saat Ini
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-white border border-[#EAE3D5] flex items-center gap-2.5 shadow-xs">
                  <span className="text-2xl">👓</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2E2E3A]">Kacamata Baca</p>
                    <p className="text-[10px] text-[#4E4E5E] leading-tight">Dipakai saat belajar</p>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-white border border-[#EAE3D5] flex items-center gap-2.5 shadow-xs">
                  <span className="text-2xl">🌙</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#2E2E3A]">Topi Tidur</p>
                    <p className="text-[10px] text-[#4E4E5E] leading-tight">Dipakai saat malam</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Unlockable Costumes */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#4E4E5E]">
                Koleksi Mendatang (Segera Hadir)
              </h3>
              <div className="space-y-1.5">
                <div className="p-2.5 rounded-xl bg-[#FAF0E6]/60 border border-dashed border-[#DCD2C2] flex items-center justify-between text-xs text-[#4A4A5A]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌸</span>
                    <span className="font-semibold text-[#2E2E3A]">Pita Sakura</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFE9DF] text-[#3E3E4E]">Buka di Level 5</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF0E6]/60 border border-dashed border-[#DCD2C2] flex items-center justify-between text-xs text-[#4A4A5A]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨‍🍳</span>
                    <span className="font-semibold text-[#2E2E3A]">Topi Koki Mochi</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFE9DF] text-[#3E3E4E]">Buka di Level 10</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF0E6]/60 border border-dashed border-[#DCD2C2] flex items-center justify-between text-xs text-[#4A4A5A]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎒</span>
                    <span className="font-semibold text-[#2E2E3A]">Ransel Petualang</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#EFE9DF] text-[#3E3E4E]">Streak 7 Hari</span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsWardrobeOpen(false)}
              className="w-full h-11 rounded-2xl bg-[#EFE9DF] hover:bg-[#E5DDD0] text-[#2E2E3A] font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup Lemari
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 8. Mochi Note Sheet Modal matching reference design */}
      <MochiNoteSheet
        isOpen={isNoteSheetOpen}
        onClose={() => {
          setIsNoteSheetOpen(false);
          setHoldingNoteLink(null);
          setForcedAction({ id: Date.now(), action: 'idle' });
          triggerSpeech('Draf ditutup tanpa disimpan ke Pustaka.', 3000);
        }}
        link={holdingNoteLink}
        onSaveAndFeed={handleSaveAndFeed}
        petName={pet.name || 'Mochi'}
      />
    </div>
  );
};
