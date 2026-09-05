import React, { useState, useEffect, useRef, useMemo, FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  CheckCheck,
  Search,
  X,
  Pencil,
  Inbox,
  CalendarDays,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  ListTodo,
  Archive,
  RotateCcw,
} from 'lucide-react';
import { ThemeMode, NoteItem, TodoSubItem } from '../types';
import { triggerHaptic } from '../lib/capacitor';
import { TodoDrawer, parseTodoItemsFromNote } from './TodoDrawer';
import { TaskDrawer } from './TaskDrawer';

export type TodoTab = 'inbox' | 'today' | 'upcoming';

interface TodoPageProps {
  theme: ThemeMode;
  notes: NoteItem[];
  autoOpenKeyboard?: boolean;
  onBack: () => void;
  onUpdateNote: (updatedNote: NoteItem) => void;
  onAddNote: (note: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onOpenSearch?: () => void;
}

// Format local Date to YYYY-MM-DD string
function formatDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// User-friendly date label
function formatFriendlyDate(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Today';

  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);

  const [ty, tm, td] = todayStr.split('-').map(Number);
  const nowDate = new Date(ty, tm - 1, td);

  const diffTime = targetDate.getTime() - nowDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  return targetDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function TodoPage({
  theme,
  notes,
  autoOpenKeyboard = true,
  onBack,
  onUpdateNote,
  onAddNote,
  onDeleteNote,
  searchQuery = '',
  onOpenSearch,
}: TodoPageProps) {
  const isDark = theme === 'dark';

  // Three main options: 'inbox', 'today', 'upcoming'
  const [activeTab, setActiveTab] = useState<TodoTab>('inbox');

  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => formatDateToISO(new Date()), []);

  // Formatted date string for Today section header (e.g. "5 Sep 2026")
  const formattedTodayDate = useMemo(() => {
    const d = new Date();
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }, []);

  // Filter status within Inbox: 'all' | 'pending' | 'completed'
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFilterMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterMenuOpen]);

  // Input state for bottom add task bar
  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calendar view states for Upcoming tab
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    // Default to today or tomorrow
    return formatDateToISO(new Date());
  });
  const [upcomingInputText, setUpcomingInputText] = useState('');

  // Task drawer edit state
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<{
    task: TodoSubItem;
    listId: string;
    listTitle: string;
  } | null>(null);

  // Todo list note drawer state (for opening list when clicking title in Inbox)
  const [selectedTodoNoteForDrawer, setSelectedTodoNoteForDrawer] = useState<NoteItem | null>(null);

  // Keep selectedTodoNoteForDrawer synced with notes updates
  useEffect(() => {
    if (selectedTodoNoteForDrawer) {
      const updated = notes.find((n) => n.id === selectedTodoNoteForDrawer.id);
      if (updated) {
        setSelectedTodoNoteForDrawer(updated);
      } else {
        setSelectedTodoNoteForDrawer(null);
      }
    }
  }, [notes, selectedTodoNoteForDrawer]);

  // Quick Reschedule / Date Picker Modal
  const [schedulingTask, setSchedulingTask] = useState<{
    listId: string;
    task: TodoSubItem;
  } | null>(null);

  // Collapsible section for archived lists in Inbox
  const [isArchiveSectionOpen, setIsArchiveSectionOpen] = useState(false);

  // Filter active todo notes from home page notes (excluding archived)
  const todoLists = useMemo(() => {
    return notes.filter((n) => (n.entryType === 'todo' || !!n.isTodo) && !n.isArchived);
  }, [notes]);

  // Filter archived todo notes
  const archivedTodoLists = useMemo(() => {
    return notes.filter((n) => (n.entryType === 'todo' || !!n.isTodo) && !!n.isArchived);
  }, [notes]);

  // Auto-reset: Archive previous days' "Today" lists and rename with date
  useEffect(() => {
    notes.forEach((n) => {
      if ((n.entryType === 'todo' || !!n.isTodo) && n.isTodayList && !n.isArchived) {
        if (n.todayDate && n.todayDate !== todayStr) {
          let formattedDate = n.todayDate;
          try {
            const [y, m, d] = n.todayDate.split('-').map(Number);
            formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
          } catch {
            // fallback
          }
          const updatedTitle =
            n.title === 'Today' || !n.title ? `Today (${formattedDate})` : n.title;
          onUpdateNote({
            ...n,
            title: updatedTitle,
            isArchived: true,
          });
        }
      }
    });
  }, [notes, todayStr, onUpdateNote]);

  // Structure all tasks with their source list reference
  const allTasksWithList = useMemo(() => {
    const items: Array<{
      task: TodoSubItem;
      listId: string;
      listTitle: string;
    }> = [];

    todoLists.forEach((list) => {
      const parsed = parseTodoItemsFromNote(list);
      parsed.forEach((task) => {
        items.push({
          task,
          listId: list.id,
          listTitle: list.title || 'Tasks',
        });
      });
    });

    return items;
  }, [todoLists]);

  // Counts for each of the 3 tabs (Inbox displays todo lists)
  const inboxTotalCount = todoLists.length;
  const inboxActiveCount = todoLists.filter((l) =>
    parseTodoItemsFromNote(l).some((t) => !t.completed)
  ).length;

  const todayTasks = useMemo(() => {
    return allTasksWithList.filter((t) => t.task.dueDate === todayStr);
  }, [allTasksWithList, todayStr]);

  const todayActiveCount = todayTasks.filter((t) => !t.task.completed).length;

  // Overdue tasks that are still pending
  const overdueTasks = useMemo(() => {
    return allTasksWithList.filter(
      (t) => t.task.dueDate && t.task.dueDate < todayStr && !t.task.completed
    );
  }, [allTasksWithList, todayStr]);

  // Tasks with any future date
  const upcomingTasks = useMemo(() => {
    return allTasksWithList
      .filter((t) => t.task.dueDate && t.task.dueDate > todayStr)
      .sort((a, b) => (a.task.dueDate || '').localeCompare(b.task.dueDate || ''));
  }, [allTasksWithList, todayStr]);

  const upcomingActiveCount = upcomingTasks.filter((t) => !t.task.completed).length;

  // Tasks specifically for the selected calendar date
  const selectedDateTasks = useMemo(() => {
    return allTasksWithList.filter((t) => t.task.dueDate === selectedCalendarDate);
  }, [allTasksWithList, selectedCalendarDate]);

  // Set of dates that have tasks (for calendar dot indicators)
  const datesWithTasksMap = useMemo(() => {
    const map = new Map<string, { total: number; pending: number }>();
    allTasksWithList.forEach((item) => {
      if (item.task.dueDate) {
        const cur = map.get(item.task.dueDate) || { total: 0, pending: 0 };
        cur.total += 1;
        if (!item.task.completed) cur.pending += 1;
        map.set(item.task.dueDate, cur);
      }
    });
    return map;
  }, [allTasksWithList]);

  // Filter lists in Inbox according to status & search query
  const displayedInboxLists = useMemo(() => {
    return todoLists.filter((list) => {
      const items = parseTodoItemsFromNote(list);
      const hasPending = items.some((t) => !t.completed);
      const hasCompleted = items.some((t) => t.completed);

      if (filterStatus === 'pending' && !hasPending && items.length > 0) return false;
      if (filterStatus === 'completed' && !hasCompleted && items.length > 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (list.title || '').toLowerCase().includes(q);
        const contentMatch = (list.content || '').toLowerCase().includes(q);
        const itemsMatch = items.some((t) => t.text.toLowerCase().includes(q));
        return titleMatch || contentMatch || itemsMatch;
      }
      return true;
    });
  }, [todoLists, filterStatus, searchQuery]);

  // Retain displayedInboxTasks for backward compatibility or task search
  const displayedInboxTasks = useMemo(() => {
    return allTasksWithList.filter((item) => {
      if (filterStatus === 'pending' && item.task.completed) return false;
      if (filterStatus === 'completed' && !item.task.completed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.task.text.toLowerCase().includes(q) ||
          item.listTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allTasksWithList, filterStatus, searchQuery]);

  const displayedTodayTasks = useMemo(() => {
    return todayTasks.filter((item) => {
      if (filterStatus === 'pending' && item.task.completed) return false;
      if (filterStatus === 'completed' && !item.task.completed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.task.text.toLowerCase().includes(q) ||
          item.listTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [todayTasks, filterStatus, searchQuery]);

  const displayedOverdueTasks = useMemo(() => {
    return overdueTasks.filter((item) => {
      if (filterStatus === 'pending' && item.task.completed) return false;
      if (filterStatus === 'completed' && !item.task.completed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.task.text.toLowerCase().includes(q) ||
          item.listTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [overdueTasks, filterStatus, searchQuery]);

  const displayedSelectedDateTasks = useMemo(() => {
    return selectedDateTasks.filter((item) => {
      if (filterStatus === 'pending' && item.task.completed) return false;
      if (filterStatus === 'completed' && !item.task.completed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.task.text.toLowerCase().includes(q) ||
          item.listTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [selectedDateTasks, filterStatus, searchQuery]);

  // Helper to update a note's tasks and serialize content
  const updateNoteTasks = (noteId: string, newTasks: TodoSubItem[]) => {
    const targetNote = notes.find((l) => l.id === noteId);
    if (!targetNote) return;

    const updatedContent = newTasks
      .map(
        (t) =>
          `${t.completed ? '[x]' : '[ ]'} ${t.text}${t.dueDate ? ` @${t.dueDate}` : ''}`
      )
      .join('\n');

    const updatedNote: NoteItem = {
      ...targetNote,
      todoItems: newTasks,
      content: updatedContent,
      isTodo: true,
      entryType: 'todo',
    };

    onUpdateNote(updatedNote);
  };

  // Toggle task completion
  const handleToggleTask = (listId: string, taskId: string) => {
    triggerHaptic('light');
    const targetNote = notes.find((l) => l.id === listId);
    if (!targetNote) return;

    const currentTasks = parseTodoItemsFromNote(targetNote);
    const updated = currentTasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    updateNoteTasks(listId, updated);
  };

  // Delete task
  const handleDeleteTask = (listId: string, taskId: string) => {
    triggerHaptic('medium');
    const targetNote = notes.find((l) => l.id === listId);
    if (!targetNote) return;

    const currentTasks = parseTodoItemsFromNote(targetNote);
    const updated = currentTasks.filter((t) => t.id !== taskId);
    updateNoteTasks(listId, updated);
  };

  // Open task drawer
  const handleOpenTaskDrawer = (item: {
    task: TodoSubItem;
    listId: string;
    listTitle: string;
  }) => {
    triggerHaptic('light');
    setSelectedTaskForDrawer(item);
  };

  // Save edited task from drawer menu
  const handleSaveDrawerTask = (
    listId: string,
    taskId: string,
    updated: { text: string; completed: boolean; dueDate?: string },
    targetListId?: string
  ) => {
    const trimmed = updated.text.trim();
    if (!trimmed) {
      handleDeleteTask(listId, taskId);
      return;
    }

    const currentList = notes.find((l) => l.id === listId);
    if (!currentList) return;

    const currentTasks = parseTodoItemsFromNote(currentList);
    const existingTask = currentTasks.find((t) => t.id === taskId);
    const updatedTask: TodoSubItem = {
      id: taskId,
      text: trimmed,
      completed: updated.completed,
      dueDate: updated.dueDate,
    };

    if (targetListId && targetListId !== listId) {
      // Move between lists
      const remainingTasks = currentTasks.filter((t) => t.id !== taskId);
      updateNoteTasks(listId, remainingTasks);

      const targetList = notes.find((l) => l.id === targetListId);
      if (targetList) {
        const destTasks = parseTodoItemsFromNote(targetList);
        updateNoteTasks(targetListId, [...destTasks, updatedTask]);
      }
    } else {
      // Update in place
      const updatedTasks = currentTasks.map((t) =>
        t.id === taskId ? updatedTask : t
      );
      updateNoteTasks(listId, updatedTasks);
    }
  };

  // Reschedule or assign due date to a task
  const handleSetTaskDueDate = (listId: string, taskId: string, newDueDate?: string) => {
    triggerHaptic('light');
    const targetNote = notes.find((l) => l.id === listId);
    if (!targetNote) return;

    const currentTasks = parseTodoItemsFromNote(targetNote);
    const updated = currentTasks.map((t) =>
      t.id === taskId ? { ...t, dueDate: newDueDate } : t
    );
    updateNoteTasks(listId, updated);
    setSchedulingTask(null);
  };

  // Add task helper: dispatches to dedicated Today list or creates/updates list
  const addTaskWithDueDate = (text: string, targetDueDate?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    triggerHaptic('selection');
    const newTask: TodoSubItem = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      completed: false,
      dueDate: targetDueDate,
    };

    const isAddingForToday = activeTab === 'today' || targetDueDate === todayStr;

    if (isAddingForToday) {
      // 1. Check if an active "Today" list already exists for today
      const existingTodayList = todoLists.find(
        (l) => l.isTodayList && !l.isArchived && l.todayDate === todayStr
      );

      if (existingTodayList) {
        // Add to existing Today list
        const currentTasks = parseTodoItemsFromNote(existingTodayList);
        updateNoteTasks(existingTodayList.id, [...currentTasks, newTask]);
      } else {
        // Create a specific dedicated list in Inbox for today
        const newTodayNote: NoteItem = {
          id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: 'Today',
          content: `[ ] ${trimmed} @${todayStr}`,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          isTodo: true,
          entryType: 'todo',
          isTodayList: true,
          todayDate: todayStr,
          todoItems: [newTask],
        };
        onAddNote(newTodayNote);
      }
    } else {
      // Non-today task (e.g. from Upcoming)
      // Look for an existing non-today list, or fallback to any active list
      const nonTodayList = todoLists.find((l) => !l.isTodayList);
      const targetList = nonTodayList || todoLists[0];

      if (targetList) {
        const currentTasks = parseTodoItemsFromNote(targetList);
        updateNoteTasks(targetList.id, [...currentTasks, newTask]);
      } else {
        // Create a standard "Tasks" list
        const newDefaultNote: NoteItem = {
          id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: 'Tasks',
          content: `[ ] ${trimmed}${targetDueDate ? ` @${targetDueDate}` : ''}`,
          date: new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          isTodo: true,
          entryType: 'todo',
          todoItems: [newTask],
        };
        onAddNote(newDefaultNote);
      }
    }
  };

  // Bottom input submit handler based on active tab
  const handleBottomAdd = () => {
    if (!inputText.trim()) return;

    if (activeTab === 'inbox') {
      const trimmed = inputText.trim();
      const isToday = trimmed.toLowerCase() === 'today';
      const newNote: NoteItem = {
        id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: trimmed,
        content: '',
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        isTodo: true,
        entryType: 'todo',
        isTodayList: isToday,
        todayDate: isToday ? todayStr : undefined,
        todoItems: [],
      };
      onAddNote(newNote);
      triggerHaptic('success');
      setSelectedTodoNoteForDrawer(newNote);
    } else if (activeTab === 'today') {
      addTaskWithDueDate(inputText, todayStr);
    } else if (activeTab === 'upcoming') {
      addTaskWithDueDate(inputText, selectedCalendarDate);
    }

    setInputText('');
  };

  // Calendar grid computation
  const calendarGrid = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth(); // 0-indexed

    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = formatDateToISO(prevDate);
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(year, month, d);
      const dateStr = formatDateToISO(currDate);
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding (up to 35 or 42 cells)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = formatDateToISO(nextDate);
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return days;
  }, [calendarMonth, todayStr]);

  // Calendar month navigation
  const handlePrevMonth = () => {
    triggerHaptic('light');
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    triggerHaptic('light');
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    triggerHaptic('light');
    const now = new Date();
    setCalendarMonth(now);
    setSelectedCalendarDate(todayStr);
  };

  // Active tab titles & subtitles
  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'inbox':
        return {
          title: 'Inbox',
          badge: `${inboxActiveCount} active`,
          subtitle: 'All existing tasks',
        };
      case 'today':
        return {
          title: 'Today',
          badge: `${todayActiveCount} today`,
          subtitle: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          }),
        };
      case 'upcoming':
        return {
          title: 'Upcoming',
          badge: `${upcomingActiveCount} scheduled`,
          subtitle: 'Calendar & Schedule',
        };
    }
  };

  const headerMeta = getHeaderMeta();

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
      {/* Top Header */}
      <header className="px-3 sm:px-6 pt-[max(calc(var(--safe-top,0px)+0.75rem),1.25rem)] md:pt-6 pb-2 flex items-center justify-between shrink-0 relative z-20 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to notes"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
              isDark
                ? 'text-neutral-300 hover:text-white hover:bg-[#18181b]'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight truncate">
                Todo
              </h1>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  isDark
                    ? 'bg-neutral-800 text-neutral-300'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {inboxActiveCount} active
              </span>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0 relative">
          {/* Filter button next to search button */}
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsFilterMenuOpen((prev) => !prev);
              }}
              aria-label="Filter tasks"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center active:scale-95 transition-all relative ${
                filterStatus !== 'all'
                  ? isDark
                    ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/40'
                    : 'text-emerald-600 bg-emerald-50 border border-emerald-300'
                  : isDark
                  ? 'text-neutral-300 hover:text-white bg-[#141416] hover:bg-[#1e1e22]'
                  : 'text-neutral-700 hover:text-neutral-900 bg-[#ebecef] hover:bg-[#e2e3e7]'
              }`}
            >
              <Filter className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2]" />
              {filterStatus !== 'all' && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            <AnimatePresence>
              {isFilterMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 mt-2 w-48 rounded-2xl border shadow-xl p-1.5 z-50 transition-colors ${
                    isDark
                      ? 'bg-[#18181b] border-neutral-700/80 text-white shadow-black/60'
                      : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/40'
                  }`}
                >
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Filter Tasks
                  </div>

                  {(
                    [
                      { id: 'all', label: 'All Tasks', count: inboxTotalCount },
                      { id: 'pending', label: 'Active Only', count: inboxActiveCount },
                      {
                        id: 'completed',
                        label: 'Done Only',
                        count: inboxTotalCount - inboxActiveCount,
                      },
                    ] as const
                  ).map((option) => {
                    const isSelected = filterStatus === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setFilterStatus(option.id);
                          setIsFilterMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                          isSelected
                            ? isDark
                              ? 'bg-neutral-800 text-white font-semibold'
                              : 'bg-neutral-100 text-neutral-900 font-semibold'
                            : isDark
                            ? 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
                            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                          ) : (
                            <div className="w-3.5 h-3.5" />
                          )}
                          <span>{option.label}</span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? isDark
                                ? 'bg-neutral-700 text-neutral-200'
                                : 'bg-neutral-200 text-neutral-800'
                              : 'opacity-60'
                          }`}
                        >
                          {option.count}
                        </span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {onOpenSearch && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenSearch();
              }}
              aria-label="Open search"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                isDark
                  ? 'text-neutral-300 hover:text-white bg-[#141416] hover:bg-[#1e1e22]'
                  : 'text-neutral-700 hover:text-neutral-900 bg-[#ebecef] hover:bg-[#e2e3e7]'
              }`}
            >
              <Search className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2]" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-2 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full space-y-4">
        {/* THE THREE OPTIONS BAR: INBOX, TODAY, UPCOMING */}
        <div
          className={`grid grid-cols-3 p-1 rounded-2xl gap-1 border transition-colors ${
            isDark
              ? 'bg-[#121214] border-neutral-800/80'
              : 'bg-neutral-100/90 border-neutral-200/80'
          }`}
        >
          {/* 1. Inbox Option */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('inbox');
            }}
            className={`relative py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              activeTab === 'inbox'
                ? isDark
                  ? 'text-white'
                  : 'text-neutral-900'
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {activeTab === 'inbox' && (
              <motion.div
                layoutId="todo-main-tab-pill"
                className={`absolute inset-0 rounded-xl shadow-xs ${
                  isDark ? 'bg-[#222226]' : 'bg-white'
                }`}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <Inbox className="w-4 h-4 shrink-0 relative z-10 stroke-[2.2]" />
            <span className="relative z-10">Inbox</span>
            <span
              className={`relative z-10 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'inbox'
                  ? isDark
                    ? 'bg-neutral-800 text-neutral-300'
                    : 'bg-neutral-100 text-neutral-700'
                  : 'opacity-60'
              }`}
            >
              {inboxTotalCount}
            </span>
          </button>

          {/* 2. Today Option */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('today');
            }}
            className={`relative py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              activeTab === 'today'
                ? isDark
                  ? 'text-white'
                  : 'text-neutral-900'
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {activeTab === 'today' && (
              <motion.div
                layoutId="todo-main-tab-pill"
                className={`absolute inset-0 rounded-xl shadow-xs ${
                  isDark ? 'bg-[#222226]' : 'bg-white'
                }`}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <CalendarDays className="w-4 h-4 shrink-0 relative z-10 stroke-[2.2]" />
            <span className="relative z-10">Today</span>
            <span
              className={`relative z-10 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'today'
                  ? isDark
                    ? 'bg-neutral-800 text-neutral-300'
                    : 'bg-neutral-100 text-neutral-700'
                  : 'opacity-60'
              }`}
            >
              {todayActiveCount}
            </span>
          </button>

          {/* 3. Upcoming Option */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('upcoming');
            }}
            className={`relative py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              activeTab === 'upcoming'
                ? isDark
                  ? 'text-white'
                  : 'text-neutral-900'
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {activeTab === 'upcoming' && (
              <motion.div
                layoutId="todo-main-tab-pill"
                className={`absolute inset-0 rounded-xl shadow-xs ${
                  isDark ? 'bg-[#222226]' : 'bg-white'
                }`}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <Calendar className="w-4 h-4 shrink-0 relative z-10 stroke-[2.2]" />
            <span className="relative z-10">Upcoming</span>
            <span
              className={`relative z-10 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === 'upcoming'
                  ? isDark
                    ? 'bg-neutral-800 text-neutral-300'
                    : 'bg-neutral-100 text-neutral-700'
                  : 'opacity-60'
              }`}
            >
              {upcomingActiveCount}
            </span>
          </button>
        </div>

        {/* TAB CONTENT: INBOX */}
        {activeTab === 'inbox' && (
          <div className="space-y-3">
            {/* Active filter badge if filterStatus is active */}
            {filterStatus !== 'all' && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-neutral-400">Filtered:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {filterStatus === 'pending' ? 'Active only' : 'Done only'}
                    <button
                      type="button"
                      onClick={() => setFilterStatus('all')}
                      className="hover:opacity-75 transition-opacity"
                      aria-label="Clear filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              </div>
            )}

            {/* Todo Lists in Inbox */}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {displayedInboxLists.map((list) => {
                  const items = parseTodoItemsFromNote(list);
                  const completedCount = items.filter((t) => t.completed).length;
                  const totalCount = items.length;
                  const pendingCount = totalCount - completedCount;

                  return (
                    <motion.div
                      key={`inbox-list-${list.id}`}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16 }}
                      onClick={() => {
                        triggerHaptic('light');
                        setSelectedTodoNoteForDrawer(list);
                      }}
                      className={`group w-full p-4 rounded-2xl sm:rounded-3xl cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between gap-3.5 border ${
                        isDark
                          ? 'bg-[#141416] hover:bg-[#1a1a1e] border-neutral-800/80'
                          : 'bg-white hover:bg-neutral-50 border-neutral-200/80 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                            isDark
                              ? 'bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/20'
                              : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
                          }`}
                        >
                          <ListTodo className="w-5 h-5 stroke-[2]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-[15px] font-semibold tracking-tight truncate leading-snug ${
                              isDark ? 'text-white' : 'text-neutral-900'
                            }`}
                          >
                            {list.title || 'Tasks'}
                          </h3>
                          <div
                            className={`flex items-center gap-2 mt-0.5 text-xs ${
                              isDark ? 'text-neutral-400' : 'text-neutral-500'
                            }`}
                          >
                            <span>
                              {totalCount === 0
                                ? 'No tasks'
                                : `${totalCount} ${totalCount === 1 ? 'task' : 'tasks'}`}
                            </span>
                            {totalCount > 0 && (
                              <>
                                <span>•</span>
                                <span>
                                  {completedCount === totalCount
                                    ? 'All done'
                                    : `${completedCount} done, ${pendingCount} active`}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('medium');
                            onDeleteNote(list.id);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all opacity-70 hover:opacity-100 ${
                            isDark
                              ? 'hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400'
                              : 'hover:bg-rose-50 text-neutral-500 hover:text-rose-600'
                          }`}
                          aria-label="Delete list"
                          title="Delete list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <ChevronRight
                          className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                            isDark ? 'text-neutral-500' : 'text-neutral-400'
                          }`}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {displayedInboxLists.length === 0 && (
                <EmptyStateBox
                  isDark={isDark}
                  title={
                    filterStatus === 'completed'
                      ? 'No completed lists'
                      : filterStatus === 'pending'
                      ? 'No active lists'
                      : 'Inbox is empty'
                  }
                  description={
                    filterStatus === 'completed'
                      ? 'Completed lists will show up here.'
                      : 'Create a new list using the input below to organize your tasks.'
                  }
                />
              )}

              {/* Archived Lists Section */}
              {archivedTodoLists.length > 0 && (
                <div className="pt-4 mt-4 border-t border-neutral-200/60 dark:border-neutral-800/60 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setIsArchiveSectionOpen((prev) => !prev);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
                      isDark
                        ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
                        : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Archive className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Archived Lists</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {archivedTodoLists.length}
                      </span>
                    </div>
                    {isArchiveSectionOpen ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isArchiveSectionOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="space-y-2 overflow-hidden"
                      >
                        <p className={`text-[11px] px-2 italic ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                          Past daily lists and archived todo lists are preserved here.
                        </p>
                        {archivedTodoLists.map((list) => {
                          const items = parseTodoItemsFromNote(list);
                          const completedCount = items.filter((t) => t.completed).length;
                          const totalCount = items.length;
                          const pendingCount = totalCount - completedCount;

                          return (
                            <div
                              key={`archived-list-${list.id}`}
                              onClick={() => {
                                triggerHaptic('light');
                                setSelectedTodoNoteForDrawer(list);
                              }}
                              className={`group w-full p-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.99] flex items-center justify-between gap-3 border opacity-85 hover:opacity-100 ${
                                isDark
                                  ? 'bg-[#121214] hover:bg-[#18181b] border-neutral-800/70'
                                  : 'bg-neutral-50 hover:bg-white border-neutral-200/80 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    isDark ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-200 text-neutral-600'
                                  }`}
                                >
                                  <Archive className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4
                                      className={`text-sm font-medium tracking-tight truncate ${
                                        isDark ? 'text-neutral-300' : 'text-neutral-800'
                                      }`}
                                    >
                                      {list.title || 'Archived List'}
                                    </h4>
                                    {list.isTodayList && (
                                      <span
                                        className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                                          isDark
                                            ? 'bg-neutral-800 text-neutral-400 border border-neutral-700/50'
                                            : 'bg-neutral-200 text-neutral-600 border border-neutral-300/50'
                                        }`}
                                      >
                                        Past Today
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    className={`flex items-center gap-2 mt-0.5 text-[11px] ${
                                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                                    }`}
                                  >
                                    <span>
                                      {totalCount === 0 ? 'No tasks' : `${totalCount} tasks`}
                                    </span>
                                    {totalCount > 0 && (
                                      <>
                                        <span>•</span>
                                        <span>
                                          {completedCount === totalCount
                                            ? 'All done'
                                            : `${completedCount} done, ${pendingCount} active`}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerHaptic('success');
                                    onUpdateNote({ ...list, isArchived: false });
                                  }}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-75 hover:opacity-100 ${
                                    isDark
                                      ? 'hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-400'
                                      : 'hover:bg-emerald-50 text-neutral-500 hover:text-emerald-600'
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
                                    onDeleteNote(list.id);
                                  }}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all opacity-75 hover:opacity-100 ${
                                    isDark
                                      ? 'hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400'
                                      : 'hover:bg-rose-50 text-neutral-500 hover:text-rose-600'
                                  }`}
                                  aria-label="Delete list"
                                  title="Delete permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: TODAY */}
        {activeTab === 'today' && (
          <div className="space-y-3">
            {/* Active filter badge if filterStatus is active */}
            {filterStatus !== 'all' && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-neutral-400">Filtered:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                      isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {filterStatus === 'pending' ? 'Active only' : 'Done only'}
                    <button
                      type="button"
                      onClick={() => setFilterStatus('all')}
                      className="hover:opacity-75 transition-opacity"
                      aria-label="Clear filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              </div>
            )}

            {/* Overdue Section if any active overdue tasks exist */}
            {displayedOverdueTasks.length > 0 && (
              <div className="space-y-2 pb-1">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider">
                    Overdue
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 font-medium">
                    {displayedOverdueTasks.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {displayedOverdueTasks.map((item) => (
                    <TaskItemRow
                      key={`overdue-task-${item.listId}-${item.task.id}`}
                      item={item}
                      isDark={isDark}
                      todayStr={todayStr}
                      onOpenDrawer={handleOpenTaskDrawer}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                      onOpenSchedule={() => setSchedulingTask(item)}
                      showListBadge
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Today's Tasks Section Header */}
            <div className="flex items-center justify-between px-1">
              <span
                className={`text-xs font-semibold tracking-wide ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}
              >
                {formattedTodayDate}
              </span>
              <span
                className={`text-xs font-mono ${
                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                {todayTasks.filter((t) => t.task.completed).length} / {todayTasks.length} completed
              </span>
            </div>

            {/* Today Tasks List */}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {displayedTodayTasks.map((item) => (
                  <TaskItemRow
                    key={`today-task-${item.listId}-${item.task.id}`}
                    item={item}
                    isDark={isDark}
                    todayStr={todayStr}
                    onOpenDrawer={handleOpenTaskDrawer}
                    onToggle={handleToggleTask}
                    onDelete={handleDeleteTask}
                    onOpenSchedule={() => setSchedulingTask(item)}
                    showListBadge
                    hideTodayDateBadge
                  />
                ))}
              </AnimatePresence>

              {displayedTodayTasks.length === 0 && displayedOverdueTasks.length === 0 && (
                <EmptyStateBox
                  isDark={isDark}
                  title={filterStatus !== 'all' ? 'No tasks matching filter' : 'No tasks scheduled for today'}
                  description={filterStatus !== 'all' ? 'Try selecting All Tasks from the filter button in the header.' : 'Use the input below to quickly add tasks you want to accomplish today.'}
                />
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: UPCOMING WITH CALENDAR VIEW */}
        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {/* CALENDAR CARD */}
            <div
              className={`p-4 rounded-3xl border shadow-xs transition-colors ${
                isDark
                  ? 'bg-[#121214] border-neutral-800/90'
                  : 'bg-white border-neutral-200/90'
              }`}
            >
              {/* Calendar Month & Navigation Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h2 className="text-base font-bold tracking-tight">
                    {calendarMonth.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h2>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                      isDark
                        ? 'bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous month"
                    className={`p-1.5 rounded-full transition-colors ${
                      isDark
                        ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                        : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                    className={`p-1.5 rounded-full transition-colors ${
                      isDark
                        ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white'
                        : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Days of Week Row */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div
                    key={`weekday-${idx}`}
                    className={`text-[11px] font-semibold py-1 uppercase ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {calendarGrid.map((day) => {
                  const isSelected = selectedCalendarDate === day.dateStr;
                  const taskMeta = datesWithTasksMap.get(day.dateStr);
                  const hasTasks = !!taskMeta && taskMeta.total > 0;
                  const hasPending = !!taskMeta && taskMeta.pending > 0;

                  return (
                    <button
                      key={`cal-day-${day.dateStr}`}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setSelectedCalendarDate(day.dateStr);
                      }}
                      className={`relative h-10 rounded-2xl flex flex-col items-center justify-center transition-all ${
                        isSelected
                          ? isDark
                            ? 'bg-white text-black font-bold shadow-md scale-105'
                            : 'bg-neutral-900 text-white font-bold shadow-md scale-105'
                          : day.isToday
                          ? isDark
                            ? 'border border-emerald-500/60 text-emerald-400 font-semibold'
                            : 'border border-emerald-600/60 text-emerald-700 font-semibold'
                          : day.isCurrentMonth
                          ? isDark
                            ? 'text-neutral-200 hover:bg-neutral-800/60'
                            : 'text-neutral-800 hover:bg-neutral-100'
                          : isDark
                          ? 'text-neutral-600 hover:bg-neutral-800/40'
                          : 'text-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-xs leading-none">{day.dayNum}</span>

                      {/* Task dot indicators */}
                      {hasTasks && (
                        <span
                          className={`w-1 h-1 rounded-full mt-0.5 ${
                            isSelected
                              ? isDark
                                ? 'bg-black'
                                : 'bg-white'
                              : hasPending
                              ? 'bg-emerald-500'
                              : 'bg-neutral-400'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SELECTED DATE VIEW & ADD TASK */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight">
                    {formatFriendlyDate(selectedCalendarDate, todayStr)}
                  </h3>
                  <span
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                      isDark
                        ? 'bg-neutral-800 text-neutral-300'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {selectedDateTasks.length} task
                    {selectedDateTasks.length === 1 ? '' : 's'}
                  </span>
                </div>

                <span
                  className={`text-xs ${
                    isDark ? 'text-neutral-500' : 'text-neutral-400'
                  }`}
                >
                  {selectedCalendarDate}
                </span>
              </div>

              {/* Quick inline add for selected date */}
              <div
                className={`flex items-center px-3.5 py-2 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-[#141416] border-neutral-800/90 focus-within:border-neutral-600'
                    : 'bg-white border-neutral-200/90 focus-within:border-neutral-400'
                }`}
              >
                <Plus className="w-4 h-4 text-emerald-500 shrink-0 mr-2.5 stroke-[2.2]" />
                <input
                  type="text"
                  value={upcomingInputText}
                  onChange={(e) => setUpcomingInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (upcomingInputText.trim()) {
                        addTaskWithDueDate(upcomingInputText, selectedCalendarDate);
                        setUpcomingInputText('');
                      }
                    }
                  }}
                  placeholder={`Add task for ${formatFriendlyDate(
                    selectedCalendarDate,
                    todayStr
                  )}...`}
                  className={`flex-1 bg-transparent text-xs sm:text-sm outline-none ${
                    isDark ? 'text-white' : 'text-neutral-900'
                  }`}
                />
                <button
                  type="button"
                  disabled={!upcomingInputText.trim()}
                  onClick={() => {
                    if (upcomingInputText.trim()) {
                      addTaskWithDueDate(upcomingInputText, selectedCalendarDate);
                      setUpcomingInputText('');
                    }
                  }}
                  className="text-xs px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Tasks for selected date */}
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {displayedSelectedDateTasks.map((item) => (
                    <TaskItemRow
                      key={`seldate-task-${item.listId}-${item.task.id}`}
                      item={item}
                      isDark={isDark}
                      todayStr={todayStr}
                      onOpenDrawer={handleOpenTaskDrawer}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                      onOpenSchedule={() => setSchedulingTask(item)}
                      showListBadge
                    />
                  ))}
                </AnimatePresence>

                {displayedSelectedDateTasks.length === 0 && (
                  <p
                    className={`text-xs text-center py-5 italic ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    No tasks scheduled for this date.
                  </p>
                )}
              </div>
            </div>

            {/* UPCOMING HORIZON (Chronological overview of scheduled tasks) */}
            {upcomingTasks.length > 0 && (
              <div className="pt-3 border-t border-neutral-200/50 dark:border-neutral-800/50 space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    Upcoming Schedule
                  </span>
                  <span
                    className={`text-xs font-mono ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    {upcomingTasks.length} upcoming
                  </span>
                </div>

                <div className="space-y-2">
                  {upcomingTasks.map((item) => (
                    <TaskItemRow
                      key={`upcoming-all-${item.listId}-${item.task.id}`}
                      item={item}
                      isDark={isDark}
                      todayStr={todayStr}
                      onOpenDrawer={handleOpenTaskDrawer}
                      onToggle={handleToggleTask}
                      onDelete={handleDeleteTask}
                      onOpenSchedule={() => setSchedulingTask(item)}
                      showDateBadge
                      showListBadge
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADD TASK INPUT BAR AT THE BOTTOM */}
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
              onClick={handleBottomAdd}
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
                  handleBottomAdd();
                }
              }}
              placeholder={
                activeTab === 'inbox'
                  ? 'Create a new list...'
                  : activeTab === 'today'
                  ? 'Add a task for Today...'
                  : `Add a task for ${formatFriendlyDate(selectedCalendarDate, todayStr)}...`
              }
              className={`flex-1 bg-transparent text-sm md:text-[14.5px] outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 ${
                isDark ? 'text-white' : 'text-neutral-900'
              }`}
            />
          </div>
        </div>
      </div>

      {/* QUICK RESCHEDULE / SCHEDULE MODAL */}
      <AnimatePresence>
        {schedulingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSchedulingTask(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className={`relative w-full max-w-sm rounded-3xl p-5 shadow-2xl border ${
                isDark
                  ? 'bg-[#141416] border-neutral-800 text-white'
                  : 'bg-white border-neutral-200 text-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Schedule Task</h3>
                  <p className={`text-xs truncate max-w-[220px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    &ldquo;{schedulingTask.task.text}&rdquo;
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSchedulingTask(null)}
                  className={`p-1.5 rounded-full ${
                    isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-3 space-y-1.5">
                {/* Option: Today */}
                <button
                  type="button"
                  onClick={() =>
                    handleSetTaskDueDate(
                      schedulingTask.listId,
                      schedulingTask.task.id,
                      todayStr
                    )
                  }
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-colors ${
                    isDark
                      ? 'bg-neutral-800/80 hover:bg-neutral-800 text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-500" />
                    <span>Today</span>
                  </div>
                  <span className="text-[11px] opacity-60 font-mono">{todayStr}</span>
                </button>

                {/* Option: Tomorrow */}
                {(() => {
                  const tm = new Date();
                  tm.setDate(tm.getDate() + 1);
                  const tomorrowStr = formatDateToISO(tm);
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        handleSetTaskDueDate(
                          schedulingTask.listId,
                          schedulingTask.task.id,
                          tomorrowStr
                        )
                      }
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-colors ${
                        isDark
                          ? 'bg-neutral-800/80 hover:bg-neutral-800 text-white'
                          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>Tomorrow</span>
                      </div>
                      <span className="text-[11px] opacity-60 font-mono">
                        {tomorrowStr}
                      </span>
                    </button>
                  );
                })()}

                {/* Option: Pick a specific date */}
                <div
                  className={`flex items-center justify-between px-3.5 py-2 rounded-2xl border ${
                    isDark
                      ? 'bg-neutral-900 border-neutral-700'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <span className="text-xs font-medium">Custom Date</span>
                  <input
                    type="date"
                    defaultValue={schedulingTask.task.dueDate || todayStr}
                    onChange={(e) => {
                      if (e.target.value) {
                        handleSetTaskDueDate(
                          schedulingTask.listId,
                          schedulingTask.task.id,
                          e.target.value
                        );
                      }
                    }}
                    className={`text-xs bg-transparent outline-none cursor-pointer ${
                      isDark ? 'text-white' : 'text-neutral-900'
                    }`}
                  />
                </div>

                {/* Option: Clear date / Move to Inbox */}
                {schedulingTask.task.dueDate && (
                  <button
                    type="button"
                    onClick={() =>
                      handleSetTaskDueDate(
                        schedulingTask.listId,
                        schedulingTask.task.id,
                        undefined
                      )
                    }
                    className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-medium text-amber-500 hover:bg-amber-500/10 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Remove Date (Move to Inbox)</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Task Edit Drawer Menu */}
      <TaskDrawer
        isOpen={!!selectedTaskForDrawer}
        item={selectedTaskForDrawer}
        allLists={todoLists}
        isDark={isDark}
        todayStr={todayStr}
        onClose={() => setSelectedTaskForDrawer(null)}
        onSave={handleSaveDrawerTask}
        onDelete={(listId, taskId) => {
          handleDeleteTask(listId, taskId);
          setSelectedTaskForDrawer(null);
        }}
      />

      {/* Todo List Drawer Menu (shows list content when clicking title in Inbox) */}
      <TodoDrawer
        isOpen={!!selectedTodoNoteForDrawer}
        theme={theme}
        note={selectedTodoNoteForDrawer}
        onClose={() => setSelectedTodoNoteForDrawer(null)}
        onUpdateNote={(updated) => {
          onUpdateNote(updated);
          setSelectedTodoNoteForDrawer(updated);
        }}
        onDelete={(id) => {
          onDeleteNote(id);
          setSelectedTodoNoteForDrawer(null);
        }}
        onToggleFavorite={(id) => {
          const target = notes.find((n) => n.id === id);
          if (target) {
            onUpdateNote({ ...target, isFavorite: !target.isFavorite });
          }
        }}
      />
    </motion.div>
  );
}

interface TaskItemRowProps {
  item: {
    task: TodoSubItem;
    listId: string;
    listTitle: string;
  };
  isDark: boolean;
  todayStr: string;
  onOpenDrawer: (item: {
    task: TodoSubItem;
    listId: string;
    listTitle: string;
  }) => void;
  onToggle: (listId: string, taskId: string) => void;
  onDelete: (listId: string, taskId: string) => void;
  onOpenSchedule?: () => void;
  showListBadge?: boolean;
  showDateBadge?: boolean;
  hideTodayDateBadge?: boolean;
}

// Sub-component: Individual Task Item Row
const TaskItemRow: FC<TaskItemRowProps> = ({
  item,
  isDark,
  todayStr,
  onOpenDrawer,
  onToggle,
  onDelete,
  onOpenSchedule,
  showListBadge = false,
  showDateBadge = false,
  hideTodayDateBadge = false,
}) => {
  const isOverdue =
    !!item.task.dueDate && item.task.dueDate < todayStr && !item.task.completed;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.16 }}
      onClick={() => onOpenDrawer(item)}
      className={`group cursor-pointer flex items-start justify-between gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.995] ${
        isDark
          ? item.task.completed
            ? 'bg-[#101012] text-neutral-500 hover:bg-[#131316]'
            : 'bg-[#141416] text-neutral-100 shadow-xs hover:bg-[#18181b]'
          : item.task.completed
          ? 'bg-[#f4f4f6] text-neutral-400 hover:bg-[#eeeff2]'
          : 'bg-white text-neutral-900 shadow-xs hover:bg-[#fafafc] border border-neutral-100'
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(item.listId, item.task.id);
          }}
          className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center shrink-0 transition-all ${
            item.task.completed
              ? 'bg-emerald-500 text-white'
              : isDark
              ? 'border border-neutral-600 hover:border-neutral-400 bg-transparent'
              : 'border border-neutral-300 hover:border-neutral-500 bg-transparent'
          }`}
          aria-label={item.task.completed ? 'Mark pending' : 'Mark done'}
        >
          {item.task.completed && <Check className="w-3 h-3 stroke-[3]" />}
        </button>

        {/* Task text */}
        <div className="flex-1 min-w-0">
          <div>
            <p
              className={`text-sm leading-relaxed break-words transition-all ${
                item.task.completed
                  ? 'line-through text-neutral-400 dark:text-neutral-500'
                  : 'font-normal'
              }`}
            >
              {item.task.text}
            </p>

            {/* Tags & Meta row */}
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {/* Due Date badge */}
              {item.task.dueDate && (!hideTodayDateBadge || item.task.dueDate !== todayStr) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenSchedule) {
                      onOpenSchedule();
                    } else {
                      onOpenDrawer(item);
                    }
                  }}
                  className={`text-[10.5px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
                    isOverdue
                      ? 'bg-rose-500/15 text-rose-500'
                      : item.task.dueDate === todayStr
                      ? 'bg-emerald-500/15 text-emerald-500'
                      : isDark
                      ? 'bg-neutral-800 text-neutral-400 hover:text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <Calendar className="w-3 h-3 stroke-[2]" />
                  <span>{formatFriendlyDate(item.task.dueDate, todayStr)}</span>
                </button>
              )}

              {/* Unscheduled date button */}
              {!item.task.dueDate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenSchedule) {
                      onOpenSchedule();
                    } else {
                      onOpenDrawer(item);
                    }
                  }}
                  className={`text-[10px] opacity-0 group-hover:opacity-100 focus:opacity-100 font-medium px-1.5 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                    isDark
                      ? 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                      : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <Calendar className="w-2.5 h-2.5" />
                  <span>Set date</span>
                </button>
              )}

              {/* Source list label */}
              {showListBadge &&
                item.listTitle &&
                item.listTitle !== 'Tasks' &&
                item.listTitle !== 'Today' && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      isDark
                        ? 'bg-neutral-800/80 text-neutral-400'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {item.listTitle}
                  </span>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Action button: Pencil removed! Only trash icon remains */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.listId, item.task.id);
          }}
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
};

// Sub-component: Empty State
function EmptyStateBox({
  isDark,
  title,
  description,
}: {
  isDark: boolean;
  title: string;
  description: string;
}) {
  return (
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
        {title}
      </h3>
      <p
        className={`text-xs max-w-xs leading-relaxed ${
          isDark ? 'text-neutral-500' : 'text-neutral-400'
        }`}
      >
        {description}
      </p>
    </div>
  );
}
