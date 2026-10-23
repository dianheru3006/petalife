import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ChatMessage, NavigationTab } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Send, User, ArrowRight } from 'lucide-react';
import { SolidSproutIcon } from '../../components/common/SolidSproutIcon';
import { cn } from '../../lib/utils';

export interface AssistantPageProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void | Promise<unknown>;
  onNavigate: (tab: NavigationTab) => void;
  isNightMode?: boolean;
}

export const AssistantPage: FC<AssistantPageProps> = ({
  messages,
  onSendMessage,
  onNavigate,
  isNightMode = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    'Bagaimana keadaan Mochi?',
    'Ringkas isi Pustakaku',
    'Apa resep yang kusimpan?',
    'Jelaskan catatan Clean Architecture',
    'Apa yang perlu kutinjau berikutnya?',
  ];

  /**
   * AUDIT-FIX (P1): the typing indicator was a fixed 600 ms timer, so it vanished
   * long before a real answer and multiple in-flight sends overlapped. It now
   * tracks the actual promise, clears the input immediately, and blocks re-entry.
   */
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    setInputText('');
    setIsTyping(true);
    try {
      await onSendMessage(text);
    } finally {
      setIsTyping(false);
    }
  };

  // AUDIT-FIX (P1): the thread never scrolled, so every reply after the first
  // screen stayed hidden below the fold. Respect reduced-motion for the scroll.
  useEffect(() => {
    const node = bottomRef.current;
    if (!node) return;
    const reduceMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.scrollIntoView({ block: 'end', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [messages.length, isTyping]);

  return (
    <div className="max-w-md mx-auto flex flex-col h-full min-h-0">
      {/* A quiet source note, using the same sprout mark as Mochi's profile. */}
      <div
        className={cn(
          'shrink-0 border px-3.5 py-2.5 rounded-2xl text-[11px] font-medium flex items-center mb-3 transition-colors duration-700',
          isNightMode
            ? 'bg-[#F5EDE0] border-[#DFD2BE] text-[#604B3B]'
            : 'bg-[#F8F2E8] border-[#E8DFCF] text-[#604B3B]'
        )}
      >
        <span className="flex items-center gap-2">
          <SolidSproutIcon className="w-4 h-4 shrink-0" />
          <span>Tanya tentang Pustaka, Catatan, atau keadaan Mochi.</span>
        </span>
      </div>

      {/* Messages Thread Container with screen reader announcement area */}
      <div
        ref={threadRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 pr-1 mb-3 scrollbar-none"
        aria-live="polite"
        aria-atomic="false"
        aria-busy={isTyping}
      >
        {messages.map(msg => {
          const isAssistant = msg.sender === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 sm:gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-2xl flex items-center justify-center text-sm flex-shrink-0 shadow-2xs ${
                  isAssistant
                    ? 'bg-[#FFF4DC] border border-[#E8D4AD] text-[#795331]'
                    : 'bg-[#FED7C5] border border-[#F4A261]/30 text-[#7A3613]'
                }`}
              >
                {isAssistant ? <SolidSproutIcon className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                <div
                  className={cn(
                    'p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-xs border transition-colors duration-700',
                    isAssistant
                      ? isNightMode
                        ? 'bg-[#FAF6EE] border-[#DDD2C2] text-[#2E2E3A] rounded-tl-sm'
                        : 'bg-[#FAF7F2] border-[#ECE6DB] text-[#2E2E3A] rounded-tl-sm'
                      : 'bg-[#BA5218] border-[#9E410E] text-white rounded-tr-sm font-medium'
                  )}
                >
                  {isAssistant && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#77533A] uppercase tracking-wider mb-1">
                      <span>Mochi</span>
                      <span className="text-[#525266] font-medium">• {msg.timestamp}</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Optional Action Button in Assistant message */}
                {msg.suggestedAction && (
                  <button
                    onClick={() => onNavigate(msg.suggestedAction!.targetTab)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#79462D] bg-[#F5E9D8] border border-[#E3D1B9] px-3 py-1.5 rounded-full hover:bg-[#EBDCC7] transition-colors cursor-pointer"
                  >
                    <span>{msg.suggestedAction.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Scroll anchor: keeps the newest message visible. */}
        <div ref={bottomRef} aria-hidden="true" />

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl bg-[#FFF4DC] border border-[#E8D4AD] flex items-center justify-center text-sm">
              <SolidSproutIcon className="w-4 h-4" />
            </div>
            <div
              className={cn(
                'border px-4 py-3 rounded-2xl rounded-tl-sm shadow-xs flex items-center gap-1.5 text-xs transition-colors duration-700',
                isNightMode
                  ? 'bg-[#FAF6EE] border-[#DDD2C2] text-[#4A4A5A]'
                  : 'bg-[#FAF7F2] border-[#ECE6DB] text-[#4A4A5A]'
              )}
            >
              <span className="animate-bounce text-[#A7673D]">·</span>
              <span className="animate-bounce text-[#A7673D]" style={{ animationDelay: '0.15s' }}>·</span>
              <span className="animate-bounce text-[#A7673D]" style={{ animationDelay: '0.3s' }}>·</span>
              <span className="ml-1 text-[11px] font-medium">Mochi sedang mencari...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="mb-3">
        <p className="text-[11px] font-bold text-[#5E5045] mb-1.5">Coba tanyakan</p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => void handleSend(prompt)}
              disabled={isTyping}
              className={cn(
                'disabled:opacity-50 disabled:pointer-events-none',
                'text-xs border px-3 py-1.5 rounded-full whitespace-nowrap shadow-2xs transition-colors cursor-pointer font-medium',
                isNightMode
                  ? 'bg-[#FAF6EE] hover:bg-[#F2ECE0] text-[#3A3A4A] border-[#DDD2C2]'
                  : 'bg-[#FAF7F2] hover:bg-[#F3EDE2] text-[#3A3A4A] border-[#ECE6DB]'
              )}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Bar */}
      <form          onSubmit={e => {
            e.preventDefault();
            void handleSend();
          }}
        className={cn(
          'shrink-0 flex items-center gap-2 p-2 rounded-2xl border shadow-xs transition-colors duration-700',
          isNightMode
            ? 'bg-[#FAF6EE] border-[#DDD2C2]'
            : 'bg-[#FAF7F2] border-[#ECE6DB]'
        )}
      >
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Tanya Mochi tentang materi atau catatan..."
          className="flex-1 text-xs sm:text-sm px-3 py-2 bg-transparent text-[#2E2E3A] focus:outline-none focus:ring-2 focus:ring-[#BA5218] focus:ring-offset-1 rounded-xl placeholder-[#5A5A6E] transition-all duration-150"
        />
        <Button
          type="submit"
          disabled={!inputText.trim() || isTyping}
          aria-label="Kirim pesan"
          title="Kirim pesan"
          variant="peach"
          size="sm"
          className="rounded-xl px-3.5 py-2 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Kirim</span>
        </Button>
      </form>
    </div>
  );
};
