import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Search,
  Plus,
  Filter,
  Check,
  BookOpen,
  Calendar as CalendarIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Bookmark,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Mic,
  Play,
  Pause,
  Clock,
  Feather,
  Quote,
  Maximize2,
  CalendarDays,
  Flame,
  MoreHorizontal,
  Copy,
} from 'lucide-react';
import { ThemeMode, NoteItem, EntryType, VoiceNoteAttachment } from '../types';
import { triggerHaptic } from '../lib/capacitor';
import { DiaryDrawer } from './DiaryDrawer';
import { DiaryDayDrawer } from './DiaryDayDrawer';
import { ImageLightbox } from './ImageLightbox';
import { formatDiaryHeaderDate, stripHtml, parseNoteDateToISO, formatDateToISO } from '../lib/formatters';
import { cleanNoteTextForPreview } from './EmptyBody';

export type DiaryTab = 'inbox' | 'calendar' | 'moments';

interface DiaryPageProps {
  theme: ThemeMode;
  notes: NoteItem[];
  onBack: () => void;
  onOpenSearch?: () => void;
  onSelectNote?: (note: NoteItem) => void;
  onOpenNewNote?: (type?: EntryType, initialDate?: string) => void;
  onUpdateNote?: (note: NoteItem) => void;
  onDeleteNote?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

// Helper: Normalize note date to YYYY-MM-DD
function getNoteDateISO(note: NoteItem): string {
  if (note.todayDate && /^\d{4}-\d{2}-\d{2}$/.test(note.todayDate)) {
    if (note.todayDate.startsWith('2001-')) {
      return `${new Date().getFullYear()}${note.todayDate.slice(4)}`;
    }
    return note.todayDate;
  }
  if (note.date) {
    return parseNoteDateToISO(note.date);
  }
  // Try parsing from id timestamp if available
  const parts = note.id.split('-');
  for (const part of parts) {
    const num = Number(part);
    if (num > 1600000000000 && num < 2500000000000) {
      const d = new Date(num);
      if (!isNaN(d.getTime())) {
        return formatDateToISO(d);
      }
    }
  }
  return formatDateToISO(new Date());
}

// Friendly formatted date string
function formatDisplayDate(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return 'Today';
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const now = new Date(ty, tm - 1, td);
  const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';

  return target.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Audio tone generator fallback
function createToneAudioBlob(): Blob {
  const sampleRate = 44100;
  const duration = 2.0;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 480 + Math.sin(t * 7) * 70;
    const decay = Math.exp(-t * 1.1);
    const sample = Math.sin(2 * Math.PI * freq * t) * decay * 0.3;
    const s = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// Mood emoji helper
function getMoodEmoji(mood?: string): string {
  switch (mood?.toLowerCase()) {
    case 'happy':
    case 'joy':
      return '😊';
    case 'peaceful':
    case 'calm':
      return '😌';
    case 'grateful':
      return '✨';
    case 'excited':
      return '🎉';
    case 'tired':
      return '😴';
    case 'sad':
      return '😔';
    case 'stressed':
    case 'anxious':
      return '😰';
    default:
      return '📝';
  }
}

export function DiaryPage({
  theme,
  notes,
  onBack,
  onOpenSearch,
  onSelectNote,
  onOpenNewNote,
  onUpdateNote,
  onDeleteNote,
  onToggleFavorite,
}: DiaryPageProps) {
  const isDark = theme === 'dark';

  // Three primary tabs: 'inbox' | 'calendar' | 'moments'
  const [activeTab, setActiveTab] = useState<DiaryTab>('inbox');

  // Filter in inbox: 'all' | 'favorites' | 'photos' | 'voice'
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'photos' | 'voice'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Reader Drawer state for viewing a full diary entry
  const [readingNote, setReadingNote] = useState<NoteItem | null>(null);

  // Lightbox state for previewing pictures
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Card dropdown menu state for inbox cards
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);

  // Day drawer state for clicking a day in the calendar
  const [selectedDayDrawerDate, setSelectedDayDrawerDate] = useState<string | null>(null);

  // Audio player state
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const todayISO = useMemo(() => formatDateToISO(new Date()), []);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayISO);
  const [calendarVisibleRows, setCalendarVisibleRows] = useState(2);

  // Scroll synchronization ref and programmatic scroll flag
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingFromCalendarClick = useRef(false);

  // Quick write input text
  const [quickInput, setQuickInput] = useState('');

  // Close filter popover on outside click
  useEffect(() => {
    if (!isFilterOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isFilterOpen]);

  // Clean audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Filter all diary notes
  const diaryNotes = useMemo(() => {
    const seen = new Set<string>();
    return notes
      .filter((n) => {
        if ((n.entryType === 'diary' || n.isDiary) && !n.isArchived) {
          if (n.id && seen.has(n.id)) return false;
          if (n.id) seen.add(n.id);
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        const dateA = getNoteDateISO(a);
        const dateB = getNoteDateISO(b);
        if (dateB !== dateA) {
          return dateB.localeCompare(dateA);
        }
        return (b.id || '').localeCompare(a.id || '');
      });
  }, [notes]);

  // Filtered inbox write-ups
  const inboxEntries = useMemo(() => {
    return diaryNotes.filter((n) => {
      if (filterType === 'favorites') return !!n.isFavorite;
      if (filterType === 'photos') return (n.images && n.images.length > 0) || !!n.imageUrl;
      if (filterType === 'voice') return (n.voiceNotes && n.voiceNotes.length > 0) || !!n.hasVoiceNote;
      return true;
    });
  }, [diaryNotes, filterType]);

  // Date map: Map of ISO dates to count and list of diary entries
  const dateEntriesMap = useMemo(() => {
    const map = new Map<string, NoteItem[]>();
    diaryNotes.forEach((n) => {
      const iso = getNoteDateISO(n);
      const list = map.get(iso) || [];
      list.push(n);
      map.set(iso, list);
    });
    return map;
  }, [diaryNotes]);

  // All Moments: Collect photos, voice notes, and favorite highlights
  const momentsData = useMemo(() => {
    const photos: { note: NoteItem; url: string; index: number }[] = [];
    const voiceMemos: { note: NoteItem; voice: VoiceNoteAttachment; id: string }[] = [];
    const reflections: NoteItem[] = [];

    diaryNotes.forEach((n) => {
      // Photos
      if (n.images && n.images.length > 0) {
        n.images.forEach((img, idx) => {
          photos.push({ note: n, url: img, index: idx });
        });
      } else if (n.imageUrl) {
        photos.push({ note: n, url: n.imageUrl, index: 0 });
      }

      // Voice Memos
      if (n.voiceNotes && n.voiceNotes.length > 0) {
        n.voiceNotes.forEach((vn, idx) => {
          voiceMemos.push({ note: n, voice: vn, id: `${n.id}-voice-${idx}` });
        });
      } else if (n.hasVoiceNote && n.voiceAudioUrl) {
        voiceMemos.push({
          note: n,
          voice: {
            id: `${n.id}-single`,
            audioUrl: n.voiceAudioUrl,
            duration: n.voiceDuration || '0:15',
            name: n.title || 'Voice Reflection',
          },
          id: `${n.id}-single`,
        });
      }

      // Reflections: Favorited or with content >= 80 chars
      if (n.isFavorite || (n.content && n.content.trim().length > 60)) {
        reflections.push(n);
      }
    });

    return { photos, voiceMemos, reflections };
  }, [diaryNotes]);

  // Audio Playback handler
  const handlePlayVoice = (id: string, audioUrl?: string) => {
    triggerHaptic('light');
    if (activePlayingId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setActivePlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    let url = audioUrl;
    if (!url || url.length < 5) {
      const blob = createToneAudioBlob();
      url = URL.createObjectURL(blob);
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setActivePlayingId(id);

    audio.onended = () => {
      setActivePlayingId(null);
      audioRef.current = null;
    };
    audio.onerror = () => {
      setActivePlayingId(null);
      audioRef.current = null;
    };

    audio.play().catch(() => {
      setActivePlayingId(null);
    });
  };

  // Calendar Grid Calculation
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon ...

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const cells: {
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasEntries: boolean;
      entryCount: number;
    }[] = [];

    // Prev month overflow
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      const iso = formatDateToISO(prevDate);
      const entries = dateEntriesMap.get(iso) || [];
      cells.push({
        dateStr: iso,
        dayNum: d,
        isCurrentMonth: false,
        isToday: iso === todayISO,
        hasEntries: entries.length > 0,
        entryCount: entries.length,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const currDate = new Date(year, month, d);
      const iso = formatDateToISO(currDate);
      const entries = dateEntriesMap.get(iso) || [];
      cells.push({
        dateStr: iso,
        dayNum: d,
        isCurrentMonth: true,
        isToday: iso === todayISO,
        hasEntries: entries.length > 0,
        entryCount: entries.length,
      });
    }

    // Next month fill to complete rows (multiple of 7)
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextDate = new Date(year, month + 1, d);
        const iso = formatDateToISO(nextDate);
        const entries = dateEntriesMap.get(iso) || [];
        cells.push({
          dateStr: iso,
          dayNum: d,
          isCurrentMonth: false,
          isToday: iso === todayISO,
          hasEntries: entries.length > 0,
          entryCount: entries.length,
        });
      }
    }

    return cells;
  }, [calendarMonth, dateEntriesMap, todayISO]);

  // Group calendar days into 7-day rows (weeks)
  const calendarRows = useMemo(() => {
    const rows: (typeof calendarDays)[] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return rows;
  }, [calendarDays]);

  // Find row index containing selected date
  const activeRowIndex = useMemo(() => {
    const idx = calendarRows.findIndex((row) =>
      row.some((day) => day.dateStr === selectedCalendarDate)
    );
    return idx >= 0 ? idx : 0;
  }, [calendarRows, selectedCalendarDate]);

  // Sliced rows to display based on calendarVisibleRows (collapsed to 2 rows, or full month)
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

  // Continuous list of days spanning past, today, and upcoming for seamless scrolling
  const diaryDaysList = useMemo(() => {
    const now = new Date();
    const pastDaysOffset = 45;
    const futureDaysOffset = 30;

    let minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - pastDaysOffset);
    let maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + futureDaysOffset);

    // Expand to cover calendarMonth if outside range
    const calStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const calEnd = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    if (calStart < minDate) minDate = new Date(calStart.getFullYear(), calStart.getMonth(), 1);
    if (calEnd > maxDate) maxDate = new Date(calEnd.getFullYear(), calEnd.getMonth() + 1, 0);

    // Expand to cover selectedCalendarDate if outside range
    if (selectedCalendarDate) {
      const [sy, sm, sd] = selectedCalendarDate.split('-').map(Number);
      const selDate = new Date(sy, sm - 1, sd);
      if (selDate < minDate) minDate = new Date(sy, sm - 1, sd - 3);
      if (selDate > maxDate) maxDate = new Date(sy, sm - 1, sd + 3);
    }

    // Also include any notes that might be further in the past (up to 1 year)
    diaryNotes.forEach((n) => {
      const iso = getNoteDateISO(n);
      if (iso) {
        const [ny, nm, nd] = iso.split('-').map(Number);
        const nDate = new Date(ny, nm - 1, nd);
        if (nDate < minDate) {
          const diffDays = (now.getTime() - nDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays <= 365) {
            minDate = new Date(ny, nm - 1, nd - 2);
          }
        }
      }
    });

    const days: Array<{
      dateStr: string;
      dayNum: number;
      dayOfWeek: string;
      dayNameShort: string;
      monthName: string;
      year: number;
      isToday: boolean;
      isYesterday: boolean;
      isTomorrow: boolean;
      title: string;
      subtitle: string;
    }> = [];

    const seenDates = new Set<string>();
    const curr = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    while (curr <= maxDate) {
      const dateStr = formatDateToISO(curr);
      if (seenDates.has(dateStr)) {
        curr.setDate(curr.getDate() + 1);
        continue;
      }
      seenDates.add(dateStr);

      const dayNum = curr.getDate();
      const dayOfWeek = curr.toLocaleDateString('en-US', { weekday: 'long' });
      const dayNameShort = curr.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = curr.toLocaleDateString('en-US', { month: 'short' });
      const year = curr.getFullYear();

      const isToday = dateStr === todayISO;

      const [ty, tm, td] = todayISO.split('-').map(Number);
      const todayDate = new Date(ty, tm - 1, td);
      const dayDiff = Math.round((curr.getTime() - todayDate.getTime()) / (1000 * 3600 * 24));
      const isYesterday = dayDiff === -1;
      const isTomorrow = dayDiff === 1;

      let title = dayOfWeek;
      if (isToday) title = 'Today';
      else if (isYesterday) title = 'Yesterday';
      else if (isTomorrow) title = 'Tomorrow';

      const subtitle = `${dayNameShort}, ${dayNum} ${monthName} ${year}`;

      days.push({
        dateStr,
        dayNum,
        dayOfWeek,
        dayNameShort,
        monthName,
        year,
        isToday,
        isYesterday,
        isTomorrow,
        title,
        subtitle,
      });

      curr.setDate(curr.getDate() + 1);
    }

    return days;
  }, [calendarMonth, selectedCalendarDate, diaryNotes, todayISO]);

  // Synchronize scroll position of diary days list to calendar date and month
  useEffect(() => {
    if (activeTab !== 'calendar') return;
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

          const sections = container.querySelectorAll('.diary-day-scroll-section');
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

  // Scroll to selected date when entering calendar tab
  useEffect(() => {
    if (activeTab === 'calendar') {
      const timer = setTimeout(() => {
        const targetDate = selectedCalendarDate || todayISO;
        const el = document.getElementById(`diary-day-section-${targetDate}`);
        if (el && contentScrollRef.current) {
          isScrollingFromCalendarClick.current = true;
          el.scrollIntoView({ block: 'start' });
          setTimeout(() => {
            isScrollingFromCalendarClick.current = false;
          }, 400);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  // Calendar day click handler: updates date and smoothly scrolls to that day
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
    const el = document.getElementById(`diary-day-section-${day.dateStr}`);
    if (el && contentScrollRef.current) {
      isScrollingFromCalendarClick.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isScrollingFromCalendarClick.current = false;
      }, 750);
    }
  };

  // Selected date's entries
  const selectedDateEntries = useMemo(() => {
    return dateEntriesMap.get(selectedCalendarDate) || [];
  }, [dateEntriesMap, selectedCalendarDate]);

  // Calendar month label
  const monthLabel = useMemo(() => {
    return calendarMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [calendarMonth]);

  // Previous month
  const handlePrevMonth = () => {
    triggerHaptic('selection');
    setCalendarMonth((prev) => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      const iso = formatDateToISO(newMonth);
      setSelectedCalendarDate(iso);
      setTimeout(() => {
        const el = document.getElementById(`diary-day-section-${iso}`);
        if (el && contentScrollRef.current) {
          isScrollingFromCalendarClick.current = true;
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            isScrollingFromCalendarClick.current = false;
          }, 750);
        }
      }, 50);
      return newMonth;
    });
  };

  // Next month
  const handleNextMonth = () => {
    triggerHaptic('selection');
    setCalendarMonth((prev) => {
      const newMonth = new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      const iso = formatDateToISO(newMonth);
      setSelectedCalendarDate(iso);
      setTimeout(() => {
        const el = document.getElementById(`diary-day-section-${iso}`);
        if (el && contentScrollRef.current) {
          isScrollingFromCalendarClick.current = true;
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            isScrollingFromCalendarClick.current = false;
          }, 750);
        }
      }, 50);
      return newMonth;
    });
  };

  // Jump to Today in calendar
  const handleJumpToToday = () => {
    triggerHaptic('selection');
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedCalendarDate(todayISO);

    const el = document.getElementById(`diary-day-section-${todayISO}`);
    if (el && contentScrollRef.current) {
      isScrollingFromCalendarClick.current = true;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        isScrollingFromCalendarClick.current = false;
      }, 750);
    }
  };

  // Quick submit from bottom pen input
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    triggerHaptic('light');
    if (onOpenNewNote) {
      onOpenNewNote('diary');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className={`relative w-full h-full flex flex-col overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#09090b] text-[#f4f4f5]' : 'bg-[#fcfcfd] text-[#18181b]'
      }`}
    >
      {/* Top Header */}
      <header className="px-3 sm:px-6 pt-[max(calc(var(--safe-top,0px)+0.75rem),1.25rem)] md:pt-6 pb-2 flex items-center justify-between shrink-0 relative z-20 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onBack();
            }}
            aria-label="Back to main notes"
            className={`p-2 rounded-full transition-colors active:scale-95 ${
              isDark
                ? 'text-neutral-300 hover:text-white hover:bg-neutral-800/70'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200/70'
            }`}
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Diary
            </h1>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Filter button (primarily for inbox) */}
          {activeTab === 'inbox' && (
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setIsFilterOpen((prev) => !prev);
                }}
                aria-label="Filter diary write-ups"
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  isDark
                    ? 'text-neutral-300 hover:text-white bg-[#141416] hover:bg-[#1e1e22]'
                    : 'text-neutral-700 hover:text-neutral-900 bg-[#ebecef] hover:bg-[#e2e3e7]'
                }`}
              >
                <Filter className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
                {filterType !== 'all' && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500" />
                )}
              </button>

              {/* Filter Popover */}
              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 mt-2 w-44 rounded-2xl border shadow-xl p-1.5 z-50 transition-colors ${
                      isDark
                        ? 'bg-[#18181b] border-neutral-700/80 text-white shadow-black/60'
                        : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/40'
                    }`}
                  >
                    <div className="px-2.5 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Filter Entries
                    </div>
                    {[
                      { id: 'all', label: 'All Write-ups' },
                      { id: 'favorites', label: 'Favorites Only' },
                      { id: 'photos', label: 'With Photos' },
                      { id: 'voice', label: 'With Voice Notes' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setFilterType(opt.id as any);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                          filterType === opt.id
                            ? isDark
                              ? 'bg-neutral-800 text-white font-semibold'
                              : 'bg-neutral-100 text-neutral-900 font-semibold'
                            : isDark
                            ? 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
                            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {filterType === opt.id && (
                          <Check className="w-3.5 h-3.5 text-purple-500 stroke-[2.5]" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Search Button */}
          {onOpenSearch && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenSearch();
              }}
              aria-label="Search diary"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                isDark
                  ? 'text-neutral-300 hover:text-white bg-[#141416] hover:bg-[#1e1e22]'
                  : 'text-neutral-700 hover:text-neutral-900 bg-[#ebecef] hover:bg-[#e2e3e7]'
              }`}
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
            </button>
          )}
        </div>
      </header>

      {/* THE THREE TABS BAR (Inbox, Calendar, Moments) - EXACTLY LIKE TODO PAGE */}
      <div className="shrink-0 px-4 sm:px-6 md:px-8 pt-1 pb-2 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full z-10">
        <div
          className={`grid grid-cols-3 p-1 rounded-2xl gap-1 border transition-colors ${
            isDark
              ? 'bg-[#121214] border-neutral-800/80'
              : 'bg-neutral-100/90 border-neutral-200/80'
          }`}
        >
          {/* 1. Inbox Tab (All write-ups) */}
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
                layoutId="diary-main-tab-pill"
                className={`absolute inset-0 rounded-xl shadow-xs ${
                  isDark ? 'bg-[#222226]' : 'bg-white'
                }`}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <BookOpen className="w-4 h-4 shrink-0 relative z-10 stroke-[2.2]" />
            <span className="relative z-10">Inbox</span>
          </button>

          {/* 2. Calendar Tab (Calendar kinda page like todo upcoming) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('calendar');
            }}
            className={`relative py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              activeTab === 'calendar'
                ? isDark
                  ? 'text-white'
                  : 'text-neutral-900'
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {activeTab === 'calendar' && (
              <motion.div
                layoutId="diary-main-tab-pill"
                className={`absolute inset-0 rounded-xl shadow-xs ${
                  isDark ? 'bg-[#222226]' : 'bg-white'
                }`}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <CalendarIcon className="w-4 h-4 shrink-0 relative z-10 stroke-[2.2]" />
            <span className="relative z-10">Calendar</span>
          </button>

          {/* 3. Moments Tab */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('moments');
            }}
            className={`relative py-2.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${
              activeTab === 'moments'
                ? isDark
                  ? 'text-white'
                  : 'text-neutral-900'
                : isDark
                ? 'text-neutral-400 hover:text-neutral-200'
                : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {activeTab === 'moments' && (
              <motion.div
                layoutId="diary-main-tab-pill"
                className={`absolute inset-0 rounded-xl shadow-xs ${
                  isDark ? 'bg-[#222226]' : 'bg-white'
                }`}
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
              />
            )}
            <Sparkles className="w-4 h-4 shrink-0 relative z-10 stroke-[2.2]" />
            <span className="relative z-10">Moments</span>
          </button>
        </div>
      </div>

      {/* Main Content View Area */}
      {activeTab === 'inbox' ? (
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-6 md:px-8 pb-28 pt-2 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
          <motion.div
            key="tab-inbox"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
            className="space-y-4"
          >
              {inboxEntries.length === 0 ? (
                /* Clean, Minimal Empty State */
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 transition-colors ${
                      isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-600'
                    }`}
                  >
                    <BookOpen className="w-8 h-8 stroke-[1.8]" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight mb-1">
                    {filterType === 'all' ? 'Your Personal Sanctuary' : 'No Matching Write-ups'}
                  </h2>
                  <p className="text-xs text-neutral-500 max-w-xs leading-relaxed mb-6">
                    {filterType === 'all'
                      ? 'Every thought, feeling, and milestone has a home here. Pen down your first entry today.'
                      : 'Try resetting the filter to see all your written reflections.'}
                  </p>
                  {onOpenNewNote && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        onOpenNewNote('diary');
                      }}
                      className="px-5 py-2.5 rounded-full text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Write First Entry</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3.5">
                  {inboxEntries.map((item, idx) => {
                    const noteISO = getNoteDateISO(item);
                    const friendlyDate = formatDisplayDate(noteISO, todayISO);
                    const hasPhotos = (item.images && item.images.length > 0) || !!item.imageUrl;
                    const imagesList = item.images || (item.imageUrl ? [item.imageUrl] : []);
                    const hasVoice = (item.voiceNotes && item.voiceNotes.length > 0) || !!item.hasVoiceNote;
                    const rawCleanText = cleanNoteTextForPreview(item.content);
                    const plainText = stripHtml(rawCleanText);
                    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
                    const readingTime = Math.max(1, Math.ceil(wordCount / 180));
                    const formattedCardDate = formatDiaryHeaderDate(noteISO);

                    // Optional weekday parsing for aesthetic depth
                    let weekdayLabel = '';
                    if (noteISO && /^\d{4}-\d{2}-\d{2}$/.test(noteISO)) {
                      const [y, m, d] = noteISO.split('-').map(Number);
                      const dt = new Date(y, m - 1, d);
                      if (!isNaN(dt.getTime())) {
                        weekdayLabel = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dt.getDay()];
                      }
                    }

                    return (
                      <motion.article
                        key={`diary-inbox-entry-${item.id || 'entry'}-${idx}`}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group relative rounded-[22px] sm:rounded-3xl p-5 sm:p-6 border transition-all duration-200 cursor-pointer overflow-hidden ${
                          isDark
                            ? 'bg-[#141418] hover:bg-[#18181e] border-neutral-800/90 hover:border-purple-500/40 shadow-xs hover:shadow-xl hover:shadow-black/50'
                            : 'bg-white hover:bg-neutral-50/80 border-neutral-200/90 hover:border-purple-300/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]'
                        }`}
                        onClick={() => {
                          triggerHaptic('light');
                          setReadingNote(item);
                        }}
                      >
                        {/* Subtle Craft Accent on Hover */}
                        <div
                          className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full transition-all duration-200 ${
                            isDark
                              ? 'bg-purple-500/0 group-hover:bg-purple-500/80'
                              : 'bg-purple-600/0 group-hover:bg-purple-500/70'
                          }`}
                        />

                        {/* Entry Header: Date pill, Mood & Actions */}
                        <div className="flex items-center justify-between gap-2.5 mb-3 sm:mb-3.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-xs font-semibold tracking-wide px-3 py-1.5 rounded-full flex items-center gap-2 transition-colors ${
                                friendlyDate === 'Today'
                                  ? isDark
                                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/35 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                                    : 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : isDark
                                  ? 'bg-white/[0.05] text-neutral-200 border border-white/[0.08] backdrop-blur-xs'
                                  : 'bg-neutral-100 text-neutral-800 border border-neutral-200/90'
                              }`}
                            >
                              <CalendarIcon className="w-3.5 h-3.5 text-purple-400 stroke-[2.2]" />
                              <span>
                                {friendlyDate === 'Today'
                                  ? `Today • ${formattedCardDate}`
                                  : formattedCardDate}
                              </span>
                            </span>

                            {weekdayLabel && (
                              <span
                                className={`hidden sm:inline-flex text-[11px] font-medium px-2 py-0.5 rounded-md ${
                                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                                }`}
                              >
                                {weekdayLabel}
                              </span>
                            )}

                            {item.mood && (
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 border ${
                                  isDark
                                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/25'
                                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                                }`}
                              >
                                <span>{getMoodEmoji(item.mood)}</span>
                                <span className="capitalize">{item.mood}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 relative" onClick={(e) => e.stopPropagation()}>
                            {/* Favorite bookmark */}
                            {onToggleFavorite && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  onToggleFavorite(item.id);
                                }}
                                aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                className={`p-1.5 sm:p-2 rounded-full transition-all cursor-pointer ${
                                  item.isFavorite
                                    ? isDark
                                      ? 'text-purple-400 bg-purple-500/15'
                                      : 'text-purple-600 bg-purple-100/80'
                                    : isDark
                                    ? 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]'
                                    : 'text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100'
                                }`}
                              >
                                <Bookmark
                                  className="w-4 h-4"
                                  fill={item.isFavorite ? 'currentColor' : 'none'}
                                  strokeWidth={2}
                                />
                              </button>
                            )}

                            {/* More button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setOpenCardMenuId((prev) => (prev === item.id ? null : item.id));
                                }}
                                aria-label="More actions"
                                className={`p-1.5 sm:p-2 rounded-full transition-all cursor-pointer ${
                                  openCardMenuId === item.id
                                    ? isDark
                                      ? 'bg-neutral-800 text-white'
                                      : 'bg-neutral-200 text-neutral-900'
                                    : isDark
                                    ? 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.06]'
                                    : 'text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100'
                                }`}
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              <AnimatePresence>
                                {openCardMenuId === item.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -2 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -2 }}
                                    transition={{ duration: 0.12 }}
                                    className={`absolute right-0 top-full mt-1 w-40 rounded-xl border shadow-xl p-1 z-30 ${
                                      isDark
                                        ? 'bg-[#18181b] border-neutral-700 text-white shadow-black/60'
                                        : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/40'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenCardMenuId(null);
                                        triggerHaptic('light');
                                        setReadingNote(item);
                                      }}
                                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                        isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                                      }`}
                                    >
                                      <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                                      <span>Open Journal</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenCardMenuId(null);
                                        triggerHaptic('light');
                                        if (item.content) {
                                          navigator.clipboard?.writeText(plainText);
                                        }
                                      }}
                                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                        isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                                      }`}
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Copy Text</span>
                                    </button>

                                    {onDeleteNote && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenCardMenuId(null);
                                          triggerHaptic('medium');
                                          onDeleteNote(item.id);
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-red-500 hover:bg-red-500/10 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                      </button>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>

                        {/* Title - Bigger & bolder as requested */}
                        <h3
                          className={`text-xl sm:text-2xl font-bold tracking-tight mb-2 sm:mb-2.5 leading-snug group-hover:text-purple-400 dark:group-hover:text-purple-300 transition-colors ${
                            isDark ? 'text-white' : 'text-neutral-900'
                          }`}
                        >
                          {item.title || 'Untitled Reflection'}
                        </h3>

                        {/* Content Excerpt - Bigger text as requested */}
                        <p
                          className={`text-[15px] sm:text-base line-clamp-4 leading-[1.7] font-normal mb-4 ${
                            isDark ? 'text-neutral-300/90' : 'text-neutral-700'
                          }`}
                        >
                          {plainText || (
                            <span className="italic text-neutral-500 dark:text-neutral-500 text-sm">
                              No written thoughts recorded yet. Tap to open journal...
                            </span>
                          )}
                        </p>

                        {/* Bottom Metadata & Subtle Micro-Details: Craft & Clean (No inside images) */}
                        <div
                          className={`pt-3.5 mt-auto border-t flex items-center justify-between gap-3 text-xs ${
                            isDark ? 'border-white/[0.06] text-neutral-400' : 'border-neutral-100 text-neutral-500'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                            {/* Reading time */}
                            <span className="flex items-center gap-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-neutral-500 stroke-[2]" />
                              <span>{readingTime} min read</span>
                            </span>

                            {/* Clean Photo Attachment Badge (No inside images) */}
                            {hasPhotos && (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  isDark
                                    ? 'bg-purple-500/10 border-purple-500/25 text-purple-300'
                                    : 'bg-purple-50 border-purple-200 text-purple-700'
                                }`}
                                title={`${imagesList.length} photo(s) attached`}
                              >
                                <ImageIcon className="w-3 h-3 text-purple-400 stroke-[2.2]" />
                                <span>
                                  {imagesList.length} {imagesList.length === 1 ? 'photo' : 'photos'}
                                </span>
                              </span>
                            )}

                            {/* Voice Note Chip */}
                            {hasVoice && (
                              <div onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const voiceUrl = item.voiceNotes?.[0]?.audioUrl || item.voiceAudioUrl;
                                    handlePlayVoice(`inbox-${item.id}`, voiceUrl);
                                  }}
                                  className={`h-6 px-2.5 rounded-full flex items-center gap-1.5 text-[11px] font-medium transition-all cursor-pointer ${
                                    activePlayingId === `inbox-${item.id}`
                                      ? 'bg-purple-500 text-white'
                                      : isDark
                                      ? 'bg-neutral-800/90 text-neutral-300 hover:bg-neutral-700'
                                      : 'bg-neutral-200/80 text-neutral-800 hover:bg-neutral-300'
                                  }`}
                                >
                                  {activePlayingId === `inbox-${item.id}` ? (
                                    <Pause className="w-3 h-3 fill-current" />
                                  ) : (
                                    <Play className="w-3 h-3 fill-current" />
                                  )}
                                  <span>
                                    {item.voiceNotes?.[0]?.duration || item.voiceDuration || 'Voice Memo'}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Open indicator */}
                          <div className="flex items-center gap-1 font-semibold text-xs text-neutral-400 dark:text-neutral-400 group-hover:text-purple-400 dark:group-hover:text-purple-300 transition-colors shrink-0">
                            <span className="hidden sm:inline">Open</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </motion.div>
        </div>
      ) : activeTab === 'calendar' ? (
        <div className="flex-1 flex flex-col min-h-0 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 pb-1 overflow-hidden">
          {/* STATIC CALENDAR - BLENDED WITH BACKGROUND, MINIMAL & CLEAN JUST LIKE TODO PAGE */}
          <div className="shrink-0 pt-1 pb-2">
            <div className="w-full">
              {/* Calendar Month & Navigation Header */}
              <div className="flex items-center justify-between mb-2.5 px-0.5">
                <div>
                  <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                    {monthLabel}
                  </h2>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer ${
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
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
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
                    className={`p-1.5 rounded-full transition-colors cursor-pointer ${
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

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center transition-all duration-300">
                {displayedCalendarRows.flat().map((cell, cellIdx) => {
                  const isSelected = cell.dateStr === selectedCalendarDate;
                  return (
                    <button
                      key={`diary-cal-cell-${cell.dateStr}-${cellIdx}`}
                      type="button"
                      onClick={() => handleCalendarDayClick(cell)}
                      title={`Select ${cell.dateStr}`}
                      className={`relative w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-full flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer select-none ${
                        isSelected
                          ? isDark
                            ? 'bg-white text-black font-bold shadow-sm'
                            : 'bg-neutral-900 text-white font-bold shadow-sm'
                          : cell.isToday
                          ? isDark
                            ? 'text-purple-400 font-bold bg-purple-500/15 ring-1 ring-purple-500/40'
                            : 'text-purple-600 font-bold bg-purple-50 ring-1 ring-purple-500/40'
                          : cell.isCurrentMonth
                          ? isDark
                            ? 'text-neutral-200 hover:bg-[#1c1c1f]'
                            : 'text-neutral-800 hover:bg-neutral-100'
                          : isDark
                          ? 'text-neutral-600 hover:bg-[#18181b]'
                          : 'text-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="text-xs sm:text-sm leading-none">{cell.dayNum}</span>
                      {cell.hasEntries && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                            isSelected
                              ? isDark
                                ? 'bg-purple-600'
                                : 'bg-purple-400'
                              : 'bg-purple-500'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Expand / Collapse Button */}
              <div className="flex justify-center pt-1.5 pb-1">
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

          {/* SCROLLING DAYS LIST - STRICTLY POSITIONED BELOW THE STATIC CALENDAR */}
          <div
            ref={contentScrollRef}
            className="flex-1 overflow-y-auto min-h-0 space-y-2.5 pb-24 md:pb-8 pr-0.5"
          >
            {diaryDaysList.map((day) => {
              const dayEntries = dateEntriesMap.get(day.dateStr) || [];
              const isSelected = day.dateStr === selectedCalendarDate;

              return (
                <div
                  key={`diary-day-${day.dateStr}`}
                  id={`diary-day-section-${day.dateStr}`}
                  data-date={day.dateStr}
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedCalendarDate(day.dateStr);
                    setSelectedDayDrawerDate(day.dateStr);
                  }}
                  className={`diary-day-scroll-section group cursor-pointer scroll-mt-2 rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 active:scale-[0.99] flex items-center justify-between gap-3 ${
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
                    {/* Compact calendar badge */}
                    <div
                      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 border transition-colors ${
                        day.isToday
                          ? isDark
                            ? 'bg-purple-500/15 border-purple-500/30 text-purple-400 font-bold'
                            : 'bg-purple-50 border-purple-500/30 text-purple-600 font-bold'
                          : isDark
                          ? 'bg-[#1a1a1e] border-neutral-800/80 text-neutral-300 group-hover:border-neutral-700'
                          : 'bg-neutral-100 border-neutral-200/80 text-neutral-700 group-hover:border-neutral-300'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider leading-none ${
                          day.isToday
                            ? isDark
                              ? 'text-purple-400'
                              : 'text-purple-600'
                            : 'text-neutral-400'
                        }`}
                      >
                        {day.dayNameShort}
                      </span>
                      <span className="text-sm font-semibold leading-tight mt-0.5">
                        {day.dayNum}
                      </span>
                    </div>

                    {/* Day text & subtitle */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        {day.isToday && (
                          <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                        )}
                        <h3
                          className={`text-sm font-semibold truncate ${
                            day.isToday
                              ? isDark
                                ? 'text-purple-400'
                                : 'text-purple-600'
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
                    {dayEntries.length > 0 && (
                      <span
                        className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border transition-colors ${
                          day.isToday
                            ? isDark
                              ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                              : 'bg-purple-50 border-purple-200 text-purple-700'
                            : isDark
                            ? 'bg-[#1a1a1e] border-neutral-800/80 text-neutral-300'
                            : 'bg-neutral-100 border-neutral-200/80 text-neutral-700'
                        }`}
                      >
                        {dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'}
                      </span>
                    )}

                    {/* Compact "+ Add" Pill button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        onOpenNewNote?.('diary', day.dateStr);
                      }}
                      className={`h-7 px-2.5 sm:px-3 rounded-full flex items-center gap-1 text-xs font-medium transition-all active:scale-95 cursor-pointer border ${
                        isDark
                          ? 'bg-[#1a1a1e] hover:bg-[#222228] border-neutral-800/80 hover:border-purple-500/40 text-neutral-300 hover:text-purple-300'
                          : 'bg-neutral-100 hover:bg-purple-50 border-neutral-200/80 hover:border-purple-200 text-neutral-700 hover:text-purple-700'
                      }`}
                      title={`Write entry for ${day.title}`}
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
      ) : (
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 sm:px-6 md:px-8 pb-28 pt-2 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
          <motion.div
              key="tab-moments"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.16 }}
              className="space-y-6"
            >
              {momentsData.photos.length === 0 &&
              momentsData.voiceMemos.length === 0 &&
              momentsData.reflections.length === 0 ? (
                /* Clean Empty State */
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div
                    className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 transition-colors ${
                      isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-600'
                    }`}
                  >
                    <Sparkles className="w-8 h-8 stroke-[1.8]" />
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight mb-1">
                    No Moments Yet
                  </h2>
                  <p className="text-xs text-neutral-500 max-w-xs leading-relaxed mb-6">
                    Photos, audio memos, and favorite thoughts from your diary write-ups will sparkle here.
                  </p>
                  {onOpenNewNote && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        onOpenNewNote('diary');
                      }}
                      className="px-5 py-2.5 rounded-full text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Capture a Moment</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Section 1: Photo Moments Gallery */}
                  {momentsData.photos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <ImageIcon className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-bold tracking-tight">
                          Visual Memories ({momentsData.photos.length})
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {momentsData.photos.map((p, idx) => (
                          <div
                            key={`moment-photo-${p.note.id}-${idx}`}
                            onClick={() => {
                              triggerHaptic('light');
                              setLightboxSrc(p.url);
                            }}
                            className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer aspect-square ${
                              isDark
                                ? 'bg-[#141416] border-neutral-800 hover:border-neutral-700'
                                : 'bg-white border-neutral-200 hover:border-neutral-300 shadow-2xs'
                            }`}
                          >
                            <img
                              src={p.url}
                              alt={p.note.title || 'Diary Moment'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            {/* Overlay caption */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-end">
                              <span className="text-[10px] text-neutral-300 font-medium">
                                {formatDisplayDate(getNoteDateISO(p.note), todayISO)}
                              </span>
                              <span className="text-xs text-white font-semibold line-clamp-1">
                                {p.note.title || 'Moment'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 2: Audio Voice Memos */}
                  {momentsData.voiceMemos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Mic className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-bold tracking-tight">
                          Voice Reflections ({momentsData.voiceMemos.length})
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {momentsData.voiceMemos.map((vm, idx) => {
                          const isPlaying = activePlayingId === vm.id;
                          return (
                            <div
                              key={`moment-vm-${vm.id}-${idx}`}
                              className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                                isDark
                                  ? 'bg-[#121214] border-neutral-800/80'
                                  : 'bg-white border-neutral-200/90 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handlePlayVoice(vm.id, vm.voice.audioUrl)}
                                  className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center transition-all active:scale-95 ${
                                    isPlaying
                                      ? 'bg-purple-500 text-white shadow-sm'
                                      : isDark
                                      ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                                      : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
                                  }`}
                                >
                                  {isPlaying ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                  ) : (
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  )}
                                </button>

                                <div className="overflow-hidden">
                                  <h4 className="text-xs font-bold truncate">
                                    {vm.voice.name || vm.note.title || 'Voice Note'}
                                  </h4>
                                  <span className="text-[10px] text-neutral-400">
                                    {vm.voice.duration || '0:15'} •{' '}
                                    {formatDisplayDate(getNoteDateISO(vm.note), todayISO)}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setReadingNote(vm.note);
                                }}
                                className={`text-[11px] px-2.5 py-1 rounded-full font-medium transition-colors shrink-0 ${
                                  isDark
                                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                                }`}
                              >
                                View
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 3: Highlighted Reflections */}
                  {momentsData.reflections.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Quote className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-bold tracking-tight">
                          Reflections & Thoughts ({momentsData.reflections.length})
                        </h3>
                      </div>

                      <div className="space-y-3">
                        {momentsData.reflections.slice(0, 6).map((item, idx) => (
                          <div
                            key={`moment-ref-${item.id || 'ref'}-${idx}`}
                            onClick={() => {
                              triggerHaptic('light');
                              setReadingNote(item);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                              isDark
                                ? 'bg-[#121214] hover:bg-[#18181c] border-neutral-800/80'
                                : 'bg-white hover:bg-[#fafafa] border-neutral-200/90 shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wide">
                                {formatDisplayDate(getNoteDateISO(item), todayISO)}
                              </span>
                              {item.isFavorite && (
                                <Bookmark className="w-3.5 h-3.5 text-purple-400 fill-current" />
                              )}
                            </div>
                            <p
                              className={`text-xs sm:text-sm italic leading-relaxed line-clamp-3 ${
                                isDark ? 'text-neutral-200' : 'text-neutral-800'
                              }`}
                            >
                              "{stripHtml(item.content)}"
                            </p>
                            {item.title && (
                              <p className="text-[11px] text-neutral-400 mt-2 font-medium">
                                — {item.title}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
        </div>
      )}

      {/* Day Details Drawer */}
      <DiaryDayDrawer
        isOpen={!!selectedDayDrawerDate}
        dateStr={selectedDayDrawerDate}
        todayStr={todayISO}
        theme={theme}
        entries={selectedDayDrawerDate ? (dateEntriesMap.get(selectedDayDrawerDate) || []) : []}
        onClose={() => setSelectedDayDrawerDate(null)}
        onSelectNote={(note) => {
          setSelectedDayDrawerDate(null);
          setReadingNote(note);
        }}
        onOpenNewNote={(date) => {
          setSelectedDayDrawerDate(null);
          onOpenNewNote?.('diary', date);
        }}
        onToggleFavorite={onToggleFavorite}
        onDeleteNote={onDeleteNote}
      />

      {/* Reader Drawer for full diary note viewing */}
      <DiaryDrawer
        isOpen={!!readingNote}
        theme={theme}
        note={readingNote}
        onClose={() => setReadingNote(null)}
        onEdit={(note) => {
          setReadingNote(null);
          onSelectNote?.(note);
        }}
        onDelete={(id) => {
          setReadingNote(null);
          onDeleteNote?.(id);
        }}
        onToggleFavorite={(id) => {
          onToggleFavorite?.(id);
          if (readingNote && readingNote.id === id) {
            setReadingNote((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
          }
        }}
        onUpdateNote={(updated) => {
          onUpdateNote?.(updated);
          if (readingNote && readingNote.id === updated.id) {
            setReadingNote(updated);
          }
        }}
      />

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={!!lightboxSrc}
        src={lightboxSrc}
        alt="Diary moment"
        onClose={() => setLightboxSrc(null)}
      />
    </motion.div>
  );
}
