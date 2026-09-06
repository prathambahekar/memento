import { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Shield,
  Plus,
  Search,
  KeyRound,
  FileText,
  Image as ImageIcon,
  Mic,
  Layers,
} from 'lucide-react';
import { ThemeMode, NoteItem } from '../types';
import { triggerHaptic } from '../lib/capacitor';
import { capitalizeFirstChar } from '../lib/formatters';
import { PassKeyDrawer } from './PassKeyDrawer';

export const DEFAULT_PERSONAL_INFO_ID = 'safe-default-personal-info';

export function isPersonalInfoNote(note?: NoteItem | null): boolean {
  if (!note) return false;
  return Boolean(
    note.id === DEFAULT_PERSONAL_INFO_ID ||
    note.isPersonalInfo ||
    (note.title && note.title.trim().toLowerCase() === 'personal info') ||
    (note.title && note.title.trim().toLowerCase() === 'personal information') ||
    (note.title && note.title.trim().toLowerCase() === 'personal identity & documents')
  );
}

interface SafePageProps {
  theme: ThemeMode;
  notes: NoteItem[];
  onBack: () => void;
  onSelectNote?: (note: NoteItem) => void;
  onOpenNewSafeNote?: () => void;
  onUpdateNote: (updatedNote: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
  onToggleFavorite?: (noteId: string) => void;
  searchQuery?: string;
  onOpenSearch?: () => void;
}

export type SafeCategory = 'all' | 'personal' | 'passwords' | 'documents' | 'photos' | 'voice';

interface CategoryChip {
  id: SafeCategory;
  label: string;
  icon: typeof Shield;
}

const CATEGORY_CHIPS: CategoryChip[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'personal', label: 'Personal IDs', icon: Shield },
  { id: 'passwords', label: 'Passwords', icon: KeyRound },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'photos', label: 'Photos', icon: ImageIcon },
  { id: 'voice', label: 'Voice Notes', icon: Mic },
];

function noteMatchesCategory(note: NoteItem, cat: SafeCategory): boolean {
  if (cat === 'all') return true;

  const isPersonal =
    isPersonalInfoNote(note) ||
    (note.personalInfo && note.personalInfo.length > 0) ||
    (note.content &&
      (note.content.toLowerCase().includes('aadhaar') ||
        note.content.toLowerCase().includes('pan card') ||
        note.content.toLowerCase().includes('pan:') ||
        note.content.toLowerCase().includes('phone:')));

  const hasDocs = Boolean(note.documents && note.documents.length > 0);
  const hasPhotos = Boolean((note.images && note.images.length > 0) || note.imageUrl);
  const hasVoice = Boolean((note.voiceNotes && note.voiceNotes.length > 0) || note.hasVoiceNote);
  const hasPass = Boolean(note.password || note.service || note.email || note.entryType === 'passwords');

  if (cat === 'personal') return Boolean(isPersonal);
  if (cat === 'documents') return hasDocs;
  if (cat === 'photos') return hasPhotos;
  if (cat === 'voice') return hasVoice;
  if (cat === 'passwords') return hasPass && !isPersonalInfoNote(note);

  return false;
}

export function SafePage({
  theme,
  notes,
  onBack,
  onSelectNote,
  onOpenNewSafeNote,
  onUpdateNote,
  onDeleteNote,
  onToggleFavorite,
  searchQuery = '',
  onOpenSearch,
}: SafePageProps) {
  const isDark = theme === 'dark';

  // State
  const [selectedCategory, setSelectedCategory] = useState<SafeCategory>('all');
  const [selectedPassKeyNote, setSelectedPassKeyNote] = useState<NoteItem | null>(null);

  // Active default Personal Info note (always available as the default card in Safe)
  const activePersonalInfoNote: NoteItem = useMemo(() => {
    return (
      notes.find(isPersonalInfoNote) || {
        id: DEFAULT_PERSONAL_INFO_ID,
        title: 'Personal Info',
        content: '',
        date: 'Safe',
        isSafe: true,
        isVault: true,
        isPersonalInfo: true,
        entryType: 'passwords' as const,
        personalInfo: [], // empty at first
      }
    );
  }, [notes]);

  // Filter Safe notes: always includes the default Personal Info card
  const safeNotes = useMemo(() => {
    const customSafeNotes = notes.filter((n) => {
      if (isPersonalInfoNote(n)) return false;
      const isSafe = n.entryType === 'passwords' || !!n.isSafe || !!n.isVault;
      const hasPassword = typeof n.password === 'string' && n.password.trim() !== '';
      const hasService = typeof n.service === 'string' && n.service.trim() !== '';
      const hasPersonal = Array.isArray(n.personalInfo) && n.personalInfo.length > 0;
      const hasDocs = Array.isArray(n.documents) && n.documents.length > 0;
      return isSafe || hasPassword || hasService || hasPersonal || hasDocs;
    });

    return [activePersonalInfoNote, ...customSafeNotes];
  }, [notes, activePersonalInfoNote]);

  // Keep selectedPassKeyNote in sync when notes update
  useEffect(() => {
    if (selectedPassKeyNote) {
      const match = notes.find((n) => n.id === selectedPassKeyNote.id);
      if (match) {
        setSelectedPassKeyNote(match);
      } else if (isPersonalInfoNote(selectedPassKeyNote)) {
        setSelectedPassKeyNote(activePersonalInfoNote);
      }
    }
  }, [notes, selectedPassKeyNote?.id, activePersonalInfoNote]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<SafeCategory, number> = {
      all: safeNotes.length,
      personal: 0,
      passwords: 0,
      documents: 0,
      photos: 0,
      voice: 0,
    };

    safeNotes.forEach((n) => {
      CATEGORY_CHIPS.forEach((chip) => {
        if (chip.id !== 'all' && noteMatchesCategory(n, chip.id)) {
          counts[chip.id]++;
        }
      });
    });

    return counts;
  }, [safeNotes]);

  // Filtered by Search & Category
  const filteredSafeNotes = useMemo(() => {
    let result = safeNotes;

    if (selectedCategory !== 'all') {
      result = result.filter((n) => noteMatchesCategory(n, selectedCategory));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((n) => {
        const isPersonal = isPersonalInfoNote(n);
        const matchesPersonalCard =
          isPersonal &&
          ('personal info'.includes(q) ||
            'personal'.includes(q) ||
            'identity'.includes(q) ||
            'aadhaar'.includes(q) ||
            'phone'.includes(q) ||
            'email'.includes(q));

        const inPersonal = n.personalInfo?.some(
          (p) => p.label.toLowerCase().includes(q) || p.value.toLowerCase().includes(q)
        );
        const inDocs = n.documents?.some((d) => d.name.toLowerCase().includes(q));

        return (
          matchesPersonalCard ||
          n.title?.toLowerCase().includes(q) ||
          n.service?.toLowerCase().includes(q) ||
          n.email?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q) ||
          inPersonal ||
          inDocs
        );
      });
    }

    return result;
  }, [safeNotes, selectedCategory, searchQuery]);

  return (
    <div
      className={`flex-1 flex flex-col h-full min-h-0 w-full overflow-hidden transition-colors duration-200 select-none ${
        isDark ? 'bg-[#09090b] text-[#f4f4f5]' : 'bg-[#f4f4f6] text-[#18181b]'
      }`}
    >
      {/* Top Header without splitting line */}
      <header
        className={`shrink-0 px-4 sm:px-6 md:px-8 pt-[max(calc(var(--safe-top,0px)+0.75rem),1.25rem)] md:pt-6 pb-2.5 flex items-center justify-between gap-3 transition-colors duration-200 ${
          isDark ? 'bg-[#09090b]' : 'bg-[#f4f4f6]'
        }`}
      >
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onBack();
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
              isDark
                ? 'text-neutral-300 hover:text-white hover:bg-[#18181b]'
                : 'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            aria-label="Back to main"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>

          <h1
            className={`text-xl sm:text-2xl font-bold tracking-tight leading-none ${
              isDark ? 'text-white' : 'text-neutral-900'
            }`}
          >
            Safe
          </h1>
        </div>

        {/* Header Right Action: Search Button like other pages */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onOpenSearch?.();
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-[#18181b]'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
            }`}
            aria-label="Search safe entries"
          >
            <Search className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 md:px-8 pt-1 pb-24 md:pb-8">
        {/* Category Filter Chips Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2.5 mb-2">
          {CATEGORY_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const count = categoryCounts[chip.id] || 0;
            const isActive = selectedCategory === chip.id;

            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedCategory(chip.id);
                }}
                className={`h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-all active:scale-95 ${
                  isActive
                    ? isDark
                      ? 'bg-white text-neutral-950 shadow-xs'
                      : 'bg-neutral-900 text-white shadow-xs'
                    : isDark
                    ? 'bg-[#18181b] text-neutral-400 hover:text-neutral-200 hover:bg-[#202024]'
                    : 'bg-neutral-200/70 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 stroke-[2] ${
                    isActive
                      ? isDark
                        ? 'text-neutral-950'
                        : 'text-white'
                      : isDark
                      ? 'text-neutral-400'
                      : 'text-neutral-500'
                  }`}
                />
                <span className="whitespace-nowrap">{chip.label}</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none transition-colors ${
                    isActive
                      ? isDark
                        ? 'bg-neutral-950/15 text-neutral-950'
                        : 'bg-white/20 text-white'
                      : isDark
                      ? 'bg-neutral-800 text-neutral-400'
                      : 'bg-neutral-300/70 text-neutral-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Card Grid */}
        {filteredSafeNotes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredSafeNotes.map((note) => {
              const hasPersonal =
                isPersonalInfoNote(note) || Boolean(note.personalInfo && note.personalInfo.length > 0);
              const hasDocs = Boolean(note.documents && note.documents.length > 0);
              const hasVoice = Boolean((note.voiceNotes && note.voiceNotes.length > 0) || note.hasVoiceNote);
              const hasPhotos = Boolean((note.images && note.images.length > 0) || note.imageUrl);
              const hasPassword = Boolean(note.password);
              const isDefaultSafe = !hasPersonal && !hasDocs && !hasVoice && !hasPhotos && !hasPassword;

              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedPassKeyNote(note);
                  }}
                  className={`group relative rounded-[20px] sm:rounded-[22px] px-3.5 py-3 sm:px-4 sm:py-3.5 flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-[0.98] shadow-xs select-none border min-h-[54px] sm:min-h-[58px] ${
                    isDark
                      ? 'bg-[#141416] hover:bg-[#18181b] border-neutral-800/80 hover:border-neutral-700/80'
                      : 'bg-white hover:bg-neutral-50 border-neutral-200/90 hover:border-neutral-300'
                  }`}
                >
                  {/* Left Side: Title */}
                  <div className="min-w-0 pr-2 flex items-center">
                    <h3
                      className={`font-semibold tracking-tight leading-snug truncate text-[14px] sm:text-[15px] ${
                        isDark ? 'text-white' : 'text-neutral-900'
                      }`}
                    >
                      {capitalizeFirstChar(note.title)}
                    </h3>
                  </div>

                  {/* Right Side: Badges */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {hasPersonal && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        title="Personal ID"
                      >
                        <Shield className="w-3 h-3 stroke-[2]" />
                      </div>
                    )}
                    {hasDocs && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                        title="Document"
                      >
                        <FileText className="w-3 h-3 stroke-[2]" />
                      </div>
                    )}
                    {hasPhotos && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center bg-sky-500/10 text-sky-400 border border-sky-500/20"
                        title="Photo"
                      >
                        <ImageIcon className="w-3 h-3 stroke-[2]" />
                      </div>
                    )}
                    {hasVoice && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        title="Voice Note"
                      >
                        <Mic className="w-3 h-3 stroke-[2]" />
                      </div>
                    )}
                    {(hasPassword || isDefaultSafe) && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        title="Safe Key"
                      >
                        <KeyRound className="w-3 h-3 stroke-[2]" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Clean Empty State */
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${
                isDark ? 'bg-neutral-800/60 text-neutral-400' : 'bg-neutral-200/80 text-neutral-500'
              }`}
            >
              <Shield className="w-7 h-7 stroke-[1.8]" />
            </div>
            <h4 className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              {searchQuery ? 'No matching safe items' : 'Your vault is empty'}
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mb-4">
              {searchQuery
                ? `No safe items found for "${searchQuery}". Try a different search.`
                : 'Store passwords, personal IDs (Aadhaar, PAN, phone numbers), confidential documents, images, and voice notes safely encrypted offline.'}
            </p>
            {!searchQuery && onOpenNewSafeNote && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onOpenNewSafeNote();
                }}
                className={`h-9 px-4 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-xs ${
                  isDark ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-900 text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add safe item</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* PassKey / Safe Detail Drawer */}
      <PassKeyDrawer
        isOpen={!!selectedPassKeyNote}
        theme={theme}
        note={selectedPassKeyNote}
        onClose={() => setSelectedPassKeyNote(null)}
        onUpdateNote={(updatedNote) => {
          onUpdateNote(updatedNote);
          setSelectedPassKeyNote(updatedNote);
        }}
        onEdit={(noteToEdit) => {
          setSelectedPassKeyNote(null);
          onSelectNote?.(noteToEdit);
        }}
        onDelete={(noteId) => {
          if (isPersonalInfoNote(selectedPassKeyNote) || noteId === DEFAULT_PERSONAL_INFO_ID) {
            const resetNote: NoteItem = {
              ...activePersonalInfoNote,
              content: '',
              personalInfo: [],
            };
            onUpdateNote(resetNote);
            setSelectedPassKeyNote(null);
            return;
          }
          onDeleteNote(noteId);
          setSelectedPassKeyNote(null);
        }}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}
