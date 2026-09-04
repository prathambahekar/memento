import { motion } from 'motion/react';
import { Feather, Plus, ListTodo, Shield, Bookmark } from 'lucide-react';
import { NavTab, ThemeMode } from '../types';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  date: string;
  isFavorite?: boolean;
  isTodo?: boolean;
  isVault?: boolean;
  isSafe?: boolean;
}

interface EmptyBodyProps {
  activeTab: NavTab;
  theme: ThemeMode;
  notes: NoteItem[];
  searchQuery: string;
  onOpenNewNote: () => void;
  onSelectNote?: (note: NoteItem) => void;
}

export function EmptyBody({
  activeTab,
  theme,
  notes,
  searchQuery,
  onOpenNewNote,
  onSelectNote,
}: EmptyBodyProps) {
  const isDark = theme === 'dark';

  // Filter notes by tab and search
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      searchQuery === '' ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (activeTab === 'favorites') return !!n.isFavorite;
    if (activeTab === 'todo') return !!n.isTodo;
    if (activeTab === 'vault' || activeTab === 'safe') return !!(n.isSafe || n.isVault);
    return true;
  });

  // If there are notes to show
  if (filteredNotes.length > 0) {
    return (
      <main className="flex-1 px-5 pt-3 pb-24 overflow-y-auto no-scrollbar">
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onSelectNote?.(note)}
              className={`p-4 rounded-2xl active:scale-[0.99] transition-all cursor-pointer shadow-sm ${
                isDark
                  ? 'bg-[#141417] hover:bg-[#1b1b20]'
                  : 'bg-[#ffffff] hover:bg-[#fafafa]'
              }`}
            >
              <h3
                className={`text-base font-semibold tracking-tight ${
                  isDark ? 'text-white' : 'text-neutral-900'
                }`}
              >
                {note.title}
              </h3>
              {note.content && (
                <p
                  className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                    isDark ? 'text-neutral-400' : 'text-neutral-600'
                  }`}
                >
                  {note.content}
                </p>
              )}
              <div
                className={`mt-3 flex items-center justify-between text-[11px] ${
                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                <span>{note.date}</span>
              </div>
            </motion.div>
          ))}
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
      className="flex-1 px-6 flex flex-col items-center justify-center text-center pb-20 select-none"
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
              ? 'bg-[#151519] text-neutral-400 shadow-sm'
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
                ? 'bg-[#16161a] hover:bg-[#202026] text-neutral-300 hover:text-white'
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
