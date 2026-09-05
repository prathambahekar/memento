import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Archive, X, RotateCcw, Trash2, Check, ChevronRight } from 'lucide-react';
import { ThemeMode, NoteItem } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { triggerHaptic } from '../lib/capacitor';
import { parseTodoItemsFromNote } from './TodoDrawer';

interface ArchiveDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  archivedLists: NoteItem[];
  onClose: () => void;
  onSelectList: (note: NoteItem) => void;
  onRestoreList: (note: NoteItem) => void;
  onDeleteList: (noteId: string) => void;
}

export const ArchiveDrawer: React.FC<ArchiveDrawerProps> = ({
  isOpen,
  theme,
  archivedLists,
  onClose,
  onSelectList,
  onRestoreList,
  onDeleteList,
}) => {
  const isDesktop = useIsDesktop();
  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="archive-drawer-overlay"
          className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { type: 'spring', damping: 30, stiffness: 340 }
            }
            className={`relative w-full max-w-md md:max-w-lg mx-auto rounded-t-[28px] md:rounded-[28px] pt-3 md:pt-6 pb-6 px-5 md:px-7 shadow-2xl flex flex-col max-h-[85vh] md:max-h-[80vh] overflow-hidden transition-colors ${
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

            {/* Header: Clean, borderless without split line matching app OG theme */}
            <div className="flex items-center justify-between pt-1 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    isDark
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <Archive className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      className={`text-lg font-bold tracking-tight leading-tight truncate ${
                        isDark ? 'text-white' : 'text-neutral-900'
                      }`}
                    >
                      Archive
                    </h2>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                        isDark
                          ? 'bg-[#1e1e1e] text-neutral-400'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {archivedLists.length} list{archivedLists.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    Past daily lists and archived todo collections
                  </p>
                </div>
              </div>

              {/* Close Button styled identically to TodoDrawer and DayDetailsDrawer */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                  isDark
                    ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                }`}
                aria-label="Close archive drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto pr-0.5 space-y-2.5 min-h-[160px] no-scrollbar">
              {archivedLists.length === 0 ? (
                <div
                  id="archive-empty-state"
                  className="py-14 px-4 flex flex-col items-center justify-center text-center select-none"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-xs flex flex-col items-center"
                  >
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center mb-3.5 transition-colors shadow-xs ${
                        isDark
                          ? 'bg-[#18181b] text-neutral-400 border border-neutral-800/80'
                          : 'bg-[#eeeff2] text-neutral-600 border border-neutral-200/80'
                      }`}
                    >
                      <Archive className="w-6 h-6 stroke-[1.7]" />
                    </div>

                    <h3
                      className={`text-base font-semibold tracking-tight ${
                        isDark ? 'text-neutral-200' : 'text-neutral-800'
                      }`}
                    >
                      Archive is empty
                    </h3>

                    <p
                      className={`text-xs mt-1.5 leading-relaxed max-w-[250px] ${
                        isDark ? 'text-neutral-500' : 'text-neutral-400'
                      }`}
                    >
                      Archived todo lists and past daily items will be preserved here safely.
                    </p>
                  </motion.div>
                </div>
              ) : (
                archivedLists.map((list) => {
                  const items = parseTodoItemsFromNote(list);
                  const completedCount = items.filter((t) => t.completed).length;
                  const totalCount = items.length;

                  return (
                    <div
                      key={`archived-item-${list.id}`}
                      onClick={() => {
                        triggerHaptic('light');
                        onSelectList(list);
                      }}
                      className={`group w-full p-3.5 sm:p-4 rounded-[22px] cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between gap-3 border shadow-xs select-none ${
                        isDark
                          ? 'bg-[#141416] hover:bg-[#18181b] border-neutral-800/80 hover:border-neutral-700/80 text-neutral-100'
                          : 'bg-white hover:bg-[#fafafc] border-neutral-200/80 hover:border-neutral-300 text-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                            completedCount === totalCount && totalCount > 0
                              ? isDark
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                : 'bg-emerald-50 text-emerald-600 border border-emerald-200/70'
                              : isDark
                              ? 'bg-[#1e1e1e] text-neutral-400 border border-neutral-800/80'
                              : 'bg-neutral-100 text-neutral-600 border border-neutral-200/80'
                          }`}
                        >
                          <Archive className="w-4.5 h-4.5 stroke-[1.8]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm font-semibold tracking-tight truncate leading-snug ${
                                isDark ? 'text-white' : 'text-neutral-900'
                              }`}
                            >
                              {list.title || 'Archived List'}
                            </h4>
                            {list.isTodayList && (
                              <span
                                className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                                  isDark
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                }`}
                              >
                                Past Today
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {totalCount > 0 ? (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
                                  completedCount === totalCount
                                    ? isDark
                                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : isDark
                                    ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                }`}
                              >
                                <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-300 shrink-0 stroke-[2.5]" />
                                <span className="font-semibold">
                                  {completedCount}/{totalCount}
                                </span>
                              </span>
                            ) : (
                              <span
                                className={`text-xs ${
                                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                                }`}
                              >
                                No tasks
                              </span>
                            )}
                            {list.date && (
                              <span
                                className={`text-[11px] ${
                                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                                }`}
                              >
                                {list.date}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('success');
                            onRestoreList(list);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                            isDark
                              ? 'bg-[#1e1e1e] hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-400'
                              : 'bg-neutral-100 hover:bg-emerald-50 text-neutral-600 hover:text-emerald-600'
                          }`}
                          aria-label="Restore list"
                          title="Restore list to Inbox"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            onDeleteList(list.id);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                            isDark
                              ? 'bg-[#1e1e1e] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400'
                              : 'bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-600'
                          }`}
                          aria-label="Delete list"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <ChevronRight
                          className={`w-4 h-4 ml-0.5 transition-colors ${
                            isDark
                              ? 'text-neutral-600 group-hover:text-neutral-400'
                              : 'text-neutral-400 group-hover:text-neutral-600'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
