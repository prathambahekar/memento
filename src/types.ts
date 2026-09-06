export type NavTab =
  | 'home'
  | 'todo'
  | 'add'
  | 'vault'
  | 'safe'
  | 'more'
  | 'notes'
  | 'favorites'
  | 'diary'
  | 'archive';
export type ThemeMode = 'dark' | 'light';
export type EntryType = 'diary' | 'passwords' | 'todo' | 'notes';
export type AppPage = 'main' | 'settings' | 'todo' | 'safe';

export interface StandaloneTodoItem {
  id: string;
  text: string;
  completed: boolean;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  createdAt: number;
}

export interface DrawerMenuItem {
  id: string;
  label: string;
  iconName: string;
  badge?: string;
  action?: () => void;
}

export interface TodoSubItem {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
}

export interface DocumentAttachment {
  id: string;
  name: string;
  size?: string;
  type?: string;
  dataUrl: string;
  uploadedAt?: string;
}

export interface PersonalInfoField {
  id: string;
  label: string;
  value: string;
  isMasked?: boolean;
  document?: DocumentAttachment;
  image?: string;
  documentName?: string;
}

export interface VoiceNoteAttachment {
  id: string;
  audioUrl: string;
  duration?: string;
  createdAt?: string;
  name?: string;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  date: string;
  tags?: string[];
  isFavorite?: boolean;
  isTodo?: boolean;
  isVault?: boolean;
  isSafe?: boolean;
  isPersonalInfo?: boolean;
  isDiary?: boolean;
  isArchived?: boolean;
  isTodayList?: boolean;
  todayDate?: string;
  entryType?: EntryType;
  email?: string;
  service?: string;
  password?: string;
  todoItems?: TodoSubItem[];
  hasVoiceNote?: boolean;
  voiceDuration?: string;
  voiceAudioUrl?: string;
  voiceNotes?: VoiceNoteAttachment[];
  imageUrl?: string;
  images?: string[];
  documents?: DocumentAttachment[];
  personalInfo?: PersonalInfoField[];
}

export type CategoryFilter = 'all' | 'todo' | 'safe' | 'diary' | 'notes';
export type HomeChipFilter = 'all' | 'note' | 'safe' | 'key' | 'todo' | 'diary';

export function getNoteCategory(note: NoteItem): 'todo' | 'safe' | 'diary' | 'notes' {
  if (note.entryType === 'todo' || !!note.isTodo) return 'todo';
  if (note.entryType === 'passwords' || !!note.isSafe || !!note.isVault) return 'safe';
  if (note.entryType === 'diary') return 'diary';
  return 'notes';
}
