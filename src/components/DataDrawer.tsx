import { useState, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  Download,
  Upload,
  Trash2,
  X,
  ChevronRight,
  Send,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { ThemeMode, NoteItem } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';

interface DataDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  notes: NoteItem[];
  onClose: () => void;
  onClearAllNotes?: () => void;
  onImportNotes?: (notes: NoteItem[]) => void;
}

type DrawerView = 'main' | 'export' | 'confirm_reset';

export function DataDrawer({
  isOpen,
  theme,
  notes,
  onClose,
  onClearAllNotes,
  onImportNotes,
}: DataDrawerProps) {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();
  const [currentView, setCurrentView] = useState<DrawerView>('main');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleExportToStorage = () => {
    const jsonString = JSON.stringify(notes, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const fileName = `memento-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);

    showToast(`Saved ${notes.length} notes to Downloads`);
  };

  const handleShareToApps = async () => {
    const jsonString = JSON.stringify(notes, null, 2);
    const fileName = `memento-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([jsonString], fileName, { type: 'application/json' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'memento Backup',
          text: `Backup of ${notes.length} notes from memento`,
        });
        showToast('Shared backup file successfully');
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'memento Backup',
          text: jsonString,
        });
        showToast('Shared backup successfully');
        return;
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard and trigger download
    try {
      await navigator.clipboard.writeText(jsonString);
      showToast('Copied JSON backup to clipboard');
    } catch {
      handleExportToStorage();
    }
  };

  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        let items: NoteItem[] = [];

        if (Array.isArray(parsed)) {
          items = parsed;
        } else if (parsed && Array.isArray(parsed.notes)) {
          items = parsed.notes;
        } else {
          throw new Error('Invalid backup schema');
        }

        if (items.length === 0) {
          showToast('Selected file has no notes');
          return;
        }

        onImportNotes?.(items);
        showToast(`Restored ${items.length} notes from backup`);
        onClose();
      } catch {
        showToast('Invalid backup file. Please choose a valid JSON file.');
      }
    };
    reader.readAsText(file);

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';
  };

  const handleConfirmReset = () => {
    onClearAllNotes?.();
    showToast('All data has been cleared');
    setCurrentView('main');
    onClose();
  };

  const handleClose = () => {
    setCurrentView('main');
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={handleClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Hidden JSON file input for Import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />

            {/* Dialog/Drawer Sheet matching user's design */}
            <motion.div
              initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
              animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
              exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
              transition={
                isDesktop
                  ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                  : { type: 'spring', damping: 28, stiffness: 300 }
              }
              className={`relative w-full max-w-md md:max-w-lg mx-auto rounded-t-3xl md:rounded-3xl pt-3 md:pt-6 pb-6 px-5 md:px-7 shadow-2xl transition-colors duration-200 ${
                isDark ? 'bg-[#121212] text-white' : 'bg-white text-neutral-900'
              }`}
            >
              {/* Top drag handle indicator (mobile only) */}
              <div className="flex justify-center pb-3 md:hidden">
                <div
                  className={`w-12 h-1 rounded-full ${
                    isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                  }`}
                />
              </div>

              {/* VIEW 1: MAIN DATA DRAWER */}
              {currentView === 'main' && (
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between py-1 mb-4">
                    <div className="flex items-center gap-3">
                      {/* Squircle Database icon container */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isDark
                            ? 'bg-[#1e1e1e] text-neutral-200'
                            : 'bg-[#f0f1f4] text-neutral-800'
                        }`}
                      >
                        <Database className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold tracking-tight leading-tight">
                          Data
                        </h3>
                        <p
                          className={`text-xs ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          Export, import, or manage local storage
                        </p>
                      </div>
                    </div>

                    {/* Square rounded close button with subtle border */}
                    <button
                      id="data-drawer-close-btn"
                      type="button"
                      onClick={handleClose}
                      aria-label="Close data menu"
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                        isDark
                          ? 'border-neutral-800 bg-[#1a1a1a] text-neutral-400 hover:text-white'
                          : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                      }`}
                    >
                      <X className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>

                  {/* 2-Column Action Cards (Export & Import) */}
                  <div className="grid grid-cols-2 gap-3.5 my-3">
                    {/* Export Card */}
                    <button
                      id="data-export-btn"
                      type="button"
                      onClick={() => setCurrentView('export')}
                      className={`p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all active:scale-[0.98] ${
                        isDark
                          ? 'bg-[#181818] hover:bg-[#202020] text-neutral-200'
                          : 'bg-[#f4f5f8] hover:bg-[#eceef2] text-neutral-800'
                      }`}
                    >
                      <Download className="w-7 h-7 stroke-[1.8] mb-2" />
                      <span className="text-sm font-bold tracking-tight">
                        Export
                      </span>
                      <span
                        className={`text-[11px] mt-0.5 leading-snug ${
                          isDark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        Save or share backup
                      </span>
                    </button>

                    {/* Import Card */}
                    <button
                      id="data-import-btn"
                      type="button"
                      onClick={handleTriggerImport}
                      className={`p-4 sm:p-5 rounded-2xl flex flex-col items-center justify-center text-center transition-all active:scale-[0.98] ${
                        isDark
                          ? 'bg-[#181818] hover:bg-[#202020] text-neutral-200'
                          : 'bg-[#f4f5f8] hover:bg-[#eceef2] text-neutral-800'
                      }`}
                    >
                      <Upload className="w-7 h-7 stroke-[1.8] mb-2" />
                      <span className="text-sm font-bold tracking-tight">
                        Import
                      </span>
                      <span
                        className={`text-[11px] mt-0.5 leading-snug ${
                          isDark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        Restore from backup
                      </span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div
                    className={`my-3 border-t ${
                      isDark ? 'border-neutral-800/80' : 'border-neutral-100'
                    }`}
                  />

                  {/* Reset all data button */}
                  <button
                    id="data-reset-btn"
                    type="button"
                    onClick={() => setCurrentView('confirm_reset')}
                    className="w-full flex items-center justify-between py-2 px-1 text-red-500 hover:opacity-80 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <Trash2 className="w-5 h-5 text-red-500 stroke-[1.8]" />
                      <span className="text-sm font-semibold text-red-500">
                        Reset all data
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>
              )}

              {/* VIEW 2: EXPORT BACKUP SUB-VIEW */}
              {currentView === 'export' && (
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between py-1 mb-4">
                    <div className="flex items-center gap-3">
                      {/* Squircle Download icon container */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isDark
                            ? 'bg-[#1e1e1e] text-neutral-200'
                            : 'bg-[#f0f1f4] text-neutral-800'
                        }`}
                      >
                        <Download className="w-5 h-5 stroke-[2]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold tracking-tight leading-tight">
                          Export Backup
                        </h3>
                        <p
                          className={`text-xs ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          Save or share your backup file
                        </p>
                      </div>
                    </div>

                    {/* Square rounded close button */}
                    <button
                      id="export-drawer-close-btn"
                      type="button"
                      onClick={() => setCurrentView('main')}
                      aria-label="Back to data menu"
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                        isDark
                          ? 'border-neutral-800 bg-[#1a1a1a] text-neutral-400 hover:text-white'
                          : 'border-neutral-200 bg-white text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                      }`}
                    >
                      <X className="w-4 h-4 stroke-[2]" />
                    </button>
                  </div>

                  {/* Stacked Options: Export to Storage & Share to Apps */}
                  <div className="space-y-2.5 my-3">
                    {/* Option 1: Export to Storage */}
                    <button
                      id="export-to-storage-btn"
                      type="button"
                      onClick={handleExportToStorage}
                      className={`w-full p-3.5 sm:p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.99] text-left ${
                        isDark
                          ? 'bg-[#181818] hover:bg-[#202020]'
                          : 'bg-[#f4f5f8] hover:bg-[#eceef2]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isDark
                              ? 'bg-neutral-800 text-neutral-200'
                              : 'bg-neutral-200/70 text-neutral-800'
                          }`}
                        >
                          <Download className="w-5 h-5 stroke-[2]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold tracking-tight">
                            Export to Storage
                          </div>
                          <div
                            className={`text-xs ${
                              isDark ? 'text-neutral-400' : 'text-neutral-500'
                            }`}
                          >
                            Save file directly to Downloads folder
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                    </button>

                    {/* Option 2: Share to Apps */}
                    <button
                      id="export-share-to-apps-btn"
                      type="button"
                      onClick={handleShareToApps}
                      className={`w-full p-3.5 sm:p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.99] text-left ${
                        isDark
                          ? 'bg-[#181818] hover:bg-[#202020]'
                          : 'bg-[#f4f5f8] hover:bg-[#eceef2]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#dcfce7] dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                          <Send className="w-4.5 h-4.5 -rotate-12 stroke-[2.2]" />
                        </div>
                        <div>
                          <div className="text-sm font-bold tracking-tight">
                            Share to Apps
                          </div>
                          <div
                            className={`text-xs ${
                              isDark ? 'text-neutral-400' : 'text-neutral-500'
                            }`}
                          >
                            Send via WhatsApp, Telegram, Drive, Email
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                    </button>
                  </div>

                  {/* Cancel Button */}
                  <div className="pt-2">
                    <button
                      id="export-cancel-btn"
                      type="button"
                      onClick={() => setCurrentView('main')}
                      className={`w-full py-3 rounded-2xl font-semibold text-xs tracking-tight transition-all active:scale-[0.99] ${
                        isDark
                          ? 'bg-[#1e1e1e] hover:bg-[#262626] text-neutral-300 hover:text-white'
                          : 'bg-[#f0f1f4] hover:bg-[#eaecee] text-neutral-800'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 3: CONFIRM RESET SUB-VIEW */}
              {currentView === 'confirm_reset' && (
                <div className="py-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-red-500">
                        Reset all data?
                      </h4>
                      <p
                        className={`text-xs ${
                          isDark ? 'text-neutral-400' : 'text-neutral-500'
                        }`}
                      >
                        This will permanently delete all {notes.length} note
                        {notes.length === 1 ? '' : 's'} from this device.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5 mt-4">
                    <button
                      type="button"
                      onClick={() => setCurrentView('main')}
                      className={`flex-1 py-3 rounded-2xl text-xs font-semibold active:scale-95 transition-all ${
                        isDark
                          ? 'bg-[#1e1e1e] text-neutral-300'
                          : 'bg-[#f0f1f4] text-neutral-700'
                      }`}
                    >
                      Keep Notes
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReset}
                      className="flex-1 py-3 rounded-2xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white active:scale-95 transition-all shadow-sm"
                    >
                      Delete Everything
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
