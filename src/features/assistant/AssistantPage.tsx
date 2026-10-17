import type { FC } from 'react';
import { useState } from 'react';
import type { ChatMessage, NavigationTab } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Send, Sparkles, User, ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AssistantPageProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
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

  const suggestedPrompts = [
    'How is Mochi doing today? 🐾',
    'Summarize my vault 📚',
    'What recipes do I have saved? 🍳',
    'Explain Clean Architecture from my notes 💻',
    'What should I review next? 📖',
  ];

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    onSendMessage(text);
    setInputText('');
    setIsTyping(true);

    // Responsive assistant reply transition
    setTimeout(() => {
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="max-w-md mx-auto flex flex-col h-[calc(100dvh-170px)] min-h-0">
      {/* Grounded AI Assistant Badge */}
      <div
        className={cn(
          'shrink-0 border px-3.5 py-1.5 rounded-2xl text-[11px] font-semibold flex items-center justify-between mb-3 shadow-2xs transition-colors duration-700',
          isNightMode
            ? 'bg-[#FAF2E6] border-[#ECC8B2] text-[#8C5D39]'
            : 'bg-[#FFF7EE] border-[#FED7C5] text-[#8C5D39]'
        )}
      >
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#F4A261]" />
          <span><b>Grounded Knowledge Assistant:</b> Responds using your personal Vault, Notes, and Mochi's real status.</span>
        </span>
      </div>

      {/* Messages Thread Container with screen reader announcement area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 mb-3 scrollbar-thin"
        aria-live="polite"
        aria-atomic="false"
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
                    ? 'bg-[#F0EDF9] border border-[#DCD6F3] text-[#7161BF]'
                    : 'bg-[#FED7C5] border border-[#F4A261]/30 text-[#7A3613]'
                }`}
              >
                {isAssistant ? '🐾' : <User className="w-4 h-4" />}
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
                      : 'bg-[#F4A261] border-[#E88E4B] text-white rounded-tr-sm font-medium'
                  )}
                >
                  {isAssistant && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#7161BF] uppercase tracking-wider mb-1">
                      <span>Mochi AI</span>
                      <span className="text-[#8E8E9E] font-normal">• {msg.timestamp}</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>

                {/* Optional Action Button in Assistant message */}
                {msg.suggestedAction && (
                  <button
                    onClick={() => onNavigate(msg.suggestedAction!.targetTab)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#7161BF] bg-[#F0EDF9] border border-[#DCD6F3] px-3 py-1.5 rounded-full hover:bg-[#E3DCF5] transition-colors cursor-pointer"
                  >
                    <span>{msg.suggestedAction.label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl bg-[#F0EDF9] border border-[#DCD6F3] flex items-center justify-center text-sm">
              🐾
            </div>
            <div
              className={cn(
                'border px-4 py-3 rounded-2xl rounded-tl-sm shadow-xs flex items-center gap-1.5 text-xs transition-colors duration-700',
                isNightMode
                  ? 'bg-[#FAF6EE] border-[#DDD2C2] text-[#828292]'
                  : 'bg-[#FAF7F2] border-[#ECE6DB] text-[#828292]'
              )}
            >
              <span className="animate-bounce">●</span>
              <span className="animate-bounce" style={{ animationDelay: '0.15s' }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>●</span>
              <span className="ml-1 text-[11px] font-medium">Mochi is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="mb-3">
        <p className="text-[11px] font-bold text-[#828292] mb-1.5">Suggested Prompts:</p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {suggestedPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(prompt)}
              className={cn(
                'text-xs border px-3 py-1.5 rounded-full whitespace-nowrap shadow-2xs transition-colors cursor-pointer font-medium',
                isNightMode
                  ? 'bg-[#FAF6EE] hover:bg-[#F2ECE0] text-[#4A4A5A] border-[#DDD2C2]'
                  : 'bg-[#FAF7F2] hover:bg-[#F3EDE2] text-[#4A4A5A] border-[#ECE6DB]'
              )}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
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
          placeholder="Ask Mochi to summarize your vault or help you study..."
          className="flex-1 text-xs sm:text-sm px-3 py-2 bg-transparent text-[#2E2E3A] focus:outline-none focus:ring-2 focus:ring-[#E88E4B] focus:ring-offset-1 rounded-xl placeholder-[#8E8E9E] transition-all duration-150"
        />
        <Button
          type="submit"
          disabled={!inputText.trim()}
          aria-label="Kirim pesan"
          title="Kirim pesan"
          variant="peach"
          size="sm"
          className="rounded-xl px-3.5 py-2 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </div>
  );
};
