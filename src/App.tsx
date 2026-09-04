import { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { NavBar } from './components/NavBar';
import { EmptyBody, NoteItem } from './components/EmptyBody';
import { DrawerMenu } from './components/DrawerMenu';
import { SearchDrawer } from './components/SearchDrawer';
import { NewNoteModal } from './components/NewNoteModal';
import { SettingsPage } from './components/SettingsPage';
import { NavTab, ThemeMode } from './types';

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

  const handleSaveNote = (title: string, content: string) => {
    const newNote: NoteItem = {
      id: Date.now().toString(),
      title,
      content,
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      isFavorite: activeTab === 'favorites',
      isTodo: activeTab === 'todo',
      isVault: activeTab === 'vault' || activeTab === 'safe',
      isSafe: activeTab === 'vault' || activeTab === 'safe',
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

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-dvh w-full flex justify-center transition-colors duration-200 ${
        isDark ? 'bg-[#050507] text-[#f4f4f5]' : 'bg-[#e8e9ed] text-[#18181b]'
      }`}
    >
      {/* Mobile-first centered container */}
      <div
        className={`w-full max-w-md h-dvh flex flex-col relative overflow-hidden shadow-2xl transition-colors duration-200 ${
          isDark ? 'bg-[#09090b]' : 'bg-[#f8f9fa]'
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
            // Can switch to notes or highlight note
            setActiveTab('notes');
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
          onClose={() => setIsNewNoteOpen(false)}
          onSaveNote={handleSaveNote}
        />
      </div>
    </div>
  );
}
