import type { FC, FormEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
import type { Pet, NavigationTab, SavedLink } from '../../lib/types';
import { MochiPet, type MochiAction } from './MochiPet';
import { ProgressBar } from '../ui/ProgressBar';
import {
  Sparkles,
  Bot,
  FileText,
  BookmarkPlus,
  CheckCircle2,
  Moon,
  Sun,
  Plus,
  Clipboard,
  Shirt,
  Info,
  Music,
} from 'lucide-react';
import { canFeedPet, getPetContextualStatus } from '../../features/pet/engine/petEngine';
import { normalizeUrl, isValidUrl } from '../../lib/utils/urlUtils';
import { detectPlatform, cn } from '../../lib/utils';
import roomBg from '../../assets/room-bg.jpg';
import { SnackBubble, CircularMeter } from './SnackBubble';
import { SNACK_VARIANTS } from './snackData';
import { TvScreen } from './TvScreen';
import { LiveCalendar } from './LiveCalendar';
import { LiveWallClock } from './LiveWallClock';

export interface PetRoomProps {
  pet: Pet;
  onFeed: () => void;
  onNavigate: (tab: NavigationTab) => void;
  savedLinks?: SavedLink[];
  onAddLink?: (newLink: SavedLink) => Promise<void>;
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
  notesCount = 3,
  isNightMode,
  onToggleNightMode,
}) => {
  const isFull = !canFeedPet(pet);
  const isFeeding = pet.state === 'feeding';
  const contextualStatus = getPetContextualStatus(pet);

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
      triggerSpeech('Hoaaam... Selamat tidur & mimpi indah, Dian! 🌙💤', 4000);
    } else {
      triggerSpeech('Selamat pagi! Semangat belajar lagi bareng Mochi! ☀️✨', 4000);
    }
  };

  // Quick Link Capture State
  const [quickUrl, setQuickUrl] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);
  const [isSavingLink, setIsSavingLink] = useState(false);

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
            'Mochi senang bersama Dian! 💖',
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
        'Penuh energi! Ayo belajar lagi bareng Dian! 🌀',
      ];
      triggerSpeech(spins[Math.floor(Math.random() * spins.length)], 3600);
      return;
    }

    if (action === 'wink') {
      const winks = [
        'Mochi selalu siap menemani Dian! 😉🍵',
        'Kedip manis buat kamu! Semangat belajarnya! ✨😉',
        'Psst... Dian rajin banget hari ini! 😉🌟',
      ];
      triggerSpeech(winks[Math.floor(Math.random() * winks.length)], 3600);
      return;
    }

    if (action === 'dance') {
      const danceLines = [
        'La la la~ Mochi suka menari! 🎵💃',
        'Dian lihat! Mochi punya gerakan tarian baru! 🎶✨',
        'Satu dua tiga, bergoyang gembira! 🎵',
        'Musik membuat hati Mochi berbunga-bunga! 🌸🎶',
      ];
      triggerSpeech(danceLines[Math.floor(Math.random() * danceLines.length)], 4000);
      return;
    }

    if (isFull) {
      triggerSpeech('Perut Mochi kenyang dan hatiku senang! ✨', 3500);
      return;
    }
    const cuteReplies = [
      'Yaaay! Semangat belajar bareng kamu! ✨',
      'Mochi siap menemani Dian! 🍵',
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
      await onAddLink(newLink);
      setQuickSuccess(`🎉 Berhasil disimpan ke Vault! (+10 XP)`);
      setQuickUrl('');
      triggerSpeech('Wah, ada tautan baru yang tersimpan di Vault! 🎬', 3500);
      setTimeout(() => setQuickSuccess(null), 3000);
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
      <div className="flex items-center justify-between px-2 pt-1 pb-1 select-none">
        <div>
          <p className="text-xs text-[#8A857A] font-medium leading-none">
            {greeting},
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-[#2E2E3A] tracking-tight mt-1">
            Rumah Mochi
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtle streak pill */}
          <button
            type="button"
            onClick={() => triggerSpeech(`Semangat belajar! Streak ${pet.streakDays} hari berturut-turut! 🔥`, 3500)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#D97736] shadow-xs cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736] active:scale-95 transition-colors duration-700 border',
              activeNight
                ? 'bg-[#FAF6EE] border-[#DDD2C2] hover:bg-[#F2ECE0]'
                : 'bg-white border-[#EAE3D5] hover:bg-[#FAF7F2]'
            )}
            title={`Streak: ${pet.streakDays} hari`}
          >
            <span>🔥</span>
            <span>{pet.streakDays}d</span>
          </button>
        </div>
      </div>

      {/* 2. Terrarium / Living Diorama Card (CRISP, NO FOG GRADIENT, BORDERED) */}
      <div
        className={cn(
          'relative w-full aspect-[9/12] sm:aspect-[4/3] max-h-[560px] rounded-[32px] overflow-hidden select-none transition-all duration-700 ease-out border-2',
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
          aria-hidden="true"
        >
          <LiveWallClock
            onClockClick={(speechText) => triggerSpeech(speechText, 4000)}
          />
          <LiveCalendar
            onCalendarClick={(speechText) => triggerSpeech(speechText, 4000)}
          />
        </svg>

        {/* Toast Notification inside Room */}
        {lastFedText && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#57B37C] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md animate-bounce">
            {lastFedText}
          </div>
        )}

        {/* Speech Bubble directly above Mochi (Only appears on direct interaction, then auto-hides) */}
        <div
          className={`absolute top-[40%] sm:top-[41%] left-[49%] -translate-x-1/2 z-30 pointer-events-none transition-all duration-300 ease-out transform ${
            showSpeech
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-2 pointer-events-none'
          }`}
        >
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-md border border-[#EAE3D5] text-xs font-bold text-[#3A3340] flex items-center gap-1.5 whitespace-nowrap">
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

        {/* Floating Snack Bubble pointing directly down to Hunger Meter (Resting during bedtime) */}
        {!activeNight && (
          <div className="absolute bottom-[66px] left-3 sm:left-4 z-25">
            <SnackBubble
              snack={currentSnack}
              onFeed={handleFeedClick}
              onCycleNext={handleCycleNextSnack}
              isFull={isFull}
              isFeeding={isFeeding}
            />
          </div>
        )}

        {/* 3. Status Dock Bar (Inside the Terrarium Border, Clean White Frosted Glass, No Percentage Text) */}
        <div className="absolute bottom-3 left-3 right-3 z-30 bg-white/92 backdrop-blur-md rounded-2xl border border-white/80 shadow-xs px-3 sm:px-4 py-2 flex items-center justify-between select-none text-[#2E2E3A]">
          {/* Left: Circular Progress Rings & Life Stage */}
          <div className="flex items-center gap-1 sm:gap-2">
            <CircularMeter
              value={pet.hunger}
              color="#D97736"
              iconType="hunger"
              label="Lapar / Makanan"
            />
            <CircularMeter
              value={pet.mood}
              color="#E57399"
              iconType="mood"
              label="Senang / Afeksi"
            />
            <CircularMeter
              value={pet.energy}
              color="#57B37C"
              iconType="energy"
              label="Energi / Segar"
            />
            <span className="text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border sm:ml-1 text-[#8A857A] bg-[#FAF7F2] border-[#ECE5DA]">
              {getStageName(pet.level)}
            </span>
          </div>

          {/* Center: Pet Name & Info */}
          <button
            type="button"
            className="flex min-w-0 items-center gap-1 font-black text-xs sm:text-sm text-[#2E2E3A] cursor-pointer hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97736] rounded-md transition-opacity"
            onClick={() => handlePetTap()}
            title="Ketuk untuk berinteraksi dengan Mochi"
          >
            <span className="truncate">{pet.name}</span>
            <Info className="w-3.5 h-3.5 text-[#8A857A]" />
          </button>

          {/* Right: Dance, Dress-up & Night Mode Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={handleDanceClick}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-[#EAE3D5] shadow-xs flex items-center justify-center text-[#E57399] hover:text-[#D97736] hover:bg-[#FFF5F7] cursor-pointer transition-all active:scale-95"
              title="Ajak Mochi Menari 🎵"
              aria-label="Ajak Mochi menari"
            >
              <Music className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => triggerSpeech('Baju Mochi sudah imut dan pas! 🌸', 3000)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-[#EAE3D5] shadow-xs flex items-center justify-center text-[#6B6B7E] hover:text-[#2E2E3A] cursor-pointer transition-colors active:scale-95"
              title="Koleksi / Baju Mochi"
              aria-label="Koleksi baju Mochi"
            >
              <Shirt className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToggleNight}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-[#EAE3D5] shadow-xs flex items-center justify-center text-[#6B6B7E] hover:text-[#7161BF] cursor-pointer transition-colors active:scale-95"
              title={activeNight ? 'Bangunkan Mochi (Pagi Hari)' : 'Tidurkan Mochi / Istirahat Malam'}
              aria-label={activeNight ? 'Bangunkan Mochi' : 'Tidurkan Mochi'}
            >
              {activeNight ? <Moon className="w-3.5 h-3.5 text-[#7161BF]" /> : <Sun className="w-3.5 h-3.5 text-[#F4A261]" />}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Quick Link Capture Pill: "+ Tempel link di sini... 📋" */}
      <div className="pt-0.5">
        {quickSuccess && (
          <div role="status" className="mb-2 p-2 rounded-xl bg-[#EAF6EE] border border-[#CCEBD6] text-xs font-bold text-[#36955E] flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#57B37C]" />
            <span>{quickSuccess}</span>
          </div>
        )}
        {quickError && (
          <div id="quick-link-error" role="alert" className="mb-2 p-2 rounded-xl bg-[#FDF0F4] border border-[#FED7C5] text-xs font-semibold text-[#C44A72]">
            ⚠️ {quickError}
          </div>
        )}

        <form onSubmit={handleQuickAddLink} className="relative flex items-center">
          <button
            type="submit"
            disabled={isSavingLink}
            className="absolute left-3.5 text-[#7A7A8A] hover:text-[#2E2E3A] cursor-pointer transition-colors"
            title="Simpan Tautan"
            aria-label={isSavingLink ? 'Menyimpan tautan' : 'Simpan tautan'}
          >
            <Plus className="w-4 h-4" />
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
              'w-full text-xs sm:text-sm pl-10 pr-10 py-3 rounded-full text-[#2E2E3A] placeholder-[#9E9EA8] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FED7C5] transition-all duration-700 border',
              activeNight
                ? 'bg-[#FAF6EE] border-[#DDD2C2] focus:bg-white'
                : 'bg-white border-[#EAE3D5]'
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
            className="absolute right-3.5 text-[#7A7A8A] hover:text-[#D97736] cursor-pointer transition-colors"
            title="Tempel dari Clipboard"
            aria-label="Tempel tautan dari clipboard"
          >
            <Clipboard className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 5. Pet XP Growth & Quick Nav Access Bar */}
      <div className="pt-1">
        <div
          className={cn(
            'rounded-3xl p-4 shadow-xs space-y-3 transition-colors duration-700 ease-out border',
            activeNight
              ? 'bg-[#FAF6EE] border-[#DDD2C2]'
              : 'bg-white border-[#ECE6DB]'
          )}
        >
          <div className="flex justify-between items-center text-xs font-bold text-[#4A4A5A]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F4A261]" />
              <span>Pertumbuhan Mochi (Level {pet.level} → {pet.level + 1})</span>
            </span>
            <span className="text-[#D97736] font-extrabold">{pet.exp} / {pet.expToNextLevel} XP</span>
          </div>
          <ProgressBar
            value={pet.exp}
            max={pet.expToNextLevel}
            color="orange"
            size="md"
          />

          {/* Quick Shortcuts */}
          <div
            className={cn(
              'pt-2 border-t flex items-center justify-between text-xs text-[#6B6B7E] transition-colors duration-700',
              activeNight ? 'border-[#EAE1D0]' : 'border-[#F2ECE1]'
            )}
          >
            <span className="font-semibold text-[#4A4A5A]">Akses Cepat:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('vault')}
                className={cn(
                  'flex items-center gap-1 hover:text-[#D97736] transition-colors py-1 px-2 rounded-lg cursor-pointer font-medium',
                  activeNight ? 'hover:bg-[#EFE8DA]' : 'hover:bg-[#FAF7F2]'
                )}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Vault ({savedLinks.length})</span>
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigate('assistant')}
                className={cn(
                  'flex items-center gap-1 hover:text-[#7161BF] transition-colors py-1 px-2 rounded-lg cursor-pointer font-medium',
                  activeNight ? 'hover:bg-[#EFE8DA]' : 'hover:bg-[#FAF7F2]'
                )}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Asisten</span>
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigate('notes')}
                className={cn(
                  'flex items-center gap-1 hover:text-[#36955E] transition-colors py-1 px-2 rounded-lg cursor-pointer font-medium',
                  activeNight ? 'hover:bg-[#EFE8DA]' : 'hover:bg-[#FAF7F2]'
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Catatan ({notesCount})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
