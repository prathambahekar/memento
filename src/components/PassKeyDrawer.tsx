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
  Mail,
  Plus,
  Trash2,
  Download,
  Image as ImageIcon,
  Mic,
  Play,
  Pause,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import { ThemeMode, NoteItem, PersonalInfoField, DocumentAttachment } from '../types';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { capitalizeFirstChar } from '../lib/formatters';
import { SubDrawerMoreMenu } from './SubDrawerMoreMenu';
import { ImageLightbox } from './ImageLightbox';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { triggerHaptic } from '../lib/capacitor';

interface PassKeyDrawerProps {
  isOpen: boolean;
  theme: ThemeMode;
  note: NoteItem | null;
  onClose: () => void;
  onEdit?: (note: NoteItem) => void;
  onUpdateNote?: (note: NoteItem) => void;
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
  onUpdateNote,
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
  const [previewDoc, setPreviewDoc] = useState<DocumentAttachment | null>(null);

  // Adding / Editing personal detail inline state
  const [isAddingField, setIsAddingField] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [activeFieldMenuId, setActiveFieldMenuId] = useState<string | null>(null);
  const [fieldLabelInput, setFieldLabelInput] = useState('');
  const [fieldValInput, setFieldValInput] = useState('');
  const [fieldIsMasked, setFieldIsMasked] = useState(false);
  const [showFieldPresetsPopup, setShowFieldPresetsPopup] = useState(false);
  const [fieldDocAttachment, setFieldDocAttachment] = useState<DocumentAttachment | null>(null);
  const [fieldImgAttachment, setFieldImgAttachment] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const detailInputRef = useRef<HTMLInputElement | null>(null);
  const fieldDocInputRef = useRef<HTMLInputElement | null>(null);
  const fieldImgInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsAddingField(false);
    setEditingFieldId(null);
    setActiveFieldMenuId(null);
    setFieldLabelInput('');
    setFieldValInput('');
    setFieldIsMasked(false);
    setShowFieldPresetsPopup(false);
    setFieldDocAttachment(null);
    setFieldImgAttachment(null);
    setPreviewDoc(null);
  }, [note?.id, isOpen]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleFieldDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
          setFieldDocAttachment({
            id: `doc-${Date.now()}`,
            name: file.name,
            size: sizeStr,
            type: file.type,
            dataUrl: event.target.result as string,
            uploadedAt: new Date().toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            }),
          });
          triggerHaptic('success');
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleFieldImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFieldImgAttachment(event.target.result as string);
          triggerHaptic('success');
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

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
        lower.startsWith('email:') ||
        lower.startsWith('emails:') ||
        lower.startsWith('email address:')
      ) {
        const val = line.split(':')[1]?.trim();
        if (val && !personalFields.some((f) => f.label.toLowerCase().includes('email'))) {
          personalFields.push({
            id: 'extracted-email',
            label: 'Email Address',
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
          !lower.startsWith('phone') &&
          !lower.startsWith('email')
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

  // Identify Personal Info card
  const isPersonalCard =
    Boolean(note.isPersonalInfo) ||
    note.id === 'safe-default-personal-info' ||
    (note.title && note.title.trim().toLowerCase() === 'personal info') ||
    (note.title && note.title.trim().toLowerCase() === 'personal information') ||
    (note.title && note.title.trim().toLowerCase() === 'personal identity & documents');

  // Determine field metadata, colors and icons matching app theme
  const getFieldMeta = (label: string) => {
    const lower = (label || '').toLowerCase();
    if (lower.includes('aadhaar')) {
      return {
        icon: Shield,
        iconClasses: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
        badgeClasses: isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
        typeName: 'Govt ID',
      };
    }
    if (lower.includes('pan')) {
      return {
        icon: CreditCard,
        iconClasses: isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600',
        badgeClasses: isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700',
        typeName: 'Tax ID',
      };
    }
    if (lower.includes('phone') || lower.includes('mobile')) {
      return {
        icon: Phone,
        iconClasses: isDark ? 'bg-sky-500/15 text-sky-400' : 'bg-sky-50 text-sky-600',
        badgeClasses: isDark ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-50 text-sky-700',
        typeName: 'Contact',
      };
    }
    if (lower.includes('email') || lower.includes('mail')) {
      return {
        icon: Mail,
        iconClasses: isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600',
        badgeClasses: isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-700',
        typeName: 'Contact',
      };
    }
    if (lower.includes('driving') || lower.includes('license')) {
      return {
        icon: FileText,
        iconClasses: isDark ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-50 text-purple-600',
        badgeClasses: isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-700',
        typeName: 'Govt ID',
      };
    }
    if (lower.includes('passport') || lower.includes('travel')) {
      return {
        icon: KeyRound,
        iconClasses: isDark ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-50 text-rose-600',
        badgeClasses: isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-700',
        typeName: 'Travel',
      };
    }
    return {
      icon: Shield,
      iconClasses: isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600',
      badgeClasses: isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700',
      typeName: 'Identity',
    };
  };

  const PRESET_PERSONAL_FIELDS = [
    {
      label: 'Aadhaar Card Number',
      masked: true,
      icon: Shield,
      typeName: 'Govt ID',
      iconDark: 'bg-emerald-500/15 text-emerald-400',
      iconLight: 'bg-emerald-50 text-emerald-600',
      badgeDark: 'bg-emerald-500/10 text-emerald-400',
      badgeLight: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'PAN Card Number',
      masked: true,
      icon: CreditCard,
      typeName: 'Tax ID',
      iconDark: 'bg-amber-500/15 text-amber-400',
      iconLight: 'bg-amber-50 text-amber-600',
      badgeDark: 'bg-amber-500/10 text-amber-400',
      badgeLight: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Phone Number',
      masked: false,
      icon: Phone,
      typeName: 'Contact',
      iconDark: 'bg-sky-500/15 text-sky-400',
      iconLight: 'bg-sky-50 text-sky-600',
      badgeDark: 'bg-sky-500/10 text-sky-400',
      badgeLight: 'bg-sky-50 text-sky-700',
    },
    {
      label: 'Email Address',
      masked: false,
      icon: Mail,
      typeName: 'Contact',
      iconDark: 'bg-indigo-500/15 text-indigo-400',
      iconLight: 'bg-indigo-50 text-indigo-600',
      badgeDark: 'bg-indigo-500/10 text-indigo-400',
      badgeLight: 'bg-indigo-50 text-indigo-700',
    },
    {
      label: 'Driving License',
      masked: false,
      icon: FileText,
      typeName: 'Govt ID',
      iconDark: 'bg-purple-500/15 text-purple-400',
      iconLight: 'bg-purple-50 text-purple-600',
      badgeDark: 'bg-purple-500/10 text-purple-400',
      badgeLight: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'Passport Number',
      masked: true,
      icon: KeyRound,
      typeName: 'Travel',
      iconDark: 'bg-rose-500/15 text-rose-400',
      iconLight: 'bg-rose-50 text-rose-600',
      badgeDark: 'bg-rose-500/10 text-rose-400',
      badgeLight: 'bg-rose-50 text-rose-700',
    },
  ];

  const handleSaveField = (
    label: string,
    value: string,
    isMasked: boolean,
    docAttachment?: DocumentAttachment | null,
    imgAttachment?: string | null,
    targetFieldId?: string | null
  ) => {
    if (!label.trim() || !value.trim() || !note) return;
    triggerHaptic('success');

    const baseFields =
      note.personalInfo && note.personalInfo.length > 0 ? note.personalInfo : personalFields;

    let updatedPersonalInfo: PersonalInfoField[];
    if (targetFieldId) {
      updatedPersonalInfo = baseFields.map((f) => {
        if (f.id === targetFieldId) {
          return {
            ...f,
            label: label.trim(),
            value: value.trim(),
            isMasked,
            document: docAttachment || undefined,
            image: imgAttachment || undefined,
          };
        }
        return f;
      });
    } else {
      const newField: PersonalInfoField = {
        id: `pi-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: label.trim(),
        value: value.trim(),
        isMasked,
        document: docAttachment || undefined,
        image: imgAttachment || undefined,
      };
      const cleanFields = baseFields.filter(
        (f) => !f.id.startsWith('extracted-') || f.value !== newField.value
      );
      updatedPersonalInfo = [...cleanFields, newField];
    }

    const updatedNote: NoteItem = {
      ...note,
      isSafe: true,
      isVault: true,
      isPersonalInfo: true,
      entryType: 'passwords',
      personalInfo: updatedPersonalInfo,
    };
    if (onUpdateNote) {
      onUpdateNote(updatedNote);
    } else if (onEdit) {
      onEdit(updatedNote);
    }
    setIsAddingField(false);
    setEditingFieldId(null);
    setFieldLabelInput('');
    setFieldValInput('');
    setFieldDocAttachment(null);
    setFieldImgAttachment(null);
    setShowFieldPresetsPopup(false);
  };

  const handleStartEditField = (field: PersonalInfoField) => {
    triggerHaptic('light');
    setIsAddingField(false);
    setEditingFieldId(field.id);
    setFieldLabelInput(field.label);
    setFieldValInput(field.value);
    setFieldIsMasked(field.isMasked ?? false);
    setFieldDocAttachment(field.document || null);
    setFieldImgAttachment(field.image || null);
    setShowFieldPresetsPopup(false);
  };

  const handleCancelEdit = () => {
    triggerHaptic('light');
    setEditingFieldId(null);
    setIsAddingField(false);
    setFieldLabelInput('');
    setFieldValInput('');
    setFieldDocAttachment(null);
    setFieldImgAttachment(null);
    setShowFieldPresetsPopup(false);
  };

  const handleDeleteField = (fieldId: string) => {
    if (!note) return;
    triggerHaptic('medium');
    const baseFields =
      note.personalInfo && note.personalInfo.length > 0 ? note.personalInfo : personalFields;
    const updatedPersonalInfo = baseFields.filter((f) => f.id !== fieldId);
    const updatedNote: NoteItem = {
      ...note,
      isSafe: true,
      isVault: true,
      isPersonalInfo: true,
      entryType: 'passwords',
      personalInfo: updatedPersonalInfo,
    };
    if (onUpdateNote) {
      onUpdateNote(updatedNote);
    } else if (onEdit) {
      onEdit(updatedNote);
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
    ? 'bg-amber-500/15 text-amber-300'
    : 'bg-amber-50 text-amber-700';

  if ((isPersonalCard || hasPersonal) && !hasCredentials) {
    badgeIcon = Shield;
    badgeLabel = 'Personal IDs';
    badgeColor = isDark
      ? 'bg-emerald-500/15 text-emerald-400'
      : 'bg-emerald-50 text-emerald-600';
  } else if (hasDocs && !hasCredentials && !hasPersonal) {
    badgeIcon = FileText;
    badgeLabel = 'Document';
    badgeColor = isDark
      ? 'bg-indigo-500/15 text-indigo-300'
      : 'bg-indigo-50 text-indigo-700';
  } else if (hasVoice && !hasCredentials && !hasPersonal && !hasDocs) {
    badgeIcon = Mic;
    badgeLabel = 'Voice Memo';
    badgeColor = isDark
      ? 'bg-rose-500/15 text-rose-300'
      : 'bg-rose-50 text-rose-700';
  } else if (hasPhotos && !hasCredentials && !hasPersonal && !hasDocs && !hasVoice) {
    badgeIcon = ImageIcon;
    badgeLabel = 'Photo Vault';
    badgeColor = isDark
      ? 'bg-sky-500/15 text-sky-300'
      : 'bg-sky-50 text-sky-700';
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
              <div className="flex items-center justify-between py-2 pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${badgeColor}`}
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
                  {isAddingField ? (
                    <>
                      {/* Cancel adding detail */}
                      <button
                        id="passkey-drawer-cancel-add-btn"
                        type="button"
                        onClick={() => {
                          setIsAddingField(false);
                          setFieldLabelInput('');
                          setFieldValInput('');
                          setShowFieldPresetsPopup(false);
                          setFieldDocAttachment(null);
                          setFieldImgAttachment(null);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                          isDark
                            ? 'bg-[#1e1e1e] text-neutral-400 hover:text-white'
                            : 'bg-neutral-100 text-neutral-500 hover:text-neutral-900'
                        }`}
                        title="Cancel"
                        aria-label="Cancel adding detail"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Save button: Exactly matching other drawers */}
                      <button
                        id="passkey-drawer-save-btn"
                        type="button"
                        onClick={() => {
                          if (fieldLabelInput.trim() && fieldValInput.trim()) {
                            handleSaveField(
                              fieldLabelInput,
                              fieldValInput,
                              fieldIsMasked,
                              fieldDocAttachment,
                              fieldImgAttachment
                            );
                            setShowFieldPresetsPopup(false);
                          }
                        }}
                        disabled={!fieldLabelInput.trim() || !fieldValInput.trim()}
                        className={`h-8 px-3.5 rounded-full flex items-center gap-1.5 font-medium text-xs active:scale-95 transition-all shadow-xs ${
                          !fieldLabelInput.trim() || !fieldValInput.trim()
                            ? 'opacity-40 cursor-not-allowed bg-neutral-800 text-neutral-500'
                            : isDark
                            ? 'bg-white text-black hover:bg-neutral-200'
                            : 'bg-neutral-900 text-white hover:bg-neutral-800'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.4]" />
                        <span>Save</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Plus button to add personal detail - placed next to More button */}
                      {(isPersonalCard || personalFields.length > 0) && (
                        <button
                          id="passkey-drawer-add-field-btn"
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            setFieldLabelInput('');
                            setFieldValInput('');
                            setFieldIsMasked(false);
                            setIsAddingField(true);
                            setShowFieldPresetsPopup(true);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-all ${
                            isDark
                              ? 'bg-[#1e1e1e] text-neutral-300 hover:text-white'
                              : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                          }`}
                          title="Add detail"
                          aria-label="Add personal detail"
                        >
                          <Plus className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      )}

                      {/* More options button (...) inside sub drawer with Edit, Fav, Copy, Delete */}
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
                    </>
                  )}
                </div>
              </div>

              {/* Details Body */}
              <div className="space-y-3 pt-3.5 pb-6 overflow-y-auto no-scrollbar">
                {/* 1. PERSONAL INFORMATION & IDS (Aadhaar, Phone, Email, PAN, etc.) */}
                {(isPersonalCard || personalFields.length > 0) && (
                  <div className="space-y-2.5">
                    {/* Add Personal Detail Inputs - Clean in-flow cards, no overlaps, no clipping */}
                    {isAddingField && (
                      <div className="space-y-2.5">
                        {/* Field 1: FIELD NAME / LABEL - Borderless and clean */}
                        <div>
                          <div
                            onClick={() => {
                              setShowFieldPresetsPopup((prev) => !prev);
                            }}
                            className={`p-3.5 rounded-2xl transition-colors cursor-pointer ${
                              showFieldPresetsPopup
                                ? isDark
                                  ? 'bg-[#202024]'
                                  : 'bg-neutral-200/80'
                                : isDark
                                ? 'bg-[#18181b] hover:bg-[#202024]'
                                : 'bg-neutral-100/80 hover:bg-neutral-100'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <label
                                className={`block text-[10px] font-semibold uppercase tracking-wider cursor-pointer ${
                                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                                }`}
                              >
                                Field Name / Label
                              </label>
                              <div className="flex items-center gap-1.5">
                                {/* Option to attach Document (just as icon) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fieldDocInputRef.current?.click();
                                  }}
                                  className={`p-1 rounded-lg transition-all active:scale-90 ${
                                    fieldDocAttachment
                                      ? isDark
                                        ? 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-500/40'
                                        : 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                                      : isDark
                                      ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5'
                                  }`}
                                  title={
                                    fieldDocAttachment
                                      ? `Document attached: ${fieldDocAttachment.name} (click to replace)`
                                      : 'Attach document for this field'
                                  }
                                  aria-label="Attach document"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>

                                {/* Option to attach Image (just as icon) */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fieldImgAttachment
                                      ? setLightboxImg(fieldImgAttachment)
                                      : fieldImgInputRef.current?.click();
                                  }}
                                  className={`p-1 rounded-lg transition-all active:scale-90 ${
                                    fieldImgAttachment
                                      ? isDark
                                        ? 'bg-sky-500/25 text-sky-300 ring-1 ring-sky-500/40'
                                        : 'bg-sky-100 text-sky-700 ring-1 ring-sky-300'
                                      : isDark
                                      ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5'
                                  }`}
                                  title={
                                    fieldImgAttachment
                                      ? 'Image attached (click to preview)'
                                      : 'Attach image for this field'
                                  }
                                  aria-label="Attach image"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowFieldPresetsPopup((prev) => !prev);
                                  }}
                                  className={`text-[10px] flex items-center gap-1 font-medium transition-colors ${
                                    isDark
                                      ? 'text-neutral-400 hover:text-white'
                                      : 'text-neutral-500 hover:text-neutral-900'
                                  }`}
                                >
                                  <span>Choose type</span>
                                  <ChevronDown
                                    className={`w-3 h-3 transition-transform duration-200 ${
                                      showFieldPresetsPopup ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                            <input
                              type="text"
                              value={fieldLabelInput}
                              onChange={(e) => setFieldLabelInput(e.target.value)}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              placeholder="Field name or choose type..."
                              className={`w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500 font-medium ${
                                isDark ? 'text-white' : 'text-neutral-900'
                              }`}
                            />

                            {/* Attached document or image badge preview */}
                            {(fieldDocAttachment || fieldImgAttachment) && (
                              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-dashed border-neutral-700/30">
                                {fieldDocAttachment && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-300 text-[11px] font-medium max-w-[200px]">
                                    <FileText className="w-3 h-3 shrink-0 text-indigo-400" />
                                    <span className="truncate">{fieldDocAttachment.name}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFieldDocAttachment(null);
                                      }}
                                      className="p-0.5 rounded-full hover:bg-indigo-500/30 text-indigo-300"
                                      title="Remove document"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                                {fieldImgAttachment && (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-sky-500/15 text-sky-300 text-[11px] font-medium">
                                    <img
                                      src={fieldImgAttachment}
                                      alt="Thumbnail"
                                      className="w-4 h-4 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImg(fieldImgAttachment);
                                      }}
                                    />
                                    <span
                                      className="text-[10.5px] cursor-pointer hover:underline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImg(fieldImgAttachment);
                                      }}
                                    >
                                      Photo attached
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setFieldImgAttachment(null);
                                      }}
                                      className="p-0.5 rounded-full hover:bg-sky-500/30 text-sky-300"
                                      title="Remove image"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* In-Flow Card for Suggested Types - Borderless, NO split lines, vibrant app colors */}
                          <AnimatePresence>
                            {showFieldPresetsPopup && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                              >
                                <div
                                  className={`mt-2 p-1.5 rounded-2xl transition-colors ${
                                    isDark
                                      ? 'bg-[#18181b] text-white'
                                      : 'bg-neutral-100 text-neutral-900'
                                  }`}
                                >
                                  <div className="px-2.5 pt-1.5 pb-2 flex items-center justify-between text-[10px] uppercase font-semibold tracking-wider text-neutral-400">
                                    <span>Suggested Types</span>
                                    <span className="text-[9px] text-neutral-500 lowercase">tap to select</span>
                                  </div>

                                  <div className="max-h-56 overflow-y-auto space-y-0.5 py-0.5 no-scrollbar">
                                    {PRESET_PERSONAL_FIELDS.map((preset) => {
                                      const IconComp = preset.icon;
                                      const isSelected = fieldLabelInput === preset.label;
                                      return (
                                        <button
                                          key={preset.label}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            triggerHaptic('light');
                                            setFieldLabelInput(preset.label);
                                            setFieldIsMasked(preset.masked);
                                            setShowFieldPresetsPopup(false);
                                            setTimeout(() => {
                                              detailInputRef.current?.focus();
                                            }, 80);
                                          }}
                                          className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-left transition-all ${
                                            isSelected
                                              ? isDark
                                                ? 'bg-white/10 text-white font-medium'
                                                : 'bg-white text-neutral-900 font-semibold shadow-xs'
                                              : isDark
                                              ? 'hover:bg-white/5 text-neutral-200'
                                              : 'hover:bg-white/60 text-neutral-800'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div
                                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                                isDark ? preset.iconDark : preset.iconLight
                                              }`}
                                            >
                                              <IconComp className="w-3.5 h-3.5 stroke-[2]" />
                                            </div>
                                            <span className="text-xs font-medium truncate">
                                              {preset.label}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                            <span
                                              className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                                                isDark ? preset.badgeDark : preset.badgeLight
                                              }`}
                                            >
                                              {preset.typeName}
                                            </span>
                                            {isSelected && (
                                              <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Field 2: DETAIL / VALUE - Borderless */}
                        <div
                          className={`p-3.5 rounded-2xl transition-colors ${
                            isDark ? 'bg-[#18181b]' : 'bg-neutral-100/80'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <label
                              className={`block text-[10px] font-semibold uppercase tracking-wider ${
                                isDark ? 'text-neutral-400' : 'text-neutral-500'
                              }`}
                            >
                              Detail / Value
                            </label>
                            <button
                              type="button"
                              onClick={() => setFieldIsMasked((prev) => !prev)}
                              className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium transition-colors ${
                                fieldIsMasked
                                  ? isDark
                                    ? 'bg-neutral-800 text-neutral-300'
                                    : 'bg-neutral-200 text-neutral-800'
                                  : isDark
                                  ? 'bg-neutral-800/40 text-neutral-500 hover:text-neutral-300'
                                  : 'bg-neutral-200/50 text-neutral-500 hover:text-neutral-800'
                              }`}
                            >
                              {fieldIsMasked ? (
                                <>
                                  <EyeOff className="w-3 h-3" />
                                  <span>Masked</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3 h-3" />
                                  <span>Visible</span>
                                </>
                              )}
                            </button>
                          </div>
                          <input
                            ref={detailInputRef}
                            type={fieldIsMasked ? 'password' : 'text'}
                            value={fieldValInput}
                            onChange={(e) => setFieldValInput(e.target.value)}
                            onFocus={() => {
                              // Automatically collapse suggestion card when user starts typing detail
                              setShowFieldPresetsPopup(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && fieldLabelInput.trim() && fieldValInput.trim()) {
                                handleSaveField(
                                  fieldLabelInput,
                                  fieldValInput,
                                  fieldIsMasked,
                                  fieldDocAttachment,
                                  fieldImgAttachment
                                );
                                setShowFieldPresetsPopup(false);
                              }
                            }}
                            placeholder="Enter number or text..."
                            className={`w-full bg-transparent text-sm font-mono focus:outline-none placeholder:text-neutral-500 ${
                              isDark ? 'text-white' : 'text-neutral-900'
                            }`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Existing Personal Fields List - Borderless cards with app colors */}
                    {personalFields.length > 0 ? (
                      <div className="space-y-2">
                        {personalFields.map((field) => {
                          const isMaskedDefault =
                            field.isMasked ??
                            (field.label.toLowerCase().includes('aadhaar') ||
                              field.label.toLowerCase().includes('pan') ||
                              field.label.toLowerCase().includes('pin') ||
                              field.label.toLowerCase().includes('passport'));

                          const isCurrentlyRevealed = unmaskedFields[field.id] ?? !isMaskedDefault;

                          const isAadhaar = field.label.toLowerCase().includes('aadhaar');
                          const isPan = field.label.toLowerCase().includes('pan');

                          let displayVal = field.value;
                          if (!isCurrentlyRevealed) {
                            if (isAadhaar) displayVal = maskAadhaar(field.value);
                            else if (isPan) displayVal = maskPAN(field.value);
                            else displayVal = maskGeneric(field.value);
                          }

                          const meta = getFieldMeta(field.label);
                          const FieldIcon = meta.icon;

                          if (editingFieldId === field.id) {
                            return (
                              <div
                                key={field.id}
                                className={`p-3.5 rounded-2xl transition-all border ${
                                  isDark
                                    ? 'bg-[#1a1a1e] border-indigo-500/30 ring-1 ring-indigo-500/20'
                                    : 'bg-white border-indigo-200 ring-1 ring-indigo-300 shadow-sm'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <label
                                    className={`block text-[10px] font-semibold uppercase tracking-wider ${
                                      isDark ? 'text-indigo-400' : 'text-indigo-600'
                                    }`}
                                  >
                                    Edit Field
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    {/* Option to attach Document (just as icon) */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        fieldDocInputRef.current?.click();
                                      }}
                                      className={`p-1 rounded-lg transition-all active:scale-90 ${
                                        fieldDocAttachment
                                          ? isDark
                                            ? 'bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-500/40'
                                            : 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                                          : isDark
                                          ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5'
                                      }`}
                                      title={
                                        fieldDocAttachment
                                          ? `Document attached: ${fieldDocAttachment.name} (click to replace)`
                                          : 'Attach document for this field'
                                      }
                                      aria-label="Attach document"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Option to attach Image (just as icon) */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        fieldImgAttachment
                                          ? setLightboxImg(fieldImgAttachment)
                                          : fieldImgInputRef.current?.click();
                                      }}
                                      className={`p-1 rounded-lg transition-all active:scale-90 ${
                                        fieldImgAttachment
                                          ? isDark
                                            ? 'bg-sky-500/25 text-sky-300 ring-1 ring-sky-500/40'
                                            : 'bg-sky-100 text-sky-700 ring-1 ring-sky-300'
                                          : isDark
                                          ? 'text-neutral-400 hover:text-white hover:bg-white/10'
                                          : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5'
                                      }`}
                                      title={
                                        fieldImgAttachment
                                          ? 'Image attached (click to preview)'
                                          : 'Attach image for this field'
                                      }
                                      aria-label="Attach image"
                                    >
                                      <ImageIcon className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFieldPresetsPopup((prev) => !prev);
                                      }}
                                      className={`text-[10px] flex items-center gap-1 font-medium transition-colors ${
                                        isDark
                                          ? 'text-neutral-400 hover:text-white'
                                          : 'text-neutral-500 hover:text-neutral-900'
                                      }`}
                                    >
                                      <span>Choose type</span>
                                      <ChevronDown
                                        className={`w-3 h-3 transition-transform duration-200 ${
                                          showFieldPresetsPopup ? 'rotate-180' : ''
                                        }`}
                                      />
                                    </button>
                                  </div>
                                </div>

                                <input
                                  type="text"
                                  value={fieldLabelInput}
                                  onChange={(e) => setFieldLabelInput(e.target.value)}
                                  placeholder="Field name or choose type..."
                                  className={`w-full bg-transparent text-sm focus:outline-none placeholder:text-neutral-500 font-medium pb-1.5 border-b mb-2.5 ${
                                    isDark ? 'text-white border-neutral-800' : 'text-neutral-900 border-neutral-200'
                                  }`}
                                />

                                {/* Presets popup if opened */}
                                <AnimatePresence>
                                  {showFieldPresetsPopup && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.15 }}
                                      className="overflow-hidden mb-2.5"
                                    >
                                      <div
                                        className={`p-1.5 rounded-2xl transition-colors border ${
                                          isDark
                                            ? 'bg-[#202024] border-neutral-700/60'
                                            : 'bg-white border-neutral-200 shadow-sm'
                                        }`}
                                      >
                                        <div className="max-h-44 overflow-y-auto space-y-0.5 no-scrollbar">
                                          {PRESET_PERSONAL_FIELDS.map((preset) => {
                                            const IconComp = preset.icon;
                                            const isSelected = fieldLabelInput === preset.label;
                                            return (
                                              <button
                                                key={preset.label}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  triggerHaptic('light');
                                                  setFieldLabelInput(preset.label);
                                                  setFieldIsMasked(preset.masked);
                                                  setShowFieldPresetsPopup(false);
                                                }}
                                                className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between text-left transition-all ${
                                                  isSelected
                                                    ? isDark
                                                      ? 'bg-white/10 text-white font-medium'
                                                      : 'bg-neutral-100 text-neutral-900 font-semibold'
                                                    : isDark
                                                    ? 'hover:bg-white/5 text-neutral-200'
                                                    : 'hover:bg-black/5 text-neutral-800'
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <div
                                                    className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                                                      isDark ? preset.iconDark : preset.iconLight
                                                    }`}
                                                  >
                                                    <IconComp className="w-3 h-3 stroke-[2]" />
                                                  </div>
                                                  <span className="text-xs font-medium truncate">
                                                    {preset.label}
                                                  </span>
                                                </div>
                                                <span
                                                  className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-medium ${
                                                    isDark ? preset.badgeDark : preset.badgeLight
                                                  }`}
                                                >
                                                  {preset.typeName}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* Value Input and Masked toggle */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <input
                                    type={fieldIsMasked ? 'password' : 'text'}
                                    value={fieldValInput}
                                    onChange={(e) => setFieldValInput(e.target.value)}
                                    placeholder="Enter number or text..."
                                    className={`w-full bg-transparent text-sm font-mono focus:outline-none placeholder:text-neutral-500 ${
                                      isDark ? 'text-white' : 'text-neutral-900'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setFieldIsMasked((prev) => !prev)}
                                    className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium transition-colors shrink-0 ${
                                      fieldIsMasked
                                        ? isDark
                                          ? 'bg-neutral-800 text-neutral-300'
                                          : 'bg-neutral-200 text-neutral-800'
                                        : isDark
                                        ? 'bg-neutral-800/40 text-neutral-500 hover:text-neutral-300'
                                        : 'bg-neutral-200/50 text-neutral-500 hover:text-neutral-800'
                                    }`}
                                  >
                                    {fieldIsMasked ? (
                                      <>
                                        <EyeOff className="w-3 h-3" />
                                        <span>Masked</span>
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-3 h-3" />
                                        <span>Visible</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Attached document or image badge preview */}
                                {(fieldDocAttachment || fieldImgAttachment) && (
                                  <div className="flex flex-wrap items-center gap-2 mb-3 pt-2 border-t border-dashed border-neutral-700/30">
                                    {fieldDocAttachment && (
                                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-300 text-[11px] font-medium max-w-[200px]">
                                        <FileText className="w-3 h-3 shrink-0 text-indigo-400" />
                                        <span className="truncate">{fieldDocAttachment.name}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFieldDocAttachment(null);
                                          }}
                                          className="p-0.5 rounded-full hover:bg-indigo-500/30 text-indigo-300"
                                          title="Remove document"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    )}
                                    {fieldImgAttachment && (
                                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xl bg-sky-500/15 text-sky-300 text-[11px] font-medium">
                                        <img
                                          src={fieldImgAttachment}
                                          alt="Thumbnail"
                                          className="w-4 h-4 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxImg(fieldImgAttachment);
                                          }}
                                        />
                                        <span
                                          className="text-[10.5px] cursor-pointer hover:underline"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLightboxImg(fieldImgAttachment);
                                          }}
                                        >
                                          Photo attached
                                        </span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFieldImgAttachment(null);
                                          }}
                                          className="p-0.5 rounded-full hover:bg-sky-500/30 text-sky-300"
                                          title="Remove image"
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Bottom action buttons: Cancel and Update */}
                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-neutral-800/40">
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className={`h-7 px-3 rounded-full text-xs font-medium transition-all ${
                                      isDark
                                        ? 'text-neutral-400 hover:text-white hover:bg-white/5'
                                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-black/5'
                                    }`}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (fieldLabelInput.trim() && fieldValInput.trim()) {
                                        handleSaveField(
                                          fieldLabelInput,
                                          fieldValInput,
                                          fieldIsMasked,
                                          fieldDocAttachment,
                                          fieldImgAttachment,
                                          field.id
                                        );
                                      }
                                    }}
                                    disabled={!fieldLabelInput.trim() || !fieldValInput.trim()}
                                    className={`h-7 px-3.5 rounded-full flex items-center gap-1 font-medium text-xs active:scale-95 transition-all shadow-xs ${
                                      !fieldLabelInput.trim() || !fieldValInput.trim()
                                        ? 'opacity-40 cursor-not-allowed bg-neutral-800 text-neutral-500'
                                        : isDark
                                        ? 'bg-white text-black hover:bg-neutral-200'
                                        : 'bg-neutral-900 text-white hover:bg-neutral-800'
                                    }`}
                                  >
                                    <Check className="w-3 h-3 stroke-[2.4]" />
                                    <span>Update</span>
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={field.id}
                              className={`p-3.5 rounded-2xl transition-colors ${
                                isDark
                                  ? 'bg-[#18181b]'
                                  : 'bg-neutral-100/80'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${meta.iconClasses}`}
                                  >
                                    <FieldIcon className="w-3.5 h-3.5 stroke-[2]" />
                                  </div>
                                  <span
                                    className={`text-[11px] font-semibold uppercase tracking-wider truncate ${
                                      isDark ? 'text-neutral-300' : 'text-neutral-700'
                                    }`}
                                  >
                                    {field.label}
                                  </span>
                                  <span
                                    className={`text-[9.5px] px-1.5 py-0.5 rounded-md font-medium shrink-0 ${meta.badgeClasses}`}
                                  >
                                    {meta.typeName}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {/* Mask toggle button */}
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

                                  {/* Copy button */}
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

                                  {/* More options button: houses Edit and Delete */}
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHaptic('light');
                                        setActiveFieldMenuId((prev) => (prev === field.id ? null : field.id));
                                      }}
                                      className={`w-6 h-6 rounded-lg flex items-center justify-center active:scale-95 transition-all ${
                                        activeFieldMenuId === field.id
                                          ? isDark
                                            ? 'bg-white/20 text-white'
                                            : 'bg-neutral-300 text-neutral-900'
                                          : isDark
                                          ? 'bg-[#262626] hover:bg-[#303030] text-neutral-300'
                                          : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                                      }`}
                                      title="More options"
                                      aria-label="More options"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>

                                    {/* More Menu Dropdown */}
                                    <AnimatePresence>
                                      {activeFieldMenuId === field.id && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveFieldMenuId(null);
                                            }}
                                          />
                                          <motion.div
                                            initial={{ opacity: 0, scale: 0.94, y: -4 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.94, y: -4 }}
                                            transition={{ duration: 0.12 }}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`absolute right-0 top-7 w-28 rounded-xl p-1 z-50 border shadow-xl backdrop-blur-xl ${
                                              isDark
                                                ? 'bg-[#1e1e22]/95 border-neutral-700/80 text-neutral-200 shadow-black/80'
                                                : 'bg-white/95 border-neutral-200 text-neutral-800 shadow-neutral-300/80'
                                            }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveFieldMenuId(null);
                                                handleStartEditField(field);
                                              }}
                                              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-colors text-left ${
                                                isDark
                                                  ? 'hover:bg-white/10 hover:text-white'
                                                  : 'hover:bg-neutral-100 hover:text-neutral-900'
                                              }`}
                                            >
                                              <Pencil className="w-3.5 h-3.5" />
                                              <span>Edit</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveFieldMenuId(null);
                                                handleDeleteField(field.id);
                                              }}
                                              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-colors text-left text-red-500 hover:text-red-400 ${
                                                isDark ? 'hover:bg-red-500/15' : 'hover:bg-red-50'
                                              }`}
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              <span>Delete</span>
                                            </button>
                                          </motion.div>
                                        </>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </div>

                              <div
                                className={`text-sm font-mono tracking-wider break-all select-all font-semibold ${
                                  isDark ? 'text-white' : 'text-neutral-900'
                                }`}
                              >
                                {displayVal}
                              </div>

                              {/* Attached document or image for this field */}
                              {(field.document || field.image) && (
                                <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-dashed border-neutral-700/30">
                                  {field.document && (
                                    <div
                                      onClick={() => {
                                        triggerHaptic('light');
                                        setPreviewDoc(field.document!);
                                      }}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all active:scale-95 cursor-pointer ${
                                        isDark
                                          ? 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 ring-1 ring-indigo-500/20'
                                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200'
                                      }`}
                                      title="Click to preview PDF document"
                                    >
                                      <FileText className="w-3 h-3 shrink-0 text-indigo-400" />
                                      <span className="truncate max-w-[150px]">{field.document.name}</span>
                                      <a
                                        href={field.document.dataUrl}
                                        download={field.document.name}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          triggerHaptic('selection');
                                        }}
                                        className={`p-0.5 rounded-md transition-colors ${
                                          isDark
                                            ? 'hover:bg-indigo-500/30 text-indigo-400 hover:text-indigo-200'
                                            : 'hover:bg-indigo-200 text-indigo-600 hover:text-indigo-800'
                                        }`}
                                        title="Download document directly"
                                      >
                                        <Download className="w-3 h-3 shrink-0" />
                                      </a>
                                    </div>
                                  )}
                                  {field.image && (
                                    <div
                                      onClick={() => {
                                        triggerHaptic('light');
                                        setLightboxImg(field.image!);
                                      }}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all active:scale-95 cursor-pointer ${
                                        isDark
                                          ? 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 ring-1 ring-sky-500/20'
                                          : 'bg-sky-50 hover:bg-sky-100 text-sky-700 ring-1 ring-sky-200'
                                      }`}
                                      title="Click to preview image"
                                    >
                                      <img
                                        src={field.image}
                                        alt="Field attachment"
                                        className="w-4 h-4 rounded object-cover"
                                      />
                                      <span>View Image</span>
                                      <a
                                        href={field.image}
                                        download="attached_image.png"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          triggerHaptic('selection');
                                        }}
                                        className={`p-0.5 rounded-md transition-colors ${
                                          isDark
                                            ? 'hover:bg-sky-500/30 text-sky-400 hover:text-sky-200'
                                            : 'hover:bg-sky-200 text-sky-600 hover:text-sky-800'
                                        }`}
                                        title="Download image directly"
                                      >
                                        <Download className="w-3 h-3 shrink-0" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Center + button to add personal detail when items exist */}
                        {!isAddingField && (
                          <div className="flex justify-center pt-2">
                            <button
                              id="passkey-list-add-detail-btn"
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setFieldLabelInput('');
                                setFieldValInput('');
                                setFieldIsMasked(false);
                                setIsAddingField(true);
                                setShowFieldPresetsPopup(true);
                              }}
                              className={`w-9 h-9 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-sm ${
                                isDark
                                  ? 'bg-[#222225] hover:bg-[#2c2c30] text-neutral-200'
                                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                              }`}
                              title="Add Personal Detail"
                              aria-label="Add personal detail"
                            >
                              <Plus className="w-4 h-4 stroke-[2.2]" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : !isAddingField ? (
                      /* Empty state for Personal Info card - Minimal and clean */
                      <div
                        onClick={() => {
                          triggerHaptic('light');
                          setFieldLabelInput('');
                          setFieldValInput('');
                          setFieldIsMasked(false);
                          setIsAddingField(true);
                          setShowFieldPresetsPopup(true);
                        }}
                        className={`py-7 px-5 rounded-2xl text-center transition-colors cursor-pointer active:scale-[0.99] ${
                          isDark
                            ? 'bg-[#18181b] hover:bg-[#202024]'
                            : 'bg-neutral-100/80 hover:bg-neutral-100'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2.5 ${
                            isDark
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          <Shield className="w-5 h-5 stroke-[2]" />
                        </div>
                        <h4
                          className={`text-xs font-semibold mb-1 ${
                            isDark ? 'text-white' : 'text-neutral-900'
                          }`}
                        >
                          No personal details
                        </h4>
                        <p className="text-[11px] text-neutral-400 max-w-xs mx-auto leading-relaxed">
                          Store your IDs and sensitive records securely.
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* 2. ACCOUNT / CREDENTIALS (Email & Password) */}
                {(email || password) && (
                  <div className="space-y-2">
                    {/* Email / Username */}
                    {email && (
                      <div
                        className={`p-3.5 rounded-2xl transition-colors ${
                          isDark
                            ? 'bg-[#18181b]'
                            : 'bg-neutral-100/80'
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
                        className={`p-3.5 rounded-2xl transition-colors ${
                          isDark
                            ? 'bg-[#18181b]'
                            : 'bg-neutral-100/80'
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
                          onClick={() => {
                            triggerHaptic('light');
                            setPreviewDoc(doc);
                          }}
                          className={`p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                            isDark
                              ? 'bg-[#18181b] hover:bg-[#202024]'
                              : 'bg-neutral-100/80 hover:bg-neutral-100'
                          }`}
                          title="Click to preview document"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHaptic('selection');
                            }}
                            className={`h-7 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-medium shrink-0 active:scale-95 transition-all ${
                              isDark
                                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                                : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
                            }`}
                            title="Download document directly"
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
                          className={`relative rounded-2xl overflow-hidden group aspect-video cursor-pointer transition-all active:scale-[0.98] ${
                            isDark ? 'bg-[#18181b]' : 'bg-neutral-100'
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
                            className={`p-3 rounded-2xl flex items-center justify-between transition-colors ${
                              isDark
                                ? 'bg-[#18181b]'
                                : 'bg-neutral-100/80'
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
                    className={`p-3.5 rounded-2xl transition-colors ${
                      isDark
                        ? 'bg-[#18181b]'
                        : 'bg-neutral-100/80'
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

      {/* PDF / Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!previewDoc}
        document={previewDoc}
        theme={theme}
        onClose={() => setPreviewDoc(null)}
      />

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={!!lightboxImg}
        src={lightboxImg}
        onClose={() => setLightboxImg(null)}
      />

      {/* Global Hidden File Inputs for Personal Fields */}
      <input
        ref={fieldDocInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,application/pdf"
        className="hidden"
        onChange={handleFieldDocChange}
      />
      <input
        ref={fieldImgInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFieldImgChange}
      />
    </>
  );
}
