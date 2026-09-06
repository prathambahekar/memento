import { motion, AnimatePresence } from 'motion/react';
import { X, Download } from 'lucide-react';
import { useEffect } from 'react';

interface ImageLightboxProps {
  isOpen: boolean;
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ isOpen, src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 cursor-zoom-out select-none"
      >
        {/* Top Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {/* Download Image Button */}
          <a
            href={src}
            download={alt ? `${alt.replace(/[^a-zA-Z0-9_-]/g, '_')}.png` : 'memento_image.png'}
            onClick={(e) => e.stopPropagation()}
            className="h-10 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-all shadow-lg active:scale-95 text-xs font-medium backdrop-blur-md"
            title="Download image"
            aria-label="Download image"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </a>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-lg active:scale-95 backdrop-blur-md"
            aria-label="Close fullscreen preview"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fullscreen Image Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-full max-h-full flex items-center justify-center cursor-default"
        >
          <img
            src={src}
            alt={alt || 'Fullscreen preview'}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
