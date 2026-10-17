import type { FC } from 'react';
import { useState } from 'react';
import type { ChatMessage, NavigationTab } from '../../lib/types';
import { Button } from '../../components/ui/Button';
import { Send, Sparkles, User, ArrowRight } from 'lucide-react';

export interface AssistantPageProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const AssistantPage: FC<AssistantPageProps> = ({
  messages,
  onSendMessage,
  onNavigate,
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
    <div className="max-w-md mx-auto flex flex-col h-[calc(100dvh-170px)] min-h-[460px]">
      {/* Grounded AI Assistant Badge */}
      <div className="bg-[#FFF9F2] border border-[#FED7C5] px-3.5 py-1.5 rounded-2xl text-[11px] font-semibold text-[#8C5D39] flex items-center justify-between mb-4 shadow-2xs">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#F4A261]" />
          <span><b>Grounded Knowledge Assistant:</b> Responds using your personal Vault, Notes, and Mochi's real status.</span>
        </span>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin">
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
                  className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isAssistant
                      ? 'bg-white border border-[#EAE6DF] text-[#2E2E3A] rounded-tl-sm'
                      : 'bg-[#F4A261] text-white rounded-tr-sm font-medium'
                  }`}
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
            <div className="bg-white border border-[#EAE6DF] px-4 py-3 rounded-2xl rounded-tl-sm shadow-xs flex items-center gap-1.5 text-xs text-[#828292]">
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
              className="text-xs bg-white hover:bg-[#FAF7F2] text-[#4A4A5A] border border-[#ECE6DB] px-3 py-1.5 rounded-full whitespace-nowrap shadow-2xs transition-colors cursor-pointer font-medium"
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
        className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-[#ECE6DB] shadow-xs"
      >
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Ask Mochi to summarize your vault or help you study..."
          className="flex-1 text-xs sm:text-sm px-3 py-2 bg-transparent text-[#2E2E3A] focus:outline-none placeholder-[#8E8E9E]"
        />
        <Button
          type="submit"
          disabled={!inputText.trim()}
          variant="peach"
          size="sm"
          className="rounded-xl px-3.5 py-2 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </div>
  );
};
