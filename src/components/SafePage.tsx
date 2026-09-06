import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Filter,
  Check,
  X,
  Share2,
  Tv,
  Terminal,
  Mail,
  CreditCard,
  Lock,
  Server,
} from 'lucide-react';
import { ThemeMode, NoteItem } from '../types';
import { triggerHaptic } from '../lib/capacitor';
import { capitalizeFirstChar } from '../lib/formatters';
import {
  DEFAULT_PERSONAL_INFO_ID,
  isPersonalInfoNote,
  getSafeNoteBadge,
  SafeBadge,
} from '../lib/safeBadges';
import { PassKeyDrawer } from './PassKeyDrawer';

export { DEFAULT_PERSONAL_INFO_ID, isPersonalInfoNote, getSafeNoteBadge };
export type { SafeBadge };

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

export type SafeCategory =
  | 'all'
  | 'social'
  | 'ott'
  | 'personal'
  | 'api'
  | 'email'
  | 'finance'
  | 'crypto'
  | 'server'
  | 'work';

interface CategoryChip {
  id: SafeCategory;
  label: string;
  icon: typeof Shield;
}

const ALL_CATEGORY_CHIPS: CategoryChip[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'ott', label: 'OTT', icon: Tv },
  { id: 'personal', label: 'Personal IDs', icon: Shield },
  { id: 'api', label: 'API', icon: Terminal },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'finance', label: 'Finance', icon: CreditCard },
  { id: 'crypto', label: 'Crypto', icon: Lock },
  { id: 'server', label: 'Infra', icon: Server },
  { id: 'work', label: 'Work', icon: KeyRound },
];

export type AttachmentFilter = 'all' | 'photos' | 'documents' | 'voice';

interface AttachmentFilterOption {
  id: AttachmentFilter;
  label: string;
  icon: typeof FileText;
  darkIcon: string;
  lightIcon: string;
}

const ATTACHMENT_FILTER_OPTIONS: AttachmentFilterOption[] = [
  {
    id: 'all',
    label: 'All Items',
    icon: Layers,
    darkIcon: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    lightIcon: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  },
  {
    id: 'photos',
    label: 'Photos & Images',
    icon: ImageIcon,
    darkIcon: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
    lightIcon: 'bg-sky-50 text-sky-600 border-sky-200',
  },
  {
    id: 'documents',
    label: 'Documents & PDFs',
    icon: FileText,
    darkIcon: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    lightIcon: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  },
  {
    id: 'voice',
    label: 'Voice Notes',
    icon: Mic,
    darkIcon: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    lightIcon: 'bg-rose-50 text-rose-600 border-rose-200',
  },
];

function noteMatchesCategory(note: NoteItem, cat: SafeCategory): boolean {
  if (cat === 'all') return true;
  const badge = getSafeNoteBadge(note);
  return badge.tag === cat;
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
    const counts: Record<string, number> = { all: safeNotes.length };
    safeNotes.forEach((n) => {
      const badge = getSafeNoteBadge(n);
      const tag = badge.tag;
      counts[tag] = (counts[tag] || 0) + 1;
    });
    return counts;
  }, [safeNotes]);

  // Visible category chips: show 'all', plus categories that have notes, plus top presets
  const visibleCategoryChips = useMemo(() => {
    return ALL_CATEGORY_CHIPS.filter((chip) => {
      if (chip.id === 'all') return true;
      const count = categoryCounts[chip.id] || 0;
      if (count > 0) return true;
      return ['social', 'ott', 'personal'].includes(chip.id);
    });
  }, [categoryCounts]);

  // Attachment counts
  const attachmentCounts = useMemo(() => {
    let documents = 0;
    let photos = 0;
    let voice = 0;

    safeNotes.forEach((n) => {
      if (n.documents && n.documents.length > 0) documents++;
      if ((n.images && n.images.length > 0) || n.imageUrl) photos++;
      if ((n.voiceNotes && n.voiceNotes.length > 0) || n.hasVoiceNote) voice++;
    });

    return { documents, photos, voice };
  }, [safeNotes]);

  // State for attachment filter & dropdown menu
  const [activeAttachmentFilter, setActiveAttachmentFilter] = useState<AttachmentFilter>('all');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // Close filter menu when clicking outside
  useEffect(() => {
    if (!isFilterMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside as any);
    document.addEventListener('touchstart', handleClickOutside as any);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as any);
      document.removeEventListener('touchstart', handleClickOutside as any);
    };
  }, [isFilterMenuOpen]);

  // Filtered by Search, Category, and Attachment Filter
  const filteredSafeNotes = useMemo(() => {
    let result = safeNotes;

    // 1. Filter by category chip
    if (selectedCategory !== 'all') {
      result = result.filter((n) => noteMatchesCategory(n, selectedCategory));
    }

    // 2. Filter by attachment type
    if (activeAttachmentFilter === 'documents') {
      result = result.filter((n) => Boolean(n.documents && n.documents.length > 0));
    } else if (activeAttachmentFilter === 'photos') {
      result = result.filter((n) => Boolean((n.images && n.images.length > 0) || n.imageUrl));
    } else if (activeAttachmentFilter === 'voice') {
      result = result.filter((n) => Boolean((n.voiceNotes && n.voiceNotes.length > 0) || n.hasVoiceNote));
    }

    // 3. Filter by search query
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
          n.tags?.some((t) => t.toLowerCase().includes(q.replace(/^#/, ''))) ||
          inPersonal ||
          inDocs
        );
      });
    }

    return result;
  }, [safeNotes, selectedCategory, activeAttachmentFilter, searchQuery]);

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

        {/* Header Right Action: Filter Button on left of Search Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Attachment Filter Button & Popover */}
          <div className="relative" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsFilterMenuOpen((prev) => !prev);
              }}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all active:scale-95 relative ${
                activeAttachmentFilter !== 'all'
                  ? isDark
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35 shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs'
                  : isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-[#18181b]'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70'
              }`}
              aria-label="Filter attachments (photos, documents, voice notes)"
              title="Filter by attachments (images, docs, voice)"
            >
              <Filter className="w-4 h-4 stroke-[2]" />
              {activeAttachmentFilter !== 'all' && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#09090b]" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            <AnimatePresence>
              {isFilterMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 top-11 sm:top-12 w-60 rounded-2xl p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.5)] z-50 border backdrop-blur-2xl ${
                    isDark
                      ? 'bg-[#18181b]/95 border-neutral-800 text-white'
                      : 'bg-white/95 border-neutral-200 text-neutral-900 shadow-neutral-200/60'
                  }`}
                >
                  <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-400 select-none">
                    Filter by Attachment
                  </div>

                  <div className="space-y-0.5">
                    {ATTACHMENT_FILTER_OPTIONS.map((opt) => {
                      const isSelected = activeAttachmentFilter === opt.id;
                      const count = opt.id === 'all' ? safeNotes.length : attachmentCounts[opt.id];
                      const OptIcon = opt.icon;

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('selection');
                            setActiveAttachmentFilter(opt.id);
                            setIsFilterMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                            isSelected
                              ? isDark
                                ? 'bg-neutral-800 text-white font-semibold'
                                : 'bg-neutral-100 text-neutral-950 font-semibold'
                              : isDark
                              ? 'text-neutral-300 hover:bg-neutral-800/60 hover:text-white'
                              : 'text-neutral-700 hover:bg-neutral-100/80 hover:text-neutral-950'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                                isDark ? opt.darkIcon : opt.lightIcon
                              }`}
                            >
                              <OptIcon className="w-3.5 h-3.5 stroke-[2]" />
                            </div>
                            <span className="truncate">{opt.label}</span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none ${
                                isSelected
                                  ? isDark
                                    ? 'bg-neutral-700 text-white'
                                    : 'bg-neutral-200 text-neutral-900'
                                  : isDark
                                  ? 'bg-neutral-800/80 text-neutral-400'
                                  : 'bg-neutral-200/60 text-neutral-500'
                              }`}
                            >
                              {count}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search Button */}
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
        {/* Category Filter Chips Bar (All, Social, OTT, Personal IDs, etc.) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2.5 mb-1.5">
          {visibleCategoryChips.map((chip) => {
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

        {/* Active Attachment Filter Tag */}
        {activeAttachmentFilter !== 'all' && (
          <div className="flex items-center gap-2 mb-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isDark
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              <span>
                Filtered by{' '}
                {activeAttachmentFilter === 'photos'
                  ? 'Photos & Images'
                  : activeAttachmentFilter === 'documents'
                  ? 'Documents & PDFs'
                  : 'Voice Notes'}
              </span>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setActiveAttachmentFilter('all');
                }}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-black/20 dark:hover:bg-white/20 transition-all ml-0.5"
                title="Clear attachment filter"
              >
                <X className="w-3 h-3 stroke-[2.5]" />
              </button>
            </span>
          </div>
        )}

        {/* Card Grid */}
        {filteredSafeNotes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredSafeNotes.map((note) => {
              const badge = getSafeNoteBadge(note);
              const BadgeIcon = badge.icon;

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

                  {/* Right Side: Category Icon */}
                  <div className="flex items-center shrink-0 ml-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${
                        isDark ? badge.darkIcon : badge.lightIcon
                      }`}
                      title={badge.name || 'Safe Key'}
                    >
                      <BadgeIcon className="w-3 h-3 stroke-[2]" />
                    </div>
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
