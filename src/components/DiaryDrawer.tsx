import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Mic,
  Smile,
  Sparkles,
  Save,
  Check,
  MoreHorizontal,
  Bookmark,
  Copy,
  Trash2,
  Play,
  Pause,
  X,
  Plus,
  Bold,
  Italic,
  List,
  Quote,
  Highlighter,
  Type,
  Palette,
  Maximize2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Scaling,
  Grid2x2,
  Grid3x3,
  Clock,
  Feather,
  ListTodo,
} from 'lucide-react';
import { ThemeMode, NoteItem, VoiceNoteAttachment, EntryType } from '../types';
import { triggerHaptic } from '../lib/capacitor';
import { formatDiaryHeaderDate, stripHtml, parseNoteDateToISO, formatDateToISO, SHORT_MONTHS } from '../lib/formatters';
import { ImageLightbox } from './ImageLightbox';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';

function formatInitialHtml(text: string): string {
  if (!text) return '';
  let converted = text
    .replace(/==([^=]+)==/g, '<mark class="bg-amber-200/90 dark:bg-amber-400/35 px-1 py-0.5 rounded text-inherit font-medium">$1</mark>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3')
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.*)$/gm, '<li>$1</li>');

  if (/<[a-z][\s\S]*>/i.test(converted)) {
    return converted;
  }
  const paragraphs = converted.split(/\n\n+/);
  if (paragraphs.length > 1) {
    return paragraphs.map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
  }
  return converted.replace(/\n/g, '<br/>');
}

export const MOOD_OPTIONS = [
  { emoji: '✨', label: 'Grateful', desc: 'Thankful & blessed' },
  { emoji: '😌', label: 'Peaceful', desc: 'Calm & content' },
  { emoji: '😊', label: 'Happy', desc: 'Joyful & positive' },
  { emoji: '💡', label: 'Inspired', desc: 'Creative ideas' },
  { emoji: '🌿', label: 'Calm', desc: 'Relaxed & grounded' },
  { emoji: '⚡', label: 'Energetic', desc: 'Motivated & driven' },
  { emoji: '💭', label: 'Thoughtful', desc: 'Deep reflection' },
  { emoji: '🥰', label: 'Loved', desc: 'Warm & affectionate' },
  { emoji: '😴', label: 'Tired', desc: 'Exhausted & sleepy' },
  { emoji: '🌧️', label: 'Down', desc: 'Sad or heavy-hearted' },
];

export function findMood(val?: string) {
  if (!val) return null;
  const trimmed = val.trim();
  const match = MOOD_OPTIONS.find(
    (m) => m.emoji === trimmed || m.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return match;
  return { emoji: trimmed.length <= 2 ? trimmed : '✨', label: trimmed, desc: '' };
}

const CALENDAR_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const JOURNALING_PROMPTS = [
  'What made you smile or feel genuinely at peace today?',
  'What was the biggest highlight or accomplishment of your day?',
  'Name one thing you learned about yourself or others today.',
  'What challenge did you encounter, and how did you navigate it?',
  'List three things you feel deeply grateful for right now.',
  'If today was a chapter in a book, what would its title be?',
  'What is something you want to let go of before you sleep?',
];

const TEXT_COLORS = [
  { name: 'Default', colorHex: null },
  { name: 'Soft Blue', colorHex: '#3b82f6' },
  { name: 'Emerald', colorHex: '#10b981' },
  { name: 'Warm Amber', colorHex: '#f59e0b' },
  { name: 'Rose Red', colorHex: '#f43f5e' },
  { name: 'Purple', colorHex: '#a855f7' },
];

function createSampleAudioBlob(): Blob {
  const sampleRate = 44100;
  const duration = 2.5;
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
    const freq = 460 + Math.sin(t * 8) * 90;
    const decay = Math.exp(-t * 0.9);
    const sample = Math.sin(2 * Math.PI * freq * t) * decay * 0.35;
    const s = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}


interface DiaryDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  note?: NoteItem | null;
  initialDraft?: { title: string; content: string; images?: string[] } | null;
  onClose: () => void;
  onEdit?: (note: NoteItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onUpdateNote?: (updatedNote: NoteItem) => void;
  onSaveNewNote?: (newNote: NoteItem) => void;
  onSwitchFormat?: (format: EntryType, draft: { title: string; content: string }) => void;
}

export function DiaryDrawer({
  isOpen,
  theme,
  note,
  initialDraft,
  onClose,
  onDelete,
  onToggleFavorite,
  onUpdateNote,
  onSaveNewNote,
  onSwitchFormat,
}: DiaryDrawerProps) {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();
  const keyboardOffset = useKeyboardOffset();

  // Form states initialized from note
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [content, setContent] = useState('');
  const [currentDate, setCurrentDate] = useState(() => formatDateToISO(new Date()));
  const [currentMood, setCurrentMood] = useState<string | undefined>(undefined);
  const [images, setImages] = useState<string[]>([]);
  const [imageHeight, setImageHeight] = useState<number>(() => note?.imageHeight || 340);
  const [imageWidthPercent, setImageWidthPercent] = useState<number>(() => note?.imageWidthPercent || 100);
  const [imageFit, setImageFit] = useState<'cover' | 'contain'>(() => note?.imageFit || 'cover');
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right'>(() => note?.imageAlign || 'left');
  const [isResizingImage, setIsResizingImage] = useState(false);
  const [imageGridCols, setImageGridCols] = useState<1 | 2 | 3>(2);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteAttachment[]>([]);

  // UI state
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isImageMenuOpen, setIsImageMenuOpen] = useState(false);
  const [isSavedJustNow, setIsSavedJustNow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Active formatting state for bold, italic, list, quote, highlight, heading
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    list: false,
    quote: false,
    highlight: false,
    heading: false,
  });

  // Audio state
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const recordIntervalRef = useRef<any>(null);

  // Calendar popover navigation state
  const [calNavDate, setCalNavDate] = useState(() => new Date());
  const [calMode, setCalMode] = useState<'days' | 'monthYear'>('days');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const calendarPopoverRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const moreFormattingRef = useRef<HTMLDivElement>(null);
  const moodPickerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  // Floating toolbar & popover states
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [selectedTextColor, setSelectedTextColor] = useState<string | null>(null);
  const [isMoreFormattingOpen, setIsMoreFormattingOpen] = useState(false);
  const [isMoodPickerOpen, setIsMoodPickerOpen] = useState(false);
  const [moodPopoverOffset, setMoodPopoverOffset] = useState(0);

  // Position mood popover so it never overflows off mobile screens
  const updateMoodPopoverPosition = useCallback(() => {
    if (moodPickerRef.current) {
      const rect = moodPickerRef.current.getBoundingClientRect();
      const popoverWidth = Math.min(window.innerWidth - 32, 288);
      const rightEdge = rect.left + popoverWidth;
      const maxAllowedRight = window.innerWidth - 16;
      if (rightEdge > maxAllowedRight) {
        const shift = rightEdge - maxAllowedRight;
        const maxShift = Math.max(0, rect.left - 16);
        setMoodPopoverOffset(-Math.min(shift, maxShift));
      } else {
        setMoodPopoverOffset(0);
      }
    }
  }, []);

  useEffect(() => {
    if (isMoodPickerOpen) {
      updateMoodPopoverPosition();
      const handleResize = () => updateMoodPopoverPosition();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isMoodPickerOpen, updateMoodPopoverPosition]);

  // Sync state when incoming note changes or new draft opens
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setTitleError(false);
      setIsSavedJustNow(false);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      const raw = note.content || '';
      const formatted = formatInitialHtml(raw);
      setContent(formatted);
      if (editorRef.current) {
        editorRef.current.innerHTML = formatted;
      }
      const rawDate = note.todayDate || note.date;
      const noteDate = parseNoteDateToISO(rawDate);
      setCurrentDate(noteDate);
      setCurrentMood(note.mood);

      const imgs =
        note.images && note.images.length > 0
          ? note.images
          : note.imageUrl
          ? [note.imageUrl]
          : [];
      setImages(imgs);
      setImageHeight(note.imageHeight || 340);
      setImageWidthPercent(note.imageWidthPercent || 100);
      setImageFit(note.imageFit || 'cover');
      setImageAlign(note.imageAlign || 'left');

      const vns =
        note.voiceNotes && note.voiceNotes.length > 0
          ? note.voiceNotes
          : note.voiceAudioUrl || note.hasVoiceNote
          ? [
              {
                id: 'vn-main',
                audioUrl: note.voiceAudioUrl || '',
                duration: note.voiceDuration || '0:15',
                name: 'Voice Note',
              },
            ]
          : [];
      setVoiceNotes(vns);

      // Parse date for calendar nav
      try {
        const [y, m] = noteDate.split('-').map(Number);
        setCalNavDate(new Date(y, m - 1, 1));
      } catch {
        setCalNavDate(new Date());
      }
      setCalMode('days');
    } else if (isOpen) {
      // New diary entry initialization
      setTitle(initialDraft?.title || '');
      setTitleError(false);
      setIsSavedJustNow(false);
      const rawDraftContent = initialDraft?.content || '';
      const formattedDraft = formatInitialHtml(rawDraftContent);
      setContent(formattedDraft);
      if (editorRef.current) {
        editorRef.current.innerHTML = formattedDraft;
      }
      setCurrentDate(formatDateToISO(new Date()));
      setCurrentMood(undefined);
      setImages(initialDraft?.images || []);
      setImageHeight(340);
      setImageWidthPercent(48);
      setImageFit('cover');
      setImageAlign('left');
      setVoiceNotes([]);
      setCalNavDate(new Date());
      setCalMode('days');
    }
  }, [note, isOpen, initialDraft]);

  // Ensure DOM innerHTML is synced on drawer open
  useEffect(() => {
    if (isOpen && editorRef.current) {
      const rawSource = note ? note.content || '' : initialDraft?.content || '';
      const formatted = formatInitialHtml(rawSource);
      if (editorRef.current.innerHTML !== formatted) {
        editorRef.current.innerHTML = formatted;
      }
    }
  }, [isOpen, note, initialDraft]);

  // Clean up audio and timers on unmount or close
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Close popovers on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(target)) {
        setIsCalendarOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
      if (colorPickerRef.current && !colorPickerRef.current.contains(target)) {
        setIsColorPickerOpen(false);
      }
      if (moreFormattingRef.current && !moreFormattingRef.current.contains(target)) {
        setIsMoreFormattingOpen(false);
      }
      if (moodPickerRef.current && !moodPickerRef.current.contains(target)) {
        setIsMoodPickerOpen(false);
      }
      if (imageMenuRef.current && !imageMenuRef.current.contains(target)) {
        setIsImageMenuOpen(false);
      }
      if (quickAddRef.current && !quickAddRef.current.contains(target)) {
        setIsQuickAddOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Calendar month days calculation (Hook must be called unconditionally)
  const calendarDays = useMemo(() => {
    const year = calNavDate.getFullYear();
    const month = calNavDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    // Monday as 0: (day + 6) % 7
    const startingOffset = (firstDay + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Prev month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startingOffset - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, dNum);
      cells.push({
        dateStr: formatDateToISO(prevDate),
        dayNum: dNum,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(year, month, i);
      cells.push({
        dateStr: formatDateToISO(curDate),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Trailing days
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      cells.push({
        dateStr: formatDateToISO(nextDate),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [calNavDate]);

  // Format header date strictly as e.g. "7 Sept 2026"
  const headerDateString = formatDiaryHeaderDate(currentDate);

  // Date breakdown matching editorial header: Day number (4), Day of week (FRI), Month & Year (Sept 2026)
  const parsedDate = useMemo(() => {
    try {
      const iso = parseNoteDateToISO(currentDate);
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const dayNum = d;
      const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = SHORT_MONTHS[dt.getMonth()] || 'Sept';
      const yearMonth = `${monthName} ${dt.getFullYear()}`;
      return { dayNum, weekday, yearMonth };
    } catch {
      const dt = new Date();
      const monthName = SHORT_MONTHS[dt.getMonth()] || 'Sept';
      return {
        dayNum: dt.getDate(),
        weekday: dt.toLocaleDateString('en-US', { weekday: 'short' }),
        yearMonth: `${monthName} ${dt.getFullYear()}`,
      };
    }
  }, [currentDate]);

  // Check if editor content is visually empty
  const isEditorEmpty = useMemo(() => {
    if (!content) return true;
    const clean = content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
    return clean.length === 0;
  }, [content]);

  // Auto-format markdown when user types:
  // e.g. **text** -> bold
  //      *text*   -> italic
  //      "- "     -> unordered list
  //      "> "     -> blockquote
  const checkAndApplyAutoMarkdown = useCallback((_editor: HTMLDivElement): boolean => {
    try {
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed || !sel.anchorNode) return false;
      const node = sel.anchorNode;
      if (node.nodeType !== Node.TEXT_NODE) return false;

      const text = node.textContent || '';
      const offset = sel.anchorOffset;
      const textBeforeCursor = text.slice(0, offset);

      // 1. Auto-Bold: **text**
      const boldMatch = /(?:^|[^*])\*\*([^*]+)\*\*$/.exec(textBeforeCursor);
      if (boldMatch) {
        const fullMatch = boldMatch[0];
        const boldText = boldMatch[1];
        const matchIndex = boldMatch.index + (fullMatch.startsWith('**') ? 0 : 1);
        const beforeText = text.slice(0, matchIndex);
        const afterText = text.slice(offset);

        const parent = node.parentNode;
        if (parent) {
          const strongEl = document.createElement('strong');
          strongEl.textContent = boldText;

          const beforeNode = document.createTextNode(beforeText);
          const afterNode = document.createTextNode(afterText || '\u200B');

          parent.insertBefore(beforeNode, node);
          parent.insertBefore(strongEl, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);

          const newRange = document.createRange();
          newRange.setStart(afterNode, afterText ? 0 : 1);
          newRange.setEnd(afterNode, afterText ? 0 : 1);
          sel.removeAllRanges();
          sel.addRange(newRange);
          return true;
        }
      }

      // 2. Auto-Italic: *text* (excluding **)
      const italicMatch = /(?:^|[^*])\*([^*\s][^*]*)\*$/.exec(textBeforeCursor);
      if (italicMatch && !italicMatch[0].includes('**')) {
        const fullMatch = italicMatch[0];
        const italicText = italicMatch[1];
        const matchIndex = italicMatch.index + (fullMatch.startsWith('*') ? 0 : 1);
        const beforeText = text.slice(0, matchIndex);
        const afterText = text.slice(offset);

        const parent = node.parentNode;
        if (parent) {
          const emEl = document.createElement('em');
          emEl.textContent = italicText;

          const beforeNode = document.createTextNode(beforeText);
          const afterNode = document.createTextNode(afterText || '\u200B');

          parent.insertBefore(beforeNode, node);
          parent.insertBefore(emEl, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);

          const newRange = document.createRange();
          newRange.setStart(afterNode, afterText ? 0 : 1);
          newRange.setEnd(afterNode, afterText ? 0 : 1);
          sel.removeAllRanges();
          sel.addRange(newRange);
          return true;
        }
      }

      // 3. Bullet List: "- " or "* " at start of paragraph
      if (textBeforeCursor === '- ' || textBeforeCursor === '* ') {
        node.textContent = text.slice(2);
        document.execCommand('insertUnorderedList', false);
        return true;
      }

      // 4. Quote: "> " at start of paragraph
      if (textBeforeCursor === '> ') {
        node.textContent = text.slice(2);
        document.execCommand('formatBlock', false, '<blockquote>');
        return true;
      }

      // 5. Highlight: ==text==
      const highlightMatch = /==([^=]+)==$/.exec(textBeforeCursor);
      if (highlightMatch) {
        const fullMatch = highlightMatch[0];
        const hlText = highlightMatch[1];
        const matchIndex = textBeforeCursor.lastIndexOf(fullMatch);
        const beforeText = text.slice(0, matchIndex);
        const afterText = text.slice(offset);

        const parent = node.parentNode;
        if (parent) {
          const markEl = document.createElement('mark');
          markEl.className = 'bg-amber-200/90 dark:bg-amber-400/35 px-1 py-0.5 rounded text-inherit font-medium';
          markEl.textContent = hlText;

          const beforeNode = document.createTextNode(beforeText);
          const afterNode = document.createTextNode(afterText || '\u200B');

          parent.insertBefore(beforeNode, node);
          parent.insertBefore(markEl, node);
          parent.insertBefore(afterNode, node);
          parent.removeChild(node);

          const newRange = document.createRange();
          newRange.setStart(afterNode, afterText ? 0 : 1);
          newRange.setEnd(afterNode, afterText ? 0 : 1);
          sel.removeAllRanges();
          sel.addRange(newRange);
          return true;
        }
      }
    } catch {
      // Ignore
    }
    return false;
  }, []);

  // Update active state of Bold, Italic, List, Quote, Highlight, Heading based on current selection
  const updateActiveFormats = useCallback(() => {
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      if (editorRef.current && !editorRef.current.contains(sel.anchorNode)) {
        return;
      }

      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      const list = document.queryCommandState('insertUnorderedList');

      let quote = false;
      let highlight = false;
      let heading = false;
      let curr: Node | null = sel.anchorNode;
      while (curr && curr !== editorRef.current) {
        if (curr.nodeName === 'BLOCKQUOTE') {
          quote = true;
        } else if (curr.nodeName === 'MARK') {
          highlight = true;
        } else if (curr.nodeName === 'H2' || curr.nodeName === 'H3') {
          heading = true;
        }
        curr = curr.parentNode;
      }

      setActiveFormats({ bold, italic, list, quote, highlight, heading });
    } catch {
      // Ignore
    }
  }, []);

  // Listen to selection changes across the document
  useEffect(() => {
    if (!isOpen) return;
    const handleSelectionChange = () => {
      if (editorRef.current && editorRef.current.contains(document.activeElement)) {
        updateActiveFormats();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [isOpen, updateActiveFormats]);

  // Toggle formatting in editor
  const handleToggleFormatting = (type: 'bold' | 'italic' | 'list' | 'quote') => {
    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (editorRef.current) {
      editorRef.current.focus();
      if (type === 'bold') {
        document.execCommand('bold', false);
      } else if (type === 'italic') {
        document.execCommand('italic', false);
      } else if (type === 'list') {
        document.execCommand('insertUnorderedList', false);
      } else if (type === 'quote') {
        if (activeFormats.quote) {
          document.execCommand('formatBlock', false, '<p>');
        } else {
          document.execCommand('formatBlock', false, '<blockquote>');
        }
      }
      handleEditorInput();
    }
  };

  // Toggle text highlight (pastel yellow marker matching reference image)
  const handleToggleHighlight = () => {
    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (editorRef.current) {
      editorRef.current.focus();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        const range = sel.getRangeAt(0);
        let parent: Node | null = range.commonAncestorContainer;
        let markNode: HTMLElement | null = null;
        while (parent && parent !== editorRef.current) {
          if (parent.nodeName === 'MARK') {
            markNode = parent as HTMLElement;
            break;
          }
          parent = parent.parentNode;
        }
        if (markNode) {
          const text = markNode.textContent || '';
          const textNode = document.createTextNode(text);
          markNode.parentNode?.replaceChild(textNode, markNode);
        } else {
          const mark = document.createElement('mark');
          mark.className = 'bg-amber-200/90 dark:bg-amber-400/35 px-1 py-0.5 rounded text-inherit font-medium';
          mark.appendChild(range.extractContents());
          range.insertNode(mark);
        }
      } else {
        document.execCommand('hiliteColor', false, '#fef08a');
      }
      handleEditorInput();
    }
  };

  // Toggle title/heading 3
  const handleToggleHeading = () => {
    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (editorRef.current) {
      editorRef.current.focus();
      if (activeFormats.heading) {
        document.execCommand('formatBlock', false, '<p>');
      } else {
        document.execCommand('formatBlock', false, '<h3>');
      }
      handleEditorInput();
    }
  };

  // Apply text color (matches the 'A' color tool in reference image)
  const handleApplyTextColor = (colorHex: string | null) => {
    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (editorRef.current) {
      editorRef.current.focus();
      if (!colorHex) {
        document.execCommand('removeFormat', false);
      } else {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, colorHex);
      }
      handleEditorInput();
    }
    setIsColorPickerOpen(false);
  };

  // Handle input in contentEditable editor
  const handleEditorInput = () => {
    if (editorRef.current) {
      checkAndApplyAutoMarkdown(editorRef.current);
      setContent(editorRef.current.innerHTML);
    }
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    updateActiveFormats();
  };

  // Handle paste in contentEditable editor (text markdown & pasted images)
  const handleEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // 1. Check for pasted image files (screenshots or copied images)
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            triggerHaptic('light');
            setIsSavedJustNow(false);
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                const imgData = reader.result as string;
                setImages((prev) => {
                  if (prev.length === 0) {
                    setImageAlign('left');
                    setImageWidthPercent(48);
                    setImageHeight(240);
                  }
                  return [...prev, imgData];
                });
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    }

    // 2. Handle styled text paste
    const text = e.clipboardData.getData('text/plain');
    if (text && (text.includes('**') || text.includes('*') || text.includes('> ') || text.includes('- '))) {
      e.preventDefault();
      const formatted = formatInitialHtml(text);
      document.execCommand('insertHTML', false, formatted);
      handleEditorInput();
    }
  };

  // Handle keyboard shortcuts (Tab for indentation, Backspace to revert auto-markdown)
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
      return;
    }

    if (e.key === 'Backspace') {
      const sel = window.getSelection();
      if (!sel || !sel.isCollapsed || !sel.anchorNode) return;

      const node = sel.anchorNode;
      const offset = sel.anchorOffset;

      let targetStrong: HTMLElement | null = null;
      let targetEm: HTMLElement | null = null;
      let targetMark: HTMLElement | null = null;
      let zeroWidthNode: Node | null = null;

      if (node.nodeType === Node.TEXT_NODE) {
        const textVal = node.textContent || '';
        const isAtStartOrZeroWidth =
          offset === 0 ||
          (offset === 1 && (textVal === '\u200B' || textVal.startsWith('\u200B')));

        if (isAtStartOrZeroWidth) {
          const prev = node.previousSibling;
          if (prev && (prev.nodeName === 'STRONG' || prev.nodeName === 'B')) {
            targetStrong = prev as HTMLElement;
            zeroWidthNode = textVal === '\u200B' || textVal === '' ? node : null;
          } else if (prev && (prev.nodeName === 'EM' || prev.nodeName === 'I')) {
            targetEm = prev as HTMLElement;
            zeroWidthNode = textVal === '\u200B' || textVal === '' ? node : null;
          } else if (prev && prev.nodeName === 'MARK') {
            targetMark = prev as HTMLElement;
            zeroWidthNode = textVal === '\u200B' || textVal === '' ? node : null;
          }
        }

        if (!targetStrong && !targetEm && !targetMark) {
          const parentEl = node.parentElement;
          if (parentEl && (parentEl.nodeName === 'STRONG' || parentEl.nodeName === 'B')) {
            if (offset === textVal.length) {
              targetStrong = parentEl;
            }
          } else if (parentEl && (parentEl.nodeName === 'EM' || parentEl.nodeName === 'I')) {
            if (offset === textVal.length) {
              targetEm = parentEl;
            }
          } else if (parentEl && parentEl.nodeName === 'MARK') {
            if (offset === textVal.length) {
              targetMark = parentEl;
            }
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const prevChild = el.childNodes[offset - 1];
        if (prevChild && (prevChild.nodeName === 'STRONG' || prevChild.nodeName === 'B')) {
          targetStrong = prevChild as HTMLElement;
        } else if (prevChild && (prevChild.nodeName === 'EM' || prevChild.nodeName === 'I')) {
          targetEm = prevChild as HTMLElement;
        } else if (prevChild && prevChild.nodeName === 'MARK') {
          targetMark = prevChild as HTMLElement;
        }
      }

      if (targetStrong) {
        e.preventDefault();
        const boldText = targetStrong.textContent?.replace(/[\u200B-\u200D\uFEFF]/g, '') || '';
        const parent = targetStrong.parentNode;
        if (parent) {
          const restored = `**${boldText}*`;
          const textNode = document.createTextNode(restored);

          if (zeroWidthNode) {
            parent.removeChild(zeroWidthNode);
          } else if (node && node.nodeType === Node.TEXT_NODE && node.textContent?.startsWith('\u200B')) {
            node.textContent = node.textContent.slice(1);
          }

          const next = targetStrong.nextSibling;
          if (next && next !== zeroWidthNode && next.nodeType === Node.TEXT_NODE) {
            if (next.textContent === '\u200B') {
              parent.removeChild(next);
            } else if (next.textContent?.startsWith('\u200B')) {
              next.textContent = next.textContent.slice(1);
            }
          }

          parent.replaceChild(textNode, targetStrong);

          const newRange = document.createRange();
          newRange.setStart(textNode, restored.length);
          newRange.setEnd(textNode, restored.length);
          sel.removeAllRanges();
          sel.addRange(newRange);

          handleEditorInput();
          return;
        }
      }

      if (targetEm) {
        e.preventDefault();
        const italicText = targetEm.textContent?.replace(/[\u200B-\u200D\uFEFF]/g, '') || '';
        const parent = targetEm.parentNode;
        if (parent) {
          const restored = `*${italicText}`;
          const textNode = document.createTextNode(restored);

          if (zeroWidthNode) {
            parent.removeChild(zeroWidthNode);
          } else if (node && node.nodeType === Node.TEXT_NODE && node.textContent?.startsWith('\u200B')) {
            node.textContent = node.textContent.slice(1);
          }

          const next = targetEm.nextSibling;
          if (next && next !== zeroWidthNode && next.nodeType === Node.TEXT_NODE) {
            if (next.textContent === '\u200B') {
              parent.removeChild(next);
            } else if (next.textContent?.startsWith('\u200B')) {
              next.textContent = next.textContent.slice(1);
            }
          }

          parent.replaceChild(textNode, targetEm);

          const newRange = document.createRange();
          newRange.setStart(textNode, restored.length);
          newRange.setEnd(textNode, restored.length);
          sel.removeAllRanges();
          sel.addRange(newRange);

          handleEditorInput();
          return;
        }
      }

      if (targetMark) {
        e.preventDefault();
        const markText = targetMark.textContent?.replace(/[\u200B-\u200D\uFEFF]/g, '') || '';
        const parent = targetMark.parentNode;
        if (parent) {
          const restored = `==${markText}=`;
          const textNode = document.createTextNode(restored);

          if (zeroWidthNode) {
            parent.removeChild(zeroWidthNode);
          } else if (node && node.nodeType === Node.TEXT_NODE && node.textContent?.startsWith('\u200B')) {
            node.textContent = node.textContent.slice(1);
          }

          const next = targetMark.nextSibling;
          if (next && next !== zeroWidthNode && next.nodeType === Node.TEXT_NODE) {
            if (next.textContent === '\u200B') {
              parent.removeChild(next);
            } else if (next.textContent?.startsWith('\u200B')) {
              next.textContent = next.textContent.slice(1);
            }
          }

          parent.replaceChild(textNode, targetMark);

          const newRange = document.createRange();
          newRange.setStart(textNode, restored.length);
          newRange.setEnd(textNode, restored.length);
          sel.removeAllRanges();
          sel.addRange(newRange);

          handleEditorInput();
          return;
        }
      }
    }
  };

  // Save handler: requires title, saves, and closes the drawer
  const handleSave = () => {
    let finalTitle = title.trim();
    if (!finalTitle) {
      const editorText = editorRef.current?.innerText?.trim() || content.trim();
      if (editorText) {
        finalTitle = 'Diary Entry';
        setTitle('Diary Entry');
      } else {
        setTitleError(true);
        titleInputRef.current?.focus();
        triggerHaptic('warning');
        return;
      }
    }
    triggerHaptic('medium');
    let finalContent = editorRef.current ? editorRef.current.innerHTML : content;
    if (finalContent) {
      finalContent = finalContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/ style="(?!color:[^"]*)[^"]*"/gi, '');
    }

    if (note) {
      const updated: NoteItem = {
        ...note,
        title: finalTitle,
        content: finalContent,
        date: currentDate,
        todayDate: currentDate,
        mood: currentMood,
        images,
        imageHeight,
        imageWidthPercent,
        imageFit,
        imageAlign,
        voiceNotes,
        hasVoiceNote: voiceNotes.length > 0,
        voiceAudioUrl: voiceNotes[0]?.audioUrl,
        voiceDuration: voiceNotes[0]?.duration,
        imageUrl: images[0],
        isDiary: true,
        entryType: 'diary',
      };

      onUpdateNote?.(updated);
    } else {
      const newEntry: NoteItem = {
        id: `diary-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: finalTitle,
        content: finalContent,
        date: currentDate,
        todayDate: currentDate,
        mood: currentMood,
        images,
        imageHeight,
        imageWidthPercent,
        imageFit,
        imageAlign,
        voiceNotes,
        hasVoiceNote: voiceNotes.length > 0,
        voiceAudioUrl: voiceNotes[0]?.audioUrl,
        voiceDuration: voiceNotes[0]?.duration,
        imageUrl: images[0],
        isDiary: true,
        entryType: 'diary',
      };

      if (onSaveNewNote) {
        onSaveNewNote(newEntry);
      } else if (onUpdateNote) {
        onUpdateNote(newEntry);
      }
    }

    setIsSavedJustNow(true);
    onClose();
  };

  // Photo upload handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const newImg = reader.result as string;
          setImages((prev) => {
            if (prev.length === 0) {
              // Default to float left with proportional width so text flows on the right immediately
              setImageAlign('left');
              setImageWidthPercent(48);
              setImageHeight(240);
            }
            return [...prev, newImg];
          });
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    setIsImageMenuOpen(false);
    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Interactive drag resize handler for attached image(s) via all 4 corners & bottom edge
  type ResizeDirection = 'nw' | 'ne' | 'se' | 'sw' | 's';

  const handleStartImageResize = (
    direction: ResizeDirection,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingImage(true);
    triggerHaptic('light');

    const pointerId = e.pointerId;
    const target = e.currentTarget;
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // ignore
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const startHeight = imageHeight;

    const wrapperEl = imageWrapperRef.current;
    const parentEl = wrapperEl?.parentElement;
    const parentWidth = parentEl?.getBoundingClientRect().width || 600;
    const startWidthPx =
      wrapperEl?.getBoundingClientRect().width ||
      (parentWidth * (imageWidthPercent / 100));

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (moveEv.pointerId !== pointerId) return;

      const deltaX = moveEv.clientX - startX;
      const deltaY = moveEv.clientY - startY;

      // 1. Height adjustment across all 4 corners and bottom edge
      let newHeight = startHeight;
      if (direction === 's' || direction === 'se' || direction === 'sw') {
        newHeight = startHeight + deltaY;
      } else if (direction === 'nw' || direction === 'ne') {
        newHeight = startHeight - deltaY;
      }
      setImageHeight(Math.max(100, Math.min(850, Math.round(newHeight))));

      // 2. Width adjustment across all 4 corners
      if (direction !== 's') {
        let newWidthPx = startWidthPx;
        if (direction === 'se' || direction === 'ne') {
          newWidthPx = startWidthPx + deltaX;
        } else if (direction === 'sw' || direction === 'nw') {
          newWidthPx = startWidthPx - deltaX;
        }

        const minPct = imageAlign === 'center' ? 25 : 20;
        const maxPct = imageAlign === 'center' ? 100 : 85;
        const newPercent = Math.max(
          minPct,
          Math.min(maxPct, Math.round((newWidthPx / parentWidth) * 100))
        );
        setImageWidthPercent(newPercent);
      }

      setIsSavedJustNow(false);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };

    const handlePointerUp = (upEv: PointerEvent) => {
      if (upEv.pointerId !== pointerId) return;
      setIsResizingImage(false);
      triggerHaptic('selection');
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Voice recording toggle
  const handleToggleRecord = () => {
    triggerHaptic('medium');
    if (!isRecording) {
      setIsRecording(true);
      setRecordDuration(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      // Finish recording
      setIsRecording(false);
      setIsSavedJustNow(false);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
      }
      const minutes = Math.floor(recordDuration / 60);
      const seconds = recordDuration % 60;
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      const audioBlob = createSampleAudioBlob();
      const audioUrl = URL.createObjectURL(audioBlob);

      const newVN: VoiceNoteAttachment = {
        id: `vn-${Date.now()}`,
        audioUrl,
        duration: formattedDuration === '0:00' ? '0:05' : formattedDuration,
        name: `Reflection Voice Note`,
        createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setVoiceNotes((prev) => [...prev, newVN]);
    }
  };

  // Play voice note
  const togglePlayVoiceNote = (vn: VoiceNoteAttachment) => {
    if (activePlayingId === vn.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current
          .play()
          .then(() => {
            setActivePlayingId(vn.id);
            triggerHaptic('selection');
          })
          .catch((err) => console.warn(err));
      } else {
        audioRef.current.pause();
        setActivePlayingId(null);
        triggerHaptic('selection');
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const url = vn.audioUrl || URL.createObjectURL(createSampleAudioBlob());
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      setPlaybackTime(Math.floor(audio.currentTime));
    };

    audio.onended = () => {
      setActivePlayingId(null);
      setPlaybackTime(0);
    };

    audio
      .play()
      .then(() => {
        setActivePlayingId(vn.id);
        triggerHaptic('selection');
      })
      .catch((err) => console.warn(err));
  };

  // Remove voice note
  const handleRemoveVoiceNote = (id: string) => {
    triggerHaptic('light');
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setVoiceNotes((prev) => prev.filter((vn) => vn.id !== id));
  };

  // Insert prompt helper
  const handleInsertPrompt = (promptText: string) => {
    triggerHaptic('selection');
    setIsPromptsOpen(false);
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const addition = `<blockquote>✨ <strong>${promptText}</strong></blockquote><p><br/></p>`;
    const next = (content ? content + '<br/>' : '') + addition;
    setContent(next);
    if (editorRef.current) {
      editorRef.current.innerHTML = next;
      editorRef.current.focus();
    }
  };

  // Insert current timestamp helper
  const handleInsertTimestamp = () => {
    triggerHaptic('light');
    setIsQuickAddOpen(false);
    setIsSavedJustNow(false);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const addition = `<p><strong>${timeStr}</strong> - </p>`;
    const next = (content ? content + '<br/>' : '') + addition;
    setContent(next);
    if (editorRef.current) {
      editorRef.current.innerHTML = next;
      editorRef.current.focus();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          style={{
            paddingBottom: !isDesktop && keyboardOffset > 0 ? `${keyboardOffset}px` : undefined,
            transition: 'padding-bottom 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto"
        >
          {/* Backdrop matching default app theme */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="absolute inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
          />

          {/* Drawer / Modal Sheet matching default app theme (full-length drawer) */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
            }
            className={`relative w-full max-w-lg md:max-w-2xl mx-auto rounded-t-[32px] md:rounded-[36px] pt-3 md:pt-6 pb-3 px-5 md:px-8 shadow-2xl flex flex-col h-[94vh] md:h-[90vh] overflow-hidden transition-colors border border-neutral-200/70 dark:border-white/[0.08] ${
              isDark ? 'bg-[#121215] text-white shadow-black/70' : 'bg-[#ffffff] text-neutral-900 shadow-xl'
            }`}
          >
            {/* Top Drag Handle for mobile */}
            <div className="flex justify-center pb-2 md:hidden">
              <div
                className={`w-9 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Hidden Photo File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Header: Clean, borderless, editorial aesthetic (matching reference image) */}
            <div className="flex items-center justify-between pt-1 pb-2 shrink-0 relative z-30">
              {/* Top Left: Editorial Date Header (Day number + Stacked Weekday/YearMonth) + Mood */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Editorial Date Block: Day Number (e.g. 28) + Weekday / Year.Month (e.g. Fri / 2026.8) */}
                <div className="relative shrink-0" ref={calendarPopoverRef}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      if (!isCalendarOpen) {
                        const iso = parseNoteDateToISO(currentDate);
                        const [y, m, d] = iso.split('-').map(Number);
                        if (!isNaN(y) && !isNaN(m)) {
                          setCalNavDate(new Date(y, m - 1, d || 1));
                        }
                        setCalMode('days');
                      }
                      setIsCalendarOpen((prev) => !prev);
                    }}
                    className="group flex items-center gap-2.5 px-2.5 py-1.5 -ml-2 rounded-2xl hover:bg-neutral-100 dark:hover:bg-white/5 transition-all text-left cursor-pointer active:scale-98 select-none"
                    title="Change date"
                  >
                    {/* Big Day Number */}
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tighter leading-none text-neutral-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors font-mono">
                      {parsedDate.dayNum}
                    </span>

                    {/* Stacked Weekday and Year.Month */}
                    <div className="flex flex-col justify-center leading-tight">
                      <span className="text-[11px] sm:text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        {parsedDate.weekday}
                      </span>
                      <span className="text-[11px] sm:text-xs font-medium text-neutral-400 dark:text-neutral-500 whitespace-nowrap">
                        {parsedDate.yearMonth}
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-400 opacity-60 group-hover:opacity-100 transition-transform duration-200 shrink-0 ${
                        isCalendarOpen ? 'rotate-180 text-purple-500' : ''
                      }`}
                    />
                  </button>

                  {/* Calendar Popover */}
                  <AnimatePresence>
                    {isCalendarOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl p-4 z-50 transition-colors ${
                          isDark
                            ? 'bg-[#18181b] border-neutral-800 text-white shadow-black/80'
                            : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                        }`}
                      >
                        {/* Calendar Header with Month/Year Toggle and Navigation */}
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setCalMode((m) => (m === 'days' ? 'monthYear' : 'days'));
                            }}
                            className={`flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-lg text-sm font-bold tracking-tight transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-neutral-800 text-white' : 'hover:bg-neutral-100 text-neutral-900'
                            }`}
                            title={calMode === 'days' ? 'Click to select month or year' : 'Back to calendar days'}
                          >
                            <span>
                              {calNavDate.toLocaleDateString('en-US', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
                                calMode === 'monthYear' ? 'rotate-180 text-purple-500' : ''
                              }`}
                            />
                          </button>

                          <div className="flex items-center gap-0.5">
                            {/* Fast Year Back */}
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setCalNavDate(
                                  (prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1)
                                );
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                              }`}
                              title="Previous year"
                            >
                              <ChevronsLeft className="w-4 h-4" />
                            </button>

                            {/* Month Back (when in days mode) */}
                            {calMode === 'days' && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setCalNavDate(
                                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                                  );
                                }}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                                }`}
                                title="Previous month"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            )}

                            {/* Today button */}
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setIsSavedJustNow(false);
                                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                const now = new Date();
                                setCalNavDate(new Date(now.getFullYear(), now.getMonth(), 1));
                                setCurrentDate(formatDateToISO(now));
                                setCalMode('days');
                                setIsCalendarOpen(false);
                              }}
                              className={`text-[11px] px-2 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-purple-400' : 'hover:bg-neutral-100 text-purple-600'
                              }`}
                              title="Jump to today"
                            >
                              Today
                            </button>

                            {/* Month Forward (when in days mode) */}
                            {calMode === 'days' && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setCalNavDate(
                                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                                  );
                                }}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                                }`}
                                title="Next month"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}

                            {/* Fast Year Forward */}
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setCalNavDate(
                                  (prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1)
                                );
                              }}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-neutral-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                              }`}
                              title="Next year"
                            >
                              <ChevronsRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {calMode === 'monthYear' ? (
                          /* Quick Month & Year Selector View */
                          <div className="py-1">
                            {/* Year Stepper Bar */}
                            <div className="flex items-center justify-between mb-3 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/70 border border-neutral-200/50 dark:border-neutral-700/50">
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setCalNavDate((prev) => new Date(prev.getFullYear() - 1, prev.getMonth(), 1));
                                }}
                                className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                                title="Previous year"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-neutral-400">Year:</span>
                                <span className="font-mono font-bold text-base text-neutral-900 dark:text-white">
                                  {calNavDate.getFullYear()}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setCalNavDate((prev) => new Date(prev.getFullYear() + 1, prev.getMonth(), 1));
                                }}
                                className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                                title="Next year"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>

                            {/* 12 Months Grid */}
                            <div className="grid grid-cols-3 gap-2">
                              {CALENDAR_MONTHS.map((mName, mIdx) => {
                                const isCurrentMonth = calNavDate.getMonth() === mIdx;
                                return (
                                  <button
                                    key={`month-picker-${mName}`}
                                    type="button"
                                    onClick={() => {
                                      triggerHaptic('selection');
                                      setCalNavDate((prev) => new Date(prev.getFullYear(), mIdx, 1));
                                      setCalMode('days');
                                    }}
                                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                      isCurrentMonth
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : isDark
                                        ? 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-200'
                                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                                    }`}
                                  >
                                    {mName}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* Standard Days Calendar View */
                          <>
                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-neutral-400 mb-2">
                              <span>M</span>
                              <span>T</span>
                              <span>W</span>
                              <span>T</span>
                              <span>F</span>
                              <span>S</span>
                              <span>S</span>
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-1">
                              {calendarDays.map((cell, idx) => {
                                const isSelected = cell.dateStr === currentDate;
                                const isToday = cell.dateStr === formatDateToISO(new Date());

                                return (
                                  <button
                                    key={`cal-day-${idx}-${cell.dateStr}`}
                                    type="button"
                                    onClick={() => {
                                      triggerHaptic('selection');
                                      setIsSavedJustNow(false);
                                      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                      setCurrentDate(cell.dateStr);
                                      setIsCalendarOpen(false);
                                    }}
                                    className={`h-8 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-purple-600 text-white shadow-xs'
                                        : isToday
                                        ? isDark
                                          ? 'border border-purple-500/50 text-purple-300 hover:bg-purple-500/10'
                                          : 'border border-purple-400 text-purple-700 hover:bg-purple-50'
                                        : cell.isCurrentMonth
                                        ? isDark
                                          ? 'hover:bg-neutral-800 text-neutral-200'
                                          : 'hover:bg-neutral-100 text-neutral-800'
                                        : isDark
                                        ? 'text-neutral-600 hover:bg-neutral-800/40'
                                        : 'text-neutral-400 hover:bg-neutral-100/50'
                                    }`}
                                  >
                                    {cell.dayNum}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mood Tag/Picker Pill right by the date */}
                <div className="relative shrink-0" ref={moodPickerRef}>
                  {(() => {
                    const activeMood = findMood(currentMood);
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          if (!isMoodPickerOpen) {
                            updateMoodPopoverPosition();
                          }
                          setIsMoodPickerOpen((prev) => !prev);
                        }}
                        className={`h-8 px-2.5 sm:px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium transition-all active:scale-95 cursor-pointer ${
                          activeMood
                            ? isDark
                              ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 shadow-2xs'
                              : 'bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 shadow-2xs'
                            : isDark
                            ? 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700/50'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border border-neutral-200/80'
                        }`}
                        title="Change entry mood"
                      >
                        {activeMood ? (
                          <>
                            <span className="text-sm select-none leading-none">{activeMood.emoji}</span>
                            <span className="font-semibold text-xs leading-none">{activeMood.label}</span>
                          </>
                        ) : (
                          <>
                            <Smile className="w-3.5 h-3.5 opacity-70" />
                            <span className="font-medium text-xs">Mood</span>
                          </>
                        )}
                      </button>
                    );
                  })()}

                  {/* Mood Picker Popover */}
                  <AnimatePresence>
                    {isMoodPickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        style={{
                          left: isDesktop ? 0 : `${moodPopoverOffset}px`,
                        }}
                        className={`absolute top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] p-3 rounded-2xl border shadow-2xl z-50 ${
                          isDark
                            ? 'bg-[#18181c] border-neutral-800 text-white shadow-black/80'
                            : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-1.5 mb-1 px-0.5">
                          <div>
                            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Select Mood</span>
                            <p className="text-[10px] text-neutral-400">Choose how you're feeling</p>
                          </div>
                          {currentMood && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setCurrentMood(undefined);
                                setIsMoodPickerOpen(false);
                                setIsSavedJustNow(false);
                                if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                              }}
                              className="text-[11px] text-rose-500 hover:text-rose-400 font-medium px-2 py-0.5 rounded-md hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 max-h-72 overflow-y-auto pr-0.5">
                          {MOOD_OPTIONS.map((opt) => {
                            const isSelected =
                              currentMood === opt.emoji ||
                              currentMood === opt.label ||
                              currentMood?.toLowerCase() === opt.label.toLowerCase();
                            return (
                              <button
                                key={`mood-opt-${opt.label}`}
                                type="button"
                                onClick={() => {
                                  triggerHaptic('selection');
                                  setCurrentMood(opt.label);
                                  setIsMoodPickerOpen(false);
                                  setIsSavedJustNow(false);
                                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                }}
                                className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all cursor-pointer border ${
                                  isSelected
                                    ? isDark
                                      ? 'bg-purple-500/20 border-purple-500/60 text-purple-200 ring-1 ring-purple-500/50'
                                      : 'bg-purple-50 border-purple-300 text-purple-900 ring-1 ring-purple-400'
                                    : isDark
                                    ? 'border-transparent hover:bg-neutral-800/80 hover:border-neutral-700/60 text-neutral-300'
                                    : 'border-transparent hover:bg-neutral-100 hover:border-neutral-200 text-neutral-700'
                                }`}
                              >
                                <span className="text-xl shrink-0 select-none">{opt.emoji}</span>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold leading-tight truncate">{opt.label}</div>
                                  <div className="text-[10px] text-neutral-400 leading-tight truncate">{opt.desc}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right: More menu (...) + Dedicated Save button */}
              <div className="flex items-center gap-2 shrink-0 relative">
                {/* More Menu (...) containing Header Extras */}
                <div ref={moreMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setIsMoreMenuOpen((prev) => !prev);
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
                      isMoreMenuOpen
                        ? isDark
                          ? 'bg-neutral-800 text-white'
                          : 'bg-neutral-200 text-neutral-900'
                        : isDark
                        ? 'bg-[#1e1e22] hover:bg-[#28282e] text-neutral-300'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    }`}
                    title="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {isMoreMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 6 }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                        className={`absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2.5rem)] origin-top-right rounded-2xl border shadow-2xl p-2.5 z-50 ${
                          isDark
                            ? 'bg-[#18181b] border-neutral-800 text-white shadow-black/80'
                            : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                        }`}
                      >
                        {/* Section 1: Mood Selector */}
                        <div className="px-1 pt-1 pb-2">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                            <span>Mood</span>
                            {currentMood && (
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('light');
                                  setIsSavedJustNow(false);
                                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                  setCurrentMood(undefined);
                                }}
                                className="text-[10px] text-neutral-400 hover:text-red-400 transition-colors lowercase cursor-pointer"
                              >
                                clear
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                            {MOOD_OPTIONS.map((opt) => {
                              const isSelected =
                                currentMood === opt.emoji ||
                                currentMood === opt.label ||
                                currentMood?.toLowerCase() === opt.label.toLowerCase();
                              return (
                                <button
                                  key={`more-mood-${opt.label}`}
                                  type="button"
                                  onClick={() => {
                                    triggerHaptic('selection');
                                    setIsSavedJustNow(false);
                                    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                                    setCurrentMood(isSelected ? undefined : opt.label);
                                  }}
                                  className={`flex items-center gap-2 p-1.5 rounded-xl text-left transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-purple-600/20 border-purple-500/50 text-purple-200'
                                      : isDark
                                      ? 'border-transparent bg-[#222226] hover:bg-[#2c2c32] text-neutral-300'
                                      : 'border-transparent bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                                  }`}
                                >
                                  <span className="text-lg shrink-0 select-none">{opt.emoji}</span>
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-semibold leading-tight truncate">{opt.label}</div>
                                    <div className="text-[9px] text-neutral-400 leading-tight truncate">{opt.desc}</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section 2: Header Extras */}
                        <div className="space-y-0.5 pt-1">
                          {/* Attach Photos */}
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              fileInputRef.current?.click();
                              setIsMoreMenuOpen(false);
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <ImageIcon className="w-4 h-4 text-purple-400 stroke-[2]" />
                            <span>Attach Photos {images.length > 0 ? `(${images.length})` : ''}</span>
                          </button>

                          {/* Record Voice Note */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsMoreMenuOpen(false);
                              handleToggleRecord();
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <Mic className={`w-4 h-4 stroke-[2] ${isRecording ? 'text-rose-500 animate-pulse' : 'text-rose-400'}`} />
                            <span>{isRecording ? 'Stop Recording' : 'Record Voice Memo'}</span>
                          </button>

                          {/* Reflection Prompts */}
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setIsMoreMenuOpen(false);
                              setIsPromptsOpen(true);
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <Sparkles className="w-4 h-4 text-amber-400 stroke-[2]" />
                            <span>Journaling Prompts</span>
                          </button>
                        </div>

                        {/* Subtle Divider */}
                        <div className={`my-1.5 h-px ${isDark ? 'bg-neutral-800' : 'bg-neutral-100'}`} />

                        {/* Section 3: Note Actions */}
                        <div className="space-y-0.5">
                          {note && onToggleFavorite && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                onToggleFavorite(note.id);
                                setIsMoreMenuOpen(false);
                              }}
                              className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                                isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                              }`}
                            >
                              <Bookmark
                                className={`w-4 h-4 stroke-[2] ${
                                  note.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-neutral-400'
                                }`}
                              />
                              <span>{note.isFavorite ? 'Remove from Fav' : 'Add to Fav'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              const fullText = `${title}\n\n${stripHtml(content)}`;
                              navigator.clipboard?.writeText(fullText);
                              setCopied(true);
                              setIsMoreMenuOpen(false);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                            ) : (
                              <Copy className="w-4 h-4 text-neutral-400 stroke-[2]" />
                            )}
                            <span>{copied ? 'Copied!' : 'Copy Content'}</span>
                          </button>

                          {note && onDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('medium');
                                onDelete(note.id);
                                setIsMoreMenuOpen(false);
                                onClose();
                              }}
                              className="w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors text-red-400 hover:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 stroke-[2]" />
                              <span>Delete Entry</span>
                            </button>
                          )}

                          {onSwitchFormat && (
                            <div className="border-t border-neutral-200/50 dark:border-neutral-800/80 pt-1.5 mt-1.5">
                              <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider px-2.5 py-1">
                                Switch Format
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('selection');
                                  setIsMoreMenuOpen(false);
                                  onClose();
                                  onSwitchFormat('notes', { title, content: editorRef.current ? editorRef.current.innerHTML : content });
                                }}
                                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                                  isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                                }`}
                              >
                                <Feather className="w-3.5 h-3.5 text-sky-400" />
                                <span>Switch to Note</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic('selection');
                                  setIsMoreMenuOpen(false);
                                  onClose();
                                  onSwitchFormat('todo', { title, content: editorRef.current ? editorRef.current.innerHTML : content });
                                }}
                                className={`w-full px-2.5 py-2 rounded-xl flex items-center gap-2.5 text-xs font-medium transition-colors cursor-pointer ${
                                  isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                                }`}
                              >
                                <ListTodo className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Switch to Todo</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Save Button */}
                <button
                  type="button"
                  onClick={handleSave}
                  className={`h-8 sm:h-9 px-3.5 sm:px-4 rounded-full font-semibold text-xs sm:text-sm flex items-center gap-1.5 active:scale-95 transition-all shadow-xs cursor-pointer select-none shrink-0 ${
                    isSavedJustNow
                      ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200 dark:ring-white/20'
                      : isDark
                      ? 'bg-white text-neutral-950 hover:bg-neutral-100 shadow-sm'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm'
                  }`}
                >
                  {isSavedJustNow ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5] text-emerald-600" />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>Save</span>
                    </>
                  )}
                </button>

                {/* Close Button (✕) */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onClose();
                  }}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0 ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                  }`}
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Recording Banner */}
            {isRecording && (
              <div className="my-2 bg-rose-500/10 rounded-2xl px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-semibold text-rose-400">
                    Recording Voice Note... ({Math.floor(recordDuration / 60)}:{(recordDuration % 60).toString().padStart(2, '0')})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                >
                  Stop & Save
                </button>
              </div>
            )}

            {/* INSIDE IT THERE WILL BE DIARY: Pure, distraction-free writing canvas */}
            <div className="flex-1 overflow-y-auto no-scrollbar w-full pt-3 pb-2 flex flex-col gap-3">
              {/* Title Input (Required, without (optional)) */}
              <div className="flex flex-col gap-1 w-full">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsSavedJustNow(false);
                    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                    if (titleError && e.target.value.trim()) {
                      setTitleError(false);
                    }
                  }}
                  placeholder="Title..."
                  required
                  className={`text-2xl sm:text-3xl font-bold tracking-tight bg-transparent border-b outline-hidden w-full transition-colors pb-1 ${
                    titleError
                      ? 'border-rose-500 placeholder:text-rose-400'
                      : 'border-transparent'
                  } ${
                    isDark
                      ? 'text-white placeholder:text-neutral-600'
                      : 'text-neutral-900 placeholder:text-neutral-400'
                  }`}
                />
                {titleError && (
                  <span className="text-xs text-rose-500 font-medium">Title is required</span>
                )}
              </div>

              {/* Voice Notes Strip (if any) */}
              {voiceNotes.length > 0 && (
                <div className="space-y-2">
                  {voiceNotes.map((vn, idx) => {
                    const isThisPlaying = activePlayingId === vn.id;
                    return (
                      <div
                        key={vn.id || `vn-${idx}`}
                        className={`p-3 rounded-2xl flex items-center gap-3 transition-colors ${
                          isDark
                            ? 'bg-[#18181c] text-white'
                            : 'bg-purple-50/70 text-neutral-900 shadow-xs'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => togglePlayVoiceNote(vn)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-xs cursor-pointer ${
                            isThisPlaying
                              ? 'bg-purple-600 text-white shadow-purple-500/25 shadow-md'
                              : isDark
                              ? 'bg-[#26262b] hover:bg-[#303036] text-purple-300'
                              : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                          }`}
                          title={isThisPlaying ? 'Pause' : 'Play'}
                        >
                          {isThisPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold tracking-tight truncate flex items-center gap-1.5">
                              <Mic className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>{vn.name || `Voice Note ${idx + 1}`}</span>
                            </span>
                            <span className="text-[11px] font-mono text-neutral-400 shrink-0">
                              {isThisPlaying
                                ? `${Math.floor(playbackTime / 60)}:${(playbackTime % 60).toString().padStart(2, '0')}`
                                : vn.duration || '0:15'}
                            </span>
                          </div>

                          {/* Visual Waveform */}
                          <div className="flex items-center gap-1 h-2">
                            {[40, 75, 100, 60, 30, 85, 95, 50, 70, 40, 90, 60, 35, 80, 100, 65, 45, 85].map(
                              (hPercent, barIdx) => (
                                <div
                                  key={`wave-${idx}-${barIdx}`}
                                  className={`flex-1 rounded-full transition-all duration-150 ${
                                    isThisPlaying
                                      ? 'bg-purple-500'
                                      : isDark
                                      ? 'bg-neutral-700'
                                      : 'bg-purple-300'
                                  }`}
                                  style={{
                                    height: isThisPlaying
                                      ? `${Math.max(
                                          25,
                                          Math.min(
                                            100,
                                            hPercent *
                                              (0.35 +
                                                Math.abs(Math.sin(barIdx * 0.8 + playbackTime * 4)) * 0.7)
                                          )
                                        )}%`
                                      : `${Math.max(25, hPercent * 0.45)}%`,
                                  }}
                                />
                              )
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveVoiceNote(vn.id)}
                          className="p-1.5 rounded-full text-neutral-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete voice note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Main Journal Writing Canvas with In-Flow Visual Media (Text flows around image anywhere) */}
              <div className="relative flex-1 min-h-[320px] w-full pt-1">
                {/* Visual Media directly in-flow with content */}
                {images.length > 0 && (
                  <div
                    ref={imageWrapperRef}
                    className={`relative select-none transition-all duration-75 ${
                      imageAlign === 'center'
                        ? 'mx-auto mb-4 block clear-both'
                        : imageAlign === 'right'
                        ? 'float-right ml-4 sm:ml-6 mb-3 clear-right'
                        : 'float-left mr-4 sm:mr-6 mb-3 clear-left'
                    }`}
                    style={{
                      width: imageAlign === 'center' ? `${imageWidthPercent}%` : `${Math.min(imageWidthPercent, 85)}%`,
                      maxWidth: imageAlign === 'center' ? '100%' : '85%',
                      minWidth: '140px',
                    }}
                  >
                    {images.length === 1 ? (
                      <div className="relative group/imgbox">
                        <div
                          className={`relative w-full rounded-2xl overflow-hidden border transition-all duration-150 select-none ${
                            isResizingImage
                              ? 'ring-2 ring-neutral-400 dark:ring-neutral-500 shadow-lg border-neutral-400 dark:border-neutral-500'
                              : 'border-neutral-200/80 dark:border-white/10 shadow-sm'
                          } bg-neutral-900/5 dark:bg-neutral-900/50`}
                          style={{
                            height: `${imageHeight}px`,
                          }}
                        >
                          <img
                            src={images[0]}
                            alt="Diary visual memory"
                            onClick={() => !isResizingImage && setLightboxSrc(images[0])}
                            className="w-full h-full cursor-pointer transition-transform duration-300 group-hover/imgbox:scale-[1.01]"
                            style={{ objectFit: imageFit }}
                            loading="lazy"
                          />

                          {/* Top-Right "More" Options Button & Minimal Horizontal Floating Pill Toolbar */}
                          <div ref={imageMenuRef} className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-30 select-none">
                            {/* Minimal Horizontal Pill Toolbar (revealed when More is clicked, completely inside the image) */}
                            {isImageMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-0.5 p-1 rounded-full bg-black/80 dark:bg-black/90 text-white backdrop-blur-md shadow-xl border border-white/15 animate-in fade-in slide-in-from-right-2 duration-150"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerHaptic('light');
                                    setImageAlign('left');
                                    setImageWidthPercent((prev) => (prev > 70 ? 48 : prev));
                                  }}
                                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                    imageAlign === 'left' ? 'bg-white/25 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/10'
                                  }`}
                                  title="Float Left (text on right)"
                                >
                                  <AlignLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerHaptic('light');
                                    setImageAlign('center');
                                  }}
                                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                    imageAlign === 'center' ? 'bg-white/25 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/10'
                                  }`}
                                  title="Center"
                                >
                                  <AlignCenter className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    triggerHaptic('light');
                                    setImageAlign('right');
                                    setImageWidthPercent((prev) => (prev > 70 ? 48 : prev));
                                  }}
                                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                                    imageAlign === 'right' ? 'bg-white/25 text-white' : 'text-neutral-300 hover:text-white hover:bg-white/10'
                                  }`}
                                  title="Float Right (text on left)"
                                >
                                  <AlignRight className="w-3.5 h-3.5" />
                                </button>

                                <div className="w-px h-3 bg-white/20 mx-0.5" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsImageMenuOpen(false);
                                    triggerHaptic('light');
                                    setLightboxSrc(images[0]);
                                  }}
                                  className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                  title="View full size"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsImageMenuOpen(false);
                                    triggerHaptic('medium');
                                    handleRemovePhoto(0);
                                  }}
                                  className="p-1.5 rounded-full text-neutral-300 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                                  title="Remove image"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* More Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerHaptic('light');
                                setIsImageMenuOpen((prev) => !prev);
                              }}
                              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md backdrop-blur-md ${
                                isImageMenuOpen
                                  ? 'bg-white text-neutral-900 shadow-lg scale-105'
                                  : 'bg-black/60 hover:bg-black/80 text-white'
                              }`}
                              title="Image options"
                              aria-label="Image options"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* All 4 Corner Resize Hitboxes (Functional drag-to-resize, zero visible dots) */}
                        {/* 1. Top-Left (NW) */}
                        <div
                          onPointerDown={(e) => handleStartImageResize('nw', e)}
                          className="absolute -top-3 -left-3 w-8 h-8 cursor-nwse-resize touch-none z-20"
                          title="Drag corner to resize"
                        />

                        {/* 2. Top-Right (NE) */}
                        <div
                          onPointerDown={(e) => handleStartImageResize('ne', e)}
                          className="absolute -top-3 -right-3 w-8 h-8 cursor-nesw-resize touch-none z-20"
                          title="Drag corner to resize"
                        />

                        {/* 3. Bottom-Left (SW) */}
                        <div
                          onPointerDown={(e) => handleStartImageResize('sw', e)}
                          className="absolute -bottom-3 -left-3 w-8 h-8 cursor-nesw-resize touch-none z-20"
                          title="Drag corner to resize"
                        />

                        {/* 4. Bottom-Right (SE) */}
                        <div
                          onPointerDown={(e) => handleStartImageResize('se', e)}
                          className="absolute -bottom-3 -right-3 w-8 h-8 cursor-nwse-resize touch-none z-20"
                          title="Drag corner to resize"
                        />

                        {/* Clean Bottom Edge Drag Handle (Functional, invisible hit area) */}
                        <div
                          onPointerDown={(e) => handleStartImageResize('s', e)}
                          className="absolute -bottom-3 inset-x-8 h-6 cursor-s-resize touch-none z-20"
                          title="Drag bottom to adjust height"
                        />
                      </div>
                    ) : (
                      /* Multiple Images Grid */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-200/50 dark:border-white/5">
                            <button
                              type="button"
                              onClick={() => setImageGridCols(1)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                                imageGridCols === 1
                                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                              }`}
                            >
                              1 Col
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageGridCols(2)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                                imageGridCols === 2
                                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                              }`}
                            >
                              2 Cols
                            </button>
                            {images.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setImageGridCols(3)}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                                  imageGridCols === 3
                                    ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs'
                                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                                }`}
                              >
                                3 Cols
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-200/50 dark:border-white/5">
                            <button
                              type="button"
                              onClick={() => {
                                setImageAlign('left');
                                setImageWidthPercent((prev) => (prev > 70 ? 55 : prev));
                              }}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                imageAlign === 'left' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                              }`}
                              title="Float Left (text on right)"
                            >
                              <AlignLeft className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageAlign('center')}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                imageAlign === 'center' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                              }`}
                              title="Center"
                            >
                              <AlignCenter className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setImageAlign('right');
                                setImageWidthPercent((prev) => (prev > 70 ? 55 : prev));
                              }}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                imageAlign === 'right' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                              }`}
                              title="Float Right (text on left)"
                            >
                              <AlignRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div
                          className={`grid gap-2.5 ${
                            imageGridCols === 1
                              ? 'grid-cols-1'
                              : imageGridCols === 3
                              ? 'grid-cols-2 sm:grid-cols-3'
                              : 'grid-cols-2'
                          }`}
                        >
                          {images.map((imgSrc, idx) => (
                            <div
                              key={`attached-img-${idx}`}
                              style={{ height: `${imageHeight}px` }}
                              className="relative rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-white/10 shadow-xs group bg-neutral-900/5 dark:bg-neutral-900/50"
                            >
                              <img
                                src={imgSrc}
                                alt={`Attachment ${idx + 1}`}
                                onClick={() => setLightboxSrc(imgSrc)}
                                className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePhoto(idx);
                                }}
                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center opacity-90 sm:opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-xs"
                                title="Remove photo"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Journal Writing Canvas with In-Flow Placeholder */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  onPaste={handleEditorPaste}
                  onKeyDown={handleEditorKeyDown}
                  onSelect={updateActiveFormats}
                  onKeyUp={updateActiveFormats}
                  onMouseUp={updateActiveFormats}
                  data-placeholder="Dear Diary, write your thoughts, memories, reflections, or moments here..."
                  data-empty={isEditorEmpty ? "true" : "false"}
                  className={`diary-editor-placeholder w-full min-h-[260px] bg-transparent border-none outline-hidden resize-none text-base sm:text-lg leading-relaxed font-normal transition-colors focus:outline-none pb-32 ${
                    isDark ? 'text-neutral-200' : 'text-neutral-800'
                  }`}
                  style={{ minHeight: '260px' }}
                />

                <div className="clear-both" />
              </div>
            </div>

            {/* BOTTOM FLOATING EDITORIAL TOOLBAR (Merged Image 1 + Image 2: + 🎙 | T 🖼️ ✎ B A | ···) */}
            <footer className="pt-2 pb-2 shrink-0 z-30 relative">
              <div className="w-full flex items-center justify-center relative">
                {/* Floating Docked Pill Toolbar */}
                <div className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full backdrop-blur-xl border shadow-2xl select-none transition-colors ${
                  isDark
                    ? 'bg-[#18181c]/90 text-white border-white/10 shadow-black/60'
                    : 'bg-neutral-900/95 text-white border-neutral-800 shadow-neutral-900/25'
                }`}>
                  {/* 1. Quick Add (+) with Popover (Attach Photo, Voice Memo, Prompts, Timestamp) */}
                  <div className="relative" ref={quickAddRef}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setIsQuickAddOpen((prev) => !prev);
                      }}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isQuickAddOpen
                          ? 'bg-white text-neutral-950 scale-105 shadow-sm'
                          : 'text-neutral-300 hover:text-white hover:bg-white/10 active:scale-90'
                      }`}
                      title="Quick insert (+)"
                    >
                      <Plus className="w-4 h-4 stroke-[2.4]" />
                    </button>

                    {/* Quick Add Popover Menu */}
                    <AnimatePresence>
                      {isQuickAddOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          className={`absolute bottom-full mb-3 left-0 w-52 p-1.5 rounded-2xl border shadow-2xl z-50 ${
                            isDark
                              ? 'bg-[#1a1a1f] border-neutral-800 text-white shadow-black/80'
                              : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setIsQuickAddOpen(false);
                              fileInputRef.current?.click();
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <ImageIcon className="w-4 h-4 text-purple-400 stroke-[2]" />
                            <span>Attach Photo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsQuickAddOpen(false);
                              handleToggleRecord();
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <Mic className="w-4 h-4 text-rose-400 stroke-[2]" />
                            <span>{isRecording ? 'Stop Recording' : 'Record Voice Memo'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsQuickAddOpen(false);
                              setIsPromptsOpen(true);
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <Sparkles className="w-4 h-4 text-amber-400 stroke-[2]" />
                            <span>Writing Prompts</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleInsertTimestamp}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                              isDark ? 'hover:bg-neutral-800 text-neutral-200' : 'hover:bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <Clock className="w-4 h-4 text-sky-400 stroke-[2]" />
                            <span>Insert Timestamp</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 2. Direct Voice Note Button (Mic) */}
                  <button
                    type="button"
                    onClick={handleToggleRecord}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isRecording
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/40'
                        : voiceNotes.length > 0
                        ? 'text-rose-400 hover:bg-rose-500/15'
                        : 'text-neutral-300 hover:text-white hover:bg-white/10 active:scale-90'
                    }`}
                    title={isRecording ? 'Stop recording voice note' : 'Record voice memo'}
                  >
                    <Mic className="w-4 h-4 stroke-[2]" />
                  </button>

                  {/* Divider */}
                  <div className="w-px h-4 bg-white/20 mx-0.5" />

                  {/* 3. T - Typography / Heading Toggle */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleToggleHeading();
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                      activeFormats.heading
                        ? 'bg-white/25 text-white ring-1 ring-white/40'
                        : 'text-neutral-300 hover:text-white hover:bg-white/10 active:scale-90'
                    }`}
                    title="Heading (T)"
                  >
                    <span className="font-bold text-sm leading-none">T</span>
                  </button>

                  {/* 4. Photo / Image Upload (Direct) */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      images.length > 0
                        ? 'text-purple-400 bg-purple-500/20'
                        : 'text-neutral-300 hover:text-white hover:bg-white/10 active:scale-90'
                    }`}
                    title="Add photo"
                  >
                    <ImageIcon className="w-4 h-4 stroke-[2]" />
                  </button>

                  {/* 5. Highlighter with Warm Amber Accent Tip (like Image 1) */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleToggleHighlight();
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      activeFormats.highlight
                        ? 'bg-amber-400 text-amber-950 font-semibold shadow-xs'
                        : 'text-amber-400 hover:bg-amber-400/20 active:scale-90'
                    }`}
                    title="Highlight text"
                  >
                    <Highlighter className="w-4 h-4 stroke-[2.4]" />
                  </button>

                  {/* 6. B - Bold Toggle */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleToggleFormatting('bold');
                    }}
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all cursor-pointer ${
                      activeFormats.bold
                        ? 'bg-white/25 text-white ring-1 ring-white/40'
                        : 'text-neutral-300 hover:text-white hover:bg-white/10 active:scale-90'
                    }`}
                    title="Bold"
                  >
                    <Bold className="w-4 h-4 stroke-[2.6]" />
                  </button>

                  {/* 7. A - Text Color with underline indicator */}
                  <div className="relative" ref={colorPickerRef}>
                    <button
                      type="button"
                      onClick={() => setIsColorPickerOpen((prev) => !prev)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isColorPickerOpen
                          ? 'bg-white/25 text-white ring-1 ring-white/40'
                          : 'text-neutral-300 hover:text-white hover:bg-white/10 active:scale-90'
                      }`}
                      title="Text color (A)"
                    >
                      <span className="font-extrabold text-xs leading-none">A</span>
                      <span
                        className="w-3.5 h-0.5 rounded-full mt-0.5"
                        style={{ backgroundColor: selectedTextColor || '#38bdf8' }}
                      />
                    </button>

                    {/* Color Swatches Popover */}
                    <AnimatePresence>
                      {isColorPickerOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 p-2 rounded-2xl border shadow-2xl flex items-center gap-1.5 z-50 ${
                            isDark
                              ? 'bg-[#1a1a1f] border-neutral-800 text-white shadow-black/80'
                              : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                          }`}
                        >
                          {TEXT_COLORS.map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setSelectedTextColor(c.colorHex);
                                handleApplyTextColor(c.colorHex);
                              }}
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-115 cursor-pointer ${
                                c.colorHex === null ? 'border border-neutral-400' : 'shadow-xs'
                              }`}
                              style={{ backgroundColor: c.colorHex || 'transparent' }}
                              title={c.name}
                            >
                              {c.colorHex === null && (
                                <span className="text-[10px] font-bold text-neutral-500">✕</span>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-4 bg-white/20 mx-0.5" />

                  {/* 8. More Formatting Tools (...) */}
                  <div className="relative" ref={moreFormattingRef}>
                    <button
                      type="button"
                      onClick={() => setIsMoreFormattingOpen((prev) => !prev)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isMoreFormattingOpen
                          ? 'bg-white/25 text-white ring-1 ring-white/40'
                          : 'text-neutral-300 hover:text-white hover:bg-white/10 active:scale-90'
                      }`}
                      title="More formatting tools"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {isMoreFormattingOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          className={`absolute bottom-full mb-3 right-0 p-1.5 rounded-2xl border shadow-2xl flex items-center gap-1 z-50 ${
                            isDark
                              ? 'bg-[#1a1a1f] border-neutral-800 text-white shadow-black/80'
                              : 'bg-white border-neutral-200 text-neutral-900 shadow-xl'
                          }`}
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleToggleFormatting('italic');
                            }}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              activeFormats.italic
                                ? 'bg-purple-500/20 text-purple-400'
                                : isDark
                                ? 'hover:bg-neutral-800 text-neutral-300'
                                : 'hover:bg-neutral-100 text-neutral-700'
                            }`}
                            title="Italic (*text*)"
                          >
                            <Italic className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleToggleFormatting('list');
                            }}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              activeFormats.list
                                ? 'bg-purple-500/20 text-purple-400'
                                : isDark
                                ? 'hover:bg-neutral-800 text-neutral-300'
                                : 'hover:bg-neutral-100 text-neutral-700'
                            }`}
                            title="Bullet List (- item)"
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleToggleFormatting('quote');
                            }}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              activeFormats.quote
                                ? 'bg-purple-500/20 text-purple-400'
                                : isDark
                                ? 'hover:bg-neutral-800 text-neutral-300'
                                : 'hover:bg-neutral-100 text-neutral-700'
                            }`}
                            title="Quote (> quote)"
                          >
                            <Quote className="w-4 h-4" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </footer>

            {/* Reflection Prompts Modal */}
            <AnimatePresence>
              {isPromptsOpen && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsPromptsOpen(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    className={`relative w-full max-w-sm rounded-2xl border shadow-2xl p-4 z-10 ${
                      isDark
                        ? 'bg-[#18181b] border-neutral-800 text-white'
                        : 'bg-white border-neutral-200 text-neutral-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h3 className="text-sm font-bold tracking-tight">Journaling Prompts</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPromptsOpen(false)}
                        className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
                      {JOURNALING_PROMPTS.map((pr, idx) => (
                        <button
                          key={`prompt-modal-${idx}`}
                          type="button"
                          onClick={() => handleInsertPrompt(pr)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors leading-relaxed cursor-pointer ${
                            isDark
                              ? 'hover:bg-neutral-800/90 text-neutral-200 hover:text-white bg-neutral-900/50'
                              : 'hover:bg-neutral-100 text-neutral-800 bg-neutral-50'
                          }`}
                        >
                          "{pr}"
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Image Lightbox */}
            <ImageLightbox
              isOpen={!!lightboxSrc}
              src={lightboxSrc}
              alt="Diary memory"
              onClose={() => setLightboxSrc(null)}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
