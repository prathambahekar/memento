import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KeyRound,
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  FileText,
  User,
  Pencil,
  Shield,
  CreditCard,
  Phone,
  Download,
  Image as ImageIcon,
  Mic,
  Play,
  Pause,
} from 'lucide-react';
import { ThemeMode, NoteItem } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { capitalizeFirstChar } from '../lib/formatters';
import { SubDrawerMoreMenu } from './SubDrawerMoreMenu';
import { ImageLightbox } from './ImageLightbox';
import { triggerHaptic } from '../lib/capacitor';

interface PassKeyDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  note: NoteItem | null;
  onClose: () => void;
  onEdit?: (note: NoteItem) => void;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

function maskAadhaar(val: string): string {
  const digits = val.replace(/\s+/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `•••• •••• ${last4}`;
  }
  return '•••• •••• ••••';
}

function maskPAN(val: string): string {
  if (val.length >= 4) {
    const first2 = val.slice(0, 2);
    const last2 = val.slice(-2);
    return `${first2}••••••${last2}`;
  }
  return '••••••••••';
}

function maskGeneric(val: string): string {
  if (val.length > 4) {
    return `•••• •••• ${val.slice(-4)}`;
  }
  return '••••••••';
}

export function PassKeyDrawer({
  isOpen,
  theme,
  note,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
}: PassKeyDrawerProps) {
  const isDark = theme === 'dark';
  const isDesktop = useIsDesktop();

  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [unmaskedFields, setUnmaskedFields] = useState<Record<string, boolean>>({});
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (!note) return null;

  // Extract email, password, and notes cleanly
  let email = note.email || '';
  let password = note.password || '';
  let secretNotes = '';

  // Extract personal info fields
  const personalFields = [...(note.personalInfo || [])];

  if (note.content) {
    const lines = note.content.split('\n');
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!email && line.startsWith('Email/Username: ')) {
        email = line.replace('Email/Username: ', '').trim();
      } else if (!password && line.startsWith('Password: ')) {
        password = line.replace('Password: ', '').trim();
      } else if (line.startsWith('Notes: ')) {
        const n = line.replace('Notes: ', '').trim();
        secretNotes = secretNotes ? `${secretNotes}\n${n}` : n;
      } else if (lower.startsWith('aadhaar:') || lower.startsWith('aadhaar number:')) {
        const val = line.split(':')[1]?.trim();
        if (val && !personalFields.some((f) => f.label.toLowerCase().includes('aadhaar'))) {
          personalFields.push({
            id: 'extracted-aadhaar',
            label: 'Aadhaar Number',
            value: val,
            isMasked: true,
          });
        }
      } else if (lower.startsWith('pan card:') || lower.startsWith('pan:')) {
        const val = line.split(':')[1]?.trim();
        if (val && !personalFields.some((f) => f.label.toLowerCase().includes('pan'))) {
          personalFields.push({
            id: 'extracted-pan',
            label: 'PAN Card Number',
            value: val,
            isMasked: false,
          });
        }
      } else if (lower.startsWith('phone:') || lower.startsWith('mobile:')) {
        const val = line.split(':')[1]?.trim();
        if (val && !personalFields.some((f) => f.label.toLowerCase().includes('phone'))) {
          personalFields.push({
            id: 'extracted-phone',
            label: 'Phone Number',
            value: val,
            isMasked: false,
          });
        }
      } else if (
        !line.startsWith('Email/Username: ') &&
        !line.startsWith('Password: ') &&
        !line.startsWith('Notes: ')
      ) {
        const trimmed = line.trim();
        if (
          trimmed &&
          trimmed !== email &&
          !lower.startsWith('aadhaar') &&
          !lower.startsWith('pan') &&
          !lower.startsWith('phone')
        ) {
          secretNotes = secretNotes ? `${secretNotes}\n${trimmed}` : trimmed;
        }
      }
    }
  }

  // Attached media
  const attachedImages = note.images && note.images.length > 0 ? note.images : note.imageUrl ? [note.imageUrl] : [];
  const attachedDocs = note.documents || [];
  const voiceNotes =
    note.voiceNotes && note.voiceNotes.length > 0
      ? note.voiceNotes
      : note.voiceAudioUrl || note.hasVoiceNote
      ? [
          {
            id: 'default-vn',
            audioUrl: note.voiceAudioUrl || '',
            duration: note.voiceDuration || '0:15',
            name: 'Voice Note 1',
          },
        ]
      : [];

  const handleCopy = (text: string, keyName: string) => {
    if (!text) return;
    triggerHaptic('selection');
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const toggleUnmaskField = (id: string) => {
    triggerHaptic('selection');
    setUnmaskedFields((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const togglePlayAudio = (id: string, url: string) => {
    triggerHaptic('selection');
    if (playingVoiceId === id) {
      audioRef.current?.pause();
      setPlayingVoiceId(null);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => setPlayingVoiceId(null);
      }
      audioRef.current.src = url;
      audioRef.current.play().catch(() => {});
      setPlayingVoiceId(id);
    }
  };

  // Determine primary badge
  const hasPersonal = personalFields.length > 0;
  const hasCredentials = Boolean(email || password);
  const hasDocs = attachedDocs.length > 0;
  const hasVoice = voiceNotes.length > 0;
  const hasPhotos = attachedImages.length > 0;

  let badgeIcon = KeyRound;
  let badgeLabel = 'Safe Key';
  let badgeColor = isDark
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-amber-50 text-amber-700 border-amber-200';

  if (hasPersonal && !hasCredentials) {
    badgeIcon = Shield;
    badgeLabel = 'Personal ID';
    badgeColor = isDark
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (hasDocs && !hasCredentials && !hasPersonal) {
    badgeIcon = FileText;
    badgeLabel = 'Document';
    badgeColor = isDark
      ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
      : 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (hasVoice && !hasCredentials && !hasPersonal && !hasDocs) {
    badgeIcon = Mic;
    badgeLabel = 'Voice Memo';
    badgeColor = isDark
      ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      : 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (hasPhotos && !hasCredentials && !hasPersonal && !hasDocs && !hasVoice) {
    badgeIcon = ImageIcon;
    badgeLabel = 'Photo Vault';
    badgeColor = isDark
      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      : 'bg-sky-50 text-sky-700 border-sky-200';
  }

  const BadgeIconComponent = badgeIcon;

  return (
    <>
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

            {/* Dialog/Drawer Sheet */}
            <motion.div
              initial={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
              animate={isDesktop ? { opacity: 1, scale: 1 } : { y: 0 }}
              exit={isDesktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
              transition={
                isDesktop
                  ? { duration: 0.18, ease: [0.16, 1, 0.3, 1] }
                  : { type: 'spring', damping: 30, stiffness: 340 }
              }
              className={`relative w-full max-w-md md:max-w-lg mx-auto rounded-t-[28px] md:rounded-[28px] pt-3 md:pt-6 pb-7 px-5 md:px-7 shadow-2xl flex flex-col max-h-[90vh] md:max-h-[82vh] overflow-hidden transition-colors ${
                isDark ? 'bg-[#121212] text-white' : 'bg-[#ffffff] text-neutral-900'
              }`}
            >
              {/* Top drag pill (mobile only) */}
              <div className="flex justify-center pb-2 md:hidden">
                <div
                  className={`w-9 h-1 rounded-full ${
                    isDark ? 'bg-neutral-800' : 'bg-neutral-300'
                  }`}
                />
              </div>

              {/* Header: Title + Badge + Actions */}
              <div className="flex items-center justify-between py-2 border-b border-neutral-200/40 dark:border-neutral-800/60 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 ${badgeColor}`}
                  >
                    <BadgeIconComponent className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold tracking-tight truncate leading-tight">
                      {capitalizeFirstChar(note.title)}
                    </h2>
                    <div
                      className={`text-[11px] flex items-center gap-2 mt-0.5 ${
                        isDark ? 'text-neutral-500' : 'text-neutral-400'
                      }`}
                    >
                      <span>{note.date}</span>
                      <span>•</span>
                      <span className="font-medium text-neutral-400 dark:text-neutral-500">
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onEdit && (
                    <button
                      id="passkey-drawer-edit-btn"
                      type="button"
                      onClick={() => onEdit(note)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                        isDark
                          ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                      }`}
                      aria-label="Edit entry"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}

                  {/* More options button (...) inside sub drawer */}
                  <SubDrawerMoreMenu
                    theme={theme}
                    isFavorite={note.isFavorite}
                    onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(note.id) : undefined}
                    onCopy={() => {
                      const text = `${note.title ? `${note.title}\n` : ''}${
                        email ? `User: ${email}\n` : ''
                      }${password ? `Password: ${password}\n` : ''}${
                        personalFields.map((f) => `${f.label}: ${f.value}`).join('\n')
                      }\n${secretNotes ? `Notes: ${secretNotes}` : ''}`;
                      navigator.clipboard?.writeText(text.trim());
                    }}
                    onEdit={onEdit ? () => onEdit(note) : undefined}
                    onDelete={
                      onDelete
                        ? () => {
                            onDelete(note.id);
                            onClose();
                          }
                        : undefined
                    }
                    copyLabel="Copy All Details"
                    itemTypeLabel="Vault Item"
                  />

                  <button
                    id="passkey-drawer-close-btn"
                    type="button"
                    onClick={onClose}
                    className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                      isDark
                        ? 'bg-[#1e1e1e] text-neutral-300 hover:text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                    }`}
                    aria-label="Close details"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Details Body */}
              <div className="space-y-3 pt-3.5 pb-2 overflow-y-auto no-scrollbar">
                {/* 1. PERSONAL INFORMATION & IDS (Aadhaar, PAN, Phone, etc.) */}
                {personalFields.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 px-0.5">
                      <Shield
                        className={`w-3.5 h-3.5 ${
                          isDark ? 'text-emerald-400' : 'text-emerald-600'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isDark ? 'text-emerald-400' : 'text-emerald-700'
                        }`}
                      >
                        Personal Identification & IDs
                      </span>
                    </div>

                    <div className="space-y-2">
                      {personalFields.map((field) => {
                        const isMaskedDefault =
                          field.isMasked ??
                          (field.label.toLowerCase().includes('aadhaar') ||
                            field.label.toLowerCase().includes('pan') ||
                            field.label.toLowerCase().includes('pin'));

                        const isCurrentlyRevealed = unmaskedFields[field.id] ?? !isMaskedDefault;

                        const isAadhaar = field.label.toLowerCase().includes('aadhaar');
                        const isPan = field.label.toLowerCase().includes('pan');
                        const isPhone = field.label.toLowerCase().includes('phone');

                        let displayVal = field.value;
                        if (!isCurrentlyRevealed) {
                          if (isAadhaar) displayVal = maskAadhaar(field.value);
                          else if (isPan) displayVal = maskPAN(field.value);
                          else displayVal = maskGeneric(field.value);
                        }

                        return (
                          <div
                            key={field.id}
                            className={`p-3.5 rounded-2xl transition-colors border ${
                              isDark
                                ? 'bg-[#181818] border-neutral-800/90'
                                : 'bg-neutral-50/90 border-neutral-200/80'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                {isPhone ? (
                                  <Phone
                                    className={`w-3.5 h-3.5 ${
                                      isDark ? 'text-emerald-400' : 'text-emerald-600'
                                    }`}
                                  />
                                ) : (
                                  <CreditCard
                                    className={`w-3.5 h-3.5 ${
                                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                                    }`}
                                  />
                                )}
                                <span
                                  className={`text-[10.5px] font-semibold uppercase tracking-wider ${
                                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                                  }`}
                                >
                                  {field.label}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => toggleUnmaskField(field.id)}
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center active:scale-95 transition-all ${
                                    isDark
                                      ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                                      : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                                  }`}
                                  aria-label={isCurrentlyRevealed ? 'Hide value' : 'Show value'}
                                  title={isCurrentlyRevealed ? 'Hide' : 'Reveal'}
                                >
                                  {isCurrentlyRevealed ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCopy(field.value, field.id)}
                                  className={`h-6 px-2 rounded-lg flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all ${
                                    copiedKey === field.id
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : isDark
                                      ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                                      : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                                  }`}
                                >
                                  {copiedKey === field.id ? (
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
                            </div>

                            <div
                              className={`text-sm font-mono tracking-wider break-all select-all font-semibold ${
                                isDark ? 'text-white' : 'text-neutral-900'
                              }`}
                            >
                              {displayVal}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. ACCOUNT / CREDENTIALS (Email & Password) */}
                {(email || password) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 px-0.5">
                      <Lock
                        className={`w-3.5 h-3.5 ${
                          isDark ? 'text-amber-400' : 'text-amber-600'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isDark ? 'text-amber-400' : 'text-amber-700'
                        }`}
                      >
                        Account Credentials
                      </span>
                    </div>

                    {/* Email / Username */}
                    {email && (
                      <div
                        className={`p-3.5 rounded-2xl transition-colors border ${
                          isDark
                            ? 'bg-[#181818] border-neutral-800/90'
                            : 'bg-neutral-50/90 border-neutral-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <User
                              className={`w-3.5 h-3.5 ${
                                isDark ? 'text-neutral-500' : 'text-neutral-400'
                              }`}
                            />
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider ${
                                isDark ? 'text-neutral-400' : 'text-neutral-500'
                              }`}
                            >
                              Email or Username
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(email, 'username')}
                            className={`h-6 px-2 rounded-lg flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all ${
                              copiedKey === 'username'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isDark
                                ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                                : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                            }`}
                          >
                            {copiedKey === 'username' ? (
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
                        <div
                          className={`text-sm font-mono break-all select-all ${
                            isDark ? 'text-neutral-200' : 'text-neutral-900'
                          }`}
                        >
                          {email}
                        </div>
                      </div>
                    )}

                    {/* Password */}
                    {password && (
                      <div
                        className={`p-3.5 rounded-2xl transition-colors border ${
                          isDark
                            ? 'bg-[#181818] border-neutral-800/90'
                            : 'bg-neutral-50/90 border-neutral-200/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Lock
                              className={`w-3.5 h-3.5 ${
                                isDark ? 'text-neutral-500' : 'text-neutral-400'
                              }`}
                            />
                            <span
                              className={`text-[10px] font-semibold uppercase tracking-wider ${
                                isDark ? 'text-neutral-400' : 'text-neutral-500'
                              }`}
                            >
                              Password / Key
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center active:scale-95 transition-all ${
                                isDark
                                  ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                                  : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                              }`}
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(password, 'password')}
                              className={`h-6 px-2 rounded-lg flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all ${
                                copiedKey === 'password'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : isDark
                                  ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                                  : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                              }`}
                            >
                              {copiedKey === 'password' ? (
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
                        </div>
                        <div
                          className={`text-sm font-mono tracking-wide break-all select-all ${
                            isDark ? 'text-white font-medium' : 'text-neutral-900 font-medium'
                          }`}
                        >
                          {showPassword ? password : '••••••••••••••••'}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. ATTACHED DOCUMENTS & FILES */}
                {attachedDocs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <div className="flex items-center gap-1.5">
                        <FileText
                          className={`w-3.5 h-3.5 ${
                            isDark ? 'text-indigo-400' : 'text-indigo-600'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isDark ? 'text-indigo-400' : 'text-indigo-700'
                          }`}
                        >
                          Confidential Documents ({attachedDocs.length})
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {attachedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${
                            isDark
                              ? 'bg-[#181818] border-neutral-800/90'
                              : 'bg-neutral-50/90 border-neutral-200/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isDark
                                  ? 'bg-indigo-500/15 text-indigo-300'
                                  : 'bg-indigo-50 text-indigo-600'
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate leading-tight">
                                {doc.name}
                              </p>
                              <span
                                className={`text-[10px] ${
                                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                                }`}
                              >
                                {doc.size || 'Document file'}
                              </span>
                            </div>
                          </div>

                          <a
                            href={doc.dataUrl}
                            download={doc.name}
                            className={`h-7 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-medium shrink-0 active:scale-95 transition-all ${
                              isDark
                                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                                : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                            }`}
                            title="Download document"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. ATTACHED PHOTOS & SCANS */}
                {attachedImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 px-0.5">
                      <ImageIcon
                        className={`w-3.5 h-3.5 ${
                          isDark ? 'text-sky-400' : 'text-sky-600'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isDark ? 'text-sky-400' : 'text-sky-700'
                        }`}
                      >
                        Photos & Scanned Cards ({attachedImages.length})
                      </span>
                    </div>

                    <div
                      className={`grid gap-2 ${
                        attachedImages.length === 1
                          ? 'grid-cols-1'
                          : 'grid-cols-2 sm:grid-cols-3'
                      }`}
                    >
                      {attachedImages.map((imgSrc, idx) => (
                        <div
                          key={`drawer-img-${idx}`}
                          onClick={() => setLightboxImg(imgSrc)}
                          className={`relative rounded-2xl overflow-hidden border group aspect-video cursor-pointer transition-all active:scale-[0.98] ${
                            isDark ? 'border-neutral-800 bg-[#161616]' : 'border-neutral-200 bg-neutral-100'
                          }`}
                        >
                          <img
                            src={imgSrc}
                            alt={`Card or ID Scan ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[10px] text-white">
                            Scan #{idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. ATTACHED VOICE NOTES */}
                {voiceNotes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 px-0.5">
                      <Mic
                        className={`w-3.5 h-3.5 ${
                          isDark ? 'text-rose-400' : 'text-rose-600'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isDark ? 'text-rose-400' : 'text-rose-700'
                        }`}
                      >
                        Confidential Voice Notes ({voiceNotes.length})
                      </span>
                    </div>

                    <div className="space-y-2">
                      {voiceNotes.map((vn, idx) => {
                        const isPlaying = playingVoiceId === vn.id;
                        return (
                          <div
                            key={vn.id || idx}
                            className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
                              isDark
                                ? 'bg-[#181818] border-neutral-800'
                                : 'bg-neutral-50/90 border-neutral-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => togglePlayAudio(vn.id, vn.audioUrl)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-sm ${
                                  isPlaying
                                    ? 'bg-rose-500 text-white'
                                    : isDark
                                    ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                                    : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
                                }`}
                                aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                              >
                                {isPlaying ? (
                                  <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                )}
                              </button>
                              <div>
                                <p className="text-xs font-semibold">
                                  {vn.name || `Voice Memo ${idx + 1}`}
                                </p>
                                <span
                                  className={`text-[10.5px] font-mono ${
                                    isDark ? 'text-neutral-400' : 'text-neutral-500'
                                  }`}
                                >
                                  {vn.duration || '0:15'}
                                </span>
                              </div>
                            </div>
                            {isPlaying && (
                              <div className="flex items-center gap-0.5 pr-2">
                                <div className="w-1 h-3 bg-rose-500 animate-pulse rounded-full" />
                                <div className="w-1 h-5 bg-rose-500 animate-pulse delay-75 rounded-full" />
                                <div className="w-1 h-2 bg-rose-500 animate-pulse delay-150 rounded-full" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 6. SECRET NOTES / HINT */}
                {secretNotes && (
                  <div
                    className={`p-3.5 rounded-2xl transition-colors border ${
                      isDark
                        ? 'bg-[#181818] border-neutral-800/90'
                        : 'bg-neutral-50/90 border-neutral-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <FileText
                          className={`w-3.5 h-3.5 ${
                            isDark ? 'text-neutral-500' : 'text-neutral-400'
                          }`}
                        />
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${
                            isDark ? 'text-neutral-400' : 'text-neutral-500'
                          }`}
                        >
                          Notes & Hints
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(secretNotes, 'notes')}
                        className={`h-6 px-2 rounded-lg flex items-center gap-1 text-[11px] font-medium active:scale-95 transition-all ${
                          copiedKey === 'notes'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isDark
                            ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                            : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                        }`}
                      >
                        {copiedKey === 'notes' ? (
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
                    <div
                      className={`text-xs whitespace-pre-wrap leading-relaxed ${
                        isDark ? 'text-neutral-300' : 'text-neutral-700'
                      }`}
                    >
                      {secretNotes}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={!!lightboxImg}
        src={lightboxImg}
        onClose={() => setLightboxImg(null)}
      />
    </>
  );
}
