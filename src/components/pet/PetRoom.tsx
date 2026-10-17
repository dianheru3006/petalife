import type { FC } from 'react';
import { useState } from 'react';
import type { Pet, NavigationTab } from '../../lib/types';
import { MochiPet } from './MochiPet';
import { ProgressBar } from '../ui/ProgressBar';
import { Button } from '../ui/Button';
import { Sparkles, Cookie, Bot, FileText, BookmarkPlus, CheckCircle2 } from 'lucide-react';
import { canFeedPet, getPetContextualStatus } from '../../features/pet/engine/petEngine';

export interface PetRoomProps {
  pet: Pet;
  onFeed: () => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const PetRoom: FC<PetRoomProps> = ({ pet, onFeed, onNavigate }) => {
  const isFull = !canFeedPet(pet);
  const isFeeding = pet.state === 'feeding';
  const contextualStatus = getPetContextualStatus(pet);

  const [speech, setSpeech] = useState<string>(contextualStatus.speechText);
  const [lastFedText, setLastFedText] = useState<string | null>(null);

  const handleFeedClick = () => {
    if (isFull) {
      setSpeech("Mochi is completely full! Come back when my tummy has room. 🌸");
      return;
    }
    if (isFeeding) {
      return; // Anti-spam guard
    }

    onFeed();
    setSpeech('Nyam! That was delicious! 💖');
    setLastFedText('+25 XP • Hunger filled!');
    setTimeout(() => {
      setLastFedText(null);
      setSpeech('Ready to learn something new? 📚');
    }, 2500);
  };

  const handlePetTap = () => {
    if (isFull) {
      setSpeech("Mochi's tummy is full and happy! Let's study together! ✨");
      return;
    }
    const cuteReplies = [
      'Hehehe, that tickles! 🌸',
      'Yay! Learning is fun with you! ✨',
      'Mochi feels cozy and energized! 🍵',
      'Did you save any cool recipes today? 🍳',
      'Keep up your 5-day streak! 🔥',
      contextualStatus.speechText,
    ];
    setSpeech(cuteReplies[Math.floor(Math.random() * cuteReplies.length)]);
  };

  return (
    <div className="relative w-full rounded-3xl bg-gradient-to-b from-[#FFFDF9] via-[#FAF6EE] to-[#F5EFE4] border border-[#ECE6DB] p-5 sm:p-6 shadow-sm overflow-hidden">
      {/* Cozy Room Background Elements */}
      {/* Soft Window Sunbeam */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#FFE8B8]/25 to-transparent rounded-bl-full pointer-events-none" />

      {/* Decorative Wall Window */}
      <div className="absolute top-4 right-5 sm:right-8 w-14 h-18 sm:w-16 sm:h-20 bg-white/70 backdrop-blur-xs rounded-2xl border-2 border-[#E7DFD0] p-1.5 flex flex-col justify-between shadow-xs pointer-events-none opacity-80">
        <div className="w-full h-full border border-dashed border-[#DCD3C0] rounded-xl flex items-center justify-center text-xs">
          🌤️
        </div>
      </div>

      {/* Hanging Wall Shelf with Mini Books */}
      <div className="absolute top-6 left-5 sm:left-8 hidden sm:flex items-end gap-1.5 border-b-4 border-[#C8BAA5] pb-0.5 pointer-events-none">
        <div className="w-3.5 h-10 bg-[#FED7C5] rounded-t-sm" />
        <div className="w-3.5 h-12 bg-[#DCD6F3] rounded-t-sm" />
        <div className="w-3.5 h-8 bg-[#CCEBD6] rounded-t-sm" />
        <span className="text-xs ml-1">🪴</span>
      </div>

      {/* Top Header inside Room: Level & Streak */}
      <div className="flex justify-between items-center mb-4 sm:mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-[#FFEFE8] border border-[#FED7C5] text-[#D97736] font-extrabold text-xs sm:text-sm px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
            <span>⭐</span>
            <span>Level {pet.level}</span>
          </div>
          <div className="bg-white/80 border border-[#EAE6DF] text-[#4A4A5A] font-semibold text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
            <span>🔥</span>
            <span>{pet.streakDays} Days Streak</span>
          </div>
        </div>

        {/* Feeding Toast Badge */}
        {lastFedText && (
          <div className="bg-[#57B37C] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md animate-bounce">
            {lastFedText}
          </div>
        )}
      </div>

      {/* Center Stage: The Pet Mochi */}
      <div className="py-2 sm:py-4 flex justify-center items-center relative z-10">
        <MochiPet pet={pet} onPetClick={handlePetTap} speechText={speech} />
      </div>

      {/* Cozy Rug under Mochi */}
      <div className="w-48 sm:w-56 h-7 bg-[#EFE7D8]/80 rounded-full mx-auto -mt-4 mb-4 border border-[#E5DAC8] flex items-center justify-center text-[10px] text-[#A89C8A] font-medium tracking-wider uppercase select-none">
        Mochi's Cozy Mat
      </div>

      {/* Pet Meters Grid */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-white/70 backdrop-blur-xs rounded-2xl p-3 border border-[#EFE9DF] mb-5">
        <ProgressBar
          label="Hunger"
          value={pet.hunger}
          icon="🍖"
          color="peach"
          size="sm"
          valueDisplay={`${pet.hunger}%`}
        />
        <ProgressBar
          label="Mood"
          value={pet.mood}
          icon="✨"
          color="lavender"
          size="sm"
          valueDisplay={`${pet.mood}%`}
        />
        <ProgressBar
          label="Energy"
          value={pet.energy}
          icon="⚡"
          color="mint"
          size="sm"
          valueDisplay={`${pet.energy}%`}
        />
      </div>

      {/* Level XP Progress */}
      <div className="bg-white/80 rounded-2xl p-3.5 border border-[#EFE9DF] mb-5">
        <div className="flex justify-between items-center text-xs font-bold text-[#4A4A5A] mb-1.5">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F4A261]" />
            <span>Growth Progress (Next Level: {pet.level + 1})</span>
          </span>
          <span className="text-[#D97736] font-extrabold">{pet.exp} / {pet.expToNextLevel} XP</span>
        </div>
        <ProgressBar
          value={pet.exp}
          max={pet.expToNextLevel}
          color="orange"
          size="md"
        />
      </div>

      {/* Primary Interaction: Feed Pet Button */}
      {/* Primary Interaction: Feed Pet Button */}
      <div className="flex flex-col items-center gap-2">
        <Button
          onClick={handleFeedClick}
          variant={isFull ? 'secondary' : 'peach'}
          size="lg"
          disabled={isFull || isFeeding}
          className={`w-full py-3.5 text-base font-extrabold shadow-md flex items-center justify-center gap-2 transition-all ${
            isFull
              ? 'opacity-70 cursor-not-allowed bg-[#ECE6DB] text-[#7A7A8A]'
              : 'shadow-[#F4A261]/25 cursor-pointer'
          }`}
        >
          {isFeeding ? (
            <>
              <Cookie className="w-5 h-5 animate-spin" />
              <span>Nyam nyam... (Mochi is eating!)</span>
            </>
          ) : isFull ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-[#57B37C]" />
              <span>Mochi is Completely Full! (100%)</span>
            </>
          ) : (
            <>
              <Cookie className="w-5 h-5" />
              <span>Feed Mochi a Snack (+25 XP)</span>
            </>
          )}
        </Button>

        {isFull && (
          <p className="text-xs text-[#8A857A] text-center font-medium">
            ✨ Tummy is full! Earn more XP today by reviewing links in <span className="font-bold text-[#D97736]">Vault</span> or jotting down <span className="font-bold text-[#36955E]">Notes</span>.
          </p>
        )}
      </div>

      {/* Quick Action Shortcuts */}
      <div className="mt-4 pt-3.5 border-t border-[#EAE3D5] flex items-center justify-between text-xs text-[#6B6B7E]">
        <span className="font-semibold text-[#4A4A5A]">Quick Actions:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('vault')}
            className="flex items-center gap-1 hover:text-[#D97736] transition-colors py-1 px-2 rounded-lg hover:bg-white cursor-pointer font-medium"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save Link</span>
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigate('assistant')}
            className="flex items-center gap-1 hover:text-[#7161BF] transition-colors py-1 px-2 rounded-lg hover:bg-white cursor-pointer font-medium"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </button>
          <span>•</span>
          <button
            onClick={() => onNavigate('notes')}
            className="flex items-center gap-1 hover:text-[#36955E] transition-colors py-1 px-2 rounded-lg hover:bg-white cursor-pointer font-medium"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>New Note</span>
          </button>
        </div>
      </div>
    </div>
  );
};
