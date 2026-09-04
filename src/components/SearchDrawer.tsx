import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Clock, FileText, Sparkles, Plus, KeyRound } from 'lucide-react';
import { ThemeMode } from '../types';
import { NoteItem } from './EmptyBody';
import { useIsDesktop } from '../hooks/useIsDesktop';

interface SearchDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  notes: NoteItem[];
  onClose: () => void;
  onSelectNote: (note: NoteItem) => void;
  onCreateWithTitle: (title: string) => void;
}

export function SearchDrawer({
  isOpen,
  theme,
  notes,
  onClose,
  onSelectNote,
  onCreateWithTitle,
}: SearchDrawerProps) {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'recent'>('all');
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  const recentTags = ['Ideas', 'Personal', 'Work', 'Reading', 'Tasks'];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const filteredNotes = notes.filter((n) => {
    if (activeFilter === 'favorites' && !n.isFavorite) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  });

  const handleSelect = (note: NoteItem) => {
    onSelectNote(note);
    onClose();
  };

  const handleCreateNew = () => {
    if (query.trim()) {
      onCreateWithTitle(query.trim());
    } else {
      onCreateWithTitle('New Note');
    }
    onClose();
  };

  const isDesktop = useIsDesktop();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog/Drawer Sheet */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { type: 'spring', damping: 28, stiffness: 300 }
            }
            className={`relative w-full max-w-md md:max-w-xl mx-auto rounded-t-3xl md:rounded-3xl pt-3 md:pt-6 pb-8 px-5 md:px-7 shadow-2xl flex flex-col max-h-[85vh] md:max-h-[80vh] transition-colors duration-200 ${
              isDark ? 'bg-[#121212] text-white' : 'bg-white text-neutral-900'
            }`}
          >
            {/* Top drag handle indicator (mobile only) */}
            <div className="flex justify-center pb-3 md:hidden">
              <div
                className={`w-12 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Header: Title & Close */}
            <div className="flex items-center justify-between px-1 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold tracking-tight">Search</span>
              </div>
              <button
                id="search-drawer-close-btn"
                type="button"
                onClick={onClose}
                aria-label="Close search"
                className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                  isDark
                    ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                    : 'bg-[#f0f1f4] text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Box */}
            <div
              className={`flex items-center rounded-2xl px-3.5 py-3 mb-3 shadow-inner transition-colors ${
                isDark ? 'bg-[#181818]' : 'bg-[#f0f1f4]'
              }`}
            >
              <Search
                className={`w-4 h-4 mr-2.5 shrink-0 ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}
                strokeWidth={2}
              />
              <input
                ref={inputRef}
                id="search-drawer-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes, ideas, tags..."
                className={`w-full bg-transparent text-sm font-medium focus:outline-none ${
                  isDark
                    ? 'text-white placeholder:text-neutral-500'
                    : 'text-neutral-900 placeholder:text-neutral-400'
                }`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear query"
                  className={`p-1 active:scale-90 transition-transform ${
                    isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar py-0.5">
              {(
                [
                  { id: 'all', label: 'All Notes' },
                  { id: 'favorites', label: 'Favorites' },
                  { id: 'recent', label: 'Recent' },
                ] as const
              ).map((tab) => {
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap active:scale-95 transition-all ${
                      isActive
                        ? isDark
                          ? 'bg-white text-black'
                          : 'bg-neutral-900 text-white'
                        : isDark
                        ? 'bg-[#1a1a1a] text-neutral-400 hover:text-neutral-200'
                        : 'bg-[#f2f3f6] text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Results list or Empty Suggestions */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 min-h-[160px] max-h-[42vh] pr-0.5">
              {filteredNotes.length > 0 ? (
                <div className="space-y-2">
                  <div
                    className={`text-[11px] font-semibold tracking-wider uppercase px-1 pt-1 ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    {query ? `Matches (${filteredNotes.length})` : 'Notes'}
                  </div>

                  {filteredNotes.map((note) => {
                    const isPassKey = note.entryType === 'passwords' || !!note.isSafe;

                    return (
                      <div
                        key={note.id}
                        onClick={() => handleSelect(note)}
                        role="button"
                        tabIndex={0}
                        className={`p-3.5 rounded-2xl cursor-pointer active:scale-[0.99] transition-all text-left ${
                          isDark
                            ? 'bg-[#1a1a1a] hover:bg-[#222222]'
                            : 'bg-[#f6f7fa] hover:bg-[#eceef2]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold tracking-tight truncate">
                            {note.title}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {isPassKey && (
                              <span
                                className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-medium flex items-center gap-1 ${
                                  isDark
                                    ? 'bg-[#262626] text-neutral-300'
                                    : 'bg-neutral-200 text-neutral-700'
                                }`}
                              >
                                <KeyRound className="w-2.5 h-2.5" />
                                <span>Key</span>
                              </span>
                            )}
                            <span
                              className={`text-[11px] ${
                                isDark ? 'text-neutral-500' : 'text-neutral-400'
                              }`}
                            >
                              {note.date}
                            </span>
                          </div>
                        </div>
                        {!isPassKey && note.content && (
                          <p
                            className={`text-xs line-clamp-2 leading-relaxed ${
                              isDark ? 'text-neutral-400' : 'text-neutral-600'
                            }`}
                          >
                            {note.content}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : query ? (
                /* No matches found */
                <div className="py-8 flex flex-col items-center justify-center text-center">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center mb-3 ${
                      isDark ? 'bg-[#181818] text-neutral-500' : 'bg-[#f0f1f4] text-neutral-400'
                    }`}
                  >
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium">No results for &ldquo;{query}&rdquo;</p>
                  <p
                    className={`text-xs mt-1 max-w-[220px] ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    Would you like to start a new note with this title?
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className={`mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold active:scale-95 transition-all shadow-sm ${
                      isDark
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-black text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create &ldquo;{query}&rdquo;</span>
                  </button>
                </div>
              ) : (
                /* Empty query state with quick suggestions & tags */
                <div className="py-4 space-y-4">
                  <div>
                    <div
                      className={`text-[11px] font-semibold tracking-wider uppercase px-1 mb-2 flex items-center gap-1.5 ${
                        isDark ? 'text-neutral-500' : 'text-neutral-400'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Suggested Topics</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => setQuery(tag)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium active:scale-95 transition-all ${
                            isDark
                              ? 'bg-[#1a1a1a] text-neutral-300 hover:bg-[#222222]'
                              : 'bg-[#f3f4f7] text-neutral-700 hover:bg-[#eaebef]'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl flex items-center gap-3 ${
                      isDark ? 'bg-[#181818]' : 'bg-[#f6f7fa]'
                    }`}
                  >
                    <Clock
                      className={`w-4 h-4 shrink-0 ${
                        isDark ? 'text-neutral-500' : 'text-neutral-400'
                      }`}
                    />
                    <p
                      className={`text-xs ${
                        isDark ? 'text-neutral-400' : 'text-neutral-500'
                      }`}
                    >
                      Quick search across titles, note content, and favorite items.
                    </p>
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
