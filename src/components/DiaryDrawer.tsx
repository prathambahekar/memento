import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  FileText,
  X,
  Trash2,
  Calendar,
  Mic,
  Copy,
  Check,
  Pencil,
  Play,
  Pause,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ThemeMode, NoteItem, VoiceNoteAttachment } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { triggerHaptic } from '../lib/capacitor';

// Fallback audio tone generator in case note doesn't have an audio file url
function createSampleAudioBlob(): Blob {
  const sampleRate = 44100;
  const duration = 2.5;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 460 + Math.sin(t * 8) * 90;
    const decay = Math.exp(-t * 0.9);
    const sample = Math.sin(2 * Math.PI * freq * t) * decay * 0.35;
    const s = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

interface DiaryDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  note: NoteItem | null;
  onClose: () => void;
  onEdit?: (note: NoteItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onUpdateNote?: (updatedNote: NoteItem) => void;
}

export function DiaryDrawer({
  isOpen,
  theme,
  note,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onUpdateNote,
}: DiaryDrawerProps) {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();
  const [copied, setCopied] = useState(false);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setActivePlayingId(null);
      setPlaybackTime(0);
    };
  }, [note]);

  if (!note) return null;

  const allVoiceNotes: VoiceNoteAttachment[] =
    note.voiceNotes && note.voiceNotes.length > 0
      ? note.voiceNotes
      : note.voiceAudioUrl || note.hasVoiceNote
      ? [
          {
            id: 'vn-main',
            audioUrl: note.voiceAudioUrl || '',
            duration: note.voiceDuration || '0:15',
            name: 'Voice Note',
          },
        ]
      : [];

  const allImages: string[] =
    note.images && note.images.length > 0
      ? note.images
      : note.imageUrl
      ? [note.imageUrl]
      : [];

  const togglePlayVoiceNote = (vn: VoiceNoteAttachment) => {
    if (activePlayingId === vn.id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current
          .play()
          .then(() => {
            setActivePlayingId(vn.id);
            triggerHaptic('selection');
          })
          .catch((e) => {
            console.warn('Audio play error:', e);
          });
      } else {
        audioRef.current.pause();
        setActivePlayingId(null);
        triggerHaptic('selection');
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const url = vn.audioUrl || URL.createObjectURL(createSampleAudioBlob());
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.currentTime = 0;
    setPlaybackTime(0);

    audio.ontimeupdate = () => {
      setPlaybackTime(Math.floor(audio.currentTime));
    };

    audio.onended = () => {
      setActivePlayingId(null);
      setPlaybackTime(0);
      triggerHaptic('light');
    };

    audio
      .play()
      .then(() => {
        setActivePlayingId(vn.id);
        triggerHaptic('selection');
      })
      .catch((e) => {
        console.warn('Audio play error:', e);
        setActivePlayingId(null);
      });
  };

  const handleToggleContentCheckbox = (lineIndex: number) => {
    if (!note.content) return;
    const lines = note.content.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    const targetLine = lines[lineIndex];
    const match = targetLine.match(/^(\s*[-*•]?\s*\[)( |x|X)(\]\s*.*)$/);
    if (match) {
      const currentCompleted = match[2].toLowerCase() === 'x';
      const newMark = currentCompleted ? ' ' : 'x';
      lines[lineIndex] = `${match[1]}${newMark}${match[3]}`;
      const newContent = lines.join('\n');
      triggerHaptic('selection');
      if (onUpdateNote) {
        onUpdateNote({
          ...note,
          content: newContent,
        });
      }
    }
  };

  const handleCopy = () => {
    const fullText = `${note.title}\n\n${note.content || ''}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-6 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Drawer / Modal Sheet */}
          <motion.div
            initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
            transition={
              isDesktop
                ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                : { type: 'spring', damping: 30, stiffness: 340 }
            }
            className={`relative w-full max-w-md md:max-w-lg mx-auto rounded-t-[28px] md:rounded-[28px] pt-3 md:pt-6 pb-6 px-5 md:px-7 shadow-2xl flex flex-col max-h-[88vh] md:max-h-[82vh] overflow-hidden transition-colors ${
              isDark ? 'bg-[#121212] text-white' : 'bg-[#ffffff] text-neutral-900'
            }`}
          >
            {/* Top drag handle (mobile only) */}
            <div className="flex justify-center pb-2 md:hidden">
              <div
                className={`w-9 h-1 rounded-full ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                }`}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between py-2 border-b border-transparent">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-[#1e1e1e] text-neutral-200' : 'bg-neutral-100 text-neutral-800'
                  }`}
                >
                  {note.entryType === 'notes' ? (
                    <FileText className="w-5 h-5 stroke-[2]" />
                  ) : (
                    <BookOpen className="w-5 h-5 stroke-[2]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold tracking-tight truncate leading-tight">
                    {note.title}
                  </h2>
                  <div
                    className={`text-[11.5px] flex items-center gap-1.5 mt-0.5 ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {note.date}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onEdit && (
                  <button
                    id="diary-drawer-edit-btn"
                    type="button"
                    onClick={() => onEdit(note)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                      isDark
                        ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                    }`}
                    aria-label="Edit note"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}

                {onDelete && (
                  <button
                    id="diary-drawer-delete-btn"
                    type="button"
                    onClick={() => {
                      onDelete(note.id);
                      onClose();
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all text-neutral-400 hover:text-red-400 ${
                      isDark
                        ? 'bg-[#1e1e1e] hover:bg-red-500/10'
                        : 'bg-neutral-100 hover:bg-red-50'
                    }`}
                    aria-label="Delete note"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  id="diary-drawer-close-btn"
                  type="button"
                  onClick={onClose}
                  className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                    isDark
                      ? 'bg-[#1e1e1e] text-neutral-300 hover:text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                  aria-label="Close"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note Content Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 py-3 my-1">
              {/* Voice Notes List */}
              {allVoiceNotes.length > 0 && (
                <div className="space-y-2">
                  <div
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1 ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    Voice Notes ({allVoiceNotes.length})
                  </div>

                  {allVoiceNotes.map((vn, idx) => {
                    const isThisPlaying = activePlayingId === vn.id;
                    return (
                      <div
                        key={vn.id || idx}
                        className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-colors ${
                          isDark
                            ? 'bg-[#1a1a1a] border-neutral-800 text-white'
                            : 'bg-emerald-50/70 border-emerald-200 text-neutral-900 shadow-sm'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => togglePlayVoiceNote(vn)}
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-sm ${
                            isThisPlaying
                              ? 'bg-emerald-500 text-white shadow-emerald-500/25 shadow-md'
                              : isDark
                              ? 'bg-[#262626] hover:bg-[#323232] text-emerald-400'
                              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                          }`}
                          title={isThisPlaying ? 'Pause voice memo' : 'Play voice memo'}
                          aria-label={isThisPlaying ? 'Pause voice memo' : 'Play voice memo'}
                        >
                          {isThisPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold tracking-tight truncate flex items-center gap-1.5">
                              <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{vn.name || `Voice Note ${idx + 1}`}</span>
                            </span>
                            <span className="text-[11px] font-mono text-neutral-400 shrink-0 ml-2">
                              {isThisPlaying
                                ? `${Math.floor(playbackTime / 60)}:${(playbackTime % 60)
                                    .toString()
                                    .padStart(2, '0')} / ${vn.duration || '0:15'}`
                                : vn.duration || '0:15'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 h-3">
                            {[40, 75, 100, 60, 30, 85, 95, 50, 70, 40, 90, 60, 35, 80, 100, 65, 45, 85].map(
                              (heightPercent, barIdx) => (
                                <div
                                  key={barIdx}
                                  className={`flex-1 rounded-full transition-all duration-150 ${
                                    isThisPlaying
                                      ? 'bg-emerald-400'
                                      : isDark
                                      ? 'bg-neutral-700'
                                      : 'bg-emerald-300'
                                  }`}
                                  style={{
                                    height: isThisPlaying
                                      ? `${Math.max(
                                          20,
                                          Math.min(
                                            100,
                                            heightPercent *
                                              (0.35 +
                                                Math.abs(Math.sin(barIdx * 0.8 + playbackTime * 4)) *
                                                  0.7)
                                          )
                                        )}%`
                                      : `${Math.max(25, heightPercent * 0.45)}%`,
                                  }}
                                />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Photos Gallery */}
              {allImages.length > 0 && (
                <div className="space-y-2">
                  <div
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1 ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    Attached Photos ({allImages.length})
                  </div>
                  <div
                    className={`grid gap-2 ${
                      allImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                    }`}
                  >
                    {allImages.map((imgSrc, imgIdx) => (
                      <div
                        key={imgIdx}
                        className="rounded-2xl overflow-hidden max-h-60 border border-neutral-800 bg-neutral-900/40"
                      >
                        <img
                          src={imgSrc}
                          alt={`${note.title} photo ${imgIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Note Text Content (Only show if note has text content, or if note has no media at all) */}
              {(note.content?.trim() || (allVoiceNotes.length === 0 && allImages.length === 0)) && (
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl transition-colors ${
                    isDark ? 'bg-[#181818]' : 'bg-neutral-100/80'
                  }`}
                >
                  {note.content?.trim() && (
                    <div className="flex items-center justify-end mb-2">
                      <button
                        id="diary-card-copy-btn"
                        type="button"
                        onClick={handleCopy}
                        className={`h-6 px-2 rounded-lg flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all ${
                          copied
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isDark
                            ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                            : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                        }`}
                        title={copied ? 'Copied' : 'Copy'}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {note.content?.trim() ? (
                    <div
                      className={`leading-relaxed text-sm ${
                        isDark ? 'text-neutral-200' : 'text-neutral-800'
                      }`}
                    >
                      {note.content.split('\n').map((line, lIdx) => {
                        const match = line.match(/^(\s*[-*•]?\s*\[)( |x|X)(\]\s*)(.*)$/);
                        if (match) {
                          const isCompleted = match[2].toLowerCase() === 'x';
                          const taskText = match[4];
                          return (
                            <div
                              key={lIdx}
                              className="flex items-start gap-2.5 my-1 text-sm group cursor-pointer"
                              onClick={() => handleToggleContentCheckbox(lIdx)}
                            >
                              <button
                                type="button"
                                className={`w-4 h-4 mt-0.5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                  isCompleted
                                    ? isDark
                                      ? 'bg-emerald-500 text-white'
                                      : 'bg-emerald-600 text-white'
                                    : isDark
                                    ? 'bg-[#262626] border border-neutral-700 hover:border-neutral-500'
                                    : 'bg-neutral-200 border border-neutral-300 hover:border-neutral-400'
                                }`}
                              >
                                {isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                              </button>
                              <span
                                className={`flex-1 break-words ${
                                  isCompleted
                                    ? 'line-through text-neutral-500'
                                    : isDark
                                    ? 'text-neutral-200'
                                    : 'text-neutral-800'
                                }`}
                              >
                                {taskText}
                              </span>
                            </div>
                          );
                        }
                        if (!line.trim()) {
                          return <div key={lIdx} className="h-2" />;
                        }
                        return (
                          <p key={lIdx} className="whitespace-pre-wrap leading-relaxed">
                            {line}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500 italic">
                      No content written in this note.
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
