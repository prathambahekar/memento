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
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  date: string;
  isFavorite?: boolean;
  isTodo?: boolean;
  isVault?: boolean;
  isSafe?: boolean;
  isArchived?: boolean;
  entryType?: EntryType;
  email?: string;
  service?: string;
  password?: string;
  todoItems?: TodoSubItem[];
  hasVoiceNote?: boolean;
  voiceDuration?: string;
  imageUrl?: string;
}
