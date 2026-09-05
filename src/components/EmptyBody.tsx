import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { TouchEvent, MouseEvent } from 'react';
import { motion } from 'motion/react';
import {
  Feather,
  Plus,
  ListTodo,
  Shield,
  Bookmark,
  Mic,
  KeyRound,
  BookOpen,
  Archive,
  Check,
  Image as ImageIcon,
  GripVertical,
} from 'lucide-react';
import { NavTab, ThemeMode, NoteItem, TodoSubItem } from '../types';
import { parseTodoItemsFromNote } from './TodoDrawer';
import { CardContextMenu } from './CardContextMenu';
import { triggerHaptic, isNativePlatform } from '../lib/capacitor';
import { capitalizeFirstChar } from '../lib/formatters';

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
    const sample = Math.sin(2 * Math.PI * 440 * t) * 0.15;
    const val = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, val < 0 ? val * 0x8000 : val * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function useColumnCount() {
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === 'undefined') return 2;
    const w = window.innerWidth;
    if (w >= 1536) return 5;
    if (w >= 1024) return 4;
    if (w >= 768) return 3;
    if (w >= 640) return 2;
    return 2;
  });

  useEffect(() => {
    const updateColumns = () => {
      const w = window.innerWidth;
      let count = 2;
      if (w >= 1536) count = 5;
      else if (w >= 1024) count = 4;
      else if (w >= 768) count = 3;
      else if (w >= 640) count = 2;
      else count = 2;
      setColumnCount((prev) => (prev !== count ? count : prev));
    };

    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  return columnCount;
}

export type { NoteItem };

interface EmptyBodyProps {
  activeTab: NavTab;
  theme: ThemeMode;
  notes: NoteItem[];
  searchQuery: string;
  isReorderMode?: boolean;
  onOpenNewNote: () => void;
  onSelectNote?: (note: NoteItem) => void;
  onToggleTodoItem?: (noteId: string, itemId: string) => void;
  onEditNote?: (note: NoteItem) => void;
  onDeleteNote?: (noteId: string) => void;
  onToggleFavorite?: (noteId: string) => void;
  onUpdateNote?: (updatedNote: NoteItem) => void;
  onReorderNotes?: (reorderedNotes: NoteItem[]) => void;
}

function reorderNotesWithFilter(
  allNotes: NoteItem[],
  draggedId: string,
  targetId: string
): NoteItem[] {
  if (!draggedId || !targetId || draggedId === targetId) return allNotes;

  const draggedIndex = allNotes.findIndex((n) => n.id === draggedId);
  const targetIndex = allNotes.findIndex((n) => n.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1) return allNotes;

  const result = [...allNotes];
  const [removed] = result.splice(draggedIndex, 1);
  const newTargetIndex = result.findIndex((n) => n.id === targetId);

  if (newTargetIndex !== -1) {
    result.splice(newTargetIndex, 0, removed);
  } else {
    result.splice(targetIndex, 0, removed);
  }

  return result;
}

function getCleanNonTodoContent(note: NoteItem): string {
  if (note.entryType !== 'todo' && !note.isTodo) return note.content || '';
  if (!note.content) return '';
  const cleaned = note.content
    .replace(/\[(x|X|\s*)\]\s*[^\[\n\r]*/g, '')
    .split('\n')
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
  return cleaned;
}

function InteractiveNoteContent({
  content,
  isDark,
  onToggleCheckbox,
}: {
  content: string;
  isDark: boolean;
  onToggleCheckbox?: (lineIndex: number) => void;
}) {
  const lines = content.split('\n');
  const hasCheckboxes = lines.some((l) => /^\s*[-*•]?\s*\[(?: |x|X)\]/.test(l));

  if (!hasCheckboxes) {
    return (
      <p
        className={`text-xs line-clamp-8 leading-relaxed break-words whitespace-pre-line ${
          isDark ? 'text-neutral-400' : 'text-neutral-600'
        }`}
      >
        {content}
      </p>
    );
  }

  return (
    <div className="space-y-1 my-1">
      {lines.map((line, idx) => {
        const match = line.match(/^(\s*[-*•]?\s*\[)( |x|X)(\]\s*)(.*)$/);
        if (match) {
          const isCompleted = match[2].toLowerCase() === 'x';
          const taskText = match[4];
          return (
            <div
              key={`task-${idx}`}
              className="flex items-start gap-2 text-xs leading-relaxed group/item"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleCheckbox) {
                  onToggleCheckbox(idx);
                }
              }}
            >
              <button
                type="button"
                className={`w-3.5 h-3.5 mt-0.5 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isDark
                    ? 'border border-neutral-600 hover:border-neutral-400 bg-transparent'
                    : 'border border-neutral-300 hover:border-neutral-400 bg-transparent'
                }`}
                title={isCompleted ? 'Mark pending' : 'Mark done'}
              >
                {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </button>
              <span
                className={`flex-1 break-words ${
                  isCompleted
                    ? 'line-through text-neutral-500'
                    : isDark
                    ? 'text-neutral-300'
                    : 'text-neutral-700'
                }`}
              >
                {taskText}
              </span>
            </div>
          );
        }
        if (!line.trim()) {
          return <div key={`spacer-${idx}`} className="h-1.5" />;
        }
        return (
          <p
            key={`line-${idx}`}
            className={`text-xs leading-relaxed break-words ${
              isDark ? 'text-neutral-400' : 'text-neutral-600'
            }`}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

interface NoteCardProps {
  key?: React.Key;
  note: NoteItem;
  theme: ThemeMode;
  onSelectNote?: (note: NoteItem) => void;
  onToggleTodoItem?: (noteId: string, itemId: string) => void;
  onOpenContextMenu: (note: NoteItem, x: number, y: number) => void;
  onUpdateNote?: (updatedNote: NoteItem) => void;
  isReorderMode?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  suppressCardClickUntil?: number;
  onDragStartCard?: (e: React.DragEvent<HTMLDivElement>, noteId: string) => void;
  onDragOverCard?: (e: React.DragEvent<HTMLDivElement>, noteId: string) => void;
  onDragLeaveCard?: (e: React.DragEvent<HTMLDivElement>, noteId: string) => void;
  onDropCard?: (e: React.DragEvent<HTMLDivElement>, noteId: string) => void;
  onDragEndCard?: (e: React.DragEvent<HTMLDivElement>) => void;
  onTouchStartCard?: (e: React.TouchEvent<HTMLDivElement>, noteId: string) => void;
  onTouchMoveCard?: (e: React.TouchEvent<HTMLDivElement>) => void;
  onTouchEndCard?: () => void;
}

function NoteCard({
  note,
  theme,
  onSelectNote,
  onToggleTodoItem,
  onOpenContextMenu,
  onUpdateNote,
  isReorderMode = false,
  isDragging,
  isDragOver,
  suppressCardClickUntil = 0,
  onDragStartCard,
  onDragOverCard,
  onDragLeaveCard,
  onDropCard,
  onDragEndCard,
  onTouchStartCard,
  onTouchMoveCard,
  onTouchEndCard,
}: NoteCardProps) {
  const isDark = theme === 'dark';
  const isPassKey = note.entryType === 'passwords' || !!note.isSafe;
  const isTodo = note.entryType === 'todo' || !!note.isTodo;
  const isDiary = note.entryType === 'diary' || !!note.isDiary;
  const todoItems: TodoSubItem[] = isTodo ? parseTodoItemsFromNote(note) : [];
  const completedCount = todoItems.filter((t) => t.completed).length;
  const totalCount = todoItems.length;
  const cleanContent = getCleanNonTodoContent(note);

  const allImages = note.images && note.images.length > 0 ? note.images : note.imageUrl ? [note.imageUrl] : [];
  const voiceCount = note.voiceNotes && note.voiceNotes.length > 0 ? note.voiceNotes.length : note.hasVoiceNote ? 1 : 0;

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleTogglePlayVoice = (e: MouseEvent) => {
    e.stopPropagation();
    const primaryUrl =
      note.voiceNotes?.[0]?.audioUrl ||
      note.voiceAudioUrl ||
      URL.createObjectURL(createSampleAudioBlob());

    if (!audioRef.current) {
      const audio = new Audio(primaryUrl);
      audioRef.current = audio;
      audio.ontimeupdate = () => {
        setPlaybackTime(Math.floor(audio.currentTime));
      };
      audio.onended = () => {
        setIsPlayingAudio(false);
        setPlaybackTime(0);
        triggerHaptic('light');
      };
    }

    const audio = audioRef.current;
    if (isPlayingAudio) {
      audio.pause();
      setIsPlayingAudio(false);
      triggerHaptic('selection');
    } else {
      audio
        .play()
        .then(() => {
          setIsPlayingAudio(true);
          triggerHaptic('selection');
        })
        .catch((err) => {
          console.warn('Audio card playback error:', err);
          setIsPlayingAudio(false);
        });
    }
  };

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const lastTouchTimeRef = useRef<number>(0);

  const isMobileOrTouchEnvironment = () => {
    if (isNativePlatform()) return true;
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  };

  const handleCardClick = () => {
    if (isReorderMode) return;
    if (Date.now() < suppressCardClickUntil) return;
    if (isDragging) return;
    onSelectNote?.(note);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // On mobile or touch interactions, holding a card must NOT open the context menu.
    // It is reserved for hold-to-reorder, while context menu is strictly for desktop mouse right-click.
    const isTouchSource =
      Date.now() - lastTouchTimeRef.current < 1500 ||
      (e.nativeEvent as any)?.pointerType === 'touch' ||
      (e.nativeEvent as any)?.sourceCapabilities?.firesTouchEvents === true;

    if (isMobileOrTouchEnvironment() || isTouchSource) {
      return;
    }

    onOpenContextMenu(note, e.clientX, e.clientY);
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

  return (
    <motion.div
      data-note-id={note.id}
      draggable={!isTouchDevice}
      style={{ WebkitTouchCallout: 'none' }}
      onDragStart={(e) => onDragStartCard?.(e as any, note.id)}
      onDragOver={(e) => onDragOverCard?.(e as any, note.id)}
      onDragLeave={(e) => onDragLeaveCard?.(e as any, note.id)}
      onDrop={(e) => onDropCard?.(e as any, note.id)}
      onDragEnd={(e) => onDragEndCard?.(e as any)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleCardClick}
      onContextMenu={handleContextMenu}
      onTouchStart={(e) => {
        lastTouchTimeRef.current = Date.now();
        onTouchStartCard?.(e, note.id);
      }}
      onTouchMove={onTouchMoveCard}
      onTouchEnd={onTouchEndCard}
      onTouchCancel={onTouchEndCard}
      className={`group relative w-full p-3.5 sm:p-4 rounded-2xl transition-all ${
        isTouchDevice ? '' : 'cursor-grab active:cursor-grabbing'
      } shadow-xs border select-none ${
        isDragging
          ? 'scale-[1.03] ring-2 ring-emerald-500 border-emerald-500 shadow-2xl z-30 opacity-95 bg-emerald-500/10'
          : isDragOver
          ? 'ring-2 ring-emerald-400 border-emerald-400 scale-[0.98] shadow-lg z-20'
          : isDark
          ? 'bg-[#141416] text-neutral-100 hover:bg-[#18181b] border-neutral-800/80 hover:border-neutral-700/80 hover:shadow-md'
          : 'bg-white text-neutral-900 hover:bg-[#fafafc] border-neutral-200/80 hover:border-neutral-300 hover:shadow-md'
      }`}
    >
      {/* Drop Target Indicator Bar */}
      {isDragOver && (
        <div className="absolute inset-x-2 -top-1.5 h-1 bg-emerald-500 rounded-full shadow-md shadow-emerald-500/50 animate-pulse pointer-events-none z-30" />
      )}

      <div className="flex items-start justify-between gap-2">
        <h3
          className={`text-sm font-semibold tracking-tight leading-snug line-clamp-2 min-w-0 flex-1 break-words ${
            isDark ? 'text-white' : 'text-neutral-900'
          }`}
        >
          {capitalizeFirstChar(note.title)}
        </h3>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Category / Security Badge */}
          {isPassKey && (
            <span
              className={`inline-flex items-center justify-center w-5 h-5 md:w-auto md:h-auto md:px-2 md:py-0.5 md:gap-1 text-[10px] font-medium rounded-full shrink-0 ${
                isDark
                  ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
                  : 'bg-amber-100 text-amber-800 border border-amber-200/80'
              }`}
              title="Key"
            >
              <KeyRound className="w-3 h-3 md:w-2.5 md:h-2.5 text-amber-500 dark:text-amber-300 shrink-0" />
              <span className="hidden md:inline">Key</span>
            </span>
          )}

          {isDiary && (
            <span
              className={`inline-flex items-center justify-center w-5 h-5 md:w-auto md:h-auto md:px-2 md:py-0.5 md:gap-1 text-[10px] font-medium rounded-full shrink-0 ${
                isDark
                  ? 'bg-purple-500/10 text-purple-200 border border-purple-500/20'
                  : 'bg-purple-100 text-purple-800 border border-purple-200/80'
              }`}
              title="Diary"
            >
              <BookOpen className="w-3 h-3 md:w-2.5 md:h-2.5 text-purple-500 dark:text-purple-300 shrink-0" />
              <span className="hidden md:inline">Diary</span>
            </span>
          )}

          {isTodo && (
            <span
              className={`inline-flex items-center justify-center w-5 h-5 md:w-auto md:h-auto md:px-2 md:py-0.5 md:gap-1 text-[10px] rounded-full shrink-0 font-medium ${
                completedCount === totalCount && totalCount > 0
                  ? isDark
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : isDark
                  ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
              }`}
              title="Todo"
            >
              <ListTodo className="w-3 h-3 md:w-2.5 md:h-2.5 text-emerald-500 dark:text-emerald-300 shrink-0" />
              <span className="hidden md:inline">Todo</span>
            </span>
          )}

          {!isPassKey && !isDiary && !isTodo && (
            <span
              className={`inline-flex items-center justify-center w-5 h-5 md:w-auto md:h-auto md:px-2 md:py-0.5 md:gap-1 text-[10px] font-medium rounded-full shrink-0 ${
                isDark
                  ? 'bg-sky-500/10 text-sky-200 border border-sky-500/20'
                  : 'bg-sky-100 text-sky-800 border border-sky-200/80'
              }`}
              title="Note"
            >
              <Feather className="w-3 h-3 md:w-2.5 md:h-2.5 text-sky-500 dark:text-sky-300 shrink-0" />
              <span className="hidden md:inline">Note</span>
            </span>
          )}

          {/* Reorder Grip Handle when in reorder mode */}
          {isReorderMode && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-emerald-400 cursor-grab active:cursor-grabbing hover:bg-emerald-500/20 transition-all"
              title="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-1">


        {/* Interactive Todo List (Shows up to 8 sub-tasks) */}
        {isTodo && (
          <div className="mt-2.5 space-y-1.5">
            {todoItems.length > 0 ? (
              <div className="space-y-1.5">
                {todoItems.slice(0, 8).map((item, itemIdx) => (
                  <div
                    key={`card-todo-${note.id}-${item.id || itemIdx}`}
                    className="flex items-center gap-2 group/item text-left"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleTodoItem) {
                        onToggleTodoItem(note.id, item.id);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        item.completed
                          ? 'bg-emerald-500 text-white'
                          : isDark
                          ? 'border border-neutral-600 hover:border-neutral-400 bg-transparent'
                          : 'border border-neutral-300 hover:border-neutral-400 bg-transparent'
                      }`}
                      title={item.completed ? 'Mark pending' : 'Mark done'}
                    >
                      {item.completed && (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      )}
                    </button>
                    <span
                      className={`text-xs truncate select-none ${
                        item.completed
                          ? 'line-through text-neutral-500'
                          : isDark
                          ? 'text-neutral-300'
                          : 'text-neutral-700'
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}

                {todoItems.length > 8 && (
                  <div
                    className={`text-[10.5px] font-medium pt-0.5 ${
                      isDark ? 'text-neutral-500' : 'text-neutral-400'
                    }`}
                  >
                    +{todoItems.length - 8} more tasks
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-neutral-500 italic py-1">
                No tasks yet • Click to add
              </div>
            )}

            {cleanContent && (
              <p
                className={`text-xs mt-1.5 line-clamp-4 leading-relaxed break-words ${
                  isDark ? 'text-neutral-400' : 'text-neutral-600'
                }`}
              >
                {cleanContent}
              </p>
            )}
          </div>
        )}

        {/* Standard Notes / Diary Content with Interactive Checkboxes */}
        {!isTodo && !isPassKey && (
          <div className="mt-2 space-y-1.5">
            {note.email && (
              <div className="text-[11.5px] font-mono text-neutral-400 truncate">
                {note.email}
              </div>
            )}

            {note.content && (
              <InteractiveNoteContent
                content={note.content}
                isDark={isDark}
                onToggleCheckbox={handleToggleContentCheckbox}
              />
            )}
          </div>
        )}

        {/* Attached Photo Previews (Adaptive Grid) */}
        {allImages.length === 1 && (
          <div
            className={`mt-2.5 overflow-hidden rounded-xl border flex items-center justify-center ${
              isDark
                ? 'border-neutral-800/80 bg-[#181818]'
                : 'border-neutral-200/40 bg-neutral-50/50'
            }`}
          >
            <img
              src={allImages[0]}
              alt={note.title || 'Attached photo'}
              className="w-full max-h-72 sm:max-h-80 object-contain rounded-xl pointer-events-none select-none"
              draggable={false}
              loading="lazy"
            />
          </div>
        )}

        {allImages.length === 2 && (
          <div className="mt-2.5 grid grid-cols-2 gap-1.5 overflow-hidden rounded-xl">
            {allImages.map((src, i) => (
              <div
                key={`pair-img-${note.id}-${i}`}
                className={`aspect-square rounded-xl overflow-hidden border ${
                  isDark
                    ? 'bg-[#181818] border-neutral-800/80'
                    : 'bg-neutral-50/50 border-neutral-200/40'
                }`}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {allImages.length >= 3 && (
          <div className="mt-2.5 grid grid-cols-3 gap-1.5 overflow-hidden rounded-xl">
            {allImages.slice(0, 3).map((src, i) => (
              <div
                key={`grid-img-${note.id}-${i}`}
                className={`relative aspect-square rounded-xl overflow-hidden border ${
                  isDark
                    ? 'bg-[#181818] border-neutral-800/80'
                    : 'bg-neutral-50/50 border-neutral-200/40'
                }`}
              >
                <img
                  src={src}
                  alt=""
                  className="w-full h-full object-cover pointer-events-none select-none"
                  draggable={false}
                  loading="lazy"
                />
                {i === 2 && allImages.length > 3 && (
                  <div
                    className={`absolute inset-0 backdrop-blur-[1px] flex items-center justify-center text-xs font-bold ${
                      isDark ? 'bg-black/65 text-white' : 'bg-black/45 text-white'
                    }`}
                  >
                    +{allImages.length - 2}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: showing todo progress, voice badge, and photo badge if present (non-pass/key notes) */}
      {!isPassKey && (isTodo || voiceCount > 0 || allImages.length > 0) && (
        <div
          className={`mt-2.5 flex items-center justify-start gap-2 flex-wrap text-[11px] ${
            isDark ? 'text-neutral-500' : 'text-neutral-400'
          }`}
        >
          {isTodo && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                completedCount === totalCount && totalCount > 0
                  ? isDark
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : isDark
                  ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
              }`}
            >
              <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-300 shrink-0" />
              <span className="font-semibold">{completedCount}/{totalCount}</span>
            </span>
          )}

          {voiceCount > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                isDark
                  ? 'bg-teal-500/10 text-teal-200 border border-teal-500/20'
                  : 'bg-teal-50 text-teal-700 border border-teal-200/80'
              }`}
            >
              <Mic className="w-3 h-3 text-teal-500 dark:text-teal-300 shrink-0" />
              <span className="font-semibold">{voiceCount}</span>
            </span>
          )}

          {allImages.length > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium shrink-0 ${
                isDark
                  ? 'bg-indigo-500/10 text-indigo-200 border border-indigo-500/20'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
              }`}
            >
              <ImageIcon className="w-3 h-3 text-indigo-500 dark:text-indigo-300 shrink-0" />
              <span className="font-semibold">{allImages.length}</span>
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function EmptyBody({
  activeTab,
  theme,
  notes,
  searchQuery,
  isReorderMode = false,
  onOpenNewNote,
  onSelectNote,
  onToggleTodoItem,
  onEditNote,
  onDeleteNote,
  onToggleFavorite,
  onUpdateNote,
  onReorderNotes,
}: EmptyBodyProps) {
  const isDark = theme === 'dark';
  const [contextMenu, setContextMenu] = useState<{
    note: NoteItem;
    x: number;
    y: number;
  } | null>(null);

  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const suppressCardClickUntilRef = useRef<number>(0);
  const touchDragRef = useRef<{
    noteId: string;
    startX: number;
    startY: number;
    isHolding: boolean;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ noteId: '', startX: 0, startY: 0, isHolding: false, timer: null });

  const performReorder = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const reordered = reorderNotesWithFilter(notes, sourceId, targetId);
    triggerHaptic('medium');
    onReorderNotes?.(reordered);
  };

  const handleDragStartCard = (e: React.DragEvent<HTMLDivElement>, noteId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', noteId);
    setDraggedNoteId(noteId);
    triggerHaptic('selection');
  };

  const handleDragOverCard = (e: React.DragEvent<HTMLDivElement>, noteId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedNoteId && draggedNoteId !== noteId && dragOverNoteId !== noteId) {
      setDragOverNoteId(noteId);
    }
  };

  const handleDragLeaveCard = (_e: React.DragEvent<HTMLDivElement>, noteId: string) => {
    if (dragOverNoteId === noteId) {
      setDragOverNoteId(null);
    }
  };

  const handleDropCard = (e: React.DragEvent<HTMLDivElement>, targetNoteId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedNoteId;
    if (sourceId && targetNoteId && sourceId !== targetNoteId) {
      performReorder(sourceId, targetNoteId);
    }
    setDraggedNoteId(null);
    setDragOverNoteId(null);
  };

  const handleDragEndCard = () => {
    setDraggedNoteId(null);
    setDragOverNoteId(null);
  };

  // Mobile Hold-to-Drag: In reorder mode activates instantly, otherwise after 550ms hold
  const handleTouchStartCard = (e: React.TouchEvent<HTMLDivElement>, noteId: string) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (touchDragRef.current.timer) clearTimeout(touchDragRef.current.timer);

    if (isReorderMode) {
      touchDragRef.current = {
        noteId,
        startX: touch.clientX,
        startY: touch.clientY,
        isHolding: true,
        timer: null,
      };
      setDraggedNoteId(noteId);
      triggerHaptic('selection');
      return;
    }

    touchDragRef.current = {
      noteId,
      startX: touch.clientX,
      startY: touch.clientY,
      isHolding: false,
      timer: setTimeout(() => {
        // User held still for 550ms: activate drag-to-reorder mode
        touchDragRef.current.isHolding = true;
        setDraggedNoteId(noteId);
        triggerHaptic('medium');
      }, 550),
    };
  };

  const handleTouchMoveCard = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchDragRef.current.noteId) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchDragRef.current.startX;
    const dy = touch.clientY - touchDragRef.current.startY;
    const dist = Math.hypot(dx, dy);

    // If still in the 550ms hold detection period:
    if (!touchDragRef.current.isHolding) {
      // If user moved more than 8px, they are scrolling naturally — cancel hold timer immediately
      if (dist > 8 && touchDragRef.current.timer) {
        clearTimeout(touchDragRef.current.timer);
        touchDragRef.current.timer = null;
      }
      return;
    }

    // Hold is active: user is reordering this card
    if (e.cancelable) {
      e.preventDefault();
    }

    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardEl = element?.closest('[data-note-id]');
    const targetId = cardEl?.getAttribute('data-note-id');

    if (targetId && targetId !== touchDragRef.current.noteId) {
      setDragOverNoteId(targetId);
    } else {
      setDragOverNoteId(null);
    }

    // Auto-scroll the list if dragging near edges
    if (scrollContainerRef.current) {
      const rect = scrollContainerRef.current.getBoundingClientRect();
      if (touch.clientY < rect.top + 70) {
        scrollContainerRef.current.scrollTop -= 8;
      } else if (touch.clientY > rect.bottom - 70) {
        scrollContainerRef.current.scrollTop += 8;
      }
    }
  };

  const handleTouchEndCard = () => {
    if (touchDragRef.current.timer) {
      clearTimeout(touchDragRef.current.timer);
      touchDragRef.current.timer = null;
    }

    if (touchDragRef.current.isHolding) {
      const sourceId = touchDragRef.current.noteId;
      if (sourceId && dragOverNoteId && sourceId !== dragOverNoteId) {
        performReorder(sourceId, dragOverNoteId);
      }
      suppressCardClickUntilRef.current = Date.now() + 400;
      setDraggedNoteId(null);
      setDragOverNoteId(null);
      touchDragRef.current.isHolding = false;
      touchDragRef.current.noteId = '';
    }
  };

  const handleOpenContextMenu = (note: NoteItem, x: number, y: number) => {
    const isMobile =
      isNativePlatform() ||
      (typeof window !== 'undefined' &&
        (window.matchMedia('(pointer: coarse)').matches ||
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)));

    if (isMobile) return;
    setContextMenu({ note, x, y });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Filter notes by active tab and search query, ensuring stable and unique IDs
  const filteredNotes = useMemo(() => {
    const seen = new Set<string>();
    const list = notes.filter((n) => {
      const matchesSearch =
        searchQuery === '' ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.email && n.email.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (activeTab === 'archive') return !!n.isArchived;
      if (n.isArchived) return false;
      if (activeTab === 'favorites') return !!n.isFavorite;
      if (activeTab === 'diary') return n.entryType === 'diary';
      if (activeTab === 'todo') return !!n.isTodo || n.entryType === 'todo';
      if (activeTab === 'vault' || activeTab === 'safe') {
        return !!(n.isSafe || n.isVault || n.entryType === 'passwords');
      }
      return true;
    });

    return list.map((n, idx) => {
      let id = n.id ? String(n.id).trim() : `note-${idx}`;
      if (!id || seen.has(id)) {
        id = `${id || 'note'}-${idx}-${seen.size}`;
      }
      seen.add(id);
      return n.id === id ? n : { ...n, id };
    });
  }, [notes, searchQuery, activeTab]);

  const getEmptyState = () => {
    if (searchQuery) {
      return {
        Icon: Feather,
        title: 'No notes found',
        desc: `No notes matching "${searchQuery}".`,
        btn: null,
      };
    }
    if (activeTab === 'todo') {
      return {
        Icon: ListTodo,
        title: 'No tasks yet',
        desc: 'Keep track of your day. Tap the plus button to add your first todo.',
        btn: 'Add task',
      };
    }
    if (activeTab === 'vault' || activeTab === 'safe') {
      return {
        Icon: Shield,
        title: 'Safe is empty',
        desc: 'Confidential and secure space. Tap the plus button to store private notes.',
        btn: 'Add to safe',
      };
    }
    if (activeTab === 'favorites') {
      return {
        Icon: Bookmark,
        title: 'No favorite notes',
        desc: 'Mark notes to keep your most important thoughts easily accessible.',
        btn: 'Create note',
      };
    }
    if (activeTab === 'diary') {
      return {
        Icon: BookOpen,
        title: 'No diary entries yet',
        desc: 'Reflect and journal your daily thoughts privately.',
        btn: 'Write journal',
      };
    }
    if (activeTab === 'archive') {
      return {
        Icon: Archive,
        title: 'Archive is empty',
        desc: 'Archived notes will be preserved here safely away from your main stream.',
        btn: null,
      };
    }
    return {
      Icon: Feather,
      title: 'Capture your thoughts',
      desc: 'A clean slate awaits. Tap the plus button to jot down an idea or reminder.',
      btn: 'Create first note',
    };
  };

  const emptyState = getEmptyState();
  const Icon = emptyState.Icon;

function estimateNoteHeight(note: NoteItem): number {
  const isPassKey = note.entryType === 'passwords' || !!note.isSafe;
  if (isPassKey) {
    return 60;
  }

  let h = 56; // base padding + title

  const isTodo = note.entryType === 'todo' || !!note.isTodo;
  if (isTodo) {
    const todoItems = parseTodoItemsFromNote(note);
    const count = Math.min(todoItems.length, 8);
    h += count * 28 + 12;
  }

  if (note.content && !isTodo) {
    const lines = note.content.split('\n').length;
    const approxWrapped = Math.ceil(note.content.length / 32);
    const totalLines = Math.min(Math.max(lines, approxWrapped), 6);
    h += totalLines * 20 + 8;
  }

  const allImages =
    note.images && note.images.length > 0
      ? note.images
      : note.imageUrl
      ? [note.imageUrl]
      : [];
  if (allImages.length === 1) {
    h += 290;
  } else if (allImages.length === 2) {
    h += 160;
  } else if (allImages.length >= 3) {
    h += 130;
  }

  const voiceCount =
    note.voiceNotes && note.voiceNotes.length > 0
      ? note.voiceNotes.length
      : note.hasVoiceNote
      ? 1
      : 0;
  if (voiceCount > 0 || allImages.length > 0) {
    h += 36;
  }

  return h;
}

  const columnCount = useColumnCount();

  // Smart Masonry: Distribute notes dynamically to the shortest column for optimal packing
  const columnNotes = useMemo(() => {
    const cols: NoteItem[][] = Array.from({ length: columnCount }, () => []);
    const colHeights: number[] = new Array(columnCount).fill(0);

    filteredNotes.forEach((note) => {
      // Find the column with the minimum accumulated height
      let shortestColIndex = 0;
      let minHeight = colHeights[0];
      for (let i = 1; i < columnCount; i++) {
        if (colHeights[i] < minHeight) {
          minHeight = colHeights[i];
          shortestColIndex = i;
        }
      }

      cols[shortestColIndex].push(note);
      colHeights[shortestColIndex] += estimateNoteHeight(note);
    });

    return cols;
  }, [filteredNotes, columnCount]);

  // If there are notes to show
  if (filteredNotes.length > 0) {
    return (
      <main
        ref={scrollContainerRef}
        className="flex-1 min-h-0 w-full px-3.5 sm:px-5 md:px-8 lg:px-10 pt-3 md:pt-6 pb-28 md:pb-8 overflow-y-auto overscroll-contain no-scrollbar relative"
      >
        {/* Horizontal-first Responsive Masonry Grid */}
        <div
          className="grid gap-3 md:gap-3.5 items-start"
          style={{
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          }}
        >
          {columnNotes.map((col, colIndex) => (
            <div key={`col-${colIndex}`} className="flex flex-col gap-3 md:gap-3.5 min-w-0">
              {col.map((note, noteIdx) => (
                <NoteCard
                  key={`card-${note.id}`}
                  note={note}
                  theme={theme}
                  onSelectNote={onSelectNote}
                  onToggleTodoItem={onToggleTodoItem}
                  onOpenContextMenu={handleOpenContextMenu}
                  onUpdateNote={onUpdateNote}
                  isReorderMode={isReorderMode}
                  isDragging={note.id === draggedNoteId}
                  isDragOver={note.id === dragOverNoteId}
                  suppressCardClickUntil={suppressCardClickUntilRef.current}
                  onDragStartCard={handleDragStartCard}
                  onDragOverCard={handleDragOverCard}
                  onDragLeaveCard={handleDragLeaveCard}
                  onDropCard={handleDropCard}
                  onDragEndCard={handleDragEndCard}
                  onTouchStartCard={handleTouchStartCard}
                  onTouchMoveCard={handleTouchMoveCard}
                  onTouchEndCard={handleTouchEndCard}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Floating Context Menu for Desktop Right Click (suppressed on mobile/touch) */}
        <CardContextMenu
          isOpen={!!contextMenu}
          position={contextMenu ? { x: contextMenu.x, y: contextMenu.y } : null}
          note={contextMenu?.note ?? null}
          theme={theme}
          onClose={handleCloseContextMenu}
          onEdit={(note) => onEditNote?.(note)}
          onDelete={(id) => onDeleteNote?.(id)}
          onToggleFavorite={(id) => onToggleFavorite?.(id)}
        />
      </main>
    );
  }

  // Pure clean, beautiful empty body
  return (
    <main
      id="empty-body"
      className="flex-1 min-h-0 w-full px-6 flex flex-col items-center justify-center text-center pb-28 md:pb-8 overflow-y-auto overscroll-contain select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-xs flex flex-col items-center"
      >
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors ${
            isDark
              ? 'bg-[#181818] text-neutral-400 shadow-sm'
              : 'bg-[#eeeff2] text-neutral-600 shadow-sm'
          }`}
        >
          <Icon className="w-6 h-6 stroke-[1.6]" />
        </div>

        <h2
          className={`text-lg font-medium tracking-tight ${
            isDark ? 'text-neutral-200' : 'text-neutral-800'
          }`}
        >
          {emptyState.title}
        </h2>

        <p
          className={`text-xs mt-1.5 leading-relaxed max-w-[240px] ${
            isDark ? 'text-neutral-500' : 'text-neutral-500'
          }`}
        >
          {emptyState.desc}
        </p>

        {emptyState.btn && (
          <button
            type="button"
            onClick={onOpenNewNote}
            className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium active:scale-95 transition-all shadow-sm ${
              isDark
                ? 'bg-[#181818] hover:bg-[#222222] text-neutral-300 hover:text-white'
                : 'bg-[#eeeff2] hover:bg-[#e4e6ea] text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{emptyState.btn}</span>
          </button>
        )}
      </motion.div>
    </main>
  );
}
