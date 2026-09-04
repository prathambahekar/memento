import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Send } from 'lucide-react';
import { ThemeMode } from '../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  theme: ThemeMode;
  onClose: () => void;
  onAddNote?: (title: string, content: string) => void;
}

export function AIAssistantModal({
  isOpen,
  theme,
  onClose,
  onAddNote,
}: AIAssistantModalProps) {
  const [prompt, setPrompt] = useState('');
  const isDark = theme === 'dark';

  const samplePrompts = [
    '✨ Summarize my recent thoughts',
    '📝 Draft a structured daily checklist',
    '💡 Brainstorm project naming ideas',
  ];

  const handleSend = () => {
    if (!prompt.trim()) return;
    // Add as a quick AI generated note
    onAddNote?.(
      `AI Note: ${prompt.slice(0, 24)}...`,
      `Prompt: ${prompt}\n\nKey takeaways and notes generated for your review.`
    );
    setPrompt('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative w-full max-w-md mx-auto rounded-t-3xl p-5 pb-8 shadow-2xl flex flex-col ${
              isDark ? 'bg-[#121212] text-white' : 'bg-white text-neutral-900'
            }`}
          >
            <div className="flex justify-center pb-2">
              <div
                className={`w-12 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            <div className="flex items-center justify-between py-2 mb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isDark ? 'bg-[#202020] text-white' : 'bg-black text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-base font-bold tracking-tight">
                  Memento AI Assistant
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isDark
                    ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                    : 'bg-[#f0f1f4] text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p
              className={`text-xs mb-4 ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              Ask questions, summarize notes, or brainstorm fresh ideas.
            </p>

            <div className="space-y-2 mb-4">
              {samplePrompts.map((sp) => (
                <button
                  key={sp}
                  type="button"
                  onClick={() => setPrompt(sp.replace(/^[^\s]+\s/, ''))}
                  className={`w-full text-left text-xs px-3.5 py-2.5 rounded-xl transition-all active:scale-[0.99] ${
                    isDark
                      ? 'bg-[#1a1a1a] hover:bg-[#222222] text-neutral-300'
                      : 'bg-[#f3f4f7] hover:bg-[#ebecee] text-neutral-700'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>

            <div
              className={`flex items-center rounded-2xl px-3.5 py-2 shadow-inner ${
                isDark ? 'bg-[#181818]' : 'bg-[#f0f1f4]'
              }`}
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask or summarize anything..."
                className={`w-full bg-transparent text-sm focus:outline-none ${
                  isDark
                    ? 'text-white placeholder:text-neutral-500'
                    : 'text-neutral-900 placeholder:text-neutral-400'
                }`}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!prompt.trim()}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  prompt.trim()
                    ? isDark
                      ? 'bg-white text-black active:scale-95'
                      : 'bg-black text-white active:scale-95'
                    : 'opacity-30 text-neutral-500'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
