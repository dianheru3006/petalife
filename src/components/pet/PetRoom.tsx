import type { FC, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import type { Pet, NavigationTab, SavedLink } from '../../lib/types';
import { MochiPet } from './MochiPet';
import { ProgressBar } from '../ui/ProgressBar';
import { Button } from '../ui/Button';
import {
  Sparkles,
  Bot,
  FileText,
  BookmarkPlus,
  CheckCircle2,
  Moon,
  Sun,
  Lightbulb,
  Plus,
} from 'lucide-react';
import { canFeedPet, getPetContextualStatus } from '../../features/pet/engine/petEngine';
import { normalizeUrl, isValidUrl } from '../../lib/utils/urlUtils';
import { detectPlatform } from '../../lib/utils';
import roomBg from '../../assets/room-bg.jpg';

export interface PetRoomProps {
  pet: Pet;
  onFeed: () => void;
  onNavigate: (tab: NavigationTab) => void;
  savedLinks?: SavedLink[];
  onAddLink?: (newLink: SavedLink) => void;
  notesCount?: number;
}

export const PetRoom: FC<PetRoomProps> = ({
  pet,
  onFeed,
  onNavigate,
  savedLinks = [],
  onAddLink,
  notesCount = 3,
}) => {
  const isFull = !canFeedPet(pet);
  const isFeeding = pet.state === 'feeding';
  const contextualStatus = getPetContextualStatus(pet);

  const [speech, setSpeech] = useState<string>(
    isFull ? 'Perut Mochi kenyang dan hatiku senang! ✨' : contextualStatus.speechText
  );
  const [lastFedText, setLastFedText] = useState<string | null>(null);
  const [lightingMode, setLightingMode] = useState<'warm' | 'day' | 'night'>('warm');

  // Quick Link Capture State
  const [quickUrl, setQuickUrl] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickSuccess, setQuickSuccess] = useState<string | null>(null);

  // Live Date & Indonesian Greeting
  const [dateStr, setDateStr] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Selamat siang');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const hours = now.getHours();

      // Month name abbreviation in Indonesian/English
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGT', 'SEP', 'OKT', 'NOV', 'DES'];
      setDateStr(`${months[now.getMonth()]} ${now.getDate()}`);

      if (hours < 11) setGreeting('Selamat pagi');
      else if (hours < 15) setGreeting('Selamat siang');
      else if (hours < 18) setGreeting('Selamat sore');
      else setGreeting('Selamat malam');
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFeedClick = () => {
    if (isFull) {
      setSpeech('Perut Mochi sudah kenyang dan hatiku senang! ✨');
      return;
    }
    if (isFeeding) {
      return; // Anti-spam guard
    }

    onFeed();
    setSpeech('Nyam nyam! Enak sekali, terima kasih! 💖');
    setLastFedText('+25 XP • Mochi Kenyang!');
    setTimeout(() => {
      setLastFedText(null);
      setSpeech('Mau simpan atau tonton video apa hari ini? 🎬');
    }, 2500);
  };

  const handlePetTap = () => {
    if (isFull) {
      setSpeech('Perut Mochi kenyang dan hatiku senang! ✨');
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
    setSpeech(cuteReplies[Math.floor(Math.random() * cuteReplies.length)]);
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
      setSpeech('Wah, ada tautan baru yang tersimpan di Vault! 🎬');
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
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* 3D Isometric Room Canvas */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-[#E8DFC8] shadow-md bg-[#FAF6EE]">
        {/* Background 3D Room Diorama */}
        <div className="relative w-full aspect-[9/13] sm:aspect-[4/3] max-h-[620px] select-none">
          <img
            src={roomBg}
            alt="Rumah Mochi 3D Living Room"
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          />

          {/* Dynamic Ambient Lighting Overlay */}
          <div
            className={`absolute inset-0 transition-all duration-700 pointer-events-none ${
              lightingMode === 'warm'
                ? 'bg-amber-400/10 mix-blend-color-burn'
                : lightingMode === 'night'
                ? 'bg-[#1a1b35]/40 mix-blend-multiply'
                : 'bg-transparent'
            }`}
          />

          {/* Top Room Navigation Bar */}
          <div className="absolute top-3.5 left-4 right-4 z-20 flex items-center justify-between">
            {/* Greeting & Room Title */}
            <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-[#EAE3D5] shadow-xs flex items-center gap-2">
              <span className="text-sm">🎉</span>
              <div>
                <p className="text-[10px] text-[#7A7A8A] font-medium leading-none">{greeting},</p>
                <h3 className="text-xs sm:text-sm font-extrabold text-[#2E2E3A] leading-tight">Rumah Mochi</h3>
              </div>
            </div>

            {/* Controls: Lighting Toggle & Streak/Level */}
            <div className="flex items-center gap-2">
              {/* Lighting Switch */}
              <button
                onClick={() => {
                  setLightingMode(prev => prev === 'warm' ? 'night' : prev === 'night' ? 'day' : 'warm');
                }}
                className="w-8 h-8 rounded-2xl bg-white/90 backdrop-blur-md border border-[#EAE3D5] shadow-xs flex items-center justify-center text-xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                title={`Ubah pencahayaan (Mode: ${lightingMode})`}
              >
                {lightingMode === 'warm' ? <Lightbulb className="w-4 h-4 text-[#F4A261]" /> : lightingMode === 'night' ? <Moon className="w-4 h-4 text-[#7161BF]" /> : <Sun className="w-4 h-4 text-[#F4A261]" />}
              </button>

              {/* Level & Streak Pill */}
              <div className="bg-[#FFEFE8]/95 backdrop-blur-md border border-[#FED7C5] px-2.5 py-1 rounded-2xl flex items-center gap-1.5 text-xs font-bold text-[#D97736] shadow-xs">
                <span>{dateStr || 'OKT 17'}</span>
                <span>•</span>
                <span>⭐ Lv. {pet.level}</span>
                <span>•</span>
                <span>🔥 {pet.streakDays}d</span>
              </div>
            </div>
          </div>

          {/* Toast Notification inside Room */}
          {lastFedText && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-[#57B37C] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md animate-bounce">
              {lastFedText}
            </div>
          )}

          {/* ONLY ONE Single Speech Bubble directly above Mochi */}
          <div className="absolute top-[41%] sm:top-[42%] left-[49%] -translate-x-1/2 z-30 pointer-events-none transition-all duration-300">
            <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-sm border border-[#EAE3D5] text-xs font-semibold text-[#3A3340] flex items-center gap-1.5 whitespace-nowrap animate-fade-in">
              <span>{isFeeding ? '✨ Nyam nyam! Enak!' : speech}</span>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-[#EAE3D5]" />
            </div>
          </div>

          {/* The Center Mat & Proportional 3D Mochi */}
          <div className="absolute top-[48%] sm:top-[49%] left-[49%] -translate-x-1/2 z-20 flex flex-col items-center">
            {/* 3D Clay Mochi Character (Scaled to fit comfortably inside the rug) */}
            <MochiPet pet={pet} onPetClick={handlePetTap} showBubble={false} />
          </div>

          {/* Bottom Status Row Overlay inside the Room Frame */}
          <div className="absolute bottom-3 left-4 right-4 z-20 bg-white/90 backdrop-blur-md rounded-2xl px-3 sm:px-4 py-2 border border-[#EAE3D5] shadow-xs flex items-center justify-between text-xs">
            {/* Status Badges: Onigiri icon precisely placed on the eating/hunger info! */}
            <div className="flex items-center gap-2.5 sm:gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-[#D97736]" title={`Lapar: ${pet.hunger}%`}>
                <span className="text-sm">🍙</span>
                <span>{pet.hunger}%</span>
              </span>
              <span className="flex items-center gap-1 text-[#E57399]" title={`Senang: ${pet.mood}%`}>
                <span>💖</span>
                <span>{pet.mood}%</span>
              </span>
              <span className="flex items-center gap-1 text-[#57B37C]" title={`Energi: ${pet.energy}%`}>
                <span>⚡</span>
                <span>{pet.energy}%</span>
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-[#FAF6EE] text-[#7161BF] border border-[#DCD6F3] text-[11px]">
                {getStageName(pet.level)}
              </span>
            </div>

            {/* Name & Quick Suapi Action */}
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#2E2E3A]">{pet.name} ⓘ</span>
              <button
                onClick={handleFeedClick}
                disabled={isFull || isFeeding}
                className={`text-[11px] font-extrabold px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                  isFull
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#FED7C5] hover:bg-[#F4A261] text-[#7A3613] hover:text-white shadow-xs'
                }`}
              >
                <span>{isFeeding ? 'Makan...' : isFull ? 'Kenyang' : '🍙 Suapi'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Link Capture Bar (Like in reference screenshot: "+ Tempel link di sini...") */}
      <div className="bg-white rounded-3xl p-3 sm:p-4 border border-[#ECE6DB] shadow-xs">
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

        <form onSubmit={handleQuickAddLink} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={quickUrl}
              onChange={e => {
                setQuickUrl(e.target.value);
                if (quickError) setQuickError(null);
              }}
              placeholder="+ Tempel tautan video di sini (YouTube, TikTok, Reels, blog)..."
              className="w-full text-xs sm:text-sm pl-4 pr-10 py-2.5 sm:py-3 rounded-2xl bg-[#FAF7F2] border border-[#EAE6DF] text-[#2E2E3A] focus:outline-none focus:ring-2 focus:ring-[#FED7C5] focus:bg-white transition-all"
            />
            {quickUrl && (
              <button
                type="button"
                onClick={() => setQuickUrl('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="peach"
            size="sm"
            className="py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-2xl font-bold flex items-center gap-1.5 cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Simpan</span>
          </Button>
        </form>
      </div>

      {/* Pet Meters & XP Progress Overview */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#ECE6DB] shadow-xs space-y-3">
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

        {/* Quick Action Buttons */}
        <div className="pt-2 border-t border-[#F2ECE1] flex items-center justify-between text-xs text-[#6B6B7E]">
          <span className="font-semibold text-[#4A4A5A]">Akses Cepat:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('vault')}
              className="flex items-center gap-1 hover:text-[#D97736] transition-colors py-1 px-2 rounded-lg hover:bg-[#FAF7F2] cursor-pointer font-medium"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Vault ({savedLinks.length})</span>
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('assistant')}
              className="flex items-center gap-1 hover:text-[#7161BF] transition-colors py-1 px-2 rounded-lg hover:bg-[#FAF7F2] cursor-pointer font-medium"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Asisten</span>
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('notes')}
              className="flex items-center gap-1 hover:text-[#36955E] transition-colors py-1 px-2 rounded-lg hover:bg-[#FAF7F2] cursor-pointer font-medium"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Catatan ({notesCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
