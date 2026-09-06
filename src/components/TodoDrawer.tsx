import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ListTodo,
  X,
  Plus,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  Calendar,
  Pencil,
} from 'lucide-react';
import { ThemeMode, NoteItem, TodoSubItem } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { capitalizeFirstChar } from '../lib/formatters';
import { SubDrawerMoreMenu } from './SubDrawerMoreMenu';

interface TodoDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  note: NoteItem | null;
  onClose: () => void;
  onUpdateNote: (updatedNote: NoteItem) => void;
  onEdit?: (note: NoteItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

export function parseTodoItemsFromNote(note: NoteItem): TodoSubItem[] {
  let rawItems: TodoSubItem[] = [];

  if (note.todoItems && note.todoItems.length > 0) {
    rawItems = note.todoItems;
  } else if (note.content) {
    const text = note.content;
    const bracketMatches = [...text.matchAll(/\[(x|X|\s*)\]\s*([^\[\n\r]+)/g)];

    if (bracketMatches.length > 0) {
      bracketMatches.forEach((m, idx) => {
        const isCompleted = m[1].toLowerCase() === 'x';
        let taskText = m[2].trim();
        let dueDate: string | undefined = undefined;
        const dateMatch = taskText.match(/@(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          dueDate = dateMatch[1];
          taskText = taskText.replace(/@\d{4}-\d{2}-\d{2}/, '').trim();
        }
        if (taskText) {
          rawItems.push({
            id: `todo-${note.id || 'note'}-${idx}`,
            text: taskText,
            completed: isCompleted,
            dueDate,
          });
        }
      });
    } else if (note.entryType === 'todo' || note.isTodo) {
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      lines.forEach((line, idx) => {
        const cleanLine = line.replace(/^[-*•]\s*/, '').trim();
        if (cleanLine) {
          rawItems.push({
            id: `todo-${note.id || 'note'}-${idx}`,
            text: cleanLine,
            completed: false,
          });
        }
      });
    }
  }

  // Deduplicate IDs stably
  const seenIds = new Set<string>();
  return rawItems.map((item, idx) => {
    let itemId = item.id ? String(item.id).trim() : `todo-${note.id || 'note'}-${idx}`;
    if (!itemId || seenIds.has(itemId)) {
      itemId = `todo-${note.id || 'note'}-${idx}-${seenIds.size}`;
    }
    seenIds.add(itemId);
    return { ...item, id: itemId };
  });
}

export function TodoDrawer({
  isOpen,
  theme,
  note,
  onClose,
  onUpdateNote,
  onEdit,
  onDelete,
  onToggleFavorite,
}: TodoDrawerProps) {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();

  const [newTaskInput, setNewTaskInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!note) return null;

  const isTodayList =
    note.isTodayList ||
    (note.title || '').toLowerCase() === 'today' ||
    note.id.startsWith('todo-today-');

  const currentItems: TodoSubItem[] = parseTodoItemsFromNote(note);
  const completedCount = currentItems.filter((item) => item.completed).length;
  const totalCount = currentItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const updateItems = (newItems: TodoSubItem[]) => {
    const updatedContent = newItems
      .map((t) => `${t.completed ? '[x]' : '[ ]'} ${t.text}`)
      .join('\n');

    const updatedNote: NoteItem = {
      ...note,
      todoItems: newItems,
      content: updatedContent,
      isTodo: true,
      entryType: 'todo',
    };
    onUpdateNote(updatedNote);
  };

  const handleToggleItem = (itemId: string) => {
    const updated = currentItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateItems(updated);
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = currentItems.filter((item) => item.id !== itemId);
    updateItems(updated);
  };

  const handleAddTask = () => {
    const trimmed = newTaskInput.trim();
    if (!trimmed) return;

    const newItem: TodoSubItem = {
      id: Date.now().toString(),
      text: trimmed,
      completed: false,
      dueDate: isTodayList ? (note.todayDate || new Date().toISOString().split('T')[0]) : undefined,
    };
    updateItems([...currentItems, newItem]);
    setNewTaskInput('');
    inputRef.current?.focus();
  };

  const handleToggleAll = () => {
    const allDone = completedCount === totalCount && totalCount > 0;
    const updated = currentItems.map((item) => ({
      ...item,
      completed: !allDone,
    }));
    updateItems(updated);
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
            className={`relative w-full max-w-md md:max-w-lg mx-auto rounded-t-[28px] md:rounded-[28px] pt-3 md:pt-6 pb-6 px-5 md:px-7 shadow-2xl flex flex-col max-h-[90vh] md:max-h-[82vh] overflow-hidden transition-colors ${
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

            {/* Header: Title + ListTodo icon + Close */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {isTodayList ? (
                    <Calendar className="w-5 h-5 stroke-[2]" />
                  ) : (
                    <ListTodo className="w-5 h-5 stroke-[2]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold tracking-tight truncate leading-tight">
                    {capitalizeFirstChar(note.title) || 'Todo Checklist'}
                  </h2>
                  <div
                    className={`text-[11.5px] flex items-center gap-1.5 mt-0.5 ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    <span>{completedCount} of {totalCount} done</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {note.date}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* More options button (...) inside sub drawer with Edit, Fav, Copy, Delete */}
                <SubDrawerMoreMenu
                  theme={theme}
                  isFavorite={note.isFavorite}
                  onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(note.id) : undefined}
                  onCopy={() => {
                    const text = `${note.title ? `${note.title}\n\n` : ''}${currentItems
                      .map((item) => `[${item.completed ? 'x' : ' '}] ${item.text}`)
                      .join('\n')}`;
                    navigator.clipboard?.writeText(text);
                  }}
                  onEdit={onEdit ? () => onEdit(note) : undefined}
                  onDelete={
                    onDelete
                      ? () => {
                          onDelete(note.id);
                          onClose();
                        }
                      : undefined
                  }
                  copyLabel="Copy Checklist"
                  itemTypeLabel="Todos"
                />

                <button
                  id="todo-drawer-close-btn"
                  type="button"
                  onClick={onClose}
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#1e1e1e] text-neutral-300 hover:text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                  aria-label="Close details"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Simple & Clean Progress Bar */}
            <div className="mt-3 px-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>
                  Progress
                </span>
                <span
                  className={`font-semibold font-mono text-[11.5px] ${
                    progressPercent === 100
                      ? 'text-emerald-500'
                      : isDark
                      ? 'text-neutral-300'
                      : 'text-neutral-700'
                  }`}
                >
                  {progressPercent}%
                </span>
              </div>
              <div
                className={`w-full h-1.5 rounded-full overflow-hidden ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-200'
                }`}
              >
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    progressPercent === 100
                      ? 'bg-emerald-500'
                      : isDark
                      ? 'bg-white'
                      : 'bg-neutral-900'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Bulk Actions at top below progress bar (no splitting lines) */}
            {totalCount > 1 && (
              <div className="flex items-center justify-between px-1 pt-2.5 pb-0.5 text-[11.5px]">
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>
                    {completedCount === totalCount ? 'Uncheck all' : 'Mark all completed'}
                  </span>
                </button>

                <span className={isDark ? 'text-neutral-500' : 'text-neutral-400'}>
                  {completedCount} / {totalCount} completed
                </span>
              </div>
            )}

            {/* Tasks List */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 py-2 mt-1 min-h-[140px]">
              {currentItems.length === 0 ? (
                <div
                  className={`py-8 text-center rounded-2xl ${
                    isDark ? 'bg-[#161616]' : 'bg-neutral-50'
                  }`}
                >
                  <ListTodo
                    className={`w-7 h-7 mx-auto mb-2 opacity-40 ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  />
                  <p className="text-xs text-neutral-400">
                    No tasks in this list yet.
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Type below to add your first item.
                  </p>
                </div>
              ) : (
                currentItems.map((item) => (
                  <motion.div
                    key={`drawer-todo-${item.id}`}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group flex items-center justify-between p-3 rounded-2xl transition-all ${
                      item.completed
                        ? isDark
                          ? 'bg-[#151515]/70 opacity-75'
                          : 'bg-neutral-100/60 opacity-80'
                        : isDark
                        ? 'bg-[#191919] hover:bg-[#202020]'
                        : 'bg-neutral-100/80 hover:bg-neutral-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleItem(item.id)}
                      className="flex items-center gap-3 flex-1 text-left select-none cursor-pointer"
                    >
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                          item.completed
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : isDark
                            ? 'border-2 border-neutral-600 hover:border-neutral-400'
                            : 'border-2 border-neutral-300 hover:border-neutral-500 bg-white'
                        }`}
                      >
                        {item.completed && (
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                      </div>
                      <span
                        className={`text-xs sm:text-sm font-medium transition-all ${
                          item.completed
                            ? 'line-through text-neutral-500'
                            : isDark
                            ? 'text-neutral-200'
                            : 'text-neutral-800'
                        }`}
                      >
                        {item.text}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Delete task"
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDark
                          ? 'text-neutral-500 hover:text-red-400 hover:bg-red-500/10'
                          : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Quick Add Task Input at Bottom */}
            <div className="mt-2 pt-1">
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-[#181818] border-neutral-800 focus-within:border-neutral-700'
                    : 'bg-neutral-50 border-neutral-200 focus-within:border-neutral-300'
                }`}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                  placeholder="Add a new task..."
                  className={`flex-1 bg-transparent text-xs sm:text-sm py-1.5 focus:outline-none placeholder:text-neutral-500 ${
                    isDark ? 'text-white' : 'text-neutral-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddTask}
                  disabled={!newTaskInput.trim()}
                  className={`h-7 px-3 rounded-full flex items-center gap-1 text-xs font-medium active:scale-95 transition-all ${
                    newTaskInput.trim()
                      ? isDark
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                      : 'opacity-40 cursor-not-allowed bg-neutral-500/20 text-neutral-400'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
