import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KeyRound,
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Lock,
  FileText,
  User,
  Pencil,
} from 'lucide-react';
import { ThemeMode, NoteItem } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';

interface PassKeyDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  note: NoteItem | null;
  onClose: () => void;
  onEdit?: (note: NoteItem) => void;
  onDelete?: (id: string) => void;
}

export function PassKeyDrawer({
  isOpen,
  theme,
  note,
  onClose,
  onEdit,
  onDelete,
}: PassKeyDrawerProps) {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();

  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  if (!note) return null;

  // Extract email, password, and notes cleanly
  let email = note.email || '';
  let password = note.password || '';
  let secretNotes = '';

  if (note.content) {
    const lines = note.content.split('\n');
    for (const line of lines) {
      if (!email && line.startsWith('Email/Username: ')) {
        email = line.replace('Email/Username: ', '').trim();
      } else if (!password && line.startsWith('Password: ')) {
        password = line.replace('Password: ', '').trim();
      } else if (line.startsWith('Notes: ')) {
        const n = line.replace('Notes: ', '').trim();
        secretNotes = secretNotes ? `${secretNotes}\n${n}` : n;
      } else if (!line.startsWith('Email/Username: ') && !line.startsWith('Password: ')) {
        const trimmed = line.trim();
        if (trimmed && trimmed !== email) {
          secretNotes = secretNotes ? `${secretNotes}\n${trimmed}` : trimmed;
        }
      }
    }
  }

  const handleCopy = (text: string, field: 'username' | 'password') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
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

          {/* Dialog/Drawer Sheet */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { type: 'spring', damping: 30, stiffness: 340 }
            }
            className={`relative w-full max-w-md md:max-w-lg mx-auto rounded-t-[28px] md:rounded-[28px] pt-3 md:pt-6 pb-7 px-5 md:px-7 shadow-2xl flex flex-col max-h-[88vh] md:max-h-[80vh] overflow-hidden transition-colors ${
              isDark ? 'bg-[#121212] text-white' : 'bg-[#ffffff] text-neutral-900'
            }`}
          >
            {/* Top drag pill (mobile only) */}
            <div className="flex justify-center pb-2 md:hidden">
              <div
                className={`w-9 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Header: Title + Key icon + Close & Delete */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-[#1e1e1e] text-neutral-200' : 'bg-neutral-100 text-neutral-800'
                  }`}
                >
                  <KeyRound className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold tracking-tight truncate leading-tight">
                    {note.title}
                  </h2>
                  <div
                    className={`text-[11px] flex items-center gap-1.5 mt-0.5 ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    <span>{note.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onEdit && (
                  <button
                    id="passkey-drawer-edit-btn"
                    type="button"
                    onClick={() => onEdit(note)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                      isDark
                        ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                    }`}
                    aria-label="Edit entry"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}

                {onDelete && (
                  <button
                    id="passkey-drawer-delete-btn"
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
                    aria-label="Delete entry"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  id="passkey-drawer-close-btn"
                  type="button"
                  onClick={onClose}
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#1e1e1e] text-neutral-300 hover:text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                  aria-label="Close details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Details Body */}
            <div className="space-y-2.5 pt-3 pb-1 overflow-y-auto no-scrollbar">
              {/* 1. Account / Username / Email */}
              <div
                className={`p-3.5 rounded-2xl transition-colors ${
                  isDark ? 'bg-[#1a1a1a]' : 'bg-neutral-100/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <User
                      className={`w-3.5 h-3.5 ${
                        isDark ? 'text-neutral-500' : 'text-neutral-400'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      Email or Username
                    </span>
                  </div>
                  {email && (
                    <button
                      type="button"
                      onClick={() => handleCopy(email, 'username')}
                      className={`h-6 px-2 rounded-lg flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all ${
                        copiedField === 'username'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isDark
                          ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                          : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                      }`}
                    >
                      {copiedField === 'username' ? (
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
                  )}
                </div>
                <div
                  className={`text-sm font-mono break-all select-all ${
                    email
                      ? isDark
                        ? 'text-neutral-200'
                        : 'text-neutral-900'
                      : 'text-neutral-500 italic font-sans text-xs'
                  }`}
                >
                  {email || 'No username or email provided'}
                </div>
              </div>

              {/* 2. Password / Key */}
              <div
                className={`p-3.5 rounded-2xl transition-colors ${
                  isDark ? 'bg-[#1a1a1a]' : 'bg-neutral-100/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Lock
                      className={`w-3.5 h-3.5 ${
                        isDark ? 'text-neutral-500' : 'text-neutral-400'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      Password / Key
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {password && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center active:scale-95 transition-all ${
                            isDark
                              ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                              : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                          }`}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(password, 'password')}
                          className={`h-6 px-2 rounded-lg flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all ${
                            copiedField === 'password'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : isDark
                              ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                              : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                          }`}
                        >
                          {copiedField === 'password' ? (
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
                      </>
                    )}
                  </div>
                </div>
                <div
                  className={`text-sm font-mono tracking-wide break-all select-all ${
                    password
                      ? isDark
                        ? 'text-white font-medium'
                        : 'text-neutral-900 font-medium'
                      : 'text-neutral-500 italic font-sans text-xs'
                  }`}
                >
                  {password
                    ? showPassword
                      ? password
                      : '••••••••••••••••'
                    : 'No password or key provided'}
                </div>
              </div>

              {/* 3. Notes (if present) */}
              {secretNotes && (
                <div
                  className={`p-3.5 rounded-2xl transition-colors ${
                    isDark ? 'bg-[#1a1a1a]' : 'bg-neutral-100/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <FileText
                      className={`w-3.5 h-3.5 ${
                        isDark ? 'text-neutral-500' : 'text-neutral-400'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      Notes / Hint
                    </span>
                  </div>
                  <div
                    className={`text-xs whitespace-pre-wrap leading-relaxed ${
                      isDark ? 'text-neutral-300' : 'text-neutral-700'
                    }`}
                  >
                    {secretNotes}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
