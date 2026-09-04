import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  Bookmark,
  Settings,
  Shield,
  Archive,
  ListTodo,
  BookOpen,
  Moon,
  Sun,
} from 'lucide-react';
import { ThemeMode } from '../types';

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem?: (item: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function DrawerMenu({
  isOpen,
  onClose,
  onSelectItem,
  theme,
  onToggleTheme,
}: DrawerMenuProps) {
  const isDark = theme === 'dark';

  const modules = [
    { id: 'my-things', label: 'My Things', icon: Layers },
    { id: 'favorites', label: 'Favourites', icon: Bookmark },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'safe', label: 'Safe', icon: Shield },
    { id: 'archive', label: 'Archive', icon: Archive },
    { id: 'todo', label: 'Todo', icon: ListTodo },
    { id: 'diary', label: 'Diary', icon: BookOpen },
  ];

  const handleModuleClick = (id: string) => {
    onSelectItem?.(id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer sheet matching the requested UI design */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative w-full max-w-md mx-auto rounded-t-3xl pt-3 pb-6 px-5 shadow-2xl transition-colors duration-200 ${
              isDark ? 'bg-[#121212] text-white' : 'bg-[#ffffff] text-neutral-900'
            }`}
          >
            {/* Top drag handle */}
            <div className="flex justify-center pb-3">
              <div
                className={`w-12 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Features & Modules Section */}
            <div className="mb-3 mt-1">
              <div
                className={`text-[11px] font-bold tracking-wider uppercase mb-2.5 px-0.5 ${
                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                FEATURES & MODULES
              </div>

              {/* Grid with cards (3 columns, adjusted for mobile ergonomics) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {modules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <button
                      key={module.id}
                      id={`module-btn-${module.id}`}
                      type="button"
                      onClick={() => handleModuleClick(module.id)}
                      className={`py-2.5 px-1.5 sm:py-3 sm:px-2 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 min-h-[64px] sm:min-h-[70px] active:scale-95 transition-all ${
                        isDark
                          ? 'bg-[#1a1a1a] hover:bg-[#222222] text-neutral-200 hover:text-white'
                          : 'bg-[#f4f5f8] hover:bg-[#eaecee] text-neutral-800'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8] ${
                          isDark ? 'text-neutral-300' : 'text-neutral-800'
                        }`}
                      />
                      <span className="text-[11.5px] sm:text-xs font-medium tracking-tight line-clamp-1 leading-tight">
                        {module.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme row at bottom - no split lines */}
            <div className="flex items-center justify-between px-1 pt-3 pb-1 mt-1">
              <div
                onClick={onToggleTheme}
                role="button"
                tabIndex={0}
                className="cursor-pointer select-none"
              >
                <span
                  className={`text-sm ${
                    isDark ? 'text-neutral-500' : 'text-neutral-500'
                  }`}
                >
                  Theme:{' '}
                </span>
                <span className="text-sm font-semibold">
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>

              {/* Round theme toggle icon button */}
              <button
                id="drawer-theme-toggle-btn"
                type="button"
                onClick={onToggleTheme}
                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-all ${
                  isDark
                    ? 'bg-[#202020] text-neutral-300 hover:text-white'
                    : 'bg-[#f0f1f4] text-neutral-700 hover:text-neutral-900'
                }`}
              >
                {isDark ? (
                  <Sun className="w-4 h-4 stroke-[2]" />
                ) : (
                  <Moon className="w-4 h-4 stroke-[2]" />
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
