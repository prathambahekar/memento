import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, Bookmark, Trash2 } from 'lucide-react';
import { ThemeMode, NoteItem } from '../types';
import { triggerHaptic } from '../lib/capacitor';

interface CardContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  note: NoteItem | null;
  theme: ThemeMode;
  onClose: () => void;
  onEdit: (note: NoteItem) => void;
  onDelete: (noteId: string) => void;
  onToggleFavorite: (noteId: string) => void;
}

export function CardContextMenu({
  isOpen,
  position,
  note,
  theme,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}: CardContextMenuProps) {
  const isDark = theme === 'dark';
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or Window resize/scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScrollOrResize = () => {
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, onClose]);

  // Clamping to screen edges
  const MENU_WIDTH = 210;
  const MENU_HEIGHT = 175;
  const PADDING = 12;

  const posX = position
    ? Math.min(
        Math.max(PADDING, position.x),
        Math.max(PADDING, window.innerWidth - MENU_WIDTH - PADDING)
      )
    : PADDING;

  let posY = position ? position.y : PADDING;
  if (position && posY + MENU_HEIGHT > window.innerHeight - PADDING) {
    posY = Math.max(PADDING, posY - MENU_HEIGHT);
  } else if (position) {
    posY = Math.max(PADDING, posY);
  }

  const handleAction = (action: () => void) => {
    triggerHaptic('light');
    action();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && position && note && (
        <div
          id="card-context-menu-container"
          className="fixed inset-0 z-50 overflow-hidden select-none"
          onContextMenu={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          {/* Transparent backdrop to catch clicks/taps outside */}
          <div
            id="card-context-menu-backdrop"
            onClick={onClose}
            onTouchStart={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="absolute inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-[1.5px] transition-opacity"
          />

          {/* Menu Popover */}
          <motion.div
            ref={menuRef}
            id="card-context-menu-popover"
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.1 } }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ top: `${posY}px`, left: `${posX}px` }}
            className={`absolute w-[200px] rounded-2xl p-1.5 shadow-2xl border transition-colors ${
              isDark
                ? 'bg-[#141414] border-[#262626] text-neutral-200 shadow-black/90'
                : 'bg-white border-neutral-200 text-neutral-800 shadow-xl'
            }`}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Note Title Preview Header (No split line) */}
            <div className="px-2.5 pt-1.5 pb-1">
              <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 truncate">
                {note.title || 'Untitled Note'}
              </p>
            </div>

            <div className="space-y-0.5">
              {/* Action: Edit */}
              <button
                id="context-menu-edit-btn"
                type="button"
                onClick={() => handleAction(() => onEdit(note))}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors ${
                  isDark
                    ? 'hover:bg-[#222222] text-neutral-200 active:bg-[#282828]'
                    : 'hover:bg-neutral-100 text-neutral-800 active:bg-neutral-200'
                }`}
              >
                <Pencil className="w-4 h-4 text-neutral-400 dark:text-neutral-400 stroke-[2]" />
                <span>Edit</span>
              </button>

              {/* Action: Add / Remove Favorite */}
              <button
                id="context-menu-favorite-btn"
                type="button"
                onClick={() => handleAction(() => onToggleFavorite(note.id))}
                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors ${
                  isDark
                    ? 'hover:bg-[#222222] text-neutral-200 active:bg-[#282828]'
                    : 'hover:bg-neutral-100 text-neutral-800 active:bg-neutral-200'
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 stroke-[2] ${
                    note.isFavorite
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-neutral-400 dark:text-neutral-400'
                  }`}
                />
                <span>{note.isFavorite ? 'Remove from Fav' : 'Add to Fav'}</span>
              </button>

              {/* Action: Delete (No split line above) */}
              <button
                id="context-menu-delete-btn"
                type="button"
                onClick={() =>
                  handleAction(() => {
                    triggerHaptic('medium');
                    onDelete(note.id);
                  })
                }
                className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors text-red-500 hover:bg-red-500/10 active:bg-red-500/15"
              >
                <Trash2 className="w-4 h-4 text-red-500 stroke-[2]" />
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
