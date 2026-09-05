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
  AlertCircle,
} from 'lucide-react';
import { ThemeMode, NoteItem, TodoSubItem } from '../types';
import { triggerHaptic } from '../lib/capacitor';
import { TodoDrawer, parseTodoItemsFromNote } from './TodoDrawer';
import { TaskDrawer } from './TaskDrawer';
import { DayDetailsDrawer } from './DayDetailsDrawer';

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
  const [calendarVisibleRows, setCalendarVisibleRows] = useState<number>(2);
  const [upcomingInputText, setUpcomingInputText] = useState('');

  // Day details drawer state (for opening date details in Upcoming tab)
  const [selectedDayDrawerDate, setSelectedDayDrawerDate] = useState<string | null>(null);

  // Task drawer edit state
  const [selectedTaskForDrawer, setSelectedTaskForDrawer] = useState<{
    task: TodoSubItem;
    listId: string;
    listTitle: string;
  } | null>(null);

  // Todo list note drawer state (for opening list when clicking title in Inbox)
  const [selectedTodoNoteForDrawer, setSelectedTodoNoteForDrawer] = useState<NoteItem | null>(null);

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

  // Active non-removable Today note for today
  const activeTodayNote: NoteItem = useMemo(() => {
    return (
      todoLists.find(
        (l) =>
          l.isTodayList &&
          !l.isArchived &&
          (l.todayDate === todayStr || l.id === `todo-today-${todayStr}`)
      ) || {
        id: `todo-today-${todayStr}`,
        title: 'Today',
        content: '',
        date: formattedTodayDate,
        entryType: 'todo' as const,
        isTodo: true,
        isTodayList: true,
        todayDate: todayStr,
        todoItems: [],
      }
    );
  }, [todoLists, todayStr, formattedTodayDate]);

  // Keep selectedTodoNoteForDrawer synced with notes updates
  useEffect(() => {
    if (selectedTodoNoteForDrawer) {
      const updated = notes.find((n) => n.id === selectedTodoNoteForDrawer.id);
      if (updated) {
        setSelectedTodoNoteForDrawer(updated);
      } else if (
        selectedTodoNoteForDrawer.isTodayList ||
        selectedTodoNoteForDrawer.id === activeTodayNote.id ||
        (selectedTodoNoteForDrawer.title || '').toLowerCase() === 'today'
      ) {
        setSelectedTodoNoteForDrawer(activeTodayNote);
      } else {
        setSelectedTodoNoteForDrawer(null);
      }
    }
  }, [notes, selectedTodoNoteForDrawer?.id, activeTodayNote]);

  // Ensure an active Today note exists in persistent notes for today
  useEffect(() => {
    const exists = notes.some(
      (n) =>
        (n.entryType === 'todo' || !!n.isTodo) &&
        n.isTodayList &&
        !n.isArchived &&
        n.todayDate === todayStr
    );
    if (!exists) {
      const initialTodayNote: NoteItem = {
        id: `todo-today-${todayStr}`,
        title: 'Today',
        content: '',
        date: formattedTodayDate,
        isTodo: true,
        entryType: 'todo',
        isTodayList: true,
        todayDate: todayStr,
        todoItems: [],
      };
      onAddNote(initialTodayNote);
    }
  }, [notes, todayStr, formattedTodayDate, onAddNote]);

  // Safe delete handler preventing removal of Today note
  const handleSafeDeleteNote = (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (
      target &&
      (target.isTodayList ||
        target.id === `todo-today-${todayStr}` ||
        target.id === activeTodayNote.id ||
        ((target.title || '').toLowerCase() === 'today' && target.todayDate === todayStr))
    ) {
      // Non-removable: Ignore deletion of Today card
      return;
    }
    onDeleteNote(noteId);
  };

  // Structure all tasks with their source list reference
  const allTasksWithList = useMemo(() => {
    const items: Array<{
      task: TodoSubItem;
      listId: string;
      listTitle: string;
    }> = [];

    todoLists.forEach((list) => {
      const parsed = parseTodoItemsFromNote(list);
      const isListToday = list.isTodayList && list.todayDate === todayStr;
      parsed.forEach((task) => {
        items.push({
          task: {
            ...task,
            dueDate: task.dueDate || (isListToday ? todayStr : undefined),
          },
          listId: list.id,
          listTitle: list.title || 'Tasks',
        });
      });
    });

    return items;
  }, [todoLists, todayStr]);

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

  // Map of dueDate -> array of tasks (for upcoming day-by-day feed)
  const tasksByDueDateMap = useMemo(() => {
    const map = new Map<string, typeof allTasksWithList>();
    allTasksWithList.forEach((item) => {
      if (item.task.dueDate) {
        if (filterStatus === 'pending' && item.task.completed) return;
        if (filterStatus === 'completed' && !item.task.completed) return;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            item.task.text.toLowerCase().includes(q) ||
            item.listTitle.toLowerCase().includes(q);
          if (!match) return;
        }

        const existing = map.get(item.task.dueDate) || [];
        existing.push(item);
        map.set(item.task.dueDate, existing);
      }
    });
    return map;
  }, [allTasksWithList, filterStatus, searchQuery]);

  // Continuous list of Today and upcoming days (next 60 days)
  const upcomingDaysList = useMemo(() => {
    const days: Array<{
      dateStr: string;
      dayNum: number;
      dayOfWeek: string;
      dayNameShort: string;
      monthName: string;
      year: number;
      isToday: boolean;
      isTomorrow: boolean;
      title: string;
      subtitle: string;
    }> = [];

    const now = new Date();
    for (let i = 0; i <= 60; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
      const dateStr = formatDateToISO(d);
      const isToday = i === 0;
      const isTomorrow = i === 1;
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
      const dayNameShort = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dayNum = d.getDate();
      const year = d.getFullYear();

      let title = dayOfWeek;
      if (isToday) {
        title = 'Today';
      } else if (isTomorrow) {
        title = 'Tomorrow';
      }

      const subtitle = `${dayNameShort}, ${dayNum} ${monthName} ${year}`;

      days.push({
        dateStr,
        dayNum,
        dayOfWeek,
        dayNameShort,
        monthName,
        year,
        isToday,
        isTomorrow,
        title,
        subtitle,
      });
    }
    return days;
  }, [todayStr]);

  // Filter lists in Inbox according to status & search query
  // Always includes non-removable Today card at the top, even if zero entries
  const displayedInboxLists = useMemo(() => {
    const customLists = todoLists.filter((list) => {
      // Exclude active today list from custom lists to prevent duplication with pinned Today card
      if (list.isTodayList && list.todayDate === todayStr) return false;
      if (list.id === `todo-today-${todayStr}`) return false;
      if ((list.title || '').toLowerCase() === 'today' && list.isTodayList) return false;

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

    // Check if Today card should be shown
    // User requirement: "show today card in inbox even if its zero entry and iit is non removable"
    let showToday = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = 'today'.includes(q);
      const matchesTasks = todayTasks.some((t) => t.task.text.toLowerCase().includes(q));
      showToday = matchesTitle || matchesTasks;
    } else {
      if (filterStatus === 'completed') {
        showToday = todayTasks.filter((t) => t.task.completed).length > 0;
      }
      // For 'all' and 'pending', showToday is ALWAYS true even with 0 entries!
    }

    if (showToday) {
      return [activeTodayNote, ...customLists];
    }
    return customLists;
  }, [
    todoLists,
    filterStatus,
    searchQuery,
    todayStr,
    activeTodayNote,
    todayTasks,
  ]);

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
      // Update in place or append if newly created
      if (!existingTask) {
        updateNoteTasks(listId, [...currentTasks, updatedTask]);
      } else {
        const updatedTasks = currentTasks.map((t) =>
          t.id === taskId ? updatedTask : t
        );
        updateNoteTasks(listId, updatedTasks);
      }
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
      if (isToday) {
        setActiveTab('today');
        setInputText('');
        return;
      }
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

  // Group days into 7-day rows (weeks)
  const calendarRows = useMemo(() => {
    const rows: typeof calendarGrid[] = [];
    for (let i = 0; i < calendarGrid.length; i += 7) {
      rows.push(calendarGrid.slice(i, i + 7));
    }
    return rows;
  }, [calendarGrid]);

  // Find row index containing selected date
  const activeRowIndex = useMemo(() => {
    const idx = calendarRows.findIndex((row) =>
      row.some((day) => day.dateStr === selectedCalendarDate)
    );
    return idx >= 0 ? idx : 0;
  }, [calendarRows, selectedCalendarDate]);

  // Sliced rows to display based on calendarVisibleRows (collapsed to 1 or 2 rows, or full month)
  const displayedCalendarRows = useMemo(() => {
    if (calendarVisibleRows >= calendarRows.length) {
      return calendarRows;
    }
    const count = Math.min(calendarVisibleRows, calendarRows.length);
    let startIndex = activeRowIndex;
    if (startIndex + count > calendarRows.length) {
      startIndex = Math.max(0, calendarRows.length - count);
    }
    return calendarRows.slice(startIndex, startIndex + count);
  }, [calendarRows, calendarVisibleRows, activeRowIndex]);

  // Scroll synchronization ref and programmatic scroll flag
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingFromCalendarClick = useRef(false);

  // Synchronize scroll position of upcoming list to calendar date and month
  useEffect(() => {
    if (activeTab !== 'upcoming') return;
    const container = contentScrollRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      if (isScrollingFromCalendarClick.current) return;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (isScrollingFromCalendarClick.current) {
            ticking = false;
            return;
          }

          const sections = container.querySelectorAll('.day-scroll-section');
          if (sections.length === 0) {
            ticking = false;
            return;
          }

          const containerRect = container.getBoundingClientRect();
          // The trigger threshold is roughly near the top of the scrolling container below the calendar
          const threshold = containerRect.top + 45;

          let targetDate: string | null = null;
          for (let i = 0; i < sections.length; i++) {
            const section = sections[i] as HTMLElement;
            const rect = section.getBoundingClientRect();
            if (rect.bottom >= threshold) {
              targetDate = section.getAttribute('data-date');
              break;
            }
          }

          if (targetDate && targetDate !== selectedCalendarDate) {
            setSelectedCalendarDate(targetDate);
            const [y, m] = targetDate.split('-').map(Number);
            setCalendarMonth((prev) => {
              if (prev.getFullYear() !== y || prev.getMonth() !== m - 1) {
                return new Date(y, m - 1, 1);
              }
              return prev;
            });
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeTab, selectedCalendarDate]);

  // Open drawer menu for new task with target date
  const handleOpenNewTaskDrawerForDate = (targetDueDate: string) => {
    triggerHaptic('light');
    setSelectedCalendarDate(targetDueDate);

    // Sync month if date is outside current month view
    const [y, m] = targetDueDate.split('-').map(Number);
    setCalendarMonth((prev) => {
      if (prev.getFullYear() !== y || prev.getMonth() !== m - 1) {
        return new Date(y, m - 1, 1);
      }
      return prev;
    });

    const nonTodayList = todoLists.find((l) => !l.isTodayList);
    let targetList = nonTodayList || todoLists[0];

    if (!targetList) {
      const newNote: NoteItem = {
        id: `todo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: 'Tasks',
        content: '',
        date: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        isTodo: true,
        entryType: 'todo',
        todoItems: [],
      };
      onAddNote(newNote);
      targetList = newNote;
    }

    const newTaskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setSelectedTaskForDrawer({
      task: {
        id: newTaskId,
        text: '',
        completed: false,
        dueDate: targetDueDate,
      },
      listId: targetList.id,
      listTitle: targetList.title || 'Tasks',
    });
  };

  // Calendar day click handler: updates date, smoothly scrolls to that day, and opens drawer menu
  const handleCalendarDayClick = (day: {
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }) => {
    triggerHaptic('selection');
    setSelectedCalendarDate(day.dateStr);

    if (!day.isCurrentMonth) {
      const [y, m] = day.dateStr.split('-').map(Number);
      setCalendarMonth(new Date(y, m - 1, 1));
    }

    // Scroll day section into view
    const el = document.getElementById(`day-section-${day.dateStr}`);
    if (el && contentScrollRef.current) {
      isScrollingFromCalendarClick.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isScrollingFromCalendarClick.current = false;
      }, 750);
    }

    // Open day details drawer to view items and fill details for this date
    setSelectedDayDrawerDate(day.dateStr);
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
            <h1 className="text-xl font-bold tracking-tight truncate">
              Todo
            </h1>
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

      {/* Static Sub-header: The Three Options Bar (Inbox, Today, Upcoming) */}
      <div className="shrink-0 px-4 sm:px-6 md:px-8 pt-1 pb-2 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full z-10">
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
            {inboxTotalCount > 0 && (
              <span
                className={`relative z-10 text-[10.5px] font-medium px-1.5 py-0.5 min-w-[18px] text-center leading-none rounded-full ${
                  activeTab === 'inbox'
                    ? isDark
                      ? 'bg-neutral-800 text-neutral-300'
                      : 'bg-neutral-100 text-neutral-700'
                    : isDark
                    ? 'bg-neutral-800/60 text-neutral-400'
                    : 'bg-neutral-200/80 text-neutral-600'
                }`}
              >
                {inboxTotalCount}
              </span>
            )}
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
            {todayActiveCount > 0 && (
              <span
                className={`relative z-10 text-[10.5px] font-medium px-1.5 py-0.5 min-w-[18px] text-center leading-none rounded-full ${
                  activeTab === 'today'
                    ? isDark
                      ? 'bg-neutral-800 text-neutral-300'
                      : 'bg-neutral-100 text-neutral-700'
                    : isDark
                    ? 'bg-neutral-800/60 text-neutral-400'
                    : 'bg-neutral-200/80 text-neutral-600'
                }`}
              >
                {todayActiveCount}
              </span>
            )}
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
            {upcomingActiveCount > 0 && (
              <span
                className={`relative z-10 text-[10.5px] font-medium px-1.5 py-0.5 min-w-[18px] text-center leading-none rounded-full ${
                  activeTab === 'upcoming'
                    ? isDark
                      ? 'bg-neutral-800 text-neutral-300'
                      : 'bg-neutral-100 text-neutral-700'
                    : isDark
                    ? 'bg-neutral-800/60 text-neutral-400'
                    : 'bg-neutral-200/80 text-neutral-600'
                }`}
              >
                {upcomingActiveCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab !== 'upcoming' ? (
        /* INBOX & TODAY MAIN SCROLLABLE CONTENT */
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-2 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full space-y-4">

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

            {/* Archived Lists Section - Above Today and other lists without splitting lines */}
            <div className="space-y-2">
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
                  <span>Archive</span>
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
                    {archivedTodoLists.length === 0 ? (
                      <div
                        className={`p-4 rounded-2xl border text-center text-xs ${
                          isDark
                            ? 'bg-[#141416]/60 border-neutral-800/70 text-neutral-500'
                            : 'bg-neutral-50 border-neutral-200/80 text-neutral-400'
                        }`}
                      >
                        No archived lists
                      </div>
                    ) : (
                      <>
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
                                            : `${completedCount} done`}
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
                                    handleSafeDeleteNote(list.id);
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
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Todo Lists in Inbox */}
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {displayedInboxLists.map((list) => {
                  const isTodayCard =
                    list.isTodayList ||
                    list.id === activeTodayNote.id ||
                    list.id === `todo-today-${todayStr}` ||
                    (list.title || '').toLowerCase() === 'today';

                  const items = isTodayCard
                    ? todayTasks.map((t) => t.task)
                    : parseTodoItemsFromNote(list);
                  const completedCount = isTodayCard
                    ? todayTasks.filter((t) => t.task.completed).length
                    : items.filter((t) => t.completed).length;
                  const totalCount = isTodayCard ? todayTasks.length : items.length;

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
                        setSelectedTodoNoteForDrawer(isTodayCard ? activeTodayNote : list);
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
                          {isTodayCard ? (
                            <Calendar className="w-5 h-5 stroke-[2]" />
                          ) : (
                            <ListTodo className="w-5 h-5 stroke-[2]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3
                            className={`text-[15px] font-semibold tracking-tight truncate leading-snug ${
                              isDark ? 'text-white' : 'text-neutral-900'
                            }`}
                          >
                            {isTodayCard ? 'Today' : (list.title || 'Tasks')}
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
                                    : `${completedCount} done`}
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
                        {!isTodayCard && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('medium');
                              handleSafeDeleteNote(list.id);
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
                        )}

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
        </div>
      ) : (
        /* TAB CONTENT: UPCOMING WITH STATIC CALENDAR & SEPARATE SCROLLING FEED */
        <div className="flex-1 flex flex-col min-h-0 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 pb-1 overflow-hidden">
          {/* STATIC CALENDAR - BLENDED WITH BACKGROUND, MINIMAL & CLEAN */}
          <div className="shrink-0 pt-1 pb-2">
            <div className="w-full">
              {/* Calendar Month & Navigation Header */}
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <div>
                  <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
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
                        ? 'bg-[#1e1e1e] hover:bg-[#282828] text-neutral-300'
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
                        ? 'hover:bg-[#1e1e1e] text-neutral-400 hover:text-white'
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
                        ? 'hover:bg-[#1e1e1e] text-neutral-400 hover:text-white'
                        : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Days of Week Row */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                  <div
                    key={`weekday-${idx}`}
                    className={`text-[11px] font-semibold py-0.5 uppercase tracking-wider ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid (Shows 2 rows by default, expandable up to full month) */}
              <div className="grid grid-cols-7 gap-1 text-center transition-all duration-300">
                {displayedCalendarRows.flat().map((day) => {
                  const isSelected = selectedCalendarDate === day.dateStr;

                  return (
                    <button
                      key={`cal-day-${day.dateStr}`}
                      type="button"
                      onClick={() => handleCalendarDayClick(day)}
                      title={`Select ${day.dateStr} & open entry drawer`}
                      className={`relative w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-full flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? isDark
                            ? 'bg-white text-black font-bold shadow-sm'
                            : 'bg-neutral-900 text-white font-bold shadow-sm'
                          : day.isToday
                          ? isDark
                            ? 'text-emerald-400 font-bold bg-emerald-500/15 ring-1 ring-emerald-500/40'
                            : 'text-emerald-600 font-bold bg-emerald-50 ring-1 ring-emerald-500/40'
                          : day.isCurrentMonth
                          ? isDark
                            ? 'text-neutral-200 hover:bg-[#1c1c1f]'
                            : 'text-neutral-800 hover:bg-neutral-100'
                          : isDark
                          ? 'text-neutral-600 hover:bg-[#18181b]'
                          : 'text-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-xs sm:text-[13px] leading-none">{day.dayNum}</span>
                    </button>
                  );
                })}
              </div>

              {/* SIMPLE EXPAND AND COLLAPSE BUTTON (NO SPLIT LINE) */}
              <div className="flex justify-center pt-1.5 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setCalendarVisibleRows((prev) =>
                      prev >= calendarRows.length ? 2 : calendarRows.length
                    );
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-[#1c1c1f]'
                      : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                  }`}
                  title={
                    calendarVisibleRows >= calendarRows.length
                      ? 'Collapse calendar'
                      : 'Expand calendar'
                  }
                >
                  <span>
                    {calendarVisibleRows >= calendarRows.length
                      ? 'Collapse'
                      : 'Expand'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      calendarVisibleRows >= calendarRows.length
                        ? 'rotate-180'
                        : ''
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* SCROLLING DAYS LIST - STRICTLY POSITIONED BELOW THE STATIC CALENDAR, NEVER OVERLAPPING */}
          <div
            ref={contentScrollRef}
            className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-24 md:pb-8 pr-0.5"
          >
            {upcomingDaysList.map((day) => {
              const dayTasks = tasksByDueDateMap.get(day.dateStr) || [];
              const isSelected = selectedCalendarDate === day.dateStr;
              const overdueForToday = day.isToday ? displayedOverdueTasks : [];
              const totalDayTasks = dayTasks.length + overdueForToday.length;

                const [y, m, d] = day.dateStr.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dayOfWeekShort = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = dateObj.getDate();

                return (
                  <div
                    key={`day-section-${day.dateStr}`}
                    id={`day-section-${day.dateStr}`}
                    data-date={day.dateStr}
                    onClick={() => {
                      triggerHaptic('selection');
                      setSelectedCalendarDate(day.dateStr);
                      setSelectedDayDrawerDate(day.dateStr);
                    }}
                    className={`day-scroll-section group cursor-pointer scroll-mt-2 rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 active:scale-[0.99] flex items-center justify-between gap-3 ${
                      isSelected
                        ? isDark
                          ? 'bg-[#18181b] border-neutral-700 shadow-md ring-1 ring-neutral-700/60'
                          : 'bg-white border-neutral-300 shadow-md ring-1 ring-neutral-200'
                        : isDark
                        ? 'bg-[#141416] hover:bg-[#19191d] border-neutral-800/80 hover:border-neutral-700/80 shadow-2xs'
                        : 'bg-white hover:bg-neutral-50/80 border-neutral-200/80 hover:border-neutral-300 shadow-2xs'
                    }`}
                  >
                    {/* Left: Minimal Date Badge & Day Title */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Compact calendar badge with default app border */}
                      <div
                        className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-colors ${
                          day.isToday
                            ? isDark
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold'
                              : 'bg-emerald-50 border-emerald-500/30 text-emerald-600 font-bold'
                            : isDark
                            ? 'bg-[#1a1a1e] border-neutral-800/80 text-neutral-300 group-hover:border-neutral-700'
                            : 'bg-neutral-100 border-neutral-200/80 text-neutral-700 group-hover:border-neutral-300'
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider leading-none text-neutral-400">
                          {dayOfWeekShort}
                        </span>
                        <span className="text-sm font-semibold leading-tight mt-0.5">
                          {dayNum}
                        </span>
                      </div>

                      {/* Day text & subtitle */}
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          {day.isToday && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          )}
                          <h3
                            className={`text-sm font-semibold truncate ${
                              day.isToday
                                ? isDark
                                  ? 'text-emerald-400'
                                  : 'text-emerald-600'
                                : isDark
                                ? 'text-white'
                                : 'text-neutral-900'
                            }`}
                          >
                            {day.title}
                          </h3>
                        </div>
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          {day.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Middle / Right: Meaningful status pills & Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Overdue alert indicator (for Today if overdue exists) */}
                      {day.isToday && overdueForToday.length > 0 && (
                        <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{overdueForToday.length} overdue</span>
                        </span>
                      )}

                      {/* Task Count Badge - only displayed when tasks exist to avoid visual clutter */}
                      {totalDayTasks > 0 && (
                        <span
                          className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border transition-colors ${
                            isDark
                              ? 'bg-[#1a1a1e] border-neutral-800/80 text-neutral-300'
                              : 'bg-neutral-100 border-neutral-200/80 text-neutral-700'
                          }`}
                        >
                          {totalDayTasks} {totalDayTasks === 1 ? 'task' : 'tasks'}
                        </span>
                      )}

                      {/* Compact "+ Add" Pill button with default app border */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('light');
                          setSelectedCalendarDate(day.dateStr);
                          setSelectedDayDrawerDate(day.dateStr);
                        }}
                        className={`h-7 px-2.5 sm:px-3 rounded-full flex items-center gap-1 text-xs font-medium transition-all active:scale-95 cursor-pointer border ${
                          isDark
                            ? 'bg-[#1a1a1e] hover:bg-[#222228] border-neutral-800/80 hover:border-neutral-700 text-neutral-300 hover:text-white'
                            : 'bg-neutral-100 hover:bg-neutral-200/80 border-neutral-200/80 hover:border-neutral-300 text-neutral-700'
                        }`}
                        title={`Open details for ${day.title}`}
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
                        <span>Add</span>
                      </button>

                      {/* Chevron indicator */}
                      <ChevronRight
                        className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                          isDark
                            ? 'text-neutral-500 group-hover:text-neutral-300'
                            : 'text-neutral-400 group-hover:text-neutral-600'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* ADD TASK INPUT BAR AT THE BOTTOM (Hidden in Upcoming view to maximize scrolling space) */}
      {activeTab !== 'upcoming' && (
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
                    : 'Add a task for Today...'
                }
                className={`flex-1 bg-transparent text-sm md:text-[14.5px] outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500 ${
                  isDark ? 'text-white' : 'text-neutral-900'
                }`}
              />
            </div>
          </div>
        </div>
      )}

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

      {/* Day Details Drawer Menu (shows items and allows adding tasks for clicked date) */}
      <DayDetailsDrawer
        isOpen={!!selectedDayDrawerDate}
        dateStr={selectedDayDrawerDate}
        todayStr={todayStr}
        theme={theme}
        tasks={
          selectedDayDrawerDate
            ? tasksByDueDateMap.get(selectedDayDrawerDate) || []
            : []
        }
        overdueTasks={
          selectedDayDrawerDate === todayStr ? displayedOverdueTasks : []
        }
        onClose={() => setSelectedDayDrawerDate(null)}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        onAddTask={(text, targetDate) => {
          addTaskWithDueDate(text, targetDate);
        }}
        onOpenTaskEdit={(item) => {
          setSelectedTaskForDrawer(item);
        }}
        onOpenSchedule={(item) => {
          setSchedulingTask(item);
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
        onDelete={
          selectedTodoNoteForDrawer?.isTodayList ||
          selectedTodoNoteForDrawer?.id === activeTodayNote.id ||
          selectedTodoNoteForDrawer?.todayDate === todayStr ||
          (selectedTodoNoteForDrawer?.title || '').toLowerCase() === 'today'
            ? undefined
            : (id) => {
                handleSafeDeleteNote(id);
                setSelectedTodoNoteForDrawer(null);
              }
        }
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
