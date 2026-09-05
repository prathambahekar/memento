import { Search, X } from 'lucide-react';
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
    <header className="shrink-0 relative w-full z-20 px-5 md:px-8 pt-[max(calc(var(--safe-top,0px)+0.75rem),1.25rem)] md:pt-6 pb-3 md:pb-4 flex items-center justify-between transition-colors">
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

      {/* Center: Desktop Flexible Search Bar */}
      <div className="hidden md:flex flex-1 justify-center max-w-sm lg:max-w-md xl:max-w-lg mx-4">
        <div
          className={`flex items-center gap-2.5 px-4 h-10 lg:h-11 rounded-full w-full transition-all duration-200 group border shadow-xs ${
            isDark
              ? 'bg-[#151515] hover:bg-[#1a1a1a] border-neutral-800/80 focus-within:border-neutral-600 focus-within:bg-[#181818] focus-within:ring-2 focus-within:ring-white/5'
              : 'bg-[#eeeff2] hover:bg-[#e6e8ed] border-neutral-200/70 focus-within:border-neutral-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-black/5'
          }`}
        >
          <Search
            className={`w-4.5 h-4.5 shrink-0 transition-colors ${
              isDark
                ? 'text-neutral-500 group-focus-within:text-neutral-200'
                : 'text-neutral-400 group-focus-within:text-neutral-800'
            }`}
            strokeWidth={2}
          />
          <input
            id="desktop-quick-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search notes, checklists, keys..."
            className={`w-full bg-transparent text-sm font-normal outline-none transition-colors ${
              isDark
                ? 'text-white placeholder-neutral-500'
                : 'text-neutral-900 placeholder-neutral-400'
            }`}
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className={`p-1 rounded-full hover:opacity-80 transition-opacity shrink-0 ${
                isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-500 hover:text-black'
              }`}
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-3">
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
