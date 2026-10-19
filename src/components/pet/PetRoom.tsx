import type { FC, FormEvent } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Pet, NavigationTab, SavedLink } from '../../lib/types';
import { MochiPet, type MochiAction } from './MochiPet';
import {
  Sparkles,
  CheckCircle2,
  Moon,
  Sun,
  Plus,
  Clipboard,
  Shirt,
  Info,
  Music,
  BookmarkPlus,
  X,
  ArrowRight,
  PawPrint,
  Vibrate,
} from 'lucide-react';
import { canFeedPet, getPetContextualStatus, getDisplayStats } from '../../features/pet/engine/petEngine';
import { normalizeUrl, isValidUrl } from '../../lib/utils/urlUtils';
import { detectPlatform, cn, getUserDisplayName } from '../../lib/utils';
import roomBg from '../../assets/room-bg.jpg';
import { SnackBubble, CircularMeter } from './SnackBubble';
import { SNACK_VARIANTS } from './snackData';
import { TvScreen } from './TvScreen';
import { LiveCalendar } from './LiveCalendar';
import { LiveWallClock } from './LiveWallClock';
import type { LinkRewardResult } from '../../lib/db/rewardLedgerRepository';

export interface PetRoomProps {
  pet: Pet;
  onFeed: () => void;
  onNavigate: (tab: NavigationTab) => void;
  savedLinks?: SavedLink[];
  onAddLink?: (newLink: SavedLink) => Promise<LinkRewardResult | void>;
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

  // Speech Bubble State: Hidden by default; only appears on direct interaction or occasional whisper
  const [speech, setSpeech] = useState<string>('Kenyang dan senang ✨');
  const [showSpeech, setShowSpeech] = useState<boolean>(false);
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lastFedText, setLastFedText] = useState<string | null>(null);
  const [localNight, setLocalNight] = useState<boolean>(false);
  const [forcedAction, setForcedAction] = useState<{ id: number; action: MochiAction } | undefined>(undefined);
  const activeNight = isNightMode !== undefined ? isNightMode : localNight;

  // When night mode is active, Mochi enters a calm, resting sleep state
  const effectivePet: Pet = activeNight && !isFeeding
    ? { ...pet, state: 'sleeping' }
    : pet;

  const handleToggleNight = () => {
    const willBeNight = !activeNight;
    if (onToggleNightMode) {
      onToggleNightMode();
    } else {
      setLocalNight(prev => !prev);
    }

    if (willBeNight) {
      triggerSpeech(`Hoaaam... Selamat tidur & mimpi indah, ${getUserDisplayName()}! 🌙💤`, 4000);
    } else {
      triggerSpeech('Selamat pagi! Semangat belajar lagi bareng Mochi! ☀️✨', 4000);
    }
  };

  // Quick Link Capture State & Modal Sheet State
  const [quickUrl, setQuickUrl] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [isLinkSheetOpen, setIsLinkSheetOpen] = useState(false);
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
    }, 320);
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
    };
  }, []);

  // Accessible Modal & FAB Focus Trap & Restoration Refs
  const linkInputRef = useRef<HTMLInputElement>(null);
  const linkModalRef = useRef<HTMLDivElement>(null);
  const linkSheetTriggerRef = useRef<HTMLButtonElement>(null);

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

  // Focus trap, Escape key, and focus restoration for Quick Link Capture Modal
  useEffect(() => {
    if (!isLinkSheetOpen) return;

    const focusTimer = setTimeout(() => {
      linkInputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsLinkSheetOpen(false);
        return;
      }

      if (e.key === 'Tab') {
        const modal = linkModalRef.current;
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
  }, [isLinkSheetOpen]);

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

  // Occasional gentle whisper: Mochi speaks briefly every 45-60 seconds, then hides again
  useEffect(() => {
    const whisperInterval = setInterval(() => {
      if (!isFeeding) {
        if (activeNight) {
          triggerSpeech('Zzz... mimpi manis... 🌙💤', 2800);
        } else {
          const whispers = [
            'Kenyang dan senang ✨',
            'Rumah Mochi hangat dan nyaman 🌸',
            'Ada materi seru yang mau dipelajari? 🎬',
            `Mochi senang bersama ${getUserDisplayName()}! 💖`,
          ];
          const randomWhisper = whispers[Math.floor(Math.random() * whispers.length)];
          triggerSpeech(randomWhisper, 3200);
        }
      }
    }, 45000);

    return () => clearInterval(whisperInterval);
  }, [isFeeding, activeNight]);

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
      triggerSpeech(`Perut Mochi kenyang! Nanti kita coba ${nextSnack.name} ya! ✨`, 3500);
    } else {
      triggerSpeech(`Mochi mau coba ${nextSnack.name}! 😋✨`, 3500);
    }
  };

  const handleFeedClick = () => {
    if (isFull) {
      triggerSpeech('Perut Mochi sudah kenyang dan hatiku senang! ✨', 3500);
      return;
    }
    if (isFeeding) {
      return; // Anti-spam guard
    }

    onFeed();
    triggerSpeech(currentSnack.feedSpeech, 4000);
    setLastFedText(`+25 XP • ${currentSnack.shortName}!`);

    // Transition to another delicious snack variant after feeding!
    setTimeout(() => {
      setSnackIndex(prev => (prev + 1) % SNACK_VARIANTS.length);
    }, 1200);

    setTimeout(() => {
      setLastFedText(null);
    }, 2800);
  };

  const handlePetTap = (action?: MochiAction) => {
    if (activeNight) {
      triggerSpeech('Ssst... Mochi sedang mimpi indah... 🌙💤', 3500);
      return;
    }

    if (action === 'wiggle') {
      const giggles = [
        'Hehehe, geli! 🌸',
        'Kikiki, geli banget! 😆',
        'Geli tapi seru! Jangan berhenti elus ya! 🌸',
      ];
      triggerSpeech(giggles[Math.floor(Math.random() * giggles.length)], 3600);
      return;
    }

    if (action === 'spin') {
      const spins = [
        'Wuuush! Putar-putar seru! 🌀✨',
        'Tadaaa! Mochi bisa salto mini! 🌟',
        `Penuh energi! Ayo belajar lagi bareng ${getUserDisplayName()}! 🌀`,
      ];
      triggerSpeech(spins[Math.floor(Math.random() * spins.length)], 3600);
      return;
    }

    if (action === 'wink') {
      const winks = [
        `Mochi selalu siap menemani ${getUserDisplayName()}! 😉🍵`,
        'Kedip manis buat kamu! Semangat belajarnya! ✨😉',
        `Psst... ${getUserDisplayName()} rajin banget hari ini! 😉🌟`,
      ];
      triggerSpeech(winks[Math.floor(Math.random() * winks.length)], 3600);
      return;
    }

    if (action === 'dance') {
      const danceLines = [
        'La la la~ Mochi suka menari! 🎵💃',
        `${getUserDisplayName()} lihat! Mochi punya gerakan tarian baru! 🎶✨`,
        'Satu dua tiga, bergoyang gembira! 🎵',
        'Musik membuat hati Mochi berbunga-bunga! 🌸🎶',
      ];
      triggerSpeech(danceLines[Math.floor(Math.random() * danceLines.length)], 4000);
      return;
    }

    if (action === 'dizzy') {
      const dizzyQuotes = [
        'Whoaa! Gempa bumi kah? Pusing~ (@ o @) 💫',
        'Aduh aduh... bumi bergoyang! Mataku muter-muter! 🌀',
        'Hehe geli! Jangan kenceng-kenceng guncangnya ya! (*≧ω≦)',
        'Waaah... kepalaku berputar-putar kayak gasing! 💫⭐',
        'Eeeh?! Ada guncangan hebat! Mochi pegangan karpet! 🌪️',
      ];
      triggerSpeech(dizzyQuotes[Math.floor(Math.random() * dizzyQuotes.length)], 3800);
      return;
    }

    if (action === 'studying') {
      const studyLines = [
        'Ssst... Mochi lagi fokus mencatat materi baru! 📝✨',
        'Kacamata Mochi pas banget buat belajar! 👓📖',
        `Satu catatan lagi, biar makin pintar bareng ${getUserDisplayName()}! 💡📓`,
      ];
      triggerSpeech(studyLines[Math.floor(Math.random() * studyLines.length)], 4000);
      return;
    }

    if (isFull) {
      triggerSpeech('Perut Mochi kenyang dan hatiku senang! ✨', 3500);
      return;
    }
    const cuteReplies = [
      'Yaaay! Semangat belajar bareng kamu! ✨',
      `Mochi siap menemani ${getUserDisplayName()}! 🍵`,
      'Ada resep atau video baru yang seru? 🍳',
      `Streak belajarmu ${pet.streakDays} hari berturut-turut! 🔥`,
      contextualStatus.speechText,
    ];
    triggerSpeech(cuteReplies[Math.floor(Math.random() * cuteReplies.length)], 3800);
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
    setTimeout(() => setIsTerrariumShaking(false), 680);

    // 3. Trigger Mochi Dizzy Action
    setForcedAction({ id: now, action: 'dizzy' });

    // 4. Dizzy Speech Lines
    const dizzyQuotes = [
      'Whoaa! Gempa bumi kah? Pusing~ (@ o @) 💫',
      'Aduh aduh... bumi bergoyang! Mataku muter-muter! 🌀',
      'Hehe geli! Jangan kenceng-kenceng guncangnya ya! (*≧ω≦)',
      'Waaah... kepalaku berputar-putar kayak gasing! 💫⭐',
      'Eeeh?! Ada guncangan hebat! Mochi pegangan karpet! 🌪️',
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

  const handleQuickAddLink = async (e: FormEvent) => {
    e.preventDefault();
    if (isSavingLink) return;
    const trimmed = quickUrl.trim();
    if (!trimmed) return;

    if (!isValidUrl(trimmed)) {
      setQuickError('Masukkan format URL yang valid (misal: youtube.com, tiktok.com)');
      return;
    }

    const normalized = normalizeUrl(trimmed);
    const isDuplicate = savedLinks.some(l => normalizeUrl(l.url) === normalized);
    if (isDuplicate) {
      setQuickError('Tautan ini sudah tersimpan di Vault Anda!');
      return;
    }

    setQuickError(null);
    const { platform, domain } = detectPlatform(trimmed);
    const now = Date.now();
    const newLink: SavedLink = {
      id: `link-${now}`,
      url: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
      title: `Saved ${domain} Video Clip #${savedLinks.length + 1}`,
      platform,
      domain,
      tags: [platform === 'youtube' || platform === 'tiktok' || platform === 'instagram' ? 'shorts' : 'article', 'new'],
      status: 'to_review',
      dateAdded: 'Baru saja',
      createdAt: now,
      updatedAt: now,
      notes: 'Disimpan dari Quick Capture Beranda.',
      summary: 'Siap untuk dipelajari dan refleksi pribadi.'
    };

    if (!onAddLink) {
      setQuickError('Penyimpanan belum siap. Coba lagi sebentar.');
      return;
    }

    setIsSavingLink(true);
    try {
      const rewardRes = await onAddLink(newLink);
      const isAwarded = rewardRes ? rewardRes.awarded : false;
      const countToday = rewardRes ? rewardRes.countToday : 0;

      if (isAwarded) {
        setQuickSuccess(`🎉 Berhasil disimpan ke Vault! (+10 XP) [${countToday}/3 hari ini]`);
      } else if (rewardRes?.reason === 'storage_error') {
        setQuickSuccess('🎉 Berhasil disimpan ke Vault! (Penyimpanan reward offline)');
      } else if (rewardRes?.reason === 'already_claimed') {
        setQuickSuccess('🎉 Berhasil disimpan ke Vault! (Tautan ini sudah diklaim hari ini)');
      } else {
        setQuickSuccess('🎉 Berhasil disimpan ke Vault! (Batas 3 reward/hari tercapai)');
      }
      setQuickUrl('');

      // Auto-close sheet after successful save so user sees confirmation
      if (isLinkSheetOpen) {
        setTimeout(() => {
          setIsLinkSheetOpen(false);
          requestAnimationFrame(() => {
            fabTriggerRef.current?.focus();
          });
        }, 1200);
      }

      // Trigger Mochi's dedicated studying & note-taking mode!
      setForcedAction({ id: Date.now(), action: 'studying' });

      let studySpeech = isAwarded
        ? `Materi baru dari ${domain}! Tersimpan rapi di Vault untuk kita pelajari bareng! 📚✨ (+10 XP)`
        : `Materi baru dari ${domain}! Tersimpan rapi di Vault untuk kita pelajari bareng! 📚✨`;

      if (activeNight) {
        studySpeech = isAwarded
          ? 'Hoaamm... Mochi simpan di rak buku ya, walau sudah malam 🌙📚 (+10 XP)'
          : 'Hoaamm... Mochi simpan di rak buku ya 🌙📚';
      } else if (platform === 'youtube') {
        studySpeech = isAwarded
          ? 'Video YouTube baru tersimpan di Vault! Siap kita tonton dan pelajari bareng! 🎬📚 (+10 XP)'
          : 'Video YouTube baru tersimpan di Vault! Siap kita pelajari bareng! 🎬📚';
      } else if (platform === 'tiktok' || platform === 'instagram') {
        studySpeech = isAwarded
          ? 'Tersimpan rapi di Vault untuk kita pelajari bareng! 📱📚 (+10 XP)'
          : 'Tersimpan rapi di Vault untuk referensi belajar kita! 📱✨';
      }
      triggerSpeech(studySpeech, 4500);

      setTimeout(() => setQuickSuccess(null), 3500);
    } catch {
      setQuickError('Tautan gagal disimpan. Periksa penyimpanan lokal lalu coba lagi.');
    } finally {
      setIsSavingLink(false);
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
    <div className="w-full max-w-lg mx-auto space-y-3">
      {/* 1. Header: Greeting & Streak Pill */}
      <div className="flex items-center justify-between px-2 pt-1 pb-1 select-none gap-2">
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
            onClick={() => triggerSpeech(`Mochi Level ${pet.level}! Butuh ${pet.expToNextLevel - pet.exp} XP lagi untuk naik level berikutnya ✨`, 3500)}
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
            onClick={() => triggerSpeech(`Semangat belajar! Streak ${pet.streakDays} hari berturut-turut! 🔥`, 3500)}
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
          'relative w-full aspect-[9/13] max-h-[560px] rounded-[32px] overflow-hidden select-none transition-all duration-700 ease-out border-2',
          isTerrariumShaking && 'anim-terrarium-shake',
          activeNight
            ? 'border-[#DDD2C2] bg-[#E5D8C3] shadow-[0_16px_48px_rgba(100,80,60,0.12)]'
            : 'border-[#E8DFCF] bg-[#EEE1CD] shadow-md'
        )}
      >
        {/* Background 3D Room Diorama - 100% Crisp, Pure & Warm */}
        <img
          src={roomBg}
          alt="Rumah Mochi 3D Living Room"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        />

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
              {/* 1. Quick Capture Sheet Trigger */}
              <button
                ref={linkSheetTriggerRef}
                type="button"
                onClick={() => {
                  closeFab();
                  setIsLinkSheetOpen(true);
                }}
                className={cn(
                  isFabClosing ? 'anim-fab-exit-1' : 'anim-fab-item-1',
                  'w-11 h-11 rounded-full bg-[#BA5218] text-white shadow-md flex items-center justify-center hover:bg-[#A34310] active:scale-95 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218]'
                )}
                title="Simpan Link Cepat ke Vault"
                aria-label="Simpan link belajar ke Vault"
              >
                <BookmarkPlus className="w-5 h-5" />
              </button>

              {/* 2. Night / Day Sleep Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  handleToggleNight();
                  closeFab();
                }}
                className={cn(
                  isFabClosing ? 'anim-fab-exit-2' : 'anim-fab-item-2',
                  'w-11 h-11 rounded-full bg-white/95 backdrop-blur-md border border-[#EAE3D5] shadow-xs flex items-center justify-center active:scale-95 transition-all cursor-pointer hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#483696]'
                )}
                title={activeNight ? 'Bangunkan Mochi (Pagi Hari)' : 'Tidurkan Mochi / Istirahat Malam'}
                aria-label={activeNight ? 'Bangunkan Mochi' : 'Tidurkan Mochi'}
              >
                {activeNight ? <Moon className="w-5 h-5 text-[#483696]" /> : <Sun className="w-5 h-5 text-[#9E410E]" />}
              </button>

              {/* 3. Dance Action */}
              <button
                type="button"
                onClick={() => {
                  handleDanceClick();
                  closeFab();
                }}
                className={cn(
                  isFabClosing ? 'anim-fab-exit-3' : 'anim-fab-item-3',
                  'w-11 h-11 rounded-full bg-white/95 backdrop-blur-md border border-[#EAE3D5] shadow-xs flex items-center justify-center text-[#9E410E] hover:text-[#BA5218] active:scale-95 transition-all cursor-pointer hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9E410E]'
                )}
                title="Ajak Mochi Menari 🎵"
                aria-label="Ajak Mochi menari"
              >
                <Music className="w-5 h-5" />
              </button>

              {/* 4. Wardrobe Modal Sheet Trigger */}
              <button
                ref={wardrobeTriggerRef}
                type="button"
                onClick={() => {
                  closeFab();
                  setIsWardrobeOpen(true);
                }}
                className={cn(
                  isFabClosing ? 'anim-fab-exit-4' : 'anim-fab-item-4',
                  'w-11 h-11 rounded-full bg-white/95 backdrop-blur-md border border-[#EAE3D5] shadow-xs flex items-center justify-center text-[#4A4A5A] hover:text-[#2E2E3A] active:scale-95 transition-all cursor-pointer hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A4A5A]'
                )}
                title="Buka Lemari Kostum Mochi"
                aria-label="Buka lemari kostum Mochi"
              >
                <Shirt className="w-5 h-5" />
              </button>

              {/* 5. Shake Mochi / Device Shake Simulator */}
              <button
                type="button"
                onClick={() => {
                  closeFab();
                  triggerShake();
                }}
                className={cn(
                  isFabClosing ? 'anim-fab-exit-5' : 'anim-fab-item-5',
                  'w-11 h-11 rounded-full bg-white/95 backdrop-blur-md border border-[#EAE3D5] shadow-xs flex items-center justify-center text-[#E57399] hover:text-[#D81B60] active:scale-95 transition-all cursor-pointer hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E57399]'
                )}
                title="Guncang HP / Mochi! 📳 (Tekan S di keyboard)"
                aria-label="Guncang HP atau Mochi"
              >
                <Vibrate className="w-5 h-5" />
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

        {/* Speech Bubble directly above Mochi (Only appears on direct interaction, wraps to 2 lines when long) */}
        <div
          className={`absolute bottom-[52%] sm:bottom-[53%] left-[49%] -translate-x-1/2 z-30 pointer-events-none transition-all duration-300 ease-out transform ${
            showSpeech
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-2 pointer-events-none'
          }`}
        >
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-[#EAE3D5] text-xs font-bold text-[#3A3340] max-w-[220px] sm:max-w-[280px] text-center leading-snug break-words whitespace-normal relative">
            <span>{isFeeding ? '✨ Nyam nyam! Enak!' : speech}</span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-[#EAE3D5]" />
          </div>
        </div>

        {/* The Center Mat & Proportional 3D Mochi (Reflects Sleep State when Night Mode Active) */}
        <div className="absolute top-[48%] sm:top-[49%] left-[49%] -translate-x-1/2 z-20 flex flex-col items-center">
          <MochiPet
            pet={effectivePet}
            onPetClick={handlePetTap}
            forcedAction={forcedAction}
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

      {/* 4. Quick Link Capture Pill: "+ Tempel link di sini... 📋" (44x44px touch targets) */}
      <div className="pt-0.5">
        {quickSuccess && (
          <div role="status" className="mb-2 p-2 rounded-xl bg-[#EAF6EE] border border-[#CCEBD6] text-xs font-bold text-[#1E6B3B] flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#1E6B3B] shrink-0" />
            <span>{quickSuccess}</span>
          </div>
        )}
        {quickError && (
          <div id="quick-link-error" role="alert" className="mb-2 p-2 rounded-xl bg-[#FDF0F4] border border-[#FED7C5] text-xs font-semibold text-[#A82B53]">
            ⚠️ {quickError}
          </div>
        )}

        <form onSubmit={handleQuickAddLink} className="relative flex items-center">
          <button
            type="submit"
            disabled={isSavingLink}
            className="absolute left-1 w-11 h-11 flex items-center justify-center rounded-full text-[#4A4A5A] hover:text-[#BA5218] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#BA5218] active:scale-95"
            title="Simpan Tautan"
            aria-label={isSavingLink ? 'Menyimpan tautan' : 'Simpan tautan ke Vault'}
          >
            <Plus className="w-5 h-5" />
          </button>
          <input
            type="text"
            name="quick-url"
            inputMode="url"
            autoComplete="url"
            aria-label="Tautan untuk disimpan ke Vault"
            aria-invalid={Boolean(quickError)}
            aria-describedby={quickError ? 'quick-link-error' : undefined}
            value={quickUrl}
            onChange={e => {
              setQuickUrl(e.target.value);
              if (quickError) setQuickError(null);
            }}
            placeholder="Tempel link di sini..."
            className={cn(
              'w-full text-sm sm:text-base pl-12 pr-12 py-3 rounded-full text-[#2E2E3A] placeholder-[#5A5A6E] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FED7C5] transition-all duration-700 border',
              activeNight
                ? 'bg-[#FAF6EE] border-[#DDD2C2] focus:bg-[#FAF6EE]'
                : 'bg-[#FAF7F2] border-[#EAE3D5] focus:bg-[#FFFDF9]'
            )}
          />
          <button
            type="button"
            disabled={isSavingLink}
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text) {
                  setQuickUrl(text);
                }
              } catch {
                // Clipboard read blocked by permissions
              }
            }}
            className="absolute right-1 w-11 h-11 flex items-center justify-center rounded-full text-[#4A4A5A] hover:text-[#9E410E] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9E410E] active:scale-95"
            title="Tempel dari Clipboard"
            aria-label="Tempel tautan dari clipboard"
          >
            <Clipboard className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* 5. Quiet Contextual Companion Strip (Connects Home to Vault & Solves Tall Screen Void) */}
      <div className="p-3 rounded-2xl bg-[#FFF8F5] border border-[#FED7C5] flex items-center justify-between gap-3 text-xs shadow-xs select-none">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[#2E2E3A] leading-snug">
            {savedLinks.length > 0 ? (
              <>Ada <strong className="font-bold text-[#BA5218]">{savedLinks.length} materi</strong> di Vault. Mau pelajari 1 hari ini?</>
            ) : (
              <>Belum ada materi tersimpan. Simpan video atau link belajar favoritmu!</>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('vault')}
          className="shrink-0 min-h-[44px] px-3.5 rounded-xl bg-[#FFEFE8] hover:bg-[#FED7C5] text-[#9E410E] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9E410E] active:scale-95"
          aria-label="Buka halaman Vault"
        >
          <span>Buka Vault</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal Sheet: Quick Link Capture (Direct access on short screens) */}
      {isLinkSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="link-sheet-title"
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 anim-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsLinkSheetOpen(false);
          }}
        >
          <div ref={linkModalRef} className="bg-[#FAF7F2] border-t sm:border border-[#EAE3D5] rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md shadow-2xl relative space-y-4 anim-modal-sheet">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#EAE3D5]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FFEFE8] flex items-center justify-center text-[#BA5218]">
                  <BookmarkPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 id="link-sheet-title" className="text-base font-black text-[#2E2E3A]">
                    Simpan Materi Belajar
                  </h2>
                  <p className="text-xs text-[#4E4E5E]">
                    Simpan video YouTube, TikTok, atau artikel ke Vault
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkSheetOpen(false)}
                className="w-11 h-11 rounded-full bg-[#EFE9DF] hover:bg-[#E5DDD0] text-[#4A4A5A] hover:text-[#2E2E3A] flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#BA5218]"
                aria-label="Tutup form simpan materi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notifications inside sheet */}
            {quickSuccess && (
              <div role="status" className="p-2.5 rounded-xl bg-[#EAF6EE] border border-[#CCEBD6] text-xs font-bold text-[#1E6B3B] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#1E6B3B] shrink-0" />
                <span>{quickSuccess}</span>
              </div>
            )}
            {quickError && (
              <div role="alert" className="p-2.5 rounded-xl bg-[#FDF0F4] border border-[#FED7C5] text-xs font-semibold text-[#A82B53]">
                ⚠️ {quickError}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleQuickAddLink} className="space-y-3">
              <div className="relative flex items-center">
                <input
                  ref={linkInputRef}
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  aria-label="URL materi untuk disimpan"
                  value={quickUrl}
                  onChange={(e) => {
                    setQuickUrl(e.target.value);
                    if (quickError) setQuickError(null);
                  }}
                  placeholder="Tempel tautan (youtube.com, tiktok.com, web)..."
                  className="w-full text-sm pl-4 pr-12 py-3 rounded-2xl bg-white border border-[#EAE3D5] text-[#2E2E3A] placeholder-[#8A857A] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#BA5218]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setQuickUrl(text);
                    } catch {
                      // blocked
                    }
                  }}
                  className="absolute right-1 w-11 h-11 flex items-center justify-center rounded-full text-[#4A4A5A] hover:text-[#9E410E] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#9E410E]"
                  title="Tempel dari clipboard"
                  aria-label="Tempel tautan dari clipboard"
                >
                  <Clipboard className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSavingLink}
                  className="flex-1 h-12 bg-[#BA5218] hover:bg-[#A34310] disabled:opacity-50 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>{isSavingLink ? 'Menyimpan...' : 'Simpan ke Vault'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sheet: Lemari Kostum Mochi */}
      {isWardrobeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wardrobe-sheet-title"
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 anim-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWardrobeOpen(false);
          }}
        >
          <div ref={wardrobeModalRef} className="bg-[#FAF7F2] border-t sm:border border-[#EAE3D5] rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md shadow-2xl relative space-y-4 anim-modal-sheet">
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
        </div>
      )}
    </div>
  );
};
