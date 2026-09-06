import { useState, useRef, useEffect, useMemo, ChangeEvent, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  X,
  ChevronDown,
  BookOpen,
  KeyRound,
  ListTodo,
  Feather,
  Eye,
  EyeOff,
  Plus,
  Mic,
  MicOff,
  Image as ImageIcon,
  Radio,
  Trash2,
  Sparkles,
  Clock,
  Play,
  Pause,
  Square,
  FileText,
  CreditCard,
  Phone,
  Shield,
  FileUp,
  Download,
  PenLine,
} from 'lucide-react';
import {
  ThemeMode,
  EntryType,
  TodoSubItem,
  NoteItem,
  VoiceNoteAttachment,
  DocumentAttachment,
  PersonalInfoField,
} from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { parseTodoItemsFromNote } from './TodoDrawer';
import { triggerHaptic } from '../lib/capacitor';
import { ImageLightbox } from './ImageLightbox';
import { capitalizeFirstChar } from '../lib/formatters';

interface NewNoteModalProps {
  isOpen: boolean;
  theme: ThemeMode;
  autoOpenKeyboard?: boolean;
  initialType?: EntryType;
  editingNote?: NoteItem | null;
  existingNotes?: NoteItem[];
  onClose: () => void;
  onSaveNote: (
    title: string,
    content: string,
    extra?: {
      entryType?: EntryType;
      isTodo?: boolean;
      isSafe?: boolean;
      email?: string;
      service?: string;
      password?: string;
      todoItems?: TodoSubItem[];
      hasVoiceNote?: boolean;
      voiceDuration?: string;
      voiceAudioUrl?: string;
      voiceNotes?: VoiceNoteAttachment[];
      imageUrl?: string;
      images?: string[];
      documents?: DocumentAttachment[];
      personalInfo?: PersonalInfoField[];
    }
  ) => void;
  onUpdateNote?: (updatedNote: NoteItem) => void;
}

// Fallback audio tone generator in case microphone is blocked in restricted browser iframes
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
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
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

const generateTodoId = () =>
  `todo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const sanitizeEntryType = (t: unknown): EntryType => {
  if (t === 'notes' || t === 'diary' || t === 'passwords' || t === 'todo') {
    return t;
  }
  return 'notes';
};

export function NewNoteModal({
  isOpen,
  theme,
  autoOpenKeyboard = true,
  initialType = 'notes',
  editingNote,
  existingNotes = [],
  onClose,
  onSaveNote,
  onUpdateNote,
}: NewNoteModalProps) {
  const isDark = theme === 'dark';

  // Entry type state (notes, diary, passwords, todo)
  const [entryType, setEntryType] = useState<EntryType>(() => sanitizeEntryType(initialType));
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // General fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // Linked existing note (when user chooses an existing note/list from title suggestions)
  const [linkedExistingNote, setLinkedExistingNote] = useState<NoteItem | null>(editingNote || null);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);

  // Password / Key specific fields
  const [serviceName, setServiceName] = useState('');
  const [emailUsername, setEmailUsername] = useState('');
  const [passwordValue, setPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [secretNotes, setSecretNotes] = useState('');
  const [showSecretNotes, setShowSecretNotes] = useState(false);

  // Todo specific fields
  const [todoItems, setTodoItems] = useState<TodoSubItem[]>([]);
  const [newTodoInput, setNewTodoInput] = useState('');

  // Bottom attachments & floating sub-menu
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedDocs, setAttachedDocs] = useState<DocumentAttachment[]>([]);
  const [personalInfoFields, setPersonalInfoFields] = useState<PersonalInfoField[]>([]);
  const [safeSection, setSafeSection] = useState<'ids' | 'credentials'>('ids');

  // Voice recording & playback state (inside '+' sub-menu)
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasVoiceNote, setHasVoiceNote] = useState(false);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteAttachment[]>([]);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);

  // Speech-to-text dictation state (floating pill mic button)
  const [isListeningSpeech, setIsListeningSpeech] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const todoFloatingInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const plusBtnRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset or initialize when opened
  useEffect(() => {
    if (isOpen) {
      if (editingNote) {
        const determinedType: EntryType =
          editingNote.entryType ||
          (editingNote.isTodo
            ? 'todo'
            : editingNote.isSafe || editingNote.isVault
            ? 'passwords'
            : 'notes');
        setEntryType(determinedType);
        setTitle(editingNote.title || '');
        setContent(editingNote.content || '');
        setServiceName(editingNote.service || editingNote.title || '');
        setEmailUsername(editingNote.email || '');
        setPasswordValue(editingNote.password || '');

        let parsedSecretNotes = '';
        if (editingNote.content && (determinedType === 'passwords' || editingNote.isSafe)) {
          const lines = editingNote.content.split('\n');
          for (const line of lines) {
            if (!editingNote.email && line.startsWith('Email/Username: ')) {
              setEmailUsername(line.replace('Email/Username: ', '').trim());
            } else if (!editingNote.password && line.startsWith('Password: ')) {
              setPasswordValue(line.replace('Password: ', '').trim());
            } else if (line.startsWith('Notes: ')) {
              const n = line.replace('Notes: ', '').trim();
              parsedSecretNotes = parsedSecretNotes ? `${parsedSecretNotes}\n${n}` : n;
            } else if (!line.startsWith('Email/Username: ') && !line.startsWith('Password: ')) {
              const trimmed = line.trim();
              if (trimmed && trimmed !== editingNote.email) {
                parsedSecretNotes = parsedSecretNotes ? `${parsedSecretNotes}\n${trimmed}` : trimmed;
              }
            }
          }
        }
        setSecretNotes(parsedSecretNotes);
        setShowSecretNotes(!!parsedSecretNotes);
        setShowPassword(false);

        if (editingNote.todoItems && editingNote.todoItems.length > 0) {
          const seenIds = new Set<string>();
          const sanitized = editingNote.todoItems.map((item, idx) => {
            let itemId = item.id ? String(item.id).trim() : `todo-item-${idx}`;
            if (!itemId || seenIds.has(itemId)) {
              itemId = `todo-item-${idx}-${seenIds.size}-${Math.random().toString(36).substring(2, 6)}`;
            }
            seenIds.add(itemId);
            return { ...item, id: itemId };
          });
          setTodoItems(sanitized);
        } else if (editingNote.isTodo || determinedType === 'todo') {
          setTodoItems(parseTodoItemsFromNote(editingNote));
        } else {
          setTodoItems([]);
        }

        // Initialize voice notes
        if (editingNote.voiceNotes && editingNote.voiceNotes.length > 0) {
          setVoiceNotes(editingNote.voiceNotes);
          setHasVoiceNote(true);
        } else if (editingNote.voiceAudioUrl || editingNote.hasVoiceNote) {
          setVoiceNotes([
            {
              id: 'vn-init',
              audioUrl: editingNote.voiceAudioUrl || '',
              duration: editingNote.voiceDuration || '0:15',
              name: 'Voice Note 1',
            },
          ]);
          setHasVoiceNote(true);
        } else {
          setVoiceNotes([]);
          setHasVoiceNote(false);
        }

        // Initialize images
        if (editingNote.images && editingNote.images.length > 0) {
          setAttachedImages(editingNote.images);
        } else if (editingNote.imageUrl) {
          setAttachedImages([editingNote.imageUrl]);
        } else {
          setAttachedImages([]);
        }

        // Initialize documents
        if (editingNote.documents && editingNote.documents.length > 0) {
          setAttachedDocs(editingNote.documents);
        } else {
          setAttachedDocs([]);
        }

        // Initialize personal info
        if (editingNote.personalInfo && editingNote.personalInfo.length > 0) {
          setPersonalInfoFields(editingNote.personalInfo);
          setSafeSection('ids');
        } else if (editingNote.content && (determinedType === 'passwords' || editingNote.isSafe)) {
          const lines = editingNote.content.split('\n');
          const extracted: PersonalInfoField[] = [];
          for (const line of lines) {
            const lower = line.toLowerCase();
            if (lower.startsWith('aadhaar:') || lower.startsWith('aadhaar number:')) {
              extracted.push({
                id: `pi-${Date.now()}-1`,
                label: 'Aadhaar Number',
                value: line.split(':')[1]?.trim() || '',
                isMasked: true,
              });
            } else if (lower.startsWith('pan card:') || lower.startsWith('pan:')) {
              extracted.push({
                id: `pi-${Date.now()}-2`,
                label: 'PAN Card Number',
                value: line.split(':')[1]?.trim() || '',
                isMasked: false,
              });
            } else if (lower.startsWith('phone:') || lower.startsWith('mobile:')) {
              extracted.push({
                id: `pi-${Date.now()}-3`,
                label: 'Phone Number',
                value: line.split(':')[1]?.trim() || '',
                isMasked: false,
              });
            }
          }
          setPersonalInfoFields(extracted);
          if (extracted.length > 0) {
            setSafeSection('ids');
          } else if (editingNote.password || editingNote.email) {
            setSafeSection('credentials');
          }
        } else {
          setPersonalInfoFields([]);
          if (editingNote.password || editingNote.email) {
            setSafeSection('credentials');
          }
        }
      } else {
        setEntryType(sanitizeEntryType(initialType));
        setTitle('');
        setContent('');
        setServiceName('');
        setEmailUsername('');
        setPasswordValue('');
        setSecretNotes('');
        setShowSecretNotes(false);
        setShowPassword(false);
        setTodoItems([]);
        setHasVoiceNote(false);
        setVoiceNotes([]);
        setAttachedImages([]);
        setAttachedDocs([]);
        setPersonalInfoFields([]);
        setSafeSection('ids');
      }

      setLinkedExistingNote(editingNote || null);
      setShowTitleSuggestions(false);
      setNewTodoInput('');
      setIsPlusMenuOpen(false);
      setIsTypeDropdownOpen(false);
      setIsRecordingAudio(false);
      setRecordingDuration(0);
      setIsListeningSpeech(false);
      setSpeechNotice(null);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setActivePlayingId(null);
      setPlaybackTime(0);

      if (autoOpenKeyboard) {
        setTimeout(() => {
          if (initialType === 'todo' && editingNote?.title) {
            todoFloatingInputRef.current?.focus();
          } else {
            titleInputRef.current?.focus();
          }
        }, 150);
      }
    }
  }, [isOpen, editingNote, initialType, autoOpenKeyboard]);

  // Existing notes matching currently typed title or recent items for suggestion
  const matchingExistingNotes = useMemo(() => {
    if (!existingNotes || existingNotes.length === 0) return [];

    const currentNoteId = linkedExistingNote?.id || editingNote?.id;

    // Filter notes that correspond to current entryType
    const relevant = existingNotes.filter((n) => {
      if (!n || !n.title) return false;
      if (currentNoteId && n.id === currentNoteId) return false;

      if (entryType === 'todo') {
        return n.isTodo || n.entryType === 'todo' || (n.todoItems && n.todoItems.length > 0);
      }
      if (entryType === 'passwords') {
        return n.isSafe || n.isVault || n.entryType === 'passwords';
      }
      if (entryType === 'diary') {
        return n.entryType === 'diary';
      }
      return !n.isTodo && !n.isSafe;
    });

    const query = title.trim().toLowerCase();
    if (!query) {
      // Return recent existing items
      return relevant.slice(0, 4);
    }

    return relevant
      .filter((n) => n.title.toLowerCase().includes(query))
      .slice(0, 5);
  }, [existingNotes, title, entryType, linkedExistingNote, editingNote]);

  const isSuggestionsActive =
    !linkedExistingNote && showTitleSuggestions && matchingExistingNotes.length > 0;

  const handleSelectExistingNote = (note: NoteItem) => {
    triggerHaptic('selection');
    setLinkedExistingNote(note);
    setTitle(note.title);

    if (entryType === 'todo' || note.isTodo) {
      const existingItems = parseTodoItemsFromNote(note);
      // Merge with any items the user already typed into the modal so nothing is lost
      const existingTexts = new Set(existingItems.map((it) => it.text.trim().toLowerCase()));
      const unmerged = todoItems.filter(
        (it) => !existingTexts.has(it.text.trim().toLowerCase())
      );
      setTodoItems([...existingItems, ...unmerged]);
    } else {
      if (note.content && !content) {
        setContent(note.content);
      }
    }

    setShowTitleSuggestions(false);

    // Focus floating task input if in todo mode, or content input in other modes
    setTimeout(() => {
      if (entryType === 'todo') {
        todoFloatingInputRef.current?.focus();
      } else {
        contentTextareaRef.current?.focus();
      }
    }, 120);
  };

  const handleUnlinkExistingNote = () => {
    triggerHaptic('selection');
    setLinkedExistingNote(null);
    setShowTitleSuggestions(false);
  };

  // Cleanup audio, recording & speech on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Click outside listeners for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsTypeDropdownOpen(false);
      }
      if (
        plusMenuRef.current &&
        !plusMenuRef.current.contains(e.target as Node) &&
        plusBtnRef.current &&
        !plusBtnRef.current.contains(e.target as Node)
      ) {
        setIsPlusMenuOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const typeConfig: Record<
    EntryType,
    {
      label: string;
      icon: typeof BookOpen;
      placeholder: string;
      desc: string;
      getBgClass: (isDark: boolean) => string;
    }
  > = {
    notes: {
      label: 'Note',
      icon: Feather,
      placeholder: 'Standard scratchpad',
      desc: 'Simple note',
      getBgClass: (dark) => (dark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600'),
    },
    diary: {
      label: 'Diary',
      icon: BookOpen,
      placeholder: 'Diary reflections & notes',
      desc: 'Journaling & reflections',
      getBgClass: (dark) => (dark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-600'),
    },
    passwords: {
      label: 'Safe',
      icon: Shield,
      placeholder: 'Store logins, secrets & keys',
      desc: 'Personal details, email & key',
      getBgClass: (dark) => (dark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'),
    },
    todo: {
      label: 'Todo',
      icon: ListTodo,
      placeholder: 'Tasks & checklist items',
      desc: 'Interactive action list',
      getBgClass: (dark) => (dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'),
    },
  };

  const handleAddTodoItem = () => {
    if (newTodoInput.trim()) {
      setTodoItems((prev) => [
        ...prev,
        {
          id: generateTodoId(),
          text: newTodoInput.trim(),
          completed: false,
        },
      ]);
      setNewTodoInput('');
      triggerHaptic('selection');
      setTimeout(() => {
        todoFloatingInputRef.current?.focus();
      }, 50);
    }
  };

  const handleToggleTodoItem = (id: string) => {
    setTodoItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteTodoItem = (id: string) => {
    setTodoItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleImageFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      let loadedCount = 0;
      const newImages: string[] = [];

      fileList.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            newImages.push(event.target.result as string);
          }
          loadedCount++;
          if (loadedCount === fileList.length) {
            setAttachedImages((prev) => [...prev, ...newImages]);
            triggerHaptic('success');
          }
        };
        reader.readAsDataURL(file);
      });
      // Reset input value so user can pick the same file again if desired
      e.target.value = '';
    }
  };

  const handleDeletePhoto = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
    triggerHaptic('selection');
  };

  const handleDocFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileList = Array.from(files);
      fileList.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            let sizeStr = '';
            if (file.size < 1024) sizeStr = `${file.size} B`;
            else if (file.size < 1024 * 1024) sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
            else sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

            const newDoc: DocumentAttachment = {
              id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              size: sizeStr,
              type: file.type || 'application/octet-stream',
              dataUrl: event.target.result as string,
              uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            };
            setAttachedDocs((prev) => [...prev, newDoc]);
            triggerHaptic('success');
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }
  };

  const handleDeleteDoc = (id: string) => {
    triggerHaptic('selection');
    setAttachedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const handleAddPersonalInfoField = (label: string, defaultValue = '', isMasked = false) => {
    triggerHaptic('selection');
    const newField: PersonalInfoField = {
      id: `pi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      label,
      value: defaultValue,
      isMasked,
    };
    setPersonalInfoFields((prev) => [...prev, newField]);
  };

  const handleUpdatePersonalInfoField = (id: string, updates: Partial<PersonalInfoField>) => {
    setPersonalInfoFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleRemovePersonalInfoField = (id: string) => {
    triggerHaptic('light');
    setPersonalInfoFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleInsertTimestamp = () => {
    const now = new Date();
    const timeStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    const stamp = `[${timeStr}]`;
    if (entryType === 'todo') {
      setTodoItems((prev) => [
        ...prev,
        { id: generateTodoId(), text: `Note created ${stamp}`, completed: false },
      ]);
    } else {
      const textarea = contentTextareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart ?? content.length;
        const end = textarea.selectionEnd ?? content.length;
        const before = content.substring(0, start);
        const after = content.substring(end);
        const needsNewline = before.length > 0 && !before.endsWith('\n');
        const insertText = needsNewline ? `\n${stamp} ` : `${stamp} `;
        const newContent = before + insertText + after;
        setContent(newContent);
        setTimeout(() => {
          textarea.focus();
          const newPos = start + insertText.length;
          textarea.setSelectionRange(newPos, newPos);
        }, 15);
      } else {
        setContent((prev) => (prev ? `${prev}\n\n${stamp} ` : `${stamp} `));
      }
    }
    triggerHaptic('selection');
  };

  const handleInsertChecklist = () => {
    if (entryType === 'todo') {
      setTodoItems((prev) => [
        ...prev,
        { id: generateTodoId(), text: 'New task', completed: false },
      ]);
      triggerHaptic('selection');
      return;
    }

    const textarea = contentTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? content.length;
      const end = textarea.selectionEnd ?? content.length;
      const before = content.substring(0, start);
      const after = content.substring(end);
      const needsNewline = before.length > 0 && !before.endsWith('\n');
      const insertText = needsNewline ? '\n- [ ] ' : '- [ ] ';
      const newContent = before + insertText + after;
      setContent(newContent);
      triggerHaptic('selection');

      setTimeout(() => {
        textarea.focus();
        const newPos = start + insertText.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 15);
    } else {
      setContent((prev) => (prev ? `${prev}\n- [ ] ` : '- [ ] '));
      triggerHaptic('selection');
    }
  };

  const handleContentKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const before = textarea.value.substring(0, start);
      const lines = before.split('\n');
      const currentLine = lines[lines.length - 1];

      // Check if current line starts with "- [ ] " or "- [x] "
      const match = currentLine.match(/^(\s*-\s*\[(?: |x|X)\]\s*)(.*)$/);
      if (match) {
        e.preventDefault();
        const textAfterPrefix = match[2];

        if (textAfterPrefix.trim() === '') {
          // Empty checkbox line: pressing Enter clears the checkbox prefix on this line
          const lineStartIndex = start - currentLine.length;
          const after = textarea.value.substring(start);
          const newContent = textarea.value.substring(0, lineStartIndex) + after;
          setContent(newContent);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(lineStartIndex, lineStartIndex);
          }, 0);
        } else {
          // Non-empty checkbox line: pressing Enter continues a fresh checkbox on the next line
          const after = textarea.value.substring(start);
          const nextPrefix = '\n- [ ] ';
          const newContent = before + nextPrefix + after;
          setContent(newContent);
          setTimeout(() => {
            textarea.focus();
            const newPos = start + nextPrefix.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 0);
        }
      }
    }
  };

  // Voice Note Recording (via '+' sub-menu)
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const startVoiceRecording = async () => {
    setIsPlusMenuOpen(false);
    triggerHaptic('medium');
    audioChunksRef.current = [];
    setRecordingDuration(0);
    recordingStartTimeRef.current = Date.now();

    // Stop any existing playback
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setActivePlayingId(null);
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof MediaRecorder !== 'undefined') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
            audioStreamRef.current = null;
          }
          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          const url = URL.createObjectURL(blob);
          
          const elapsedSec = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
          const mins = Math.floor(elapsedSec / 60);
          const secs = elapsedSec % 60;
          const durStr = `${mins}:${secs.toString().padStart(2, '0')}`;
          const finalDur = durStr === '0:00' ? '0:03' : durStr;

          setVoiceNotes((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              audioUrl: url,
              duration: finalDur,
              createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              name: `Voice Note ${prev.length + 1}`,
            },
          ]);
          setHasVoiceNote(true);
          setIsRecordingAudio(false);
          setRecordingDuration(0);
          triggerHaptic('success');
        };

        recorder.start(250);
        mediaRecorderRef.current = recorder;
        setIsRecordingAudio(true);

        recordingIntervalRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
        return;
      } catch (err) {
        console.warn('Microphone access denied or unavailable, using simulated voice recording:', err);
      }
    }

    // Fallback if mic permission not granted in iframe
    setIsRecordingAudio(true);
    recordingIntervalRef.current = setInterval(() => {
      setRecordingDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopVoiceRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    } else {
      // Fallback: create sample audio WAV blob if microphone was simulated
      const sampleBlob = createSampleAudioBlob();
      const url = URL.createObjectURL(sampleBlob);
      const elapsedSec = Math.max(1, Math.round((Date.now() - recordingStartTimeRef.current) / 1000));
      const mins = Math.floor(elapsedSec / 60);
      const secs = elapsedSec % 60;
      const durStr = `${mins}:${secs.toString().padStart(2, '0')}`;
      const finalDur = durStr === '0:00' ? '0:03' : durStr;

      setVoiceNotes((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          audioUrl: url,
          duration: finalDur,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          name: `Voice Note ${prev.length + 1}`,
        },
      ]);
      setHasVoiceNote(true);
      setIsRecordingAudio(false);
      setRecordingDuration(0);
      triggerHaptic('success');
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecordingAudio(false);
    setRecordingDuration(0);
    triggerHaptic('light');
  };

  // Voice Note Playback and Deletion (in note editor)
  const togglePlayVoiceNote = (vn: VoiceNoteAttachment) => {
    if (activePlayingId === vn.id && audioPlayerRef.current) {
      if (audioPlayerRef.current.paused) {
        audioPlayerRef.current
          .play()
          .then(() => {
            setActivePlayingId(vn.id);
            triggerHaptic('selection');
          })
          .catch((e) => {
            console.warn('Audio resume error:', e);
          });
      } else {
        audioPlayerRef.current.pause();
        setActivePlayingId(null);
        triggerHaptic('selection');
      }
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    const audioUrl = vn.audioUrl || URL.createObjectURL(createSampleAudioBlob());
    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;
    audio.currentTime = 0;
    setPlaybackTime(0);

    audio.ontimeupdate = () => {
      setPlaybackTime(Math.floor(audio.currentTime));
    };

    audio.onended = () => {
      setActivePlayingId(null);
      setPlaybackTime(0);
      triggerHaptic('light');
    };

    audio
      .play()
      .then(() => {
        setActivePlayingId(vn.id);
        triggerHaptic('selection');
      })
      .catch((e) => {
        console.warn('Audio playback error:', e);
        setActivePlayingId(null);
      });
  };

  const handleDeleteVoiceNote = (id: string) => {
    if (activePlayingId === id && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
      setActivePlayingId(null);
    }
    setVoiceNotes((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (filtered.length === 0) {
        setHasVoiceNote(false);
      }
      return filtered;
    });
    triggerHaptic('medium');
  };

  // Speech-to-Text Dictation (floating pill mic button)
  const handleToggleSpeechToText = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isListeningSpeech) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListeningSpeech(false);
      setSpeechNotice(null);
      triggerHaptic('light');
      return;
    }

    if (!SpeechRecognition) {
      setSpeechNotice('Speech recognition is supported in Chrome, Safari & Edge. You can also record voice notes using +.');
      setTimeout(() => setSpeechNotice(null), 3500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListeningSpeech(true);
        setSpeechNotice('Listening... Speak to dictate');
        triggerHaptic('medium');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          const text = finalTranscript.trim();
          if (entryType === 'todo') {
            setTodoItems((prev) => [
              ...prev,
              { id: generateTodoId(), text, completed: false },
            ]);
          } else if (entryType === 'passwords') {
            setSecretNotes((prev) => (prev ? `${prev}\n• ${text}` : `• ${text}`));
            setShowSecretNotes(true);
          } else {
            setContent((prev) => (prev ? `${prev} ${text}` : text));
          }
          triggerHaptic('selection');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechNotice('Microphone permission blocked in browser.');
        } else if (event.error === 'no-speech') {
          // silent
        } else {
          setSpeechNotice(`Speech dictation: ${event.error}`);
        }
        setIsListeningSpeech(false);
        setTimeout(() => setSpeechNotice(null), 3500);
      };

      recognition.onend = () => {
        setIsListeningSpeech(false);
        setSpeechNotice(null);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      setSpeechNotice('Speech dictation is unavailable.');
      setTimeout(() => setSpeechNotice(null), 3000);
    }
  };

  const handleSave = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    let finalTitle = title.trim();
    let finalContent = content.trim();

    const hasAnyVoice = voiceNotes.length > 0;
    const primaryVoiceUrl = voiceNotes[0]?.audioUrl || undefined;
    const primaryVoiceDur = voiceNotes[0]?.duration || undefined;
    const primaryImageUrl = attachedImages[0] || undefined;

    const targetNote = linkedExistingNote || editingNote;

    if (targetNote && onUpdateNote) {
      if (entryType === 'passwords') {
        finalTitle = capitalizeFirstChar(
          serviceName.trim() ||
            title.trim() ||
            emailUsername.trim() ||
            (personalInfoFields[0]?.label ? `${personalInfoFields[0].label} Record` : 'Safe Item')
        );
        const lines = [];
        if (emailUsername) lines.push(`Email/Username: ${emailUsername}`);
        if (passwordValue) lines.push(`Password: ${passwordValue}`);
        personalInfoFields.forEach((field) => {
          if (field.value) lines.push(`${field.label}: ${field.value}`);
        });
        if (secretNotes) lines.push(`Notes: ${secretNotes}`);
        finalContent = lines.join('\n');

        onUpdateNote({
          ...targetNote,
          title: finalTitle,
          content: finalContent,
          entryType: 'passwords',
          isSafe: true,
          isVault: true,
          service: serviceName,
          email: emailUsername,
          password: passwordValue,
          personalInfo: personalInfoFields.length > 0 ? personalInfoFields : undefined,
          documents: attachedDocs.length > 0 ? attachedDocs : undefined,
          hasVoiceNote: hasAnyVoice,
          voiceDuration: primaryVoiceDur,
          voiceAudioUrl: primaryVoiceUrl,
          voiceNotes: voiceNotes.length > 0 ? voiceNotes : undefined,
          imageUrl: primaryImageUrl,
          images: attachedImages.length > 0 ? attachedImages : undefined,
        });
      } else if (entryType === 'todo') {
        finalTitle = capitalizeFirstChar(title.trim() || 'Todo Checklist');
        const finalTodoItems = [...todoItems];
        if (newTodoInput.trim()) {
          finalTodoItems.push({
            id: Date.now().toString(),
            text: newTodoInput.trim(),
            completed: false,
          });
        }
        const itemsList = finalTodoItems
          .map((t) => `${t.completed ? '[x]' : '[ ]'} ${t.text}`)
          .join('\n');
        finalContent = itemsList;

        onUpdateNote({
          ...targetNote,
          title: finalTitle,
          content: finalContent,
          entryType: 'todo',
          isTodo: true,
          todoItems: finalTodoItems,
          documents: attachedDocs.length > 0 ? attachedDocs : undefined,
          hasVoiceNote: hasAnyVoice,
          voiceDuration: primaryVoiceDur,
          voiceAudioUrl: primaryVoiceUrl,
          voiceNotes: voiceNotes.length > 0 ? voiceNotes : undefined,
          imageUrl: primaryImageUrl,
          images: attachedImages.length > 0 ? attachedImages : undefined,
        });
      } else {
        finalTitle = capitalizeFirstChar(title.trim() || (entryType === 'diary' ? 'Diary Entry' : 'Untitled Note'));
        onUpdateNote({
          ...targetNote,
          title: finalTitle,
          content: finalContent,
          entryType,
          documents: attachedDocs.length > 0 ? attachedDocs : undefined,
          hasVoiceNote: hasAnyVoice,
          voiceDuration: primaryVoiceDur,
          voiceAudioUrl: primaryVoiceUrl,
          voiceNotes: voiceNotes.length > 0 ? voiceNotes : undefined,
          imageUrl: primaryImageUrl,
          images: attachedImages.length > 0 ? attachedImages : undefined,
        });
      }
    } else if (entryType === 'passwords') {
      finalTitle = capitalizeFirstChar(
        serviceName.trim() ||
          title.trim() ||
          emailUsername.trim() ||
          (personalInfoFields[0]?.label ? `${personalInfoFields[0].label} Record` : 'Safe Item')
      );
      const lines = [];
      if (emailUsername) lines.push(`Email/Username: ${emailUsername}`);
      if (passwordValue) lines.push(`Password: ${passwordValue}`);
      personalInfoFields.forEach((field) => {
        if (field.value) lines.push(`${field.label}: ${field.value}`);
      });
      if (secretNotes) lines.push(`Notes: ${secretNotes}`);
      finalContent = lines.join('\n');

      onSaveNote(finalTitle, finalContent, {
        entryType: 'passwords',
        isSafe: true,
        service: serviceName,
        email: emailUsername,
        password: passwordValue,
        personalInfo: personalInfoFields.length > 0 ? personalInfoFields : undefined,
        documents: attachedDocs.length > 0 ? attachedDocs : undefined,
        hasVoiceNote: hasAnyVoice,
        voiceDuration: primaryVoiceDur,
        voiceAudioUrl: primaryVoiceUrl,
        voiceNotes: voiceNotes.length > 0 ? voiceNotes : undefined,
        imageUrl: primaryImageUrl,
        images: attachedImages.length > 0 ? attachedImages : undefined,
      });
    } else if (entryType === 'todo') {
      finalTitle = capitalizeFirstChar(title.trim() || 'Todo Checklist');
      const finalTodoItems = [...todoItems];
      if (newTodoInput.trim()) {
        finalTodoItems.push({
          id: Date.now().toString(),
          text: newTodoInput.trim(),
          completed: false,
        });
      }
      const itemsList = finalTodoItems
        .map((t) => `${t.completed ? '[x]' : '[ ]'} ${t.text}`)
        .join('\n');
      finalContent = itemsList;

      onSaveNote(finalTitle, finalContent, {
        entryType: 'todo',
        isTodo: true,
        todoItems: finalTodoItems,
        documents: attachedDocs.length > 0 ? attachedDocs : undefined,
        hasVoiceNote: hasAnyVoice,
        voiceDuration: primaryVoiceDur,
        voiceAudioUrl: primaryVoiceUrl,
        voiceNotes: voiceNotes.length > 0 ? voiceNotes : undefined,
        imageUrl: primaryImageUrl,
        images: attachedImages.length > 0 ? attachedImages : undefined,
      });
    } else {
      finalTitle = capitalizeFirstChar(title.trim() || (entryType === 'diary' ? 'Diary Entry' : 'Untitled Note'));
      onSaveNote(finalTitle, finalContent, {
        entryType,
        documents: attachedDocs.length > 0 ? attachedDocs : undefined,
        hasVoiceNote: hasAnyVoice,
        voiceDuration: primaryVoiceDur,
        voiceAudioUrl: primaryVoiceUrl,
        voiceNotes: voiceNotes.length > 0 ? voiceNotes : undefined,
        imageUrl: primaryImageUrl,
        images: attachedImages.length > 0 ? attachedImages : undefined,
      });
    }

    onClose();
  };

  const isDesktop = useIsDesktop();
  const safeEntryType: EntryType = typeConfig[entryType] ? entryType : 'notes';
  const ActiveIcon = typeConfig[safeEntryType].icon;

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

          {/* Dialog/Drawer Sheet */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { type: 'spring', damping: 30, stiffness: 340 }
            }
            className={`relative w-full max-w-md md:max-w-xl mx-auto rounded-t-[28px] md:rounded-[28px] pt-2.5 md:pt-5 pb-5 px-5 md:px-7 shadow-2xl flex flex-col max-h-[92vh] md:max-h-[85vh] md:min-h-[460px] overflow-hidden transition-colors ${
              isDark ? 'bg-[#121212] text-white' : 'bg-[#ffffff] text-neutral-900'
            }`}
          >
            {/* Top subtle drag pill (mobile only) */}
            <div className="flex justify-center pb-2 md:hidden">
              <div
                className={`w-9 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Header: Left interactive Dropdown Menu (Icon + Text) and Right Save button */}
            <div className="flex items-center justify-between py-1.5 relative z-30">
              {/* Left: Interactive Dropdown Menu combining Icon + Text */}
              <div className="relative" ref={dropdownRef}>
                <button
                  id="entry-type-dropdown-btn"
                  type="button"
                  onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                  className={`h-9 pl-1.5 pr-3 rounded-full flex items-center gap-2 active:scale-95 transition-all select-none ${
                    isDark
                      ? 'bg-[#1c1c1f] hover:bg-[#252529] text-white border border-neutral-800/80'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border border-neutral-200/80'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      typeConfig[safeEntryType].getBgClass(isDark)
                    }`}
                  >
                    <ActiveIcon className="w-3.5 h-3.5 stroke-[2]" />
                  </div>
                  <span className="text-sm font-semibold tracking-tight">
                    {typeConfig[safeEntryType].label}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                      isTypeDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Backdrop to close format dropdown when tapping outside */}
                {isTypeDropdownOpen && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsTypeDropdownOpen(false)}
                  />
                )}

                {/* Dropdown Menu popover: Sleek, compact, minimal format selector opening on the left */}
                <AnimatePresence>
                  {isTypeDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className={`absolute left-0 top-11 w-44 rounded-2xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 border backdrop-blur-xl ${
                        isDark
                          ? 'bg-[#1a1a1a]/95 border-neutral-800 text-white shadow-black/80'
                          : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-200/80'
                      }`}
                    >
                      <div
                        className={`text-[9.5px] font-semibold tracking-wider uppercase px-2.5 py-1 ${
                          isDark ? 'text-neutral-500' : 'text-neutral-400'
                        }`}
                      >
                        Format
                      </div>

                      {(Object.keys(typeConfig) as EntryType[]).map((typeKey) => {
                        const item = typeConfig[typeKey];
                        const ItemIcon = item.icon;
                        const isSelected = entryType === typeKey;
                        return (
                          <button
                            key={typeKey}
                            id={`select-type-${typeKey}`}
                            type="button"
                            onClick={() => {
                              setEntryType(typeKey);
                              setIsTypeDropdownOpen(false);
                              triggerHaptic('selection');
                            }}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#262626] text-white font-medium'
                                  : 'bg-neutral-100 text-neutral-900 font-semibold'
                                : isDark
                                ? 'hover:bg-[#222222] text-neutral-300'
                                : 'hover:bg-neutral-50 text-neutral-700'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                item.getBgClass(isDark)
                              }`}
                            >
                              <ItemIcon className="w-3.5 h-3.5 stroke-[2]" />
                            </div>
                            <span className="flex-1 text-xs truncate">{item.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-neutral-400 stroke-[2.5]" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right controls: Save button & Close button */}
              <div className="flex items-center gap-1.5 sm:gap-2 relative">
                {/* Save Button: High-contrast modern pill */}
                <button
                  id="drawer-save-btn"
                  type="button"
                  onClick={handleSave}
                  className={`h-8 px-4 rounded-full flex items-center gap-1.5 font-medium text-xs active:scale-95 transition-all shadow-sm ${
                    isDark
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.4]" />
                  <span>{editingNote ? 'Update' : 'Save'}</span>
                </button>

                {/* Close Button: Explicit X button for desktop & mobile */}
                <button
                  id="drawer-close-btn"
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  title="Close (Esc)"
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                    isDark
                      ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5'
                  }`}
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              </div>
            </div>

            {/* DYNAMIC BODY: Fluid and borderless (NO split lines anywhere) */}
            <div
              className={`flex-1 ${
                isSuggestionsActive ? 'overflow-visible relative z-30' : 'overflow-y-auto'
              } no-scrollbar pt-1.5 ${
                entryType === 'todo' ? 'pb-24' : 'pb-2'
              } max-h-[55vh] md:max-h-[62vh]`}
            >
              <AnimatePresence mode="wait">
                {/* 1. DIARY FORMAT (Clean, elegant notepad) */}
                {entryType === 'diary' && (
                  <motion.div
                    key="body-diary"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2.5"
                  >
                    <div className="text-xs font-medium text-neutral-500">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>

                    <input
                      ref={titleInputRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Title..."
                      className={`w-full bg-transparent text-xl font-bold tracking-tight placeholder:text-neutral-600 focus:outline-none ${
                        isDark ? 'text-white' : 'text-neutral-900'
                      }`}
                    />

                    <textarea
                      ref={contentTextareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={handleContentKeyDown}
                      placeholder="Write your thoughts..."
                      rows={attachedImages.length > 0 ? 2 : 4}
                      className={`w-full bg-transparent text-sm placeholder:text-neutral-600 focus:outline-none resize-none leading-relaxed ${
                        isDark ? 'text-neutral-200' : 'text-neutral-700'
                      }`}
                    />
                  </motion.div>
                )}

                {/* 2. PASSWORDS / KEYS FORMAT (Asks for title, email, password) */}
                {entryType === 'passwords' && (
                  <motion.div
                    key="body-passwords"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    {/* Card 1: TITLE */}
                    <div
                      className={`p-3.5 rounded-2xl transition-colors ${
                        isDark ? 'bg-[#18181a]' : 'bg-neutral-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          TITLE
                        </label>
                        <PenLine
                          className={`w-3.5 h-3.5 ${
                            isDark ? 'text-neutral-500' : 'text-neutral-400'
                          }`}
                        />
                      </div>
                      <input
                        ref={titleInputRef}
                        type="text"
                        name="memento_vault_title"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        placeholder="e.g. Google, GitHub, Netflix"
                        className={`w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500 ${
                          isDark ? 'text-white' : 'text-neutral-900'
                        }`}
                      />
                    </div>

                    {/* Card 2: EMAIL OR USERNAME */}
                    <div
                      className={`p-3.5 rounded-2xl transition-colors ${
                        isDark ? 'bg-[#18181a]' : 'bg-neutral-100/80'
                      }`}
                    >
                      <label
                        className={`block text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${
                          isDark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        EMAIL OR USERNAME
                      </label>
                      <input
                        type="text"
                        name="memento_vault_username"
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={emailUsername}
                        onChange={(e) => setEmailUsername(e.target.value)}
                        placeholder="user@example.com or username"
                        className={`w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500 ${
                          isDark ? 'text-white' : 'text-neutral-900'
                        }`}
                      />
                    </div>

                    {/* Card 3: PASSWORD / KEY */}
                    <div
                      className={`p-3.5 rounded-2xl transition-colors ${
                        isDark ? 'bg-[#18181a]' : 'bg-neutral-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          PASSWORD / KEY
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const chars =
                              'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*';
                            let pass = '';
                            for (let i = 0; i < 14; i++) {
                              pass += chars.charAt(Math.floor(Math.random() * chars.length));
                            }
                            setPasswordValue(pass);
                            setShowPassword(true);
                            triggerHaptic('light');
                          }}
                          className={`text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                            isDark
                              ? 'text-neutral-300 hover:text-white'
                              : 'text-neutral-700 hover:text-neutral-900'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Generate</span>
                        </button>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="memento_vault_password"
                          autoComplete="new-password"
                          autoCorrect="off"
                          spellCheck={false}
                          value={passwordValue}
                          onChange={(e) => setPasswordValue(e.target.value)}
                          placeholder="Secret key or password"
                          className={`w-full pr-8 bg-transparent text-sm font-mono focus:outline-none placeholder:text-neutral-500 ${
                            isDark ? 'text-white' : 'text-neutral-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowPassword((prev) => !prev);
                            triggerHaptic('light');
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            isDark
                              ? 'text-neutral-400 hover:text-white'
                              : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                      {/* Custom Personal Identifier Fields if any */}
                      {personalInfoFields.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {personalInfoFields.map((field) => (
                            <div
                              key={field.id}
                              className={`p-2.5 sm:p-3 rounded-2xl border transition-colors ${
                                isDark
                                  ? 'bg-[#18181a] border-neutral-800'
                                  : 'bg-white border-neutral-200 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) =>
                                    handleUpdatePersonalInfoField(field.id, {
                                      label: e.target.value,
                                    })
                                  }
                                  placeholder="Field Name"
                                  className={`text-[10.5px] font-semibold uppercase tracking-wider bg-transparent focus:outline-none ${
                                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                                  }`}
                                />
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerHaptic('light');
                                      handleUpdatePersonalInfoField(field.id, {
                                        isMasked: !field.isMasked,
                                      });
                                    }}
                                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                                      field.isMasked
                                        ? isDark
                                          ? 'bg-neutral-800 text-emerald-400'
                                          : 'bg-neutral-100 text-emerald-600'
                                        : isDark
                                        ? 'text-neutral-400 hover:text-white'
                                        : 'text-neutral-500 hover:text-neutral-900'
                                    }`}
                                    title={field.isMasked ? 'Masked' : 'Visible'}
                                  >
                                    {field.isMasked ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePersonalInfoField(field.id)}
                                    className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-red-400 transition-colors"
                                    title="Delete field"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <input
                                type={field.isMasked ? 'password' : 'text'}
                                value={field.value}
                                onChange={(e) =>
                                  handleUpdatePersonalInfoField(field.id, { value: e.target.value })
                                }
                                placeholder="Value"
                                className={`w-full bg-transparent text-sm font-mono focus:outline-none placeholder:text-neutral-500 ${
                                  isDark ? 'text-white' : 'text-neutral-900'
                                }`}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                  </motion.div>
                )}

                {/* 3. TODO FORMAT (Interactive checklist) */}
                {entryType === 'todo' && (
                  <motion.div
                    key="body-todo"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    <div className={`relative ${isSuggestionsActive ? 'z-40' : ''}`}>
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          setShowTitleSuggestions(true);
                        }}
                        onFocus={() => setShowTitleSuggestions(true)}
                        onBlur={() => {
                          setTimeout(() => setShowTitleSuggestions(false), 220);
                        }}
                        placeholder="Todo List Title..."
                        className={`w-full bg-transparent text-xl font-bold tracking-tight placeholder:text-neutral-600 focus:outline-none ${
                          isDark ? 'text-white' : 'text-neutral-900'
                        }`}
                      />

                      {/* Linked existing list indicator badge */}
                      {linkedExistingNote && (
                        <div className="flex items-center gap-1.5 pt-1.5 text-[11px] text-neutral-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span className="truncate">
                            Adding to list: <strong className={isDark ? 'text-white font-medium' : 'text-neutral-900 font-semibold'}>{linkedExistingNote.title}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={handleUnlinkExistingNote}
                            className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${
                              isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-neutral-200 text-neutral-600 hover:text-neutral-900'
                            }`}
                          >
                            New list
                          </button>
                        </div>
                      )}

                      {/* Suggestions popover for existing lists */}
                      <AnimatePresence>
                        {!linkedExistingNote && showTitleSuggestions && matchingExistingNotes.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 2, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute left-0 right-0 top-full mt-1.5 rounded-2xl p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.6)] border backdrop-blur-xl z-50 ${
                              isDark
                                ? 'bg-[#181818] border-neutral-800 text-neutral-200 shadow-black/70'
                                : 'bg-white border-neutral-200 text-neutral-800 shadow-neutral-300/80'
                            }`}
                          >
                            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                              <span>{title.trim() ? 'Matching existing lists' : 'Existing lists'}</span>
                              <span className="text-[9px] text-neutral-500 lowercase font-normal">Tap to add tasks to it</span>
                            </div>
                            <div className="space-y-0.5 mt-0.5 max-h-40 overflow-y-auto no-scrollbar">
                              {matchingExistingNotes.map((note) => {
                                const count = note.todoItems?.length ?? parseTodoItemsFromNote(note).length;
                                return (
                                  <button
                                    key={`exist-todo-${note.id}`}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleSelectExistingNote(note);
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                                      isDark
                                        ? 'hover:bg-[#252525] text-neutral-200 hover:text-white'
                                        : 'hover:bg-neutral-100 text-neutral-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                        isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                                      }`}>
                                        <ListTodo className="w-3 h-3" />
                                      </div>
                                      <span className="truncate font-medium">{note.title}</span>
                                    </div>
                                    <span className="text-[10px] text-neutral-400 shrink-0 ml-2">
                                      {count > 0 ? `${count} ${count === 1 ? 'task' : 'tasks'}` : 'Empty list'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Todo List Items (No split lines) */}
                    <div className="space-y-1.5 pt-1">
                      {todoItems.length === 0 ? (
                        <p className="text-xs py-4 text-center text-neutral-500">
                          No items yet. Type below to add tasks.
                        </p>
                      ) : (
                        <AnimatePresence initial={false}>
                          {todoItems.map((item) => (
                            <motion.div
                              key={`modal-todo-${item.id}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                              transition={{ duration: 0.18 }}
                              className={`flex items-center justify-between p-2.5 rounded-2xl transition-all ${
                                isDark
                                  ? 'bg-[#181818] hover:bg-[#202020]'
                                  : 'bg-neutral-100/70 hover:bg-neutral-100'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleTodoItem(item.id)}
                                className="flex items-center gap-3 flex-1 text-left select-none"
                              >
                                <div
                                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
                                    item.completed
                                      ? isDark
                                        ? 'bg-white text-black'
                                        : 'bg-neutral-900 text-white'
                                      : isDark
                                      ? 'bg-[#282828]'
                                      : 'bg-neutral-300'
                                  }`}
                                >
                                  {item.completed && (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  )}
                                </div>
                                <span
                                  className={`text-xs ${
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
                                onClick={() => handleDeleteTodoItem(item.id)}
                                className="p-1 rounded-lg text-neutral-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* 4. QUICK NOTE FORMAT */}
                {entryType === 'notes' && (
                  <motion.div
                    key="body-notes"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    <div className={`relative ${isSuggestionsActive ? 'z-40' : ''}`}>
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={title}
                        onChange={(e) => {
                          setTitle(e.target.value);
                          setShowTitleSuggestions(true);
                        }}
                        onFocus={() => setShowTitleSuggestions(true)}
                        onBlur={() => {
                          setTimeout(() => setShowTitleSuggestions(false), 220);
                        }}
                        placeholder="Title..."
                        className={`w-full bg-transparent text-xl font-bold tracking-tight placeholder:text-neutral-600 focus:outline-none ${
                          isDark ? 'text-white' : 'text-neutral-900'
                        }`}
                      />

                      {/* Linked existing note badge */}
                      {linkedExistingNote && (
                        <div className="flex items-center gap-1.5 pt-1.5 text-[11px] text-neutral-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse shrink-0" />
                          <span className="truncate">
                            Editing note: <strong className={isDark ? 'text-white font-medium' : 'text-neutral-900 font-semibold'}>{linkedExistingNote.title}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={handleUnlinkExistingNote}
                            className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-md transition-colors ${
                              isDark ? 'bg-neutral-800 text-neutral-400 hover:text-white' : 'bg-neutral-200 text-neutral-600 hover:text-neutral-900'
                            }`}
                          >
                            New note
                          </button>
                        </div>
                      )}

                      {/* Suggestions popover for existing notes */}
                      <AnimatePresence>
                        {!linkedExistingNote && showTitleSuggestions && matchingExistingNotes.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 2, scale: 0.98 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute left-0 right-0 top-full mt-1.5 rounded-2xl p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.6)] border backdrop-blur-xl z-50 ${
                              isDark
                                ? 'bg-[#181818] border-neutral-800 text-neutral-200 shadow-black/70'
                                : 'bg-white border-neutral-200 text-neutral-800 shadow-neutral-300/80'
                            }`}
                          >
                            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                              <span>{title.trim() ? 'Matching existing notes' : 'Existing notes'}</span>
                              <span className="text-[9px] text-neutral-500 lowercase font-normal">Tap to edit</span>
                            </div>
                            <div className="space-y-0.5 mt-0.5 max-h-40 overflow-y-auto no-scrollbar">
                              {matchingExistingNotes.map((note) => (
                                <button
                                  key={`exist-note-${note.id}`}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectExistingNote(note);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                                    isDark
                                      ? 'hover:bg-[#252525] text-neutral-200 hover:text-white'
                                      : 'hover:bg-neutral-100 text-neutral-800'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                      isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-50 text-sky-600'
                                    }`}>
                                      <FileText className="w-3 h-3" />
                                    </div>
                                    <span className="truncate font-medium">{note.title}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <textarea
                      ref={contentTextareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={handleContentKeyDown}
                      placeholder="Write your thoughts..."
                      rows={attachedImages.length > 0 ? 2 : 4}
                      className={`w-full bg-transparent text-sm placeholder:text-neutral-600 focus:outline-none resize-none leading-relaxed ${
                        isDark ? 'text-neutral-200' : 'text-neutral-700'
                      }`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ATTACHMENT PREVIEWS (Images, Documents, Voice Notes) */}
              {(attachedImages.length > 0 ||
                attachedDocs.length > 0 ||
                voiceNotes.length > 0 ||
                isRecordingAudio) && (
                <div className="space-y-3.5 pt-3 pb-1">
                  {/* 1. Attached Photos Gallery Preview */}
                  {attachedImages.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10.5px] font-semibold uppercase tracking-wider ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          Attached Photos ({attachedImages.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className={`text-[11px] font-medium flex items-center gap-1 hover:underline ${
                            isDark ? 'text-sky-400' : 'text-sky-600'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add more</span>
                        </button>
                      </div>

                      <div
                        className={`grid gap-2 ${
                          attachedImages.length === 1
                            ? 'grid-cols-1'
                            : attachedImages.length === 2
                            ? 'grid-cols-2'
                            : 'grid-cols-2 sm:grid-cols-3'
                        }`}
                      >
                        {attachedImages.map((imgSrc, idx) => (
                          <div
                            key={`attached-img-${idx}`}
                            onClick={() => setLightboxImg(imgSrc)}
                            className={`relative rounded-2xl overflow-hidden border shadow-xs group aspect-video flex items-center justify-center cursor-pointer ${
                              isDark
                                ? 'bg-[#141414] border-neutral-800/80'
                                : 'bg-neutral-50/50 border-neutral-200/40'
                            }`}
                          >
                            <img
                              src={imgSrc}
                              alt={`Attached note visual ${idx + 1}`}
                              className="w-full h-full object-cover rounded-2xl transition-transform duration-300 group-hover:scale-105"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(idx);
                              }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/75 hover:bg-red-600 text-white backdrop-blur-md flex items-center justify-center shadow-lg transition-all active:scale-90 z-10"
                              title="Delete photo"
                              aria-label={`Delete photo ${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white/90">
                              #{idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Attached Documents Preview */}
                  {attachedDocs.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10.5px] font-semibold uppercase tracking-wider ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          Attached Documents ({attachedDocs.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => docInputRef.current?.click()}
                          className={`text-[11px] font-medium flex items-center gap-1 hover:underline ${
                            isDark ? 'text-indigo-400' : 'text-indigo-600'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add more</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {attachedDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                              isDark
                                ? 'bg-[#181818] border-neutral-800 text-white'
                                : 'bg-white border-neutral-200 text-neutral-900 shadow-xs'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isDark
                                    ? 'bg-indigo-950/40 text-indigo-400'
                                    : 'bg-indigo-50 text-indigo-600'
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate leading-tight">
                                  {doc.name}
                                </p>
                                <p className="text-[10px] text-neutral-400 font-mono">
                                  {doc.size || 'Document'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {doc.dataUrl && (
                                <a
                                  href={doc.dataUrl}
                                  download={doc.name}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isDark
                                      ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
                                  }`}
                                  title="Download document"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(doc.id)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800/40 transition-colors"
                                title="Remove document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Recording in progress indicator */}
                  {isRecordingAudio && (
                    <div
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                        isDark
                          ? 'bg-red-950/20 border-red-500/30 text-white'
                          : 'bg-red-50 border-red-200 text-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-red-400">
                            Recording Voice Note...
                          </span>
                          <span className="text-[11px] font-mono opacity-80">
                            {Math.floor(recordingDuration / 60)}:
                            {(recordingDuration % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={cancelVoiceRecording}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                            isDark
                              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                              : 'bg-neutral-200 text-neutral-700'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={stopVoiceRecording}
                          className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                        >
                          <Square className="w-3 h-3 fill-current" />
                          <span>Done</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. Playable Voice Notes List */}
                  {voiceNotes.length > 0 && !isRecordingAudio && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10.5px] font-semibold uppercase tracking-wider ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          Voice Notes ({voiceNotes.length})
                        </span>
                        <button
                          type="button"
                          onClick={startVoiceRecording}
                          className={`text-[11px] font-medium flex items-center gap-1 hover:underline ${
                            isDark ? 'text-emerald-400' : 'text-emerald-600'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Record another</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {voiceNotes.map((vn, index) => {
                          const isThisPlaying = activePlayingId === vn.id;
                          return (
                            <div
                              key={vn.id ? `modal-vn-${vn.id}-${index}` : `modal-vn-${index}`}
                              className={`p-3 rounded-2xl border flex items-center gap-3 transition-colors ${
                                isDark
                                  ? 'bg-[#181818] border-neutral-800 text-white'
                                  : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
                              }`}
                            >
                              {/* Play/Pause Button */}
                              <button
                                type="button"
                                onClick={() => togglePlayVoiceNote(vn)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-sm ${
                                  isThisPlaying
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-md'
                                    : isDark
                                    ? 'bg-[#262626] hover:bg-[#303030] text-emerald-400'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                                }`}
                                title={isThisPlaying ? 'Pause voice note' : 'Play voice note'}
                                aria-label={isThisPlaying ? 'Pause voice note' : 'Play voice note'}
                              >
                                {isThisPlaying ? (
                                  <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                )}
                              </button>

                              {/* Voice Memo Info & Animated Waveform */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-semibold tracking-tight truncate flex items-center gap-1.5">
                                    <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span className="truncate">{vn.name || `Voice Note ${index + 1}`}</span>
                                  </span>
                                  <span className="text-[11px] font-mono text-neutral-400 shrink-0 ml-2">
                                    {isThisPlaying
                                      ? `${Math.floor(playbackTime / 60)}:${(playbackTime % 60)
                                          .toString()
                                          .padStart(2, '0')} / ${vn.duration || '0:15'}`
                                      : vn.duration || '0:15'}
                                  </span>
                                </div>

                                {/* Dynamic waveform bars */}
                                <div className="flex items-center gap-1 h-3.5">
                                  {[30, 65, 90, 50, 25, 75, 85, 45, 60, 35, 80, 55, 30, 70, 95, 60, 40, 75].map(
                                    (heightPercent, barIdx) => (
                                      <div
                                        key={`modal-vn-bar-${index}-${barIdx}`}
                                        className={`flex-1 rounded-full transition-all duration-150 ${
                                          isThisPlaying
                                            ? 'bg-emerald-400'
                                            : isDark
                                            ? 'bg-neutral-700'
                                            : 'bg-neutral-300'
                                        }`}
                                        style={{
                                          height: isThisPlaying
                                            ? `${Math.max(
                                                20,
                                                Math.min(
                                                  100,
                                                  heightPercent *
                                                    (0.35 +
                                                      Math.abs(
                                                        Math.sin(barIdx * 0.8 + playbackTime * 4)
                                                      ) *
                                                        0.7)
                                                )
                                              )}%`
                                            : `${Math.max(25, heightPercent * 0.45)}%`,
                                        }}
                                      />
                                    )
                                  )}
                                </div>
                              </div>

                              {/* Delete Voice Note Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteVoiceNote(vn.id)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800/40 transition-colors shrink-0"
                                title="Delete voice note"
                                aria-label="Delete voice note"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hidden file input for uploading images */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageFilesChange}
              className="hidden"
            />

            {/* Hidden file input for uploading documents */}
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,application/pdf"
              multiple
              onChange={handleDocFilesChange}
              className="hidden"
            />

            {/* FLOATING ACTION / SUB-MENU NAV BAR */}
            <div className={`pt-3 pb-1 flex flex-col items-center justify-center relative ${
              isPlusMenuOpen ? 'z-40' : 'z-10'
            }`}>
              {/* Speech-to-text dictation status notification pill */}
              <AnimatePresence>
                {isListeningSpeech && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className={`mb-2 px-3.5 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium shadow-lg border ${
                      isDark
                        ? 'bg-[#1e1e1e] border-emerald-500/50 text-emerald-400 shadow-emerald-950/40'
                        : 'bg-white border-emerald-300 text-emerald-700 shadow-emerald-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Listening... Speak to dictate</span>
                  </motion.div>
                )}
                {speechNotice && !isListeningSpeech && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className={`mb-2 px-3 py-1 rounded-full text-[11px] shadow-sm ${
                      isDark
                        ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                        : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                    }`}
                  >
                    {speechNotice}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* '+' Popup Menu for options like photo, timestamp, checklist, voice note */}
              <AnimatePresence>
                {isPlusMenuOpen && entryType !== 'todo' && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsPlusMenuOpen(false)}
                    />
                    <motion.div
                      ref={plusMenuRef}
                      initial={{ opacity: 0, y: 10, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.94 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className={`absolute bottom-16 w-52 rounded-2xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 border backdrop-blur-2xl ${
                        isDark
                          ? 'bg-[#181818]/95 border-neutral-800 text-white shadow-black/60'
                          : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-200/80'
                      }`}
                    >
                      <div
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 ${
                          isDark ? 'text-neutral-500' : 'text-neutral-400'
                        }`}
                      >
                        Insert & Media
                      </div>

                    {/* Attach Photo option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        triggerHaptic('selection');
                        fileInputRef.current?.click();
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors ${
                        isDark
                          ? 'hover:bg-[#242424] text-neutral-200 hover:text-white'
                          : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          isDark ? 'bg-neutral-800 text-sky-400' : 'bg-sky-50 text-sky-600'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium">Attach Photo</span>
                    </button>

                    {/* Attach Document option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        triggerHaptic('selection');
                        docInputRef.current?.click();
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors ${
                        isDark
                          ? 'hover:bg-[#242424] text-neutral-200 hover:text-white'
                          : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          isDark ? 'bg-neutral-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium">Attach Document</span>
                    </button>

                    {/* Insert Timestamp option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        handleInsertTimestamp();
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors ${
                        isDark
                          ? 'hover:bg-[#242424] text-neutral-200 hover:text-white'
                          : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          isDark ? 'bg-neutral-800 text-amber-400' : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium">Insert Timestamp</span>
                    </button>

                    {/* Checklist / Task option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        handleInsertChecklist();
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors ${
                        isDark
                          ? 'hover:bg-[#242424] text-neutral-200 hover:text-white'
                          : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          isDark ? 'bg-neutral-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        <ListTodo className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium">
                        {entryType === 'todo' ? 'Add Checklist Item' : 'Insert Checkbox'}
                      </span>
                    </button>

                    {/* Voice note option (Records audio voice note) */}
                    <button
                      type="button"
                      onClick={() => {
                        startVoiceRecording();
                      }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors ${
                        isDark
                          ? 'hover:bg-[#242424] text-neutral-200 hover:text-white'
                          : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                          isDark ? 'bg-neutral-800 text-red-400' : 'bg-red-50 text-red-600'
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium">Record Voice Note</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Floating Action Bar Pill */}
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] border transition-all ${
                entryType === 'todo'
                  ? 'w-full max-w-sm sm:max-w-md mx-auto'
                  : 'w-auto'
              } ${
                isDark
                  ? 'bg-[#181818]/95 border-neutral-800 text-white shadow-black/40'
                  : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-200/80'
              }`}
            >
              {/* '+' button: adds task in Todo mode, or toggles options menu in other modes */}
              <button
                ref={plusBtnRef}
                id="drawer-plus-btn"
                type="button"
                onClick={() => {
                  if (entryType === 'todo') {
                    if (newTodoInput.trim()) {
                      handleAddTodoItem();
                    } else {
                      triggerHaptic('selection');
                      todoFloatingInputRef.current?.focus();
                    }
                  } else {
                    triggerHaptic('selection');
                    setIsPlusMenuOpen((prev) => !prev);
                  }
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all ${
                  entryType === 'todo'
                    ? newTodoInput.trim()
                      ? isDark
                        ? 'bg-white text-black shadow-xs hover:bg-neutral-200'
                        : 'bg-neutral-900 text-white shadow-xs hover:bg-neutral-800'
                      : isDark
                      ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                    : isPlusMenuOpen
                    ? isDark
                      ? 'bg-white text-black rotate-45'
                      : 'bg-neutral-900 text-white rotate-45'
                    : isDark
                    ? 'bg-[#262626] hover:bg-[#303030] text-neutral-200 hover:text-white'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                }`}
                aria-label={entryType === 'todo' ? "Add task" : "Add options menu"}
                title={entryType === 'todo' ? "Add task" : "Insert & Media menu"}
              >
                <Plus className="w-4 h-4 transition-transform duration-200" />
              </button>

                {/* Animated task input text box between '+' and 'mic' for Todo drawer */}
                {entryType === 'todo' ? (
                  <motion.div
                    key="todo-task-floating-input"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex-1 min-w-0 flex items-center"
                  >
                    <input
                      ref={todoFloatingInputRef}
                      type="text"
                      value={newTodoInput}
                      onChange={(e) => setNewTodoInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTodoItem();
                        }
                      }}
                      placeholder="Add task & enter..."
                      className={`w-full bg-transparent text-sm font-medium px-2 py-1 outline-none placeholder:text-neutral-500 ${
                        isDark ? 'text-white' : 'text-neutral-900'
                      }`}
                    />
                  </motion.div>
                ) : (
                  /* Subtle vertical divider for other types */
                  <div
                    className={`w-[1px] h-4 rounded-full ${
                      isDark ? 'bg-neutral-800' : 'bg-neutral-200'
                    }`}
                  />
                )}

                {/* Mic button: Speech-to-Text Dictation */}
                <button
                  id="drawer-mic-btn"
                  type="button"
                  onClick={handleToggleSpeechToText}
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-all ${
                    isListeningSpeech
                      ? 'bg-emerald-500 text-white animate-pulse shadow-md shadow-emerald-500/40 ring-2 ring-emerald-400/40'
                      : isDark
                      ? 'bg-[#262626] hover:bg-[#303030] text-neutral-200 hover:text-white'
                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                  }`}
                  aria-label="Speech to text"
                  title={
                    isListeningSpeech
                      ? 'Stop dictation'
                      : 'Speech to text (dictate)'
                  }
                >
                  {isListeningSpeech ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lightbox Modal for fullscreen image preview */}
      <ImageLightbox
        isOpen={!!lightboxImg}
        src={lightboxImg}
        onClose={() => setLightboxImg(null)}
      />
    </AnimatePresence>
  );
}
