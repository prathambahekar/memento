import { useState, useRef, useEffect, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, Bookmark, Copy, Trash2, Pencil, Check } from 'lucide-react';
import { ThemeMode } from '../types';
import { triggerHaptic } from '../lib/capacitor';

interface SubDrawerMoreMenuProps {
  theme: ThemeMode;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onCopy?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  copyLabel?: string;
  itemTypeLabel?: string;
}

export function SubDrawerMoreMenu({
  theme,
  isFavorite = false,
  onToggleFavorite,
  onCopy,
  onEdit,
  onDelete,
  copyLabel = 'Copy Content',
  itemTypeLabel = 'Item',
}: SubDrawerMoreMenuProps) {
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggleMenu = (e: MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    setIsOpen((prev) => !prev);
  };

  const handleAction = (action?: () => void) => {
    if (!action) return;
    triggerHaptic('light');
    action();
    setIsOpen(false);
  };

  const handleCopy = () => {
    if (!onCopy) return;
    triggerHaptic('light');
    onCopy();
    setHasCopied(true);
    setTimeout(() => {
      setHasCopied(false);
      setIsOpen(false);
    }, 800);
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* The More (...) Button */}
      <button
        id="sub-drawer-more-btn"
        type="button"
        aria-label="More options"
        title="More options"
        onClick={handleToggleMenu}
        className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
          isOpen
            ? isDark
              ? 'bg-[#2a2a2a] text-white'
              : 'bg-neutral-200 text-neutral-900'
            : isDark
            ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
            : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
        }`}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Popover Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className={`absolute right-0 top-full mt-2 z-50 w-48 rounded-2xl p-1.5 shadow-2xl border ${
              isDark
                ? 'bg-[#18181b] border-neutral-800 text-neutral-200 shadow-black/80'
                : 'bg-white border-neutral-200 text-neutral-800 shadow-xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-0.5">
              {/* Toggle Favorite */}
              {onToggleFavorite && (
                <button
                  type="button"
                  onClick={() => handleAction(onToggleFavorite)}
                  className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors ${
                    isDark
                      ? 'hover:bg-[#27272a] text-neutral-200 active:bg-[#3f3f46]'
                      : 'hover:bg-neutral-100 text-neutral-800 active:bg-neutral-200'
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 stroke-[2] ${
                      isFavorite
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-neutral-400 dark:text-neutral-400'
                    }`}
                  />
                  <span>{isFavorite ? 'Remove from Fav' : 'Add to Fav'}</span>
                </button>
              )}

              {/* Copy Action */}
              {onCopy && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors ${
                    isDark
                      ? 'hover:bg-[#27272a] text-neutral-200 active:bg-[#3f3f46]'
                      : 'hover:bg-neutral-100 text-neutral-800 active:bg-neutral-200'
                  }`}
                >
                  {hasCopied ? (
                    <Check className="w-4 h-4 text-emerald-500 stroke-[2.5]" />
                  ) : (
                    <Copy className="w-4 h-4 text-neutral-400 dark:text-neutral-400 stroke-[2]" />
                  )}
                  <span>{hasCopied ? 'Copied!' : copyLabel}</span>
                </button>
              )}

              {/* Edit Action */}
              {onEdit && (
                <button
                  type="button"
                  onClick={() => handleAction(onEdit)}
                  className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors ${
                    isDark
                      ? 'hover:bg-[#27272a] text-neutral-200 active:bg-[#3f3f46]'
                      : 'hover:bg-neutral-100 text-neutral-800 active:bg-neutral-200'
                  }`}
                >
                  <Pencil className="w-4 h-4 text-neutral-400 dark:text-neutral-400 stroke-[2]" />
                  <span>Edit {itemTypeLabel}</span>
                </button>
              )}

              {/* Delete Action */}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    onDelete();
                    setIsOpen(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors text-red-500 hover:bg-red-500/10 active:bg-red-500/15"
                >
                  <Trash2 className="w-4 h-4 text-red-500 stroke-[2]" />
                  <span>Delete {itemTypeLabel}</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
