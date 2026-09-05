import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Calendar,
  Check,
  Trash2,
  ListTodo,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { ThemeMode, TodoSubItem } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { triggerHaptic } from '../lib/capacitor';

export interface DayTaskItem {
  task: TodoSubItem;
  listId: string;
  listTitle: string;
}

interface DayDetailsDrawerProps {
  isOpen: boolean;
  dateStr: string | null;
  todayStr: string;
  theme: ThemeMode;
  tasks: DayTaskItem[];
  overdueTasks?: DayTaskItem[];
  onClose: () => void;
  onToggleTask: (listId: string, taskId: string) => void;
  onDeleteTask: (listId: string, taskId: string) => void;
  onAddTask: (text: string, dateStr: string) => void;
  onOpenTaskEdit: (item: DayTaskItem) => void;
  onOpenSchedule?: (item: DayTaskItem) => void;
}

// Format friendly header title and subtitle
function getFormattedDayHeader(dateStr: string, todayStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);

  const [ty, tm, td] = todayStr.split('-').map(Number);
  const today = new Date(ty, tm - 1, td);

  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let title = target.toLocaleDateString('en-US', { weekday: 'long' });
  let isToday = false;

  if (diffDays === 0) {
    title = 'Today';
    isToday = true;
  } else if (diffDays === 1) {
    title = 'Tomorrow';
  } else if (diffDays === -1) {
    title = 'Yesterday';
  }

  const fullDate = target.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return { title, fullDate, isToday };
}

export const DayDetailsDrawer: React.FC<DayDetailsDrawerProps> = ({
  isOpen,
  dateStr,
  todayStr,
  theme,
  tasks,
  overdueTasks = [],
  onClose,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onOpenTaskEdit,
}) => {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputText('');
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, dateStr]);

  if (!isOpen || !dateStr) return null;

  const { title, fullDate, isToday } = getFormattedDayHeader(dateStr, todayStr);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.task.completed).length;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    triggerHaptic('light');
    onAddTask(trimmed, dateStr);
    setInputText('');
    inputRef.current?.focus();
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

          {/* Drawer / Modal Sheet matching default app theme (no split lines, borderless header) */}
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
            {/* Mobile drag bar */}
            <div className="md:hidden flex justify-center pb-2">
              <div
                className={`w-9 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Header: Clean, borderless, matching default app theme */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    isToday
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : isDark
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <Calendar className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2
                      className={`text-lg font-bold tracking-tight truncate leading-tight ${
                        isToday
                          ? 'text-emerald-500'
                          : isDark
                          ? 'text-white'
                          : 'text-neutral-900'
                      }`}
                    >
                      {title}
                    </h2>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                        isDark
                          ? 'bg-[#1e1e1e] text-neutral-400'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {totalTasks} task{totalTasks === 1 ? '' : 's'}
                      {completedTasks > 0 && ` • ${completedTasks} done`}
                    </span>
                  </div>
                  <p
                    className={`text-xs mt-0.5 ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    {fullDate}
                  </p>
                </div>
              </div>

              {/* Close Button styled like TodoDrawer / TaskDrawer */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                  isDark
                    ? 'bg-[#1e1e1e] text-neutral-300 hover:text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Add Task Input: Clean, matching default app theme */}
            <div className="mt-3 mb-2">
              <form
                onSubmit={handleSubmit}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-[#181818] border-neutral-800/80 focus-within:border-neutral-700'
                    : 'bg-neutral-100 border-neutral-200/80 focus-within:border-neutral-300'
                }`}
              >
                <Plus
                  className={`w-4 h-4 shrink-0 ${
                    isDark ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Add task for ${title.toLowerCase()}...`}
                  className={`flex-1 bg-transparent text-xs sm:text-sm py-2 focus:outline-none placeholder:text-neutral-500 ${
                    isDark ? 'text-white' : 'text-neutral-900'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`h-7 px-3 rounded-full flex items-center gap-1 text-xs font-medium active:scale-95 transition-all ${
                    inputText.trim()
                      ? isDark
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                      : 'opacity-40 cursor-not-allowed bg-neutral-500/20 text-neutral-400'
                  }`}
                >
                  Add
                </button>
              </form>
            </div>

            {/* Content: Overdue tasks + Scheduled tasks with no splitting lines */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 py-1 mt-1 min-h-[140px]">
              {/* Overdue section (if today and has overdue) */}
              {isToday && overdueTasks.length > 0 && (
                <div
                  className={`p-3 rounded-2xl space-y-2 mb-2 ${
                    isDark ? 'bg-amber-500/10' : 'bg-amber-50'
                  }`}
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-amber-500 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Overdue Tasks ({overdueTasks.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {overdueTasks.map((item) => (
                      <DrawerTaskRow
                        key={`drawer-overdue-${item.listId}-${item.task.id}`}
                        item={item}
                        isDark={isDark}
                        onToggle={() => onToggleTask(item.listId, item.task.id)}
                        onDelete={() => onDeleteTask(item.listId, item.task.id)}
                        onClick={() => onOpenTaskEdit(item)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks List */}
              {tasks.length > 0 ? (
                <div className="space-y-1.5">
                  <AnimatePresence initial={false}>
                    {tasks.map((item) => (
                      <DrawerTaskRow
                        key={`drawer-task-${item.listId}-${item.task.id}`}
                        item={item}
                        isDark={isDark}
                        onToggle={() => onToggleTask(item.listId, item.task.id)}
                        onDelete={() => onDeleteTask(item.listId, item.task.id)}
                        onClick={() => onOpenTaskEdit(item)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div
                  className={`py-10 text-center rounded-2xl ${
                    isDark ? 'bg-[#161616]' : 'bg-neutral-50'
                  }`}
                >
                  <div
                    className={`w-12 h-12 mx-auto mb-3 rounded-2xl flex items-center justify-center ${
                      isDark
                        ? 'bg-[#1f1f1f] text-neutral-400'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    <ListTodo className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <p
                    className={`text-sm font-semibold tracking-tight ${
                      isDark ? 'text-neutral-200' : 'text-neutral-800'
                    }`}
                  >
                    No tasks for this day
                  </p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
                    Type in the box above to schedule a new task for {title}.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Compact individual task item row for the drawer matching TodoDrawer styling
interface DrawerTaskRowProps {
  item: DayTaskItem;
  isDark: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onClick: () => void;
}

const DrawerTaskRow: React.FC<DrawerTaskRowProps> = ({
  item,
  isDark,
  onToggle,
  onDelete,
  onClick,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`group cursor-pointer flex items-center justify-between p-3 rounded-2xl transition-all select-none ${
        item.task.completed
          ? isDark
            ? 'bg-[#151515]/70 opacity-75'
            : 'bg-neutral-100/60 opacity-80'
          : isDark
          ? 'bg-[#191919] hover:bg-[#202020]'
          : 'bg-neutral-100/80 hover:bg-neutral-100'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={item.task.completed ? 'Mark pending' : 'Mark done'}
          className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
            item.task.completed
              ? 'bg-emerald-500 text-white shadow-xs'
              : isDark
              ? 'border-2 border-neutral-600 hover:border-neutral-400'
              : 'border-2 border-neutral-300 hover:border-neutral-500 bg-white'
          }`}
        >
          {item.task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-xs sm:text-sm font-medium leading-snug break-words transition-all ${
              item.task.completed
                ? 'line-through text-neutral-500'
                : isDark
                ? 'text-neutral-200'
                : 'text-neutral-800'
            }`}
          >
            {item.task.text}
          </p>
          {item.listTitle &&
            item.listTitle !== 'Tasks' &&
            item.listTitle !== 'Today' && (
              <span
                className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  isDark
                    ? 'bg-[#242424] text-neutral-400'
                    : 'bg-neutral-200/70 text-neutral-600'
                }`}
              >
                {item.listTitle}
              </span>
            )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete task"
          className={`p-1.5 rounded-lg transition-colors ${
            isDark
              ? 'text-neutral-500 hover:text-red-400 hover:bg-red-500/10'
              : 'text-neutral-400 hover:text-red-600 hover:bg-red-50'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ChevronRight
          className={`w-3.5 h-3.5 ${
            isDark ? 'text-neutral-600' : 'text-neutral-400'
          }`}
        />
      </div>
    </motion.div>
  );
};
