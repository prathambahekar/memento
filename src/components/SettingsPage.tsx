import { useState } from 'react';
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
  ShieldCheck,
} from 'lucide-react';
import { ThemeMode } from '../types';
import { NoteItem } from './EmptyBody';

interface SettingsPageProps {
  theme: ThemeMode;
  notes: NoteItem[];
  onBack: () => void;
  onToggleTheme: () => void;
  onClearAllNotes?: () => void;
}

export function SettingsPage({
  theme,
  notes,
  onBack,
  onToggleTheme,
  onClearAllNotes,
}: SettingsPageProps) {
  const isDark = theme === 'dark';
  const [activeModal, setActiveModal] = useState<'none' | 'data' | 'info'>('none');
  const [copiedNotification, setCopiedNotification] = useState(false);

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
      className={`relative w-full h-full min-h-[640px] flex flex-col transition-colors duration-200 ${
        isDark ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f4f6] text-neutral-900'
      }`}
    >
      {/* Top Bar with Back Button */}
      <header className="px-5 pt-4 pb-3 flex items-center justify-between z-10 shrink-0">
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
      <main className="flex-1 px-5 pt-2 pb-10 overflow-y-auto no-scrollbar space-y-6">
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
                v1.0.0
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
      <AnimatePresence>
        {activeModal === 'data' && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal('none')}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`relative w-full max-w-md mx-auto rounded-t-3xl pt-3 pb-8 px-5 shadow-2xl transition-colors ${
                isDark ? 'bg-[#121212] text-white' : 'bg-white text-neutral-900'
              }`}
            >
              <div className="flex justify-center pb-3">
                <div
                  className={`w-12 h-1 rounded-full ${
                    isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                  }`}
                />
              </div>

              <h4 className="text-lg font-bold tracking-tight mb-1">Data Management</h4>
              <p
                className={`text-xs mb-5 ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}
              >
                Export your notes to a standalone JSON backup file or clear your stored notes.
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleExportData}
                  className={`w-full p-3.5 rounded-2xl flex items-center justify-between active:scale-[0.99] transition-all font-semibold text-xs ${
                    isDark
                      ? 'bg-[#1e1e1e] text-white hover:bg-[#262626]'
                      : 'bg-[#f4f5f8] text-neutral-800 hover:bg-[#eaebef]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-emerald-500" />
                    <span>Download JSON Backup ({notes.length} notes)</span>
                  </div>
                  <span className="text-[11px] opacity-70">JSON</span>
                </button>

                {onClearAllNotes && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all notes?')) {
                        onClearAllNotes();
                        setActiveModal('none');
                      }
                    }}
                    className={`w-full p-3.5 rounded-2xl flex items-center justify-between active:scale-[0.99] transition-all font-semibold text-xs ${
                      isDark
                        ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-950/60'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      <span>Clear All Local Notes</span>
                    </div>
                    <span className="text-[11px] opacity-70">Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className={`w-full py-3 rounded-2xl text-xs font-bold active:scale-95 transition-all mt-2 ${
                    isDark
                      ? 'bg-[#202020] text-neutral-300 hover:text-white'
                      : 'bg-[#f0f1f4] text-neutral-700 hover:text-neutral-900'
                  }`}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL / SHEET: App Info */}
      <AnimatePresence>
        {activeModal === 'info' && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal('none')}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`relative w-full max-w-md mx-auto rounded-t-3xl pt-3 pb-8 px-5 shadow-2xl transition-colors ${
                isDark ? 'bg-[#121212] text-white' : 'bg-white text-neutral-900'
              }`}
            >
              <div className="flex justify-center pb-3">
                <div
                  className={`w-12 h-1 rounded-full ${
                    isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                  }`}
                />
              </div>

              <div className="flex flex-col items-center text-center py-3">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-sm ${
                    isDark ? 'bg-[#202020] text-white' : 'bg-neutral-900 text-white'
                  }`}
                >
                  <span className="text-xl font-bold tracking-tight">m</span>
                </div>
                <h4 className="text-base font-bold tracking-tight">memento</h4>
                <p
                  className={`text-xs mt-1 max-w-[260px] leading-relaxed ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  A minimal, distraction-free notebook built for swift thoughts and calm reflection.
                </p>

                <div
                  className={`w-full mt-5 p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                    isDark ? 'bg-[#1a1a1a]' : 'bg-[#f4f5f8]'
                  }`}
                >
                  <span className={isDark ? 'text-neutral-400' : 'text-neutral-500'}>
                    Version
                  </span>
                  <span>1.0.0</span>
                </div>

                <div
                  className={`w-full mt-2 p-3.5 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                    isDark ? 'bg-[#1a1a1a]' : 'bg-[#f4f5f8]'
                  }`}
                >
                  <span className={isDark ? 'text-neutral-400' : 'text-neutral-500'}>
                    Privacy
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-500">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Local Storage Only
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className={`w-full py-3 rounded-2xl text-xs font-bold active:scale-95 transition-all mt-5 ${
                    isDark
                      ? 'bg-white text-black hover:bg-neutral-200'
                      : 'bg-black text-white hover:bg-neutral-800'
                  }`}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
