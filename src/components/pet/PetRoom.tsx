import type { FC, FormEvent } from 'react';
import { useState, useEffect, useRef } from 'react';
import type { Pet, NavigationTab, SavedLink } from '../../lib/types';
import { MochiPet } from './MochiPet';
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
} from 'lucide-react';
import { canFeedPet, getPetContextualStatus } from '../../features/pet/engine/petEngine';
import { normalizeUrl, isValidUrl } from '../../lib/utils/urlUtils';
import { detectPlatform } from '../../lib/utils';
import roomBg from '../../assets/room-bg.jpg';
import { SnackBubble, CircularMeter } from './SnackBubble';
import { SNACK_VARIANTS } from './snackData';

export interface PetRoomProps {
  pet: Pet;
  onFeed: () => void;
  onNavigate: (tab: NavigationTab) => void;
  savedLinks?: SavedLink[];
  onAddLink?: (newLink: SavedLink) => void;
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
  const activeNight = isNightMode !== undefined ? isNightMode : localNight;

  const handleToggleNight = () => {
    const willBeNight = !activeNight;
    if (onToggleNightMode) {
      onToggleNightMode();
    } else {
      setLocalNight(prev => !prev);
    }

    if (willBeNight) {
      triggerSpeech('Hoaaam... Selamat istirahat & mimpi indah, Dian! 🌙💤', 4000);
    } else {
      triggerSpeech('Selamat pagi! Semangat belajar lagi bareng Mochi! ☀️✨', 4000);
    }
  };

  // Quick Link Capture State
  const [quickUrl, setQuickUrl] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);

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
        const whispers = [
          'Kenyang dan senang ✨',
          'Rumah Mochi hangat dan nyaman 🌸',
          'Ada materi seru yang mau dipelajari? 🎬',
          'Mochi senang bersama Dian! 💖',
        ];
        const randomWhisper = whispers[Math.floor(Math.random() * whispers.length)];
        triggerSpeech(randomWhisper, 3200);
      }
    }, 45000);

    return () => clearInterval(whisperInterval);
  }, [isFeeding]);

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

  const handlePetTap = () => {
    if (isFull) {
      triggerSpeech('Perut Mochi kenyang dan hatiku senang! ✨', 3500);
      return;
    }
    const cuteReplies = [
      'Hehehe, geli! 🌸',
      'Yaaay! Semangat belajar bareng kamu! ✨',
      'Mochi siap menemani Dian! 🍵',
      'Ada resep atau video baru yang seru? 🍳',
      `Streak belajarmu ${pet.streakDays} hari berturut-turut! 🔥`,
      contextualStatus.speechText,
    ];
    triggerSpeech(cuteReplies[Math.floor(Math.random() * cuteReplies.length)], 3800);
  };

  const handleQuickAddLink = (e?: FormEvent) => {
    if (e) e.preventDefault();
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

    if (onAddLink) {
      onAddLink(newLink);
      setQuickSuccess(`🎉 Berhasil disimpan ke Vault! (+10 XP)`);
      setQuickUrl('');
      triggerSpeech('Wah, ada tautan baru yang tersimpan di Vault! 🎬', 3500);
      setTimeout(() => setQuickSuccess(null), 3000);
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
    <div className="w-full max-w-lg mx-auto space-y-2">
      {/* 1. Simple, Clean Header directly on canvas (matching reference screenshot) */}
      <div className="flex items-center justify-between px-5 pt-3 pb-1 select-none transition-colors duration-700">
        <div>
          <p className={`text-xs font-medium leading-none ${activeNight ? 'text-[#A09BAC]' : 'text-[#8A857A]'}`}>
            {greeting},
          </p>
          <h1 className={`text-xl font-extrabold tracking-tight mt-1 ${activeNight ? 'text-[#FAF7F2]' : 'text-[#2E2E3A]'}`}>
            Rumah Mochi
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtle streak pill */}
          <div
            onClick={() => triggerSpeech(`Semangat belajar! Streak ${pet.streakDays} hari berturut-turut! 🔥`, 3500)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95 ${
              activeNight
                ? 'bg-[#222434] border border-[#34374D] text-[#F4A261] hover:bg-[#2A2C3E]'
                : 'bg-white/80 border border-[#EAE3D5] text-[#D97736] hover:bg-white'
            }`}
            title={`Streak: ${pet.streakDays} hari`}
          >
            <span>🔥</span>
            <span>{pet.streakDays}d</span>
          </div>
        </div>
      </div>

      {/* 2. 3D Isometric Room Canvas (BORDERLESS, exact matching #EEE1CD with seamless feathered transitions) */}
      <div className={`relative w-full aspect-[9/12] sm:aspect-[4/3] max-h-[580px] select-none overflow-hidden transition-colors duration-700 ${
        activeNight ? 'bg-[#181926]' : 'bg-[#EEE1CD]'
      }`}>
        {/* Background 3D Room Diorama */}
        <img
          src={roomBg}
          alt="Rumah Mochi 3D Living Room"
          className={`absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-all duration-700 ${
            activeNight ? 'brightness-90 contrast-[0.95]' : 'brightness-100'
          }`}
        />

        {/* TOP SOFT FEATHERED GRADIENT (Matches page bg exactly: #EEE1CD day / #181926 night) */}
        <div className={`absolute top-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-b to-transparent pointer-events-none z-10 transition-all duration-700 ${
          activeNight ? 'from-[#181926] via-[#181926]/70' : 'from-[#EEE1CD] via-[#EEE1CD]/70'
        }`} />

        {/* BOTTOM SOFT FEATHERED GRADIENT (Matches page bg exactly: #EEE1CD day / #181926 night) */}
        <div className={`absolute bottom-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-t to-transparent pointer-events-none z-10 transition-all duration-700 ${
          activeNight ? 'from-[#181926] via-[#181926]/70' : 'from-[#EEE1CD] via-[#EEE1CD]/70'
        }`} />

        {/* Night Mode Ambient Overlay (Seamless full-bleed midnight filter) */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 pointer-events-none z-10 ${
            activeNight ? 'opacity-100 bg-[#141522]/45 mix-blend-multiply' : 'opacity-0'
          }`}
        />

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
          <div className={`backdrop-blur-md px-4 py-2 rounded-2xl shadow-md border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors duration-700 ${
            activeNight
              ? 'bg-[#222434]/95 text-[#FAF7F2] border-[#34374D]'
              : 'bg-white/95 text-[#3A3340] border-[#EAE3D5]'
          }`}>
            <span>{isFeeding ? '✨ Nyam nyam! Enak!' : speech}</span>
            <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b ${
              activeNight
                ? 'bg-[#222434] border-[#34374D]'
                : 'bg-white border-[#EAE3D5]'
            }`} />
          </div>
        </div>

        {/* The Center Mat & Proportional 3D Mochi */}
        <div className="absolute top-[48%] sm:top-[49%] left-[49%] -translate-x-1/2 z-20 flex flex-col items-center">
          <MochiPet pet={pet} onPetClick={handlePetTap} showBubble={false} />
        </div>

        {/* Floating Dream Soap Bubble pointing directly down to Hunger Meter (NO FOOD NAME LABEL) */}
        <div className="absolute bottom-3 left-2 sm:left-4 z-25">
          <SnackBubble
            snack={currentSnack}
            onFeed={handleFeedClick}
            onCycleNext={handleCycleNextSnack}
            isFull={isFull}
            isFeeding={isFeeding}
          />
        </div>
      </div>

      {/* 3. Open Status Row (Borderless, sitting directly on the canvas matching reference) */}
      <div className="flex items-center justify-between px-4 sm:px-2 py-1 select-none">
        {/* Left: Circular Progress Rings & Life Stage */}
        <div className="flex items-center gap-2 sm:gap-3">
          <CircularMeter
            value={pet.hunger}
            color="#D97736"
            iconType="hunger"
            label="Lapar / Makanan"
            isNightMode={activeNight}
          />
          <CircularMeter
            value={pet.mood}
            color="#E57399"
            iconType="mood"
            label="Senang / Afeksi"
            isNightMode={activeNight}
          />
          <CircularMeter
            value={pet.energy}
            color="#57B37C"
            iconType="energy"
            label="Energi / Segar"
            isNightMode={activeNight}
          />
          <span className={`text-xs font-semibold ${activeNight ? 'text-[#A09BAC]' : 'text-[#8A857A]'}`}>
            {getStageName(pet.level)}
          </span>
        </div>

        {/* Center: Pet Name & Info */}
        <div
          className={`flex items-center gap-1 font-black text-sm cursor-pointer hover:opacity-80 transition-opacity ${
            activeNight ? 'text-[#FAF7F2]' : 'text-[#2E2E3A]'
          }`}
          onClick={handlePetTap}
          title="Ketuk untuk berinteraksi dengan Mochi"
        >
          <span>{pet.name}</span>
          <Info className={`w-3.5 h-3.5 ${activeNight ? 'text-[#A09BAC]' : 'text-[#8A857A]'}`} />
        </div>

        {/* Right: Dress-up & Night Mode Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerSpeech('Baju Mochi sudah imut dan pas! 🌸', 3000)}
            className={`w-8 h-8 rounded-full shadow-xs flex items-center justify-center cursor-pointer transition-colors active:scale-95 ${
              activeNight
                ? 'bg-[#222434] border border-[#34374D] text-[#A09BAC] hover:text-[#FAF7F2]'
                : 'bg-white border border-[#EAE3D5] text-[#6B6B7E] hover:text-[#2E2E3A]'
            }`}
            title="Koleksi / Baju Mochi"
          >
            <Shirt className="w-4 h-4" />
          </button>
          <button
            onClick={handleToggleNight}
            className={`w-8 h-8 rounded-full shadow-xs flex items-center justify-center cursor-pointer transition-colors active:scale-95 ${
              activeNight
                ? 'bg-[#222434] border border-[#34374D] text-[#F4A261] hover:text-[#F8C194]'
                : 'bg-white border border-[#EAE3D5] text-[#6B6B7E] hover:text-[#7161BF]'
            }`}
            title={activeNight ? 'Kembali ke mode siang' : 'Mode malam (redupkan lampu)'}
          >
            {activeNight ? <Sun className="w-4 h-4 text-[#F4A261]" /> : <Moon className="w-4 h-4 text-[#7161BF]" />}
          </button>
        </div>
      </div>

      {/* 4. Quick Link Capture Pill matching screenshot: "+ Tempel link di sini... 📋" */}
      <div className="px-4 sm:px-2 pt-1">
        {quickSuccess && (
          <div className="mb-2 p-2 rounded-xl bg-[#EAF6EE] border border-[#CCEBD6] text-xs font-bold text-[#36955E] flex items-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#57B37C]" />
            <span>{quickSuccess}</span>
          </div>
        )}
        {quickError && (
          <div className="mb-2 p-2 rounded-xl bg-[#FDF0F4] border border-[#FED7C5] text-xs font-semibold text-[#C44A72]">
            ⚠️ {quickError}
          </div>
        )}

        <form onSubmit={handleQuickAddLink} className="relative flex items-center">
          <button
            type="submit"
            className={`absolute left-3.5 cursor-pointer transition-colors ${
              activeNight ? 'text-[#A09BAC] hover:text-[#FAF7F2]' : 'text-[#7A7A8A] hover:text-[#2E2E3A]'
            }`}
            title="Simpan Tautan"
          >
            <Plus className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={quickUrl}
            onChange={e => {
              setQuickUrl(e.target.value);
              if (quickError) setQuickError(null);
            }}
            placeholder="Tempel link di sini..."
            className={`w-full text-xs sm:text-sm pl-10 pr-10 py-3 rounded-full shadow-xs focus:outline-none focus:ring-2 transition-all ${
              activeNight
                ? 'bg-[#222434] border border-[#34374D] text-[#FAF7F2] placeholder-[#7E7A8E] focus:ring-[#7161BF]'
                : 'bg-white border border-[#EAE3D5] text-[#2E2E3A] placeholder-[#9E9EA8] focus:ring-[#FED7C5]'
            }`}
          />
          <button
            type="button"
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
            className={`absolute right-3.5 cursor-pointer transition-colors ${
              activeNight ? 'text-[#A09BAC] hover:text-[#F4A261]' : 'text-[#7A7A8A] hover:text-[#D97736]'
            }`}
            title="Tempel dari Clipboard"
          >
            <Clipboard className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 5. Pet XP Growth & Quick Nav Access Bar */}
      <div className="px-4 sm:px-2 pt-2">
        <div className={`rounded-3xl p-4 border shadow-xs space-y-3 transition-colors duration-700 ${
          activeNight ? 'bg-[#222434] border-[#34374D]' : 'bg-white border-[#ECE6DB]'
        }`}>
          <div className={`flex justify-between items-center text-xs font-bold ${
            activeNight ? 'text-[#FAF7F2]' : 'text-[#4A4A5A]'
          }`}>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#F4A261]" />
              <span>Pertumbuhan Mochi (Level {pet.level} → {pet.level + 1})</span>
            </span>
            <span className="text-[#F4A261] font-extrabold">{pet.exp} / {pet.expToNextLevel} XP</span>
          </div>
          <ProgressBar
            value={pet.exp}
            max={pet.expToNextLevel}
            color="orange"
            size="md"
          />

          {/* Quick Shortcuts */}
          <div className={`pt-2 border-t flex items-center justify-between text-xs ${
            activeNight ? 'border-[#34374D] text-[#A09BAC]' : 'border-[#F2ECE1] text-[#6B6B7E]'
          }`}>
            <span className={`font-semibold ${activeNight ? 'text-[#FAF7F2]' : 'text-[#4A4A5A]'}`}>Akses Cepat:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('vault')}
                className={`flex items-center gap-1 transition-colors py-1 px-2 rounded-lg cursor-pointer font-medium ${
                  activeNight ? 'hover:text-[#F4A261] hover:bg-[#2A2C3E]' : 'hover:text-[#D97736] hover:bg-[#FAF7F2]'
                }`}
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Vault ({savedLinks.length})</span>
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigate('assistant')}
                className={`flex items-center gap-1 transition-colors py-1 px-2 rounded-lg cursor-pointer font-medium ${
                  activeNight ? 'hover:text-[#A89AE8] hover:bg-[#2A2C3E]' : 'hover:text-[#7161BF] hover:bg-[#FAF7F2]'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Asisten</span>
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigate('notes')}
                className={`flex items-center gap-1 transition-colors py-1 px-2 rounded-lg cursor-pointer font-medium ${
                  activeNight ? 'hover:text-[#57B37C] hover:bg-[#2A2C3E]' : 'hover:text-[#36955E] hover:bg-[#FAF7F2]'
                }`}
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
