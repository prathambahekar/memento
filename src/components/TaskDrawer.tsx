import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  Calendar,
  CalendarDays,
  Clock,
  Trash2,
  ListTodo,
  ChevronDown,
  X,
} from 'lucide-react';
import { TodoSubItem, NoteItem } from '../types';
import { triggerHaptic } from '../lib/capacitor';

interface TaskDrawerProps {
  isOpen: boolean;
  item: {
    task: TodoSubItem;
    listId: string;
    listTitle: string;
  } | null;
  allLists: NoteItem[];
  isDark: boolean;
  todayStr: string;
  onClose: () => void;
  onSave: (
    listId: string,
    taskId: string,
    updated: { text: string; completed: boolean; dueDate?: string },
    targetListId?: string
  ) => void;
  onDelete: (listId: string, taskId: string) => void;
}

export const TaskDrawer: React.FC<TaskDrawerProps> = ({
  isOpen,
  item,
  allLists,
  isDark,
  todayStr,
  onClose,
  onSave,
  onDelete,
}) => {
  const [text, setText] = useState('');
  const [completed, setCompleted] = useState(false);
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea to fit text content exactly as needed
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(40, textareaRef.current.scrollHeight)}px`;
    }
  }, [text, isOpen]);

  // Sync state when item changes or opens
  useEffect(() => {
    if (item && isOpen) {
      setText(item.task.text);
      setCompleted(!!item.task.completed);
      setDueDate(item.task.dueDate);
      setSelectedListId(item.listId);
      setIsListDropdownOpen(false);

      // Auto-focus after drawer animation starts
      const t = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            textareaRef.current.value.length,
            textareaRef.current.value.length
          );
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.max(40, textareaRef.current.scrollHeight)}px`;
        }
      }, 120);
      return () => clearTimeout(t);
    }
  }, [item, isOpen]);

  // Close list dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsListDropdownOpen(false);
      }
    };
    if (isListDropdownOpen) {
      document.addEventListener('mousedown', handleOutside);
      return () => document.removeEventListener('mousedown', handleOutside);
    }
  }, [isListDropdownOpen]);

  if (!isOpen || !item) return null;

  const currentList = allLists.find((l) => l.id === selectedListId);
  const currentListTitle = currentList ? currentList.title || 'Tasks' : item.listTitle || 'Tasks';

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onDelete(item.listId, item.task.id);
    } else {
      triggerHaptic('success');
      onSave(
        item.listId,
        item.task.id,
        {
          text: trimmed,
          completed,
          dueDate,
        },
        selectedListId !== item.listId ? selectedListId : undefined
      );
    }
    onClose();
  };

  const handleToggleComplete = () => {
    triggerHaptic('light');
    setCompleted((prev) => !prev);
  };

  const setQuickDate = (dateVal?: string) => {
    triggerHaptic('selection');
    setDueDate(dateVal);
  };

  // Quick date computations
  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yr = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${yr}-${m}-${day}`;
  })();

  const nextWeekStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const yr = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${yr}-${m}-${day}`;
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Drawer / Sheet Panel matching default app theme */}
          <motion.div
            initial={{ y: '100%', opacity: 0.8 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className={`relative w-full max-w-md md:max-w-lg mx-auto rounded-t-[28px] md:rounded-[28px] pt-3 md:pt-6 pb-6 px-5 md:px-7 shadow-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden transition-colors ${
              isDark ? 'bg-[#121212] text-white' : 'bg-[#ffffff] text-neutral-900'
            }`}
          >
            {/* Top Sheet Grab Handle for mobile */}
            <div className="flex justify-center pb-2 md:hidden">
              <div
                className={`w-9 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Header: Clean, borderless, NO split lines, NO 'Todo' text */}
            <div className="flex items-center justify-between py-1.5 relative z-30">
              {/* Left: Icon and List selector dropdown (no redundant 'Todo' text) */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  <ListTodo className="w-3.5 h-3.5 stroke-[2]" />
                </div>

                {/* List Dropdown selector */}
                {allLists.length > 0 && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      id="task-list-dropdown-btn"
                      type="button"
                      onClick={() => setIsListDropdownOpen((prev) => !prev)}
                      className={`h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium active:scale-95 transition-all ${
                        isDark
                          ? 'bg-[#1e1e1e] hover:bg-[#282828] text-neutral-200'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                      }`}
                    >
                      <span className="max-w-[130px] truncate">{currentListTitle}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                          isListDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* Popover menu */}
                    <AnimatePresence>
                      {isListDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute left-0 top-10 w-48 rounded-2xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 ${
                            isDark
                              ? 'bg-[#1c1c1c] text-white'
                              : 'bg-white text-neutral-900 shadow-neutral-200/80'
                          }`}
                        >
                          <div
                            className={`text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 ${
                              isDark ? 'text-neutral-500' : 'text-neutral-400'
                            }`}
                          >
                            Move to List
                          </div>
                          {allLists.map((list) => {
                            const isSelected = selectedListId === list.id;
                            return (
                              <button
                                key={list.id}
                                type="button"
                                onClick={() => {
                                  setSelectedListId(list.id);
                                  setIsListDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                                  isSelected
                                    ? isDark
                                      ? 'bg-[#282828] text-white font-medium'
                                      : 'bg-neutral-100 text-neutral-900 font-semibold'
                                    : isDark
                                    ? 'hover:bg-[#242424] text-neutral-300'
                                    : 'hover:bg-neutral-50 text-neutral-700'
                                }`}
                              >
                                <span className="truncate">{list.title || 'Tasks'}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-neutral-200 shrink-0" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Right controls: Delete (icon only) and Save button */}
              <div className="flex items-center gap-2 relative">
                {/* Delete / Cancel Button as Icon Only right next to Save button */}
                <button
                  id="task-drawer-delete-btn"
                  type="button"
                  onClick={() => {
                    triggerHaptic('medium');
                    if (item.task.text) {
                      onDelete(item.listId, item.task.id);
                    }
                    onClose();
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#1e1e1e] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400'
                      : 'bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-600'
                  }`}
                  aria-label={item.task.text ? 'Delete task' : 'Cancel'}
                  title={item.task.text ? 'Delete task' : 'Cancel'}
                >
                  {item.task.text ? <Trash2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                </button>

                {/* Save / Add Button: High-contrast modern pill matching default UI */}
                <button
                  id="task-drawer-save-btn"
                  type="button"
                  onClick={handleSave}
                  className={`h-8 px-4 rounded-full flex items-center gap-1.5 font-medium text-xs active:scale-95 transition-all shadow-sm ${
                    isDark
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.4]" />
                  <span>{item.task.text ? 'Save' : 'Add'}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Drawer Body: Borderless, NO split lines anywhere */}
            <div className="flex-1 overflow-y-auto no-scrollbar pt-2 pb-1 space-y-3.5">
              {/* Task Description: Auto-sized to content height, no oversized empty space */}
              <div>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    if (textareaRef.current) {
                      textareaRef.current.style.height = 'auto';
                      textareaRef.current.style.height = `${Math.max(40, textareaRef.current.scrollHeight)}px`;
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  rows={1}
                  placeholder="Task description..."
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-sm leading-snug outline-none resize-none overflow-y-auto transition-[background-color] ${
                    isDark
                      ? 'bg-[#1c1c1f] text-white placeholder-neutral-500 focus:bg-[#232328]'
                      : 'bg-neutral-100 text-neutral-900 placeholder-neutral-400 focus:bg-neutral-200/70'
                  } ${completed ? 'line-through opacity-60' : ''}`}
                  style={{ minHeight: '40px', maxHeight: '160px' }}
                />
              </div>

              {/* Status Toggle: Sleek pill container, no split line */}
              <button
                type="button"
                onClick={handleToggleComplete}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all active:scale-[0.99] ${
                  completed
                    ? isDark
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-700'
                    : isDark
                    ? 'bg-[#1c1c1f] text-neutral-300 hover:bg-[#232328]'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/70'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      completed
                        ? 'bg-emerald-500 text-white'
                        : isDark
                        ? 'border-2 border-neutral-600'
                        : 'border-2 border-neutral-400'
                    }`}
                  >
                    {completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-xs sm:text-sm font-medium">
                    {completed ? 'Completed' : 'Active (To-do)'}
                  </span>
                </div>
                <span
                  className={`text-[10.5px] font-medium px-2 py-0.5 rounded-full ${
                    completed
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-emerald-100 text-emerald-800'
                      : isDark
                      ? 'bg-neutral-800 text-neutral-400'
                      : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  Tap to toggle
                </span>
              </button>

              {/* Due Date Section: Clean chips and compact picker without split lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className={`text-[11px] font-semibold tracking-wider uppercase ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    Due Date
                  </span>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setQuickDate(undefined)}
                      className="text-[11px] font-medium text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      Clear date
                    </button>
                  )}
                </div>

                {/* Quick Preset Date Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setQuickDate(todayStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${
                      dueDate === todayStr
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isDark
                        ? 'bg-[#1c1c1f] text-neutral-300 hover:bg-[#25252a]'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>Today</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickDate(tomorrowStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${
                      dueDate === tomorrowStr
                        ? 'bg-blue-500 text-white shadow-xs'
                        : isDark
                        ? 'bg-[#1c1c1f] text-neutral-300 hover:bg-[#25252a]'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Tomorrow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuickDate(nextWeekStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 ${
                      dueDate === nextWeekStr
                        ? 'bg-purple-500 text-white shadow-xs'
                        : isDark
                        ? 'bg-[#1c1c1f] text-neutral-300 hover:bg-[#25252a]'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Next Week</span>
                  </button>
                </div>

                {/* Custom Date Input: Compact & Seamless */}
                <div
                  className={`flex items-center justify-between px-3.5 py-2 rounded-xl transition-colors ${
                    isDark ? 'bg-[#1c1c1f] text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <span className="text-xs font-medium opacity-80">Custom date:</span>
                  <input
                    type="date"
                    value={dueDate || ''}
                    onChange={(e) => setDueDate(e.target.value || undefined)}
                    className={`text-xs bg-transparent outline-none cursor-pointer font-medium ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
