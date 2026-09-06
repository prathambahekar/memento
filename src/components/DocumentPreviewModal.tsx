import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { DocumentAttachment, ThemeMode } from '../types';
import { triggerHaptic } from '../lib/capacitor';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  document: DocumentAttachment | null;
  theme?: ThemeMode;
  onClose: () => void;
}

export function DocumentPreviewModal({
  isOpen,
  document,
  theme = 'dark',
  onClose,
}: DocumentPreviewModalProps) {
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !document) return null;

  const handleOpenInNewTab = () => {
    triggerHaptic('light');
    const win = window.open();
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${document.name}</title>
            <style>
              body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #0e0e10; }
              iframe { width: 100%; height: 100%; border: none; }
            </style>
          </head>
          <body>
            <iframe src="${document.dataUrl}"></iframe>
          </body>
        </html>
      `);
    }
  };

  const isPdf =
    document.name.toLowerCase().endsWith('.pdf') ||
    (document.dataUrl && document.dataUrl.startsWith('data:application/pdf'));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 cursor-zoom-out select-none"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-4xl h-[90vh] sm:h-[86vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden cursor-default transition-colors border ${
            isDark
              ? 'bg-[#141416] border-neutral-800 text-white shadow-black/80'
              : 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-300/60'
          }`}
        >
          {/* Header */}
          <div
            className={`px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 border-b ${
              isDark ? 'border-neutral-800/80 bg-[#161618]' : 'border-neutral-200/80 bg-neutral-50'
            }`}
          >
            {/* Left: Document Info */}
            <div className="flex items-center gap-3 min-w-0 pr-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isDark
                    ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/20'
                    : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold truncate leading-tight">
                  {document.name}
                </h3>
                <p
                  className={`text-[10.5px] truncate mt-0.5 ${
                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                  }`}
                >
                  {document.size || (isPdf ? 'PDF Document' : 'Document file')}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Download Button */}
              <a
                href={document.dataUrl}
                download={document.name}
                onClick={() => triggerHaptic('selection')}
                className={`h-8 px-3 sm:px-3.5 rounded-full flex items-center gap-1.5 font-medium text-xs transition-all active:scale-95 shadow-xs ${
                  isDark
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                }`}
                title="Download document"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.2]" />
                <span className="hidden xs:inline">Download</span>
              </a>

              {/* Open in New Tab Button */}
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  isDark
                    ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                    : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700 hover:text-neutral-900'
                }`}
                title="Open in new tab"
                aria-label="Open in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  isDark
                    ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                    : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700 hover:text-neutral-900'
                }`}
                title="Close (Esc)"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document Preview Content Container */}
          <div className="flex-1 w-full h-full relative overflow-hidden bg-neutral-950/20">
            {document.dataUrl ? (
              <iframe
                src={document.dataUrl}
                title={document.name}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <FileText className="w-12 h-12 text-neutral-500 mb-3" />
                <p className="text-sm font-medium text-neutral-400">Preview not available</p>
                <a
                  href={document.dataUrl}
                  download={document.name}
                  className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
