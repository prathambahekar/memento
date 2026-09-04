import { Search } from 'lucide-react';
import { ThemeMode } from '../types';

interface TopBarProps {
  theme: ThemeMode;
  onOpenSearch: () => void;
}

export function TopBar({ theme, onOpenSearch }: TopBarProps) {
  const isDark = theme === 'dark';

  return (
    <header className="relative w-full z-20 px-5 pt-4 pb-3 flex items-center justify-between">
      {/* App name at left: "memento" */}
      <div className="flex items-center gap-2">
        <h1
          className={`text-2xl font-semibold tracking-tight select-none ${
            isDark ? 'text-white' : 'text-neutral-900'
          }`}
        >
          memento
        </h1>
      </div>

      {/* Search button at right: clicking opens the clean & beautiful bottom drawer menu */}
      <button
        id="top-bar-search-btn"
        type="button"
        onClick={onOpenSearch}
        aria-label="Open search menu"
        className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all ${
          isDark
            ? 'text-neutral-300 hover:text-white bg-[#181818] hover:bg-[#222222]'
            : 'text-neutral-700 hover:text-neutral-900 bg-[#ebecef] hover:bg-[#e2e3e7]'
        }`}
      >
        <Search className="w-5 h-5" strokeWidth={2} />
      </button>
    </header>
  );
}
