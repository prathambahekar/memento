import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Palette,
  Database,
  Info,
  ChevronRight,
  Download,
  Trash2,
  Check,
  Moon,
  Sun,
  X,
} from 'lucide-react';
import { ThemeMode } from '../types';
import { NoteItem } from './EmptyBody';
import { DataDrawer } from './DataDrawer';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { getAppVersion } from '../lib/capacitor';

interface SettingsPageProps {
  theme: ThemeMode;
  notes: NoteItem[];
  onBack: () => void;
  onToggleTheme: () => void;
  onClearAllNotes?: () => void;
  onImportNotes?: (notes: NoteItem[]) => void;
}

export function SettingsPage({
  theme,
  notes,
  onBack,
  onToggleTheme,
  onClearAllNotes,
  onImportNotes,
}: SettingsPageProps) {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();
  const [activeModal, setActiveModal] = useState<'none' | 'data' | 'info'>('none');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [appInfo, setAppInfo] = useState<{ name: string; version: string; build: string }>({
    name: 'Memento',
    version: '1.0.0',
    build: '1',
  });

  useEffect(() => {
    getAppVersion().then(setAppInfo).catch(() => {});
  }, []);

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `memento-notes-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`relative w-full h-full flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f4f6] text-neutral-900'
      }`}
    >
      {/* Top Bar with Back Button */}
      <header className="px-5 md:px-8 pt-4 md:pt-6 pb-3 flex items-center justify-between z-10 shrink-0 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <button
            id="settings-back-btn"
            type="button"
            onClick={onBack}
            aria-label="Back"
            className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-all ${
              isDark
                ? 'bg-[#181818] text-neutral-300 hover:text-white hover:bg-[#222222]'
                : 'bg-white text-neutral-700 hover:text-neutral-900 hover:bg-[#eceef2] shadow-sm'
            }`}
          >
            <ArrowLeft className="w-5 h-5 stroke-[2]" />
          </button>
          <h2 className="text-xl font-bold tracking-tight">Settings</h2>
        </div>
      </header>

      {/* Main Settings Content List */}
      <main className="flex-1 min-h-0 max-w-2xl mx-auto w-full px-5 md:px-8 pt-2 md:pt-6 pb-28 md:pb-10 overflow-y-auto overscroll-contain no-scrollbar space-y-6">
        {/* SECTION 1: APPEARANCE */}
        <section>
          <div
            className={`text-[11px] font-bold tracking-wider uppercase mb-2.5 px-1 ${
              isDark ? 'text-neutral-500' : 'text-neutral-500'
            }`}
          >
            GENERAL & CUSTOMIZATION
          </div>

          <div
            id="setting-appearance-card"
            onClick={onToggleTheme}
            role="button"
            tabIndex={0}
            className={`w-full p-4 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-sm ${
              isDark
                ? 'bg-[#141414] hover:bg-[#1a1a1a] text-white'
                : 'bg-white hover:bg-neutral-50/90 border border-neutral-200/80 text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              {/* Left icon box */}
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-[#202020] text-white' : 'bg-[#f0f1f4] text-neutral-800'
                }`}
              >
                <Palette className="w-5 h-5 stroke-[1.8]" />
              </div>

              {/* Title & Description */}
              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-tight truncate leading-snug">
                  Appearance & Theme
                </h3>
                <p
                  className={`text-xs truncate ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  {isDark ? 'Dark Mode active' : 'Light Mode active'} · Tap to switch
                </p>
              </div>
            </div>

            {/* Right pill & chevron */}
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-[#202020] text-neutral-200'
                    : 'bg-[#f0f1f4] text-neutral-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isDark ? 'bg-neutral-300' : 'bg-amber-500'
                  }`}
                />
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </span>
              <ChevronRight
                className={`w-4 h-4 ${
                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: DATA & STORAGE */}
        <section>
          <div
            className={`text-[11px] font-bold tracking-wider uppercase mb-2.5 px-1 ${
              isDark ? 'text-neutral-500' : 'text-neutral-500'
            }`}
          >
            DATA & STORAGE
          </div>

          <div
            id="setting-data-card"
            onClick={() => setActiveModal('data')}
            role="button"
            tabIndex={0}
            className={`w-full p-4 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-sm ${
              isDark
                ? 'bg-[#141414] hover:bg-[#1a1a1a] text-white'
                : 'bg-white hover:bg-neutral-50/90 border border-neutral-200/80 text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-[#202020] text-white' : 'bg-[#f0f1f4] text-neutral-800'
                }`}
              >
                <Database className="w-5 h-5 stroke-[1.8]" />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-tight truncate leading-snug">
                  Data Management
                </h3>
                <p
                  className={`text-xs truncate ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  {notes.length} note{notes.length === 1 ? '' : 's'} stored · Export, backup & clear
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isDark
                    ? 'bg-[#202020] text-neutral-200'
                    : 'bg-[#f0f1f4] text-neutral-700'
                }`}
              >
                Backup & Export
              </span>
              <ChevronRight
                className={`w-4 h-4 ${
                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              />
            </div>
          </div>
        </section>

        {/* SECTION 3: SYSTEM & APP INFO */}
        <section>
          <div
            className={`text-[11px] font-bold tracking-wider uppercase mb-2.5 px-1 ${
              isDark ? 'text-neutral-500' : 'text-neutral-500'
            }`}
          >
            SYSTEM & INFO
          </div>

          <div
            id="setting-info-card"
            onClick={() => setActiveModal('info')}
            role="button"
            tabIndex={0}
            className={`w-full p-4 rounded-2xl flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all shadow-sm ${
              isDark
                ? 'bg-[#141414] hover:bg-[#1a1a1a] text-white'
                : 'bg-white hover:bg-neutral-50/90 border border-neutral-200/80 text-neutral-900'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-2">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-[#202020] text-white' : 'bg-[#f0f1f4] text-neutral-800'
                }`}
              >
                <Info className="w-5 h-5 stroke-[1.8]" />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-tight truncate leading-snug">
                  App Info
                </h3>
                <p
                  className={`text-xs truncate ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  memento · Minimal offline notebook
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isDark
                    ? 'bg-[#202020] text-neutral-200'
                    : 'bg-[#f0f1f4] text-neutral-700'
                }`}
              >
                v{appInfo.version}
              </span>
              <ChevronRight
                className={`w-4 h-4 ${
                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Export notification toast */}
      <AnimatePresence>
        {copiedNotification && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Backup downloaded successfully</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL / SHEET: Data Management */}
      <DataDrawer
        isOpen={activeModal === 'data'}
        theme={theme}
        notes={notes}
        onClose={() => setActiveModal('none')}
        onClearAllNotes={onClearAllNotes}
        onImportNotes={onImportNotes}
      />

      {/* MODAL / SHEET: App Info */}
      <AnimatePresence>
        {activeModal === 'info' && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal('none')}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
              animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
              exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
              transition={
                isDesktop
                  ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                  : { type: 'spring', damping: 28, stiffness: 300 }
              }
              className={`relative w-full max-w-md md:max-w-lg mx-auto rounded-t-3xl md:rounded-3xl pt-3 md:pt-6 pb-6 px-5 md:px-7 shadow-2xl transition-colors ${
                isDark ? 'bg-[#121212] text-white' : 'bg-white text-neutral-900'
              }`}
            >
              {/* Drag indicator (mobile only) */}
              <div className="flex justify-center pb-2 md:hidden">
                <div
                  className={`w-12 h-1 rounded-full ${
                    isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                  }`}
                />
              </div>

              {/* Header row with Close button */}
              <div className="flex items-center justify-between py-1 mb-3">
                <span
                  className={`text-[11px] font-bold tracking-wider uppercase ${
                    isDark ? 'text-neutral-500' : 'text-neutral-500'
                  }`}
                >
                  App Info
                </span>
                <button
                  id="info-drawer-close-btn"
                  type="button"
                  onClick={() => setActiveModal('none')}
                  aria-label="Close app info"
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                    isDark
                      ? 'border-neutral-800 bg-[#1a1a1a] text-neutral-400 hover:text-white'
                      : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                  }`}
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              </div>

              {/* Logo & Name at left, Description at right */}
              <div className="flex items-center justify-between gap-4 py-2">
                {/* Left: Logo and App Name */}
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${
                      isDark
                        ? 'bg-[#1e1e1e] text-white border border-neutral-800/60'
                        : 'bg-neutral-900 text-white'
                    }`}
                  >
                    <span className="text-xl font-bold tracking-tight">m</span>
                  </div>
                  <div>
                    <h4 className="text-base font-bold tracking-tight leading-tight">
                      memento
                    </h4>
                  </div>
                </div>

                {/* Right: Description */}
                <p
                  className={`text-xs text-right leading-relaxed max-w-[210px] ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  A minimal, distraction-free notebook built for swift thoughts and calm reflection.
                </p>
              </div>

              {/* Version */}
              <div
                className={`w-full mt-3 p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                  isDark ? 'bg-[#181818]' : 'bg-[#f4f5f8]'
                }`}
              >
                <span className={isDark ? 'text-neutral-400' : 'text-neutral-500'}>
                  Version
                </span>
                <span className="font-mono">{appInfo.version}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
