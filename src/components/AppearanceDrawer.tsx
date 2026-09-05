import { motion, AnimatePresence } from 'motion/react';
import { Palette, Moon, Sun, Layout, Check } from 'lucide-react';
import { ThemeMode } from '../types';
import { triggerHaptic } from '../lib/capacitor';

interface AppearanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  isNavbarFloating: boolean;
  onToggleNavbarFloating: () => void;
}

export function AppearanceDrawer({
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  isNavbarFloating,
  onToggleNavbarFloating,
}: AppearanceDrawerProps) {
  const isDark = theme === 'dark';

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

          {/* Drawer sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`relative w-full max-w-lg mx-auto rounded-t-3xl pt-3 pb-8 px-6 shadow-2xl transition-colors duration-200 ${
              isDark ? 'bg-[#121214] text-white' : 'bg-white text-neutral-900'
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

            {/* Title Header */}
            <div className="flex items-center justify-between pb-4 border-b mb-5 border-neutral-200/60 dark:border-neutral-800/60">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isDark ? 'bg-[#202022] text-white' : 'bg-[#f0f1f4] text-neutral-800'
                  }`}
                >
                  <Palette className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h2 className="text-base font-bold tracking-tight">Appearance</h2>
                  <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Theme & layout customization
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* CARD 1: Theme Switcher Card */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-[#18181b] border-neutral-800/80'
                    : 'bg-[#f8f9fa] border-neutral-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isDark ? 'bg-[#27272a] text-amber-400' : 'bg-white text-amber-500 shadow-xs'
                      }`}
                    >
                      {isDark ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Color Theme</h3>
                      <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {isDark ? 'Dark Mode' : 'Light Mode'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Segmented Picker */}
                <div
                  className={`p-1 rounded-xl flex items-center gap-1 ${
                    isDark ? 'bg-[#101012]' : 'bg-[#eeeff2]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isDark) {
                        triggerHaptic('selection');
                        onToggleTheme();
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      !isDark
                        ? 'bg-white text-neutral-900 shadow-sm font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Light</span>
                    {!isDark && <Check className="w-3.5 h-3.5 ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isDark) {
                        triggerHaptic('selection');
                        onToggleTheme();
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      isDark
                        ? 'bg-[#27272a] text-white shadow-sm font-bold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Dark</span>
                    {isDark && <Check className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                </div>
              </div>

              {/* CARD 2: Navigation Bar Style Switch Card */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isDark
                    ? 'bg-[#18181b] border-neutral-800/80'
                    : 'bg-[#f8f9fa] border-neutral-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isDark ? 'bg-[#27272a] text-emerald-400' : 'bg-white text-emerald-600 shadow-xs'
                      }`}
                    >
                      <Layout className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">Navigation Bar Style</h3>
                      <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {isNavbarFloating ? 'Floating Capsule' : 'Static Docked (Default)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Segmented Picker */}
                <div
                  className={`p-1 rounded-xl flex items-center gap-1 ${
                    isDark ? 'bg-[#101012]' : 'bg-[#eeeff2]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isNavbarFloating) {
                        triggerHaptic('selection');
                        onToggleNavbarFloating();
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      !isNavbarFloating
                        ? isDark
                          ? 'bg-[#27272a] text-white shadow-sm font-bold'
                          : 'bg-white text-neutral-900 shadow-sm font-bold'
                        : isDark
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <span>Static Docked</span>
                    {!isNavbarFloating && <Check className="w-3.5 h-3.5 ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isNavbarFloating) {
                        triggerHaptic('selection');
                        onToggleNavbarFloating();
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      isNavbarFloating
                        ? isDark
                          ? 'bg-[#27272a] text-white shadow-sm font-bold'
                          : 'bg-white text-neutral-900 shadow-sm font-bold'
                        : isDark
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <span>Floating</span>
                    {isNavbarFloating && <Check className="w-3.5 h-3.5 ml-0.5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
