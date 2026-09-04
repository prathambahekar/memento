import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  ChevronDown,
  BookOpen,
  KeyRound,
  ListTodo,
  FileText,
  Eye,
  EyeOff,
  Plus,
  Mic,
  MicOff,
  Image as ImageIcon,
  Radio,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { ThemeMode, EntryType, TodoSubItem, NoteItem } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { parseTodoItemsFromNote } from './TodoDrawer';

interface NewNoteModalProps {
  isOpen: boolean;
  theme: ThemeMode;
  initialType?: EntryType;
  editingNote?: NoteItem | null;
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
      imageUrl?: string;
    }
  ) => void;
  onUpdateNote?: (updatedNote: NoteItem) => void;
}

export function NewNoteModal({
  isOpen,
  theme,
  initialType = 'diary',
  editingNote,
  onClose,
  onSaveNote,
  onUpdateNote,
}: NewNoteModalProps) {
  const isDark = theme === 'dark';

  // Entry type state (diary, passwords, todo, notes)
  const [entryType, setEntryType] = useState<EntryType>(initialType);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // General fields
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

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

  // Bottom text box & attachments
  const [bottomTextInput, setBottomTextInput] = useState('');
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasVoiceNote, setHasVoiceNote] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

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
            : 'diary');
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
          setTodoItems(editingNote.todoItems);
        } else if (editingNote.isTodo || determinedType === 'todo') {
          setTodoItems(parseTodoItemsFromNote(editingNote));
        } else {
          setTodoItems([]);
        }

        setHasVoiceNote(!!editingNote.hasVoiceNote);
        setAttachedImage(editingNote.imageUrl || null);
      } else {
        setEntryType(initialType);
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
        setAttachedImage(null);
      }

      setNewTodoInput('');
      setBottomTextInput('');
      setIsPlusMenuOpen(false);
      setIsTypeDropdownOpen(false);
      setIsRecording(false);

      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, editingNote, initialType]);

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
        !plusMenuRef.current.contains(e.target as Node)
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
    { label: string; icon: typeof BookOpen; placeholder: string; desc: string }
  > = {
    diary: {
      label: 'Diary',
      icon: BookOpen,
      placeholder: 'Diary reflections & notes',
      desc: 'Journaling & reflections',
    },
    passwords: {
      label: 'Pass/Keys',
      icon: KeyRound,
      placeholder: 'Store logins, secrets & keys',
      desc: 'Email, account & password',
    },
    todo: {
      label: 'Todo',
      icon: ListTodo,
      placeholder: 'Tasks & checklist items',
      desc: 'Interactive action list',
    },
    notes: {
      label: 'Quick Note',
      icon: FileText,
      placeholder: 'Standard scratchpad',
      desc: 'Simple note',
    },
  };

  const handleAddTodoItem = () => {
    if (newTodoInput.trim()) {
      setTodoItems((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: newTodoInput.trim(),
          completed: false,
        },
      ]);
      setNewTodoInput('');
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

  const handleBottomSubmit = () => {
    if (!bottomTextInput.trim()) return;

    if (entryType === 'todo') {
      setTodoItems((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: bottomTextInput.trim(),
          completed: false,
        },
      ]);
    } else if (entryType === 'passwords') {
      setSecretNotes((prev) =>
        prev ? `${prev}\n• ${bottomTextInput.trim()}` : `• ${bottomTextInput.trim()}`
      );
      setShowSecretNotes(true);
    } else {
      setContent((prev) =>
        prev ? `${prev}\n\n${bottomTextInput.trim()}` : bottomTextInput.trim()
      );
    }
    setBottomTextInput('');
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setHasVoiceNote(true);
      const speechSnippet =
        'Voice note recorded at ' +
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (entryType === 'todo') {
        setTodoItems((prev) => [
          ...prev,
          { id: Date.now().toString(), text: 'Voice task recorded', completed: false },
        ]);
      } else {
        setContent((prev) =>
          prev
            ? `${prev}\n\n🎙️ [Voice Memo]: ${speechSnippet}`
            : `🎙️ [Voice Memo]: ${speechSnippet}`
        );
      }
    } else {
      setIsRecording(true);
    }
  };

  const handleSave = () => {
    let finalTitle = title.trim();
    let finalContent = content.trim();

    if (editingNote && onUpdateNote) {
      if (entryType === 'passwords') {
        finalTitle = serviceName.trim() || emailUsername.trim() || 'Account Key';
        const lines = [];
        if (emailUsername) lines.push(`Email/Username: ${emailUsername}`);
        if (passwordValue) lines.push(`Password: ${passwordValue}`);
        if (secretNotes) lines.push(`Notes: ${secretNotes}`);
        finalContent = lines.join('\n');

        onUpdateNote({
          ...editingNote,
          title: finalTitle,
          content: finalContent,
          entryType: 'passwords',
          isSafe: true,
          isVault: true,
          service: serviceName,
          email: emailUsername,
          password: passwordValue,
          hasVoiceNote,
          imageUrl: attachedImage || undefined,
        });
      } else if (entryType === 'todo') {
        finalTitle = title.trim() || 'Todo Checklist';
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
          ...editingNote,
          title: finalTitle,
          content: finalContent,
          entryType: 'todo',
          isTodo: true,
          todoItems: finalTodoItems,
          hasVoiceNote,
          imageUrl: attachedImage || undefined,
        });
      } else {
        finalTitle = title.trim() || (entryType === 'diary' ? 'Diary Entry' : 'Untitled Note');
        onUpdateNote({
          ...editingNote,
          title: finalTitle,
          content: finalContent,
          entryType,
          hasVoiceNote,
          imageUrl: attachedImage || undefined,
        });
      }
    } else if (entryType === 'passwords') {
      finalTitle = serviceName.trim() || emailUsername.trim() || 'Account Key';
      const lines = [];
      if (emailUsername) lines.push(`Email/Username: ${emailUsername}`);
      if (passwordValue) lines.push(`Password: ${passwordValue}`);
      if (secretNotes) lines.push(`Notes: ${secretNotes}`);
      finalContent = lines.join('\n');

      onSaveNote(finalTitle, finalContent, {
        entryType: 'passwords',
        isSafe: true,
        service: serviceName,
        email: emailUsername,
        password: passwordValue,
        hasVoiceNote,
        imageUrl: attachedImage || undefined,
      });
    } else if (entryType === 'todo') {
      finalTitle = title.trim() || 'Todo Checklist';
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
        hasVoiceNote,
        imageUrl: attachedImage || undefined,
      });
    } else {
      finalTitle = title.trim() || (entryType === 'diary' ? 'Diary Entry' : 'Untitled Note');
      onSaveNote(finalTitle, finalContent, {
        entryType,
        hasVoiceNote,
        imageUrl: attachedImage || undefined,
      });
    }

    onClose();
  };

  const isDesktop = useIsDesktop();
  const ActiveIcon = typeConfig[entryType].icon;

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
            className={`relative w-full max-w-md md:max-w-xl mx-auto rounded-t-[28px] md:rounded-[28px] pt-2.5 md:pt-5 pb-5 px-5 md:px-7 shadow-2xl flex flex-col max-h-[92vh] md:max-h-[85vh] overflow-hidden transition-colors ${
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

            {/* Header: Clean, borderless, NO split lines */}
            <div className="flex items-center justify-between py-1.5 relative z-30">
              {/* Left: Mode Title badge */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    isDark ? 'bg-[#1e1e1e] text-neutral-300' : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <ActiveIcon className="w-3.5 h-3.5 stroke-[2]" />
                </div>
                <span className="text-sm font-semibold tracking-tight">
                  {typeConfig[entryType].label}
                </span>
              </div>

              {/* Right controls: Dropdown Menu directly to the LEFT of Save button (NO close button) */}
              <div className="flex items-center gap-2 relative">
                {/* Dropdown Menu button to choose info type */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    id="entry-type-dropdown-btn"
                    type="button"
                    onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                    className={`h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-medium active:scale-95 transition-all ${
                      isDark
                        ? 'bg-[#1e1e1e] hover:bg-[#282828] text-neutral-200'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                    }`}
                  >
                    <span>{typeConfig[entryType].label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                        isTypeDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu popover: Sleek, pure neutral dark, borderless shadow */}
                  <AnimatePresence>
                    {isTypeDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute right-0 top-10 w-52 rounded-2xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.6)] z-50 ${
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
                          Select Format
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
                              }}
                              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                                isSelected
                                  ? isDark
                                    ? 'bg-[#282828] text-white font-medium'
                                    : 'bg-neutral-100 text-neutral-900 font-semibold'
                                  : isDark
                                  ? 'hover:bg-[#242424] text-neutral-300'
                                  : 'hover:bg-neutral-50 text-neutral-700'
                              }`}
                            >
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                  isSelected
                                    ? isDark
                                      ? 'bg-neutral-700 text-white'
                                      : 'bg-neutral-200 text-neutral-900'
                                    : isDark
                                    ? 'bg-neutral-800 text-neutral-400'
                                    : 'bg-neutral-100 text-neutral-500'
                                }`}
                              >
                                <ItemIcon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1">
                                <div className="leading-tight">{item.label}</div>
                                <div
                                  className={`text-[10px] ${
                                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                                  }`}
                                >
                                  {item.desc}
                                </div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-neutral-200" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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
              </div>
            </div>

            {/* DYNAMIC BODY: Fluid and borderless (NO split lines anywhere) */}
            <div className="flex-1 overflow-y-auto no-scrollbar pt-4 pb-2 min-h-[220px] max-h-[48vh]">
              <AnimatePresence mode="wait">
                {/* 1. DIARY FORMAT (Clean, elegant notepad) */}
                {entryType === 'diary' && (
                  <motion.div
                    key="body-diary"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
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
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your thoughts..."
                      rows={6}
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
                    className="space-y-2.5"
                  >
                    {/* Title */}
                    <div
                      className={`p-3 rounded-2xl transition-colors ${
                        isDark ? 'bg-[#1a1a1a]' : 'bg-neutral-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <label
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          Title
                        </label>
                        <button
                          id="title-notes-btn"
                          type="button"
                          onClick={() => setShowSecretNotes((prev) => !prev)}
                          title={showSecretNotes || secretNotes ? 'Note open (click to toggle)' : 'Add note'}
                          aria-label="Add note to title"
                          className={`w-6 h-6 rounded-lg flex items-center justify-center active:scale-95 transition-all ${
                            showSecretNotes || secretNotes
                              ? isDark
                                ? 'bg-neutral-700 text-white'
                                : 'bg-neutral-200 text-neutral-900'
                              : isDark
                              ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
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
                        className={`w-full bg-transparent text-sm font-medium focus:outline-none placeholder:text-neutral-600 ${
                          isDark ? 'text-white' : 'text-neutral-900'
                        }`}
                      />

                      {/* Expandable note input if toggled or has notes */}
                      <AnimatePresence>
                        {(showSecretNotes || secretNotes) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="mt-2.5 pt-1.5"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-[10px] font-semibold uppercase tracking-wider ${
                                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                                }`}
                              >
                                Notes
                              </span>
                              {secretNotes && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSecretNotes('');
                                    setShowSecretNotes(false);
                                  }}
                                  className="text-[10px] text-neutral-500 hover:text-red-400 transition-colors"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            <textarea
                              value={secretNotes}
                              onChange={(e) => setSecretNotes(e.target.value)}
                              placeholder="Add notes, recovery hints, or details..."
                              rows={2}
                              autoFocus
                              className={`w-full bg-transparent text-xs focus:outline-none resize-none leading-relaxed placeholder:text-neutral-600 ${
                                isDark ? 'text-white' : 'text-neutral-900'
                              }`}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Email / Username */}
                    <div
                      className={`p-3 rounded-2xl transition-colors ${
                        isDark ? 'bg-[#1a1a1a]' : 'bg-neutral-100/80'
                      }`}
                    >
                      <label
                        className={`block text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                          isDark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        Email or Username
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
                        className={`w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-600 ${
                          isDark ? 'text-white' : 'text-neutral-900'
                        }`}
                      />
                    </div>

                    {/* Password / Key with Show/Hide toggle */}
                    <div
                      className={`p-3 rounded-2xl transition-colors ${
                        isDark ? 'bg-[#1a1a1a]' : 'bg-neutral-100/80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <label
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          Password / Key
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
                          }}
                          className={`text-[11px] font-medium flex items-center gap-1 hover:underline ${
                            isDark ? 'text-neutral-300' : 'text-neutral-700'
                          }`}
                        >
                          <Sparkles className="w-3 h-3" />
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
                          className={`w-full pr-8 bg-transparent text-sm font-mono focus:outline-none placeholder:text-neutral-600 ${
                            isDark ? 'text-white' : 'text-neutral-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className={`p-1 rounded-md transition-colors ${
                            isDark
                              ? 'text-neutral-400 hover:text-white'
                              : 'text-neutral-500 hover:text-neutral-900'
                          }`}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
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
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Todo List Title..."
                      className={`w-full bg-transparent text-xl font-bold tracking-tight placeholder:text-neutral-600 focus:outline-none ${
                        isDark ? 'text-white' : 'text-neutral-900'
                      }`}
                    />

                    {/* Quick item input capsule */}
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl transition-colors ${
                        isDark ? 'bg-[#1a1a1a]' : 'bg-neutral-100'
                      }`}
                    >
                      <input
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
                        className={`flex-1 bg-transparent text-sm focus:outline-none placeholder:text-neutral-600 ${
                          isDark ? 'text-white' : 'text-neutral-900'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleAddTodoItem}
                        className={`h-7 px-3 rounded-full flex items-center gap-1 text-xs font-medium active:scale-95 transition-all ${
                          isDark
                            ? 'bg-[#282828] text-white hover:bg-[#323232]'
                            : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Todo List Items (No split lines) */}
                    <div className="space-y-1.5 pt-1">
                      {todoItems.length === 0 ? (
                        <p className="text-xs py-3 text-center text-neutral-500">
                          No items yet. Type above to add tasks.
                        </p>
                      ) : (
                        todoItems.map((item) => (
                          <div
                            key={item.id}
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
                          </div>
                        ))
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
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your thoughts..."
                      rows={5}
                      className={`w-full bg-transparent text-sm placeholder:text-neutral-600 focus:outline-none resize-none leading-relaxed ${
                        isDark ? 'text-neutral-200' : 'text-neutral-700'
                      }`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ATTACHMENT BADGES */}
            {(hasVoiceNote || attachedImage || isRecording) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
                {isRecording && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/15 text-red-400 animate-pulse">
                    <Radio className="w-3.5 h-3.5 animate-spin" />
                    <span>Recording audio memo...</span>
                  </div>
                )}
                {hasVoiceNote && !isRecording && (
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                      isDark
                        ? 'bg-[#222222] text-neutral-300'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <Mic className="w-3 h-3 text-emerald-400" />
                    <span>Voice Memo Attached</span>
                    <button
                      type="button"
                      onClick={() => setHasVoiceNote(false)}
                      className="ml-1 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                )}
                {attachedImage && (
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
                      isDark
                        ? 'bg-[#222222] text-neutral-300'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3 text-neutral-300" />
                    <span>Photo Attached</span>
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      className="ml-1 hover:text-red-400"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* BOTTOM BAR: Sleek floating capsule, NO split lines */}
            <div className="pt-2 relative">
              {/* '+' Popup Menu for options like voice note, images */}
              <AnimatePresence>
                {isPlusMenuOpen && (
                  <motion.div
                    ref={plusMenuRef}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute left-0 bottom-14 w-48 rounded-2xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.7)] z-50 ${
                      isDark
                        ? 'bg-[#1e1e1e] text-white'
                        : 'bg-white text-neutral-900 shadow-neutral-200'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 ${
                        isDark ? 'text-neutral-500' : 'text-neutral-400'
                      }`}
                    >
                      Media
                    </div>

                    {/* Voice note option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        handleToggleRecording();
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors ${
                        isDark
                          ? 'hover:bg-[#282828] text-neutral-200'
                          : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <span>Record Voice Note</span>
                    </button>

                    {/* Images option */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlusMenuOpen(false);
                        setAttachedImage(
                          'https://images.unsplash.com/photo-1517842645767-c639042777db?w=300'
                        );
                      }}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs transition-colors ${
                        isDark
                          ? 'hover:bg-[#282828] text-neutral-200'
                          : 'hover:bg-neutral-100 text-neutral-800'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4 text-neutral-300" />
                      <span>Attach Photo</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Input Capsule: Seamless floating surface */}
              <div
                className={`flex items-center gap-2 p-1.5 pl-2 rounded-full transition-colors ${
                  isDark ? 'bg-[#1a1a1a]' : 'bg-neutral-100'
                }`}
              >
                {/* '+' button showing voice note, images options */}
                <button
                  id="drawer-plus-btn"
                  type="button"
                  onClick={() => setIsPlusMenuOpen((prev) => !prev)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                    isPlusMenuOpen
                      ? isDark
                        ? 'bg-[#2e2e2e] text-white rotate-45'
                        : 'bg-neutral-300 text-black rotate-45'
                      : isDark
                      ? 'bg-[#242424] hover:bg-[#2c2c2c] text-neutral-300'
                      : 'bg-white hover:bg-neutral-200 text-neutral-700 shadow-sm'
                  }`}
                  aria-label="Add options (voice note, images)"
                >
                  <Plus className="w-4 h-4 transition-transform duration-200" />
                </button>

                {/* Text Box user can type in */}
                <input
                  id="drawer-bottom-input"
                  type="text"
                  value={bottomTextInput}
                  onChange={(e) => setBottomTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBottomSubmit();
                    }
                  }}
                  placeholder={
                    entryType === 'todo'
                      ? 'Type task & press enter...'
                      : entryType === 'passwords'
                      ? 'Type note or hint...'
                      : 'Type notes, details, thoughts...'
                  }
                  className={`flex-1 bg-transparent text-xs py-1 px-1 focus:outline-none placeholder:text-neutral-500 ${
                    isDark ? 'text-white' : 'text-neutral-900'
                  }`}
                />

                {/* Insert Text button if typing */}
                {bottomTextInput.trim() && (
                  <button
                    type="button"
                    onClick={handleBottomSubmit}
                    className={`h-7 px-3 rounded-full text-[11px] font-medium transition-all active:scale-95 ${
                      isDark
                        ? 'bg-[#2e2e2e] text-white hover:bg-[#383838]'
                        : 'bg-neutral-300 text-neutral-900 hover:bg-neutral-400'
                    }`}
                  >
                    Add
                  </button>
                )}

                {/* Mic button on the right */}
                <button
                  id="drawer-mic-btn"
                  type="button"
                  onClick={handleToggleRecording}
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-all ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse'
                      : isDark
                      ? 'bg-[#242424] hover:bg-[#2c2c2c] text-neutral-300 hover:text-white'
                      : 'bg-white hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 shadow-sm'
                  }`}
                  aria-label="Voice input"
                >
                  {isRecording ? (
                    <MicOff className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
