import { Search, Plus, X } from 'lucide-react';
import { NavTab, ThemeMode } from '../types';
import { triggerHaptic } from '../lib/capacitor';

interface TopBarProps {
  theme: ThemeMode;
  activeTab?: NavTab;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onOpenSearch: () => void;
  onOpenNewNote?: () => void;
}

export function TopBar({
  theme,
  activeTab = 'home',
  searchQuery = '',
  onSearchChange,
  onOpenSearch,
  onOpenNewNote,
}: TopBarProps) {
  const isDark = theme === 'dark';

  const sectionTitles: Partial<Record<NavTab, string>> = {
    home: 'All Notes',
    notes: 'All Notes',
    todo: 'Tasks & Todos',
    vault: 'Safe Vault',
    safe: 'Safe Vault',
    favorites: 'Favourites',
    diary: 'Personal Diary',
    archive: 'Archive',
  };

  const currentTitle = sectionTitles[activeTab] || 'Notes';

  return (
    <header className="relative w-full z-20 px-5 md:px-8 pt-[max(1rem,env(safe-area-inset-top))] md:pt-6 pb-3 md:pb-4 flex items-center justify-between transition-colors">
      {/* Left side: Mobile brand title or Desktop section title */}
      <div className="flex items-center gap-3">
        {/* Mobile brand title */}
        <h1
          className={`text-2xl font-semibold tracking-tight select-none md:hidden ${
            isDark ? 'text-white' : 'text-neutral-900'
          }`}
        >
          memento
        </h1>

        {/* Desktop section title */}
        <div className="hidden md:flex items-center gap-2.5">
          <h2
            className={`text-xl font-bold tracking-tight select-none ${
              isDark ? 'text-white' : 'text-neutral-900'
            }`}
          >
            {currentTitle}
          </h2>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
        {/* Clean Desktop Search Bar (no ⌘K button) */}
        <div
          className={`hidden md:flex items-center gap-2.5 px-3.5 py-2 rounded-full w-64 lg:w-80 transition-all duration-200 group ${
            isDark
              ? 'bg-[#151515] hover:bg-[#1a1a1a] focus-within:bg-[#171717] focus-within:ring-1 focus-within:ring-neutral-700/70'
              : 'bg-[#eeeff2] hover:bg-[#e6e8ed] focus-within:bg-white focus-within:ring-1 focus-within:ring-neutral-300 shadow-xs'
          }`}
        >
          <Search
            className={`w-4 h-4 shrink-0 transition-colors ${
              isDark
                ? 'text-neutral-500 group-focus-within:text-neutral-300'
                : 'text-neutral-400 group-focus-within:text-neutral-700'
            }`}
          />
          <input
            id="desktop-quick-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search in notes..."
            className={`w-full bg-transparent text-xs font-normal outline-none transition-colors ${
              isDark
                ? 'text-white placeholder-neutral-500'
                : 'text-neutral-900 placeholder-neutral-400'
            }`}
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className={`p-0.5 rounded-full hover:opacity-80 transition-opacity ${
                isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-black'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desktop Quick '+ Note' action */}
        {onOpenNewNote && (
          <button
            type="button"
            onClick={onOpenNewNote}
            className={`hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold active:scale-95 transition-all shadow-xs ${
              isDark
                ? 'bg-white text-black hover:bg-neutral-200'
                : 'bg-neutral-900 text-white hover:bg-black'
            }`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Note</span>
          </button>
        )}

        {/* Mobile Search Button */}
        <button
          id="top-bar-search-btn"
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenSearch?.();
          }}
          aria-label="Open search menu"
          className={`md:hidden w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${
            isDark
              ? 'text-neutral-300 hover:text-white bg-[#181818] hover:bg-[#222222]'
              : 'text-neutral-700 hover:text-neutral-900 bg-[#ebecef] hover:bg-[#e2e3e7]'
          }`}
        >
          <Search className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>
    </header>
  );
}
