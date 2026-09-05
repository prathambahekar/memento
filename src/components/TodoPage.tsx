import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  CheckCheck,
  Flag,
  Search,
  X,
} from 'lucide-react';
import { ThemeMode, StandaloneTodoItem } from '../types';
import { triggerHaptic } from '../lib/capacitor';

interface TodoPageProps {
  theme: ThemeMode;
  onBack: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onOpenSearch?: () => void;
  onSaveAsNote?: (title: string, content: string) => void;
}

const DEFAULT_TODOS: StandaloneTodoItem[] = [
  {
    id: 'todo-init-1',
    text: 'Review project goals and milestone targets',
    completed: false,
    category: 'Work',
    priority: 'high',
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'todo-init-2',
    text: 'Organize notes and archive old drafts',
    completed: true,
    category: 'Personal',
    priority: 'medium',
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'todo-init-3',
    text: 'Plan tomorrow’s key focus areas',
    completed: false,
    category: 'Focus',
    priority: 'low',
    createdAt: Date.now() - 3600000 * 1,
  },
];

export function TodoPage({
  theme,
  onBack,
  searchQuery = '',
  onSearchChange,
  onOpenSearch,
}: TodoPageProps) {
  const isDark = theme === 'dark';

  const [todos, setTodos] = useState<StandaloneTodoItem[]>(() => {
    try {
      const saved = localStorage.getItem('memento_standalone_todos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.map((item, idx) => {
            let id = item?.id ? String(item.id).trim() : `todo-${Date.now()}-${idx}`;
            if (!id || seen.has(id)) {
              id = `todo-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
            }
            seen.add(id);
            return {
              ...item,
              id,
              text: item?.text || '',
              completed: !!item?.completed,
            };
          });
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_TODOS;
  });

  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Personal');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [selectedPriority, setSelectedPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-sync to localStorage silently
  useEffect(() => {
    try {
      localStorage.setItem('memento_standalone_todos', JSON.stringify(todos));
    } catch {
      // ignore storage error
    }
  }, [todos]);

  const handleAddTodo = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    triggerHaptic('selection');
    const newTodo: StandaloneTodoItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      completed: false,
      category: selectedCategory,
      priority: selectedPriority,
      createdAt: Date.now(),
    };

    setTodos((prev) => [newTodo, ...prev]);
    setInputText('');
  };

  const handleToggleTodo = (id: string) => {
    triggerHaptic('light');
    setTodos((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteTodo = (id: string) => {
    triggerHaptic('medium');
    setTodos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleStartEdit = (todo: StandaloneTodoItem) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) {
      handleDeleteTodo(id);
    } else {
      setTodos((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, text: editText.trim() } : item
        )
      );
    }
    setEditingId(null);
    setEditText('');
  };

  const handleClearCompleted = () => {
    triggerHaptic('medium');
    setTodos((prev) => prev.filter((item) => !item.completed));
  };

  // Filtered todos list with guaranteed unique IDs
  const filteredTodos = useMemo(() => {
    const seen = new Set<string>();
    return todos
      .filter((item) => {
        if (filterStatus === 'pending' && item.completed) return false;
        if (filterStatus === 'completed' && !item.completed) return false;
        return true;
      })
      .map((item, idx) => {
        let id = item.id ? String(item.id).trim() : `task-${idx}`;
        if (!id || seen.has(id)) {
          id = `${id || 'task'}-${idx}-${seen.size}`;
        }
        seen.add(id);
        return item.id === id ? item : { ...item, id };
      });
  }, [todos, filterStatus]);

  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const pendingCount = totalCount - completedCount;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`relative w-full h-full flex flex-col overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#09090b] text-[#f4f4f5]' : 'bg-[#fcfcfd] text-[#18181b]'
      }`}
    >
      {/* Top Header - Clean, Minimal, matching Home Page header layout */}
      <header className="px-3 sm:px-6 pt-4 pb-2 flex items-center justify-between shrink-0 relative z-20 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to notes"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-[#18181b]'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  isDark
                    ? 'bg-neutral-800/80 text-neutral-400'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {pendingCount} active
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Center: Desktop Flexible Search Bar */}
        <div className="hidden md:flex flex-1 justify-center max-w-sm lg:max-w-md xl:max-w-lg mx-4">
          <div
            className={`flex items-center gap-2.5 px-4 h-10 lg:h-11 rounded-full w-full transition-all duration-200 group border shadow-xs ${
              isDark
                ? 'bg-[#151515] hover:bg-[#1a1a1a] border-neutral-800/80 focus-within:border-neutral-600 focus-within:bg-[#181818] focus-within:ring-2 focus-within:ring-white/5'
                : 'bg-[#eeeff2] hover:bg-[#e6e8ed] border-neutral-200/70 focus-within:border-neutral-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-black/5'
            }`}
          >
            <Search
              className={`w-4.5 h-4.5 shrink-0 transition-colors ${
                isDark
                  ? 'text-neutral-500 group-focus-within:text-neutral-200'
                  : 'text-neutral-400 group-focus-within:text-neutral-800'
              }`}
              strokeWidth={2}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search notes, checklists, keys..."
              className={`w-full bg-transparent text-sm font-normal outline-none transition-colors ${
                isDark
                  ? 'text-white placeholder-neutral-500'
                  : 'text-neutral-900 placeholder-neutral-400'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                className={`p-1 rounded-full hover:opacity-80 transition-opacity shrink-0 ${
                  isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-black'
                }`}
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Header Search Action - Mobile Search Button (Hidden on Desktop) */}
        <div className="flex items-center gap-2 shrink-0 md:hidden">
          {onOpenSearch && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenSearch();
              }}
              aria-label="Open search menu"
              className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                isDark
                  ? 'text-neutral-300 hover:text-white bg-[#181818] hover:bg-[#222222]'
                  : 'text-neutral-700 hover:text-neutral-900 bg-[#ebecef] hover:bg-[#e2e3e7]'
              }`}
              title="Search notes and tasks"
            >
              <Search className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area - Scrollable list */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-4 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full space-y-4">
        {/* Minimal Segmented Filter Tabs */}
        <div className="flex items-center justify-start pb-1">
          <div
            className={`p-1 rounded-full flex items-center gap-0.5 ${
              isDark ? 'bg-[#141416]' : 'bg-neutral-100'
            }`}
          >
            {(
              [
                { id: 'all', label: 'All', count: totalCount },
                { id: 'pending', label: 'Active', count: pendingCount },
                { id: 'completed', label: 'Done', count: completedCount },
              ] as const
            ).map((tab) => {
              const active = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setFilterStatus(tab.id);
                  }}
                  className={`relative px-3.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1.5 ${
                    active
                      ? isDark
                        ? 'text-white'
                        : 'text-neutral-900'
                      : isDark
                      ? 'text-neutral-400 hover:text-neutral-200'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="todo-filter-pill"
                      className={`absolute inset-0 rounded-full shadow-xs ${
                        isDark ? 'bg-[#222226]' : 'bg-white'
                      }`}
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                  <span className={`relative z-10 text-[10px] opacity-60 font-mono`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Items List */}
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {filteredTodos.map((todo, todoIdx) => {
              const isEditing = editingId === todo.id;

              return (
                <motion.div
                  key={`todopage-task-${todo.id}`}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  className={`group flex items-start justify-between gap-3 px-4 py-3 rounded-2xl transition-all ${
                    isDark
                      ? todo.completed
                        ? 'bg-[#101012] text-neutral-500'
                        : 'bg-[#141416] text-neutral-100 shadow-xs'
                      : todo.completed
                      ? 'bg-[#f4f4f6] text-neutral-400'
                      : 'bg-white text-neutral-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Apple-style circular checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleTodo(todo.id)}
                      className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        todo.completed
                          ? 'bg-emerald-500 text-white'
                          : isDark
                          ? 'border border-neutral-600 hover:border-neutral-400 bg-transparent'
                          : 'border border-neutral-300 hover:border-neutral-500 bg-transparent'
                      }`}
                      aria-label={todo.completed ? 'Mark pending' : 'Mark done'}
                    >
                      {todo.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    {/* Task text or inline editor */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(todo.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className={`w-full text-sm bg-transparent outline-none ${
                              isDark ? 'text-white' : 'text-neutral-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(todo.id)}
                            className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-medium shrink-0"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartEdit(todo)}
                          className="cursor-pointer"
                        >
                          <p
                            className={`text-sm leading-relaxed break-words select-none transition-all ${
                              todo.completed
                                ? 'line-through text-neutral-400 dark:text-neutral-500'
                                : 'font-normal'
                            }`}
                          >
                            {todo.text}
                          </p>

                          {/* Category and priority indicator pills */}
                          {(todo.category || (todo.priority && todo.priority !== 'low')) && (
                            <div className="mt-1 flex items-center gap-2 text-[10.5px]">
                              {todo.category && (
                                <span
                                  className={`px-1.5 py-0.5 rounded-md font-medium ${
                                    isDark
                                      ? 'bg-neutral-800/80 text-neutral-400'
                                      : 'bg-neutral-100 text-neutral-600'
                                  }`}
                                >
                                  {todo.category}
                                </span>
                              )}
                              {todo.priority && todo.priority !== 'low' && (
                                <span
                                  className={`flex items-center gap-1 font-medium ${
                                    todo.priority === 'high'
                                      ? 'text-rose-500'
                                      : 'text-amber-500'
                                  }`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  <span className="capitalize">{todo.priority}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clean Delete Button (appears on hover or touch) */}
                  <div className="flex items-center gap-1 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleDeleteTodo(todo.id)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        isDark
                          ? 'hover:bg-neutral-800 text-neutral-500 hover:text-rose-400'
                          : 'hover:bg-neutral-100 text-neutral-400 hover:text-rose-600'
                      }`}
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Serene Empty State */}
          {filteredTodos.length === 0 && (
            <div className="text-center py-16 px-4 flex flex-col items-center justify-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
                  isDark ? 'bg-neutral-800/50 text-neutral-500' : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                <CheckCheck className="w-5 h-5 stroke-[1.8]" />
              </div>
              <h3
                className={`text-sm font-medium tracking-tight mb-1 ${
                  isDark ? 'text-neutral-300' : 'text-neutral-700'
                }`}
              >
                {filterStatus === 'completed'
                  ? 'No completed tasks'
                  : filterStatus === 'pending'
                  ? 'All tasks completed'
                  : 'No tasks yet'}
              </h3>
              <p
                className={`text-xs max-w-xs leading-relaxed ${
                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                {filterStatus === 'completed'
                  ? 'Completed tasks will appear here as you check them off.'
                  : 'Add a new task using the input below to plan your day.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Input Bar placed at the BOTTOM */}
      <div className="shrink-0 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 pb-20 md:pb-6 pt-2">
        <div
          className={`rounded-full transition-all duration-200 border ${
            isInputFocused
              ? isDark
                ? 'bg-[#18181c] border-neutral-700 shadow-lg'
                : 'bg-white border-neutral-300 shadow-md'
              : isDark
              ? 'bg-[#141416] border-neutral-800/80 shadow-xs'
              : 'bg-white border-neutral-200/80 shadow-xs'
          }`}
        >
          <div className="flex items-center px-4 py-2.5 sm:py-3 gap-3">
            <button
              type="button"
              onClick={handleAddTodo}
              disabled={!inputText.trim()}
              aria-label="Add task"
              className={`w-7.5 h-7.5 rounded-full flex items-center justify-center transition-all shrink-0 ${
                inputText.trim()
                  ? isDark
                    ? 'bg-white text-black active:scale-95 shadow-xs'
                    : 'bg-neutral-900 text-white active:scale-95 shadow-xs'
                  : isDark
                  ? 'bg-neutral-800 text-neutral-500 cursor-default'
                  : 'bg-neutral-100 text-neutral-400 cursor-default'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.2]" />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTodo();
                }
              }}
              placeholder="Add a task..."
              className={`flex-1 bg-transparent text-sm md:text-[14.5px] outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 ${
                isDark ? 'text-white' : 'text-neutral-900'
              }`}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
