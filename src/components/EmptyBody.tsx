import { motion } from 'motion/react';
import {
  Feather,
  Plus,
  ListTodo,
  Shield,
  Bookmark,
  Mic,
  KeyRound,
  BookOpen,
  Archive,
  Check,
} from 'lucide-react';
import { NavTab, ThemeMode, NoteItem, TodoSubItem } from '../types';
import { parseTodoItemsFromNote } from './TodoDrawer';

export type { NoteItem };

interface EmptyBodyProps {
  activeTab: NavTab;
  theme: ThemeMode;
  notes: NoteItem[];
  searchQuery: string;
  onOpenNewNote: () => void;
  onSelectNote?: (note: NoteItem) => void;
  onToggleTodoItem?: (noteId: string, itemId: string) => void;
}

function getCleanNonTodoContent(note: NoteItem): string {
  if (note.entryType !== 'todo' && !note.isTodo) return note.content || '';
  if (!note.content) return '';
  const cleaned = note.content
    .replace(/\[(x|X|\s*)\]\s*[^\[\n\r]*/g, '')
    .split('\n')
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
  return cleaned;
}

export function EmptyBody({
  activeTab,
  theme,
  notes,
  searchQuery,
  onOpenNewNote,
  onSelectNote,
  onToggleTodoItem,
}: EmptyBodyProps) {
  const isDark = theme === 'dark';

  // Filter notes by tab and search
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      searchQuery === '' ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'archive') return !!n.isArchived;
    if (n.isArchived) return false;
    if (activeTab === 'favorites') return !!n.isFavorite;
    if (activeTab === 'diary') return n.entryType === 'diary';
    if (activeTab === 'todo') return !!n.isTodo || n.entryType === 'todo';
    if (activeTab === 'vault' || activeTab === 'safe') return !!(n.isSafe || n.isVault || n.entryType === 'passwords');
    return true;
  });

  // If there are notes to show
  if (filteredNotes.length > 0) {
    return (
      <main className="flex-1 min-h-0 w-full px-3.5 sm:px-5 md:px-8 lg:px-10 pt-3 md:pt-6 pb-28 md:pb-8 overflow-y-auto overscroll-contain no-scrollbar">
        {/* Pinterest-style Masonry Multi-column Grid */}
        <div className="columns-2 sm:columns-2 md:columns-3 lg:columns-4 gap-3 md:gap-3.5">
          {filteredNotes.map((note) => {
            const isPassKey = note.entryType === 'passwords' || !!note.isSafe;
            const isTodo = note.entryType === 'todo' || !!note.isTodo;
            const todoItems: TodoSubItem[] = isTodo ? parseTodoItemsFromNote(note) : [];
            const completedCount = todoItems.filter((t) => t.completed).length;
            const totalCount = todoItems.length;
            const cleanContent = getCleanNonTodoContent(note);

            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onSelectNote?.(note)}
                className={`break-inside-avoid inline-block w-full mb-3 md:mb-3.5 p-3.5 sm:p-4 rounded-2xl active:scale-[0.99] transition-all cursor-pointer shadow-xs border border-transparent hover:border-neutral-200/60 dark:hover:border-neutral-800/80 ${
                  isDark
                    ? 'bg-[#141414] hover:bg-[#1a1a1a]'
                    : 'bg-[#ffffff] hover:bg-[#fafafa]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className={`text-sm sm:text-base font-semibold tracking-tight break-words min-w-0 ${
                        isDark ? 'text-white' : 'text-neutral-900'
                      }`}
                    >
                      {note.title}
                    </h3>
                    {/* Badges: Icon-only (no label text) */}
                    {isPassKey && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNote?.(note);
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          isDark
                            ? 'bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                        }`}
                        title="Password / Key"
                        aria-label="Password / Key"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isTodo && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectNote?.(note);
                        }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 ${
                          completedCount === totalCount && totalCount > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isDark
                            ? 'bg-[#222222] hover:bg-[#2c2c2c] text-neutral-300'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                        }`}
                        title="Todo checklist"
                        aria-label="Todo checklist"
                      >
                        <ListTodo className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!isPassKey && !isTodo && note.entryType === 'diary' && (
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isDark
                            ? 'bg-[#222222] text-neutral-300'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                        title="Diary"
                        aria-label="Diary"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Todo Card Body: clean interactive tasks (progress bar removed) */}
                  {isTodo && (
                    <div className="mt-2 space-y-2">
                      {todoItems.length > 0 ? (
                        <div className="space-y-1.5 pt-0.5">
                          {todoItems.slice(0, 8).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 group/task"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTodoItem?.(note.id, item.id);
                                }}
                                className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all ${
                                  item.completed
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : isDark
                                    ? 'border border-neutral-600 hover:border-neutral-400 bg-[#1c1c1c]'
                                    : 'border border-neutral-300 hover:border-neutral-500 bg-white'
                                }`}
                                title={item.completed ? 'Mark pending' : 'Mark done'}
                              >
                                {item.completed && (
                                  <Check className="w-3 h-3 stroke-[3]" />
                                )}
                              </button>
                              <span
                                className={`text-xs truncate select-none ${
                                  item.completed
                                    ? 'line-through text-neutral-500'
                                    : isDark
                                    ? 'text-neutral-300'
                                    : 'text-neutral-700'
                                }`}
                              >
                                {item.text}
                              </span>
                            </div>
                          ))}

                          {todoItems.length > 8 && (
                            <div
                              className={`text-[10.5px] font-medium pt-0.5 ${
                                isDark ? 'text-neutral-500' : 'text-neutral-400'
                              }`}
                            >
                              +{todoItems.length - 8} more tasks
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-500 italic py-1">
                          No tasks yet • Click to add
                        </div>
                      )}

                      {cleanContent && (
                        <p
                          className={`text-xs mt-1.5 line-clamp-4 leading-relaxed break-words ${
                            isDark ? 'text-neutral-400' : 'text-neutral-600'
                          }`}
                        >
                          {cleanContent}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Password / Key Content Preview */}
                  {isPassKey && (
                    <div className="mt-2 space-y-1">
                      {note.email && (
                        <div className="text-[11.5px] font-mono text-neutral-400 truncate">
                          {note.email}
                        </div>
                      )}
                      {note.content && !note.email && (
                        <p
                          className={`text-xs line-clamp-3 leading-relaxed break-words ${
                            isDark ? 'text-neutral-400' : 'text-neutral-600'
                          }`}
                        >
                          {note.content.split('\n')[0]}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Standard Notes / Diary Content - expanded vertically to show more data */}
                  {!isTodo && !isPassKey && (
                    <div className="mt-2 space-y-1.5">
                      {note.email && (
                        <div className="text-[11.5px] font-mono text-neutral-400 truncate">
                          {note.email}
                        </div>
                      )}

                      {note.content && (
                        <p
                          className={`text-xs line-clamp-8 leading-relaxed break-words whitespace-pre-line ${
                            isDark ? 'text-neutral-400' : 'text-neutral-600'
                          }`}
                        >
                          {note.content}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer: Date removed completely as requested; showing voice/photo indicator if present */}
                {(note.hasVoiceNote || note.imageUrl) && (
                  <div
                    className={`mt-2.5 flex items-center justify-end text-[11px] ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {note.hasVoiceNote && (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <Mic className="w-3 h-3" />
                          <span>Voice</span>
                        </span>
                      )}
                      {note.imageUrl && (
                        <span className="text-blue-500">Photo</span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>
    );
  }

  const getEmptyState = () => {
    if (searchQuery) {
      return {
        Icon: Feather,
        title: 'No notes found',
        desc: `No notes matching "${searchQuery}".`,
        btn: null,
      };
    }
    if (activeTab === 'todo') {
      return {
        Icon: ListTodo,
        title: 'No tasks yet',
        desc: 'Keep track of your day. Tap the plus button to add your first todo.',
        btn: 'Add task',
      };
    }
    if (activeTab === 'vault' || activeTab === 'safe') {
      return {
        Icon: Shield,
        title: 'Safe is empty',
        desc: 'Confidential and secure space. Tap the plus button to store private notes.',
        btn: 'Add to safe',
      };
    }
    if (activeTab === 'favorites') {
      return {
        Icon: Bookmark,
        title: 'No favorite notes',
        desc: 'Mark notes to keep your most important thoughts easily accessible.',
        btn: 'Create note',
      };
    }
    if (activeTab === 'diary') {
      return {
        Icon: BookOpen,
        title: 'No diary entries yet',
        desc: 'Reflect and journal your daily thoughts privately.',
        btn: 'Write journal',
      };
    }
    if (activeTab === 'archive') {
      return {
        Icon: Archive,
        title: 'Archive is empty',
        desc: 'Archived notes will be preserved here safely away from your main stream.',
        btn: null,
      };
    }
    return {
      Icon: Feather,
      title: 'Capture your thoughts',
      desc: 'A clean slate awaits. Tap the plus button to jot down an idea or reminder.',
      btn: 'Create first note',
    };
  };

  const emptyState = getEmptyState();
  const Icon = emptyState.Icon;

  // Pure clean, beautiful empty body without splitting lines
  return (
    <main
      id="empty-body"
      className="flex-1 min-h-0 w-full px-6 flex flex-col items-center justify-center text-center pb-28 md:pb-8 overflow-y-auto overscroll-contain select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-xs flex flex-col items-center"
      >
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${
            isDark
              ? 'bg-[#181818] text-neutral-400 shadow-sm'
              : 'bg-[#eeeff2] text-neutral-600 shadow-sm'
          }`}
        >
          <Icon className="w-6 h-6 stroke-[1.6]" />
        </div>

        <h2
          className={`text-lg font-medium tracking-tight ${
            isDark ? 'text-neutral-200' : 'text-neutral-800'
          }`}
        >
          {emptyState.title}
        </h2>

        <p
          className={`text-xs mt-1.5 leading-relaxed max-w-[240px] ${
            isDark ? 'text-neutral-500' : 'text-neutral-500'
          }`}
        >
          {emptyState.desc}
        </p>

        {emptyState.btn && (
          <button
            type="button"
            onClick={onOpenNewNote}
            className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium active:scale-95 transition-all shadow-sm ${
              isDark
                ? 'bg-[#181818] hover:bg-[#222222] text-neutral-300 hover:text-white'
                : 'bg-[#eeeff2] hover:bg-[#e4e6ea] text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{emptyState.btn}</span>
          </button>
        )}
      </motion.div>
    </main>
  );
}
