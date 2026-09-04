import { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { NavBar } from './components/NavBar';
import { EmptyBody } from './components/EmptyBody';
import { DrawerMenu } from './components/DrawerMenu';
import { SearchDrawer } from './components/SearchDrawer';
import { NewNoteModal } from './components/NewNoteModal';
import { SettingsPage } from './components/SettingsPage';
import { PassKeyDrawer } from './components/PassKeyDrawer';
import { NavTab, ThemeMode, NoteItem, EntryType, TodoSubItem } from './types';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('memento_theme');
    return saved === 'light' || saved === 'dark' ? (saved as ThemeMode) : 'dark';
  });

  const [currentPage, setCurrentPage] = useState<'main' | 'settings'>('main');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [selectedPassKeyNote, setSelectedPassKeyNote] = useState<NoteItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<NoteItem[]>([]);

  useEffect(() => {
    localStorage.setItem('memento_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#09090b';
      document.body.style.color = '#f4f4f5';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '#f4f4f6';
      document.body.style.color = '#18181b';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleSaveNote = (
    title: string,
    content: string,
    extra?: {
      entryType?: EntryType;
      isTodo?: boolean;
      isSafe?: boolean;
      email?: string;
      service?: string;
      password?: string;
      todoItems?: TodoSubItem[];
      hasVoiceNote?: boolean;
      imageUrl?: string;
    }
  ) => {
    const isTodo = extra?.isTodo ?? (activeTab === 'todo');
    const isSafe = extra?.isSafe ?? (activeTab === 'vault' || activeTab === 'safe');

    const newNote: NoteItem = {
      id: Date.now().toString(),
      title,
      content,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      isFavorite: activeTab === 'favorites',
      isTodo,
      isVault: isSafe,
      isSafe,
      entryType: extra?.entryType ?? (isTodo ? 'todo' : isSafe ? 'passwords' : 'diary'),
      email: extra?.email,
      service: extra?.service,
      password: extra?.password,
      todoItems: extra?.todoItems,
      hasVoiceNote: extra?.hasVoiceNote,
      imageUrl: extra?.imageUrl,
    };
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleDrawerSelect = (itemId: string) => {
    if (itemId === 'settings') {
      setCurrentPage('settings');
    } else if (itemId === 'favorites') {
      setActiveTab('favorites');
      setCurrentPage('main');
    } else if (itemId === 'todo') {
      setActiveTab('todo');
      setCurrentPage('main');
    } else if (itemId === 'safe' || itemId === 'vault') {
      setActiveTab('safe');
      setCurrentPage('main');
    } else if (itemId === 'my-things') {
      setActiveTab('home');
      setCurrentPage('main');
    }
  };

  const handleSelectNote = (note: NoteItem) => {
    if (note.entryType === 'passwords' || note.isSafe || note.isVault) {
      setSelectedPassKeyNote(note);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-dvh w-full flex justify-center transition-colors duration-200 ${
        isDark ? 'bg-[#000000] text-[#f4f4f5]' : 'bg-[#e8e9ed] text-[#18181b]'
      }`}
    >
      {/* Mobile-first centered container */}
      <div
        className={`w-full max-w-md h-dvh flex flex-col relative overflow-hidden shadow-2xl transition-colors duration-200 ${
          isDark ? 'bg-[#0a0a0a]' : 'bg-[#f8f9fa]'
        }`}
      >
        {currentPage === 'settings' ? (
          <SettingsPage
            theme={theme}
            notes={notes}
            onBack={() => setCurrentPage('main')}
            onToggleTheme={toggleTheme}
            onClearAllNotes={() => setNotes([])}
          />
        ) : (
          <>
            {/* Top Bar: 'memento' at left, Search button at right */}
            <TopBar
              theme={theme}
              onOpenSearch={() => setIsSearchDrawerOpen(true)}
            />

            {/* Empty Body: clean, simple, beautiful, zero splitting lines */}
            <EmptyBody
              activeTab={activeTab}
              theme={theme}
              notes={notes}
              searchQuery={searchQuery}
              onOpenNewNote={() => setIsNewNoteOpen(true)}
              onSelectNote={handleSelectNote}
            />

            {/* Bottom Nav Bar: 5 buttons (Home, Notes, + at center, Favorites, More at rightmost) */}
            <NavBar
              activeTab={activeTab}
              theme={theme}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setCurrentPage('main');
              }}
              onOpenNewNote={() => setIsNewNoteOpen(true)}
              onOpenDrawer={() => setIsDrawerOpen(true)}
            />
          </>
        )}

        {/* Search Drawer opened by top-bar Search button */}
        <SearchDrawer
          isOpen={isSearchDrawerOpen}
          theme={theme}
          notes={notes}
          onClose={() => setIsSearchDrawerOpen(false)}
          onSelectNote={(note) => {
            handleSelectNote(note);
          }}
          onCreateWithTitle={(title) => {
            handleSaveNote(title, '');
          }}
        />

        {/* Drawer Menu opened by 'More' button - features grid and theme footer */}
        <DrawerMenu
          isOpen={isDrawerOpen}
          theme={theme}
          onToggleTheme={toggleTheme}
          onClose={() => setIsDrawerOpen(false)}
          onSelectItem={handleDrawerSelect}
        />

        {/* New Note Composer Sheet opened by '+' button */}
        <NewNoteModal
          isOpen={isNewNoteOpen}
          theme={theme}
          initialType={
            activeTab === 'todo'
              ? 'todo'
              : activeTab === 'vault' || activeTab === 'safe'
              ? 'passwords'
              : 'diary'
          }
          onClose={() => setIsNewNoteOpen(false)}
          onSaveNote={handleSaveNote}
        />

        {/* Pass / Key Detail Drawer Menu */}
        <PassKeyDrawer
          isOpen={!!selectedPassKeyNote}
          theme={theme}
          note={selectedPassKeyNote}
          onClose={() => setSelectedPassKeyNote(null)}
          onDelete={(id) => {
            setNotes((prev) => prev.filter((n) => n.id !== id));
            setSelectedPassKeyNote(null);
          }}
        />
      </div>
    </div>
  );
}
