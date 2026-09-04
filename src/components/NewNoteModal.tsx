import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { ThemeMode } from '../types';

interface NewNoteModalProps {
  isOpen: boolean;
  theme: ThemeMode;
  onClose: () => void;
  onSaveNote: (title: string, content: string) => void;
}

export function NewNoteModal({ isOpen, theme, onClose, onSaveNote }: NewNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setContent('');
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 120);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (title.trim() || content.trim()) {
      onSaveNote(title.trim() || 'Untitled note', content.trim());
    }
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
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={`relative w-full max-w-md mx-auto rounded-t-3xl p-5 pb-8 shadow-2xl flex flex-col transition-colors ${
              isDark ? 'bg-[#121215] text-white' : 'bg-[#ffffff] text-neutral-900'
            }`}
          >
            <div className="flex justify-center pb-2">
              <div
                className={`w-10 h-1 rounded-full ${
                  isDark ? 'bg-neutral-700' : 'bg-neutral-300'
                }`}
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <span
                className={`text-sm font-semibold ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}
              >
                New Note
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isDark
                      ? 'bg-[#1c1c22] text-neutral-400 hover:text-white'
                      : 'bg-[#f0f1f4] text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className={`h-8 px-3.5 rounded-full flex items-center gap-1.5 font-medium text-xs active:scale-95 transition-all ${
                    isDark
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title..."
                className={`w-full bg-transparent text-xl font-semibold placeholder:text-neutral-500 focus:outline-none ${
                  isDark ? 'text-white' : 'text-neutral-900'
                }`}
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your thoughts..."
                rows={6}
                className={`w-full bg-transparent text-sm placeholder:text-neutral-500 focus:outline-none resize-none ${
                  isDark ? 'text-neutral-200' : 'text-neutral-700'
                }`}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
