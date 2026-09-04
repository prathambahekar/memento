import { Home, ListTodo, Plus, Shield, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import { NavTab, ThemeMode } from '../types';

interface NavBarProps {
  activeTab: NavTab;
  theme: ThemeMode;
  onSelectTab: (tab: NavTab) => void;
  onOpenNewNote: () => void;
  onOpenDrawer: () => void;
}

export function NavBar({
  activeTab,
  theme,
  onSelectTab,
  onOpenNewNote,
  onOpenDrawer,
}: NavBarProps) {
  const isDark = theme === 'dark';
  const isSafeActive = activeTab === 'vault' || activeTab === 'safe';

  return (
    <nav
      id="bottom-nav-bar"
      aria-label="Main Navigation"
      className="fixed bottom-4 left-0 right-0 z-30 px-4 flex justify-center pointer-events-none"
    >
      <div
        className={`pointer-events-auto w-full max-w-sm rounded-full px-2 py-2 flex items-center justify-between backdrop-blur-2xl transition-colors duration-200 ${
          isDark
            ? 'bg-[#121212]/95 shadow-[0_12px_32px_rgba(0,0,0,0.7)]'
            : 'bg-[#ffffff]/95 shadow-[0_12px_32px_rgba(0,0,0,0.08)]'
        }`}
      >
        {/* 1. Home button */}
        <button
          id="nav-btn-home"
          type="button"
          onClick={() => onSelectTab('home')}
          className="relative flex-1 py-2.5 flex flex-col items-center justify-center rounded-full transition-colors group"
          aria-label="Home"
        >
          {activeTab === 'home' && (
            <motion.div
              layoutId="nav-pill"
              className={`absolute inset-0 rounded-full ${
                isDark ? 'bg-[#222222]' : 'bg-[#eeeff2]'
              }`}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <Home
            className={`w-5 h-5 relative z-10 transition-colors ${
              activeTab === 'home'
                ? isDark
                  ? 'text-white'
                  : 'text-neutral-900'
                : isDark
                ? 'text-neutral-400 group-hover:text-neutral-200'
                : 'text-neutral-500 group-hover:text-neutral-800'
            }`}
            strokeWidth={activeTab === 'home' ? 2.2 : 1.8}
          />
        </button>

        {/* 2. Todo button (2nd button) */}
        <button
          id="nav-btn-todo"
          type="button"
          onClick={() => onSelectTab('todo')}
          className="relative flex-1 py-2.5 flex flex-col items-center justify-center rounded-full transition-colors group"
          aria-label="Todo"
        >
          {activeTab === 'todo' && (
            <motion.div
              layoutId="nav-pill"
              className={`absolute inset-0 rounded-full ${
                isDark ? 'bg-[#222222]' : 'bg-[#eeeff2]'
              }`}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <ListTodo
            className={`w-5 h-5 relative z-10 transition-colors ${
              activeTab === 'todo'
                ? isDark
                  ? 'text-white'
                  : 'text-neutral-900'
                : isDark
                ? 'text-neutral-400 group-hover:text-neutral-200'
                : 'text-neutral-500 group-hover:text-neutral-800'
            }`}
            strokeWidth={activeTab === 'todo' ? 2.2 : 1.8}
          />
        </button>

        {/* 3. Center (+) button */}
        <div className="flex-1 flex items-center justify-center px-1">
          <button
            id="nav-btn-create"
            type="button"
            onClick={onOpenNewNote}
            className={`w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg ${
              isDark
                ? 'bg-white text-black hover:bg-neutral-200 shadow-white/10'
                : 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-neutral-900/20'
            }`}
            aria-label="Create new note"
          >
            <Plus className="w-6 h-6 stroke-[2.4]" />
          </button>
        </div>

        {/* 4. Safe button (4th button) */}
        <button
          id="nav-btn-safe"
          type="button"
          onClick={() => onSelectTab('safe')}
          className="relative flex-1 py-2.5 flex flex-col items-center justify-center rounded-full transition-colors group"
          aria-label="Safe"
        >
          {isSafeActive && (
            <motion.div
              layoutId="nav-pill"
              className={`absolute inset-0 rounded-full ${
                isDark ? 'bg-[#222222]' : 'bg-[#eeeff2]'
              }`}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <Shield
            className={`w-5 h-5 relative z-10 transition-colors ${
              isSafeActive
                ? isDark
                  ? 'text-white'
                  : 'text-neutral-900'
                : isDark
                ? 'text-neutral-400 group-hover:text-neutral-200'
                : 'text-neutral-500 group-hover:text-neutral-800'
            }`}
            strokeWidth={isSafeActive ? 2.2 : 1.8}
          />
        </button>

        {/* 5. More button (opens drawer menu) */}
        <button
          id="nav-btn-more"
          type="button"
          onClick={onOpenDrawer}
          className="relative flex-1 py-2.5 flex flex-col items-center justify-center rounded-full transition-colors group"
          aria-label="More menu"
        >
          <MoreHorizontal
            className={`w-5 h-5 relative z-10 transition-colors ${
              isDark
                ? 'text-neutral-400 group-hover:text-neutral-200'
                : 'text-neutral-500 group-hover:text-neutral-800'
            }`}
            strokeWidth={1.8}
          />
        </button>
      </div>
    </nav>
  );
}
