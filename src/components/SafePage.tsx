import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Shield,
  Plus,
  Search,
  KeyRound,
  Tv,
  MessageCircle,
  Briefcase,
  Layers,
  Wallet,
} from 'lucide-react';
import { ThemeMode, NoteItem } from '../types';
import { triggerHaptic } from '../lib/capacitor';
import { capitalizeFirstChar } from '../lib/formatters';
import { PassKeyDrawer } from './PassKeyDrawer';

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

type SafeCategory = 'all' | 'streaming' | 'social' | 'work' | 'finance' | 'other';

interface CategoryChip {
  id: SafeCategory;
  label: string;
  icon: typeof Shield;
}

const CATEGORY_CHIPS: CategoryChip[] = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'social', label: 'Social', icon: MessageCircle },
  { id: 'streaming', label: 'Streaming', icon: Tv },
  { id: 'work', label: 'Work', icon: Briefcase },
  { id: 'finance', label: 'Finance', icon: Wallet },
];

function categorizeSafeItem(title: string, service?: string): SafeCategory {
  const text = `${title} ${service || ''}`.toLowerCase();
  if (
    text.includes('netflix') ||
    text.includes('prime') ||
    text.includes('disney') ||
    text.includes('spotify') ||
    text.includes('youtube') ||
    text.includes('hbo') ||
    text.includes('hulu') ||
    text.includes('apple tv')
  ) {
    return 'streaming';
  }
  if (
    text.includes('discord') ||
    text.includes('twitter') ||
    text.includes('reddit') ||
    text.includes('instagram') ||
    text.includes('telegram') ||
    text.includes('facebook') ||
    text.includes('signal') ||
    text.includes('tiktok')
  ) {
    return 'social';
  }
  if (
    text.includes('github') ||
    text.includes('gitlab') ||
    text.includes('slack') ||
    text.includes('jira') ||
    text.includes('google') ||
    text.includes('aws') ||
    text.includes('notion') ||
    text.includes('work') ||
    text.includes('office')
  ) {
    return 'work';
  }
  if (
    text.includes('bank') ||
    text.includes('paypal') ||
    text.includes('crypto') ||
    text.includes('binance') ||
    text.includes('stripe') ||
    text.includes('card')
  ) {
    return 'finance';
  }
  return 'other';
}

export function SafePage({
  theme,
  notes,
  onBack,
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

  // Filter Safe notes
  const safeNotes = useMemo(() => {
    return notes.filter((n) => {
      const isSafe = n.entryType === 'passwords' || !!n.isSafe || !!n.isVault;
      const hasPassword = typeof n.password === 'string' && n.password.trim() !== '';
      const hasService = typeof n.service === 'string' && n.service.trim() !== '';
      return isSafe || hasPassword || hasService;
    });
  }, [notes]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<SafeCategory, number> = {
      all: safeNotes.length,
      social: 0,
      streaming: 0,
      work: 0,
      finance: 0,
      other: 0,
    };
    safeNotes.forEach((n) => {
      const cat = categorizeSafeItem(n.title, n.service);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      } else {
        counts.other++;
      }
    });
    return counts;
  }, [safeNotes]);

  // Filtered by Search & Category
  const filteredSafeNotes = useMemo(() => {
    let result = safeNotes;

    if (selectedCategory !== 'all') {
      result = result.filter((n) => {
        const cat = categorizeSafeItem(n.title, n.service);
        return cat === selectedCategory;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((n) => {
        return (
          n.title?.toLowerCase().includes(q) ||
          n.service?.toLowerCase().includes(q) ||
          n.email?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q)
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
            aria-label="Search"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${
              isDark
                ? 'text-neutral-300 hover:text-white bg-[#141416] hover:bg-[#1e1e22]'
                : 'text-neutral-700 hover:text-neutral-900 bg-[#ebecef] hover:bg-[#e2e3e7]'
            }`}
          >
            <Search className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2]" />
          </button>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 sm:px-5 md:px-8 lg:px-10 pt-1 sm:pt-2 pb-28 md:pb-10 no-scrollbar">
        {/* Filter Chips Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 mb-3.5">
          {CATEGORY_CHIPS.map((chip) => {
            const ChipIcon = chip.icon;
            const isActive = selectedCategory === chip.id;
            const count = categoryCounts[chip.id];

            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setSelectedCategory(chip.id);
                }}
                className={`h-8 sm:h-8.5 px-3 sm:px-3.5 rounded-full inline-flex items-center gap-1.5 shrink-0 text-xs sm:text-[13px] font-medium tracking-tight active:scale-95 transition-all duration-150 cursor-pointer select-none ${
                  isActive
                    ? isDark
                      ? 'bg-neutral-100 text-neutral-950 font-semibold shadow-xs'
                      : 'bg-neutral-900 text-white font-semibold shadow-xs'
                    : isDark
                    ? 'bg-[#18181b] hover:bg-[#222226] text-neutral-400 hover:text-neutral-200 border border-neutral-800/80'
                    : 'bg-[#eeeff2] hover:bg-[#e4e6ea] text-neutral-600 hover:text-neutral-900 border border-neutral-200/80'
                }`}
              >
                <ChipIcon
                  className={`w-3.5 h-3.5 stroke-[2] shrink-0 transition-colors ${
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

        {/* Card Grid: 2 columns on mobile */}
        {filteredSafeNotes.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {filteredSafeNotes.map((note) => (
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
                className={`group relative rounded-[22px] p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-[0.98] shadow-xs select-none border ${
                  isDark
                    ? 'bg-[#141416] hover:bg-[#18181b] border-neutral-800/80 hover:border-neutral-700/80'
                    : 'bg-white hover:bg-neutral-50 border-neutral-200/90 hover:border-neutral-300'
                }`}
              >
                {/* Left Side: Bold Title */}
                <h3
                  className={`font-semibold tracking-tight leading-none truncate text-[15px] sm:text-[16px] pr-2 ${
                    isDark ? 'text-white' : 'text-neutral-900'
                  }`}
                >
                  {capitalizeFirstChar(note.title)}
                </h3>

                {/* Right Side: Gold Key Badge */}
                <div
                  className={`inline-flex items-center justify-center w-5 h-5 md:w-auto md:h-auto md:px-2 md:py-0.5 md:gap-1 text-[10px] font-medium rounded-full shrink-0 ${
                    isDark
                      ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
                      : 'bg-amber-100 text-amber-800 border border-amber-200/80'
                  }`}
                  title="Safe Key"
                >
                  <KeyRound className="w-3 h-3 md:w-2.5 md:h-2.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <span className="hidden md:inline">Key</span>
                </div>
              </motion.div>
            ))}
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
              {searchQuery ? 'No matching credentials' : 'No safe credentials yet'}
            </h4>
            <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mb-4">
              {searchQuery
                ? `No safe notes found for "${searchQuery}". Try a different search.`
                : 'Keep passwords, secret pins, and sensitive access keys encrypted and stored offline.'}
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
                <span>Add first credential</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* PassKey Detail Drawer */}
      <PassKeyDrawer
        isOpen={!!selectedPassKeyNote}
        theme={theme}
        note={selectedPassKeyNote}
        onClose={() => setSelectedPassKeyNote(null)}
        onEdit={(updatedNote) => {
          onUpdateNote(updatedNote);
          setSelectedPassKeyNote(updatedNote);
        }}
        onDelete={(noteId) => {
          onDeleteNote(noteId);
          setSelectedPassKeyNote(null);
        }}
        onToggleFavorite={onToggleFavorite}
      />
    </div>
  );
}
