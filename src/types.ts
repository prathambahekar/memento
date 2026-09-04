export type NavTab = 'home' | 'todo' | 'add' | 'vault' | 'safe' | 'more' | 'notes' | 'favorites';
export type ThemeMode = 'dark' | 'light';

export interface DrawerMenuItem {
  id: string;
  label: string;
  iconName: string;
  badge?: string;
  action?: () => void;
}
