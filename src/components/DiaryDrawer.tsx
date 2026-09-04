import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  X,
  Trash2,
  Calendar,
  Mic,
  Copy,
  Check,
  Pencil,
} from 'lucide-react';
import { useState } from 'react';
import { ThemeMode, NoteItem } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';

interface DiaryDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  note: NoteItem | null;
  onClose: () => void;
  onEdit?: (note: NoteItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

export function DiaryDrawer({
  isOpen,
  theme,
  note,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}: DiaryDrawerProps) {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();
  const [copied, setCopied] = useState(false);

  if (!note) return null;

  const handleCopy = () => {
    const fullText = `${note.title}\n\n${note.content || ''}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Drawer / Modal Sheet */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { type: 'spring', damping: 30, stiffness: 340 }
            }
            className={`relative w-full max-w-md md:max-w-lg mx-auto rounded-t-[28px] md:rounded-[28px] pt-3 md:pt-6 pb-6 px-5 md:px-7 shadow-2xl flex flex-col max-h-[88vh] md:max-h-[82vh] overflow-hidden transition-colors ${
              isDark ? 'bg-[#121212] text-white' : 'bg-[#ffffff] text-neutral-900'
            }`}
          >
            {/* Top drag handle (mobile only) */}
            <div className="flex justify-center pb-2 md:hidden">
              <div
                className={`w-9 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between py-2 border-b border-transparent">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-[#1e1e1e] text-neutral-200' : 'bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <BookOpen className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold tracking-tight truncate leading-tight">
                    {note.title}
                  </h2>
                  <div
                    className={`text-[11.5px] flex items-center gap-1.5 mt-0.5 ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {note.date}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onEdit && (
                  <button
                    id="diary-drawer-edit-btn"
                    type="button"
                    onClick={() => onEdit(note)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                      isDark
                        ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                    }`}
                    aria-label="Edit note"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}

                {onDelete && (
                  <button
                    id="diary-drawer-delete-btn"
                    type="button"
                    onClick={() => {
                      onDelete(note.id);
                      onClose();
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all text-neutral-400 hover:text-red-400 ${
                      isDark
                        ? 'bg-[#1e1e1e] hover:bg-red-500/10'
                        : 'bg-neutral-100 hover:bg-red-50'
                    }`}
                    aria-label="Delete note"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  id="diary-drawer-close-btn"
                  type="button"
                  onClick={onClose}
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#1e1e1e] text-neutral-300 hover:text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                  aria-label="Close"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note Content Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 py-3 my-1">
              {note.hasVoiceNote && (
                <div
                  className={`p-3 rounded-2xl flex items-center gap-2.5 text-xs ${
                    isDark ? 'bg-[#1a1a1a] text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  <span>Voice memo attached to this entry</span>
                </div>
              )}

              {note.imageUrl && (
                <div className="rounded-2xl overflow-hidden max-h-48 border border-neutral-800">
                  <img
                    src={note.imageUrl}
                    alt={note.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div
                className={`p-3.5 sm:p-4 rounded-2xl transition-colors ${
                  isDark ? 'bg-[#181818]' : 'bg-neutral-100/80'
                }`}
              >
                <div className="flex items-center justify-end mb-2">
                  <button
                    id="diary-card-copy-btn"
                    type="button"
                    onClick={handleCopy}
                    className={`h-6 px-2 rounded-lg flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all ${
                      copied
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : isDark
                        ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                        : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                    }`}
                    title={copied ? 'Copied' : 'Copy'}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div
                  className={`leading-relaxed text-sm whitespace-pre-wrap ${
                    isDark ? 'text-neutral-200' : 'text-neutral-800'
                  }`}
                >
                  {note.content || 'No content written in this note.'}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
