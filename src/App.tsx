import { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { NavBar } from './components/NavBar';
import { EmptyBody } from './components/EmptyBody';
import { DrawerMenu } from './components/DrawerMenu';
import { SearchDrawer } from './components/SearchDrawer';
import { NewNoteModal } from './components/NewNoteModal';
import { SettingsPage } from './components/SettingsPage';
import { PassKeyDrawer } from './components/PassKeyDrawer';
import { TodoDrawer, parseTodoItemsFromNote } from './components/TodoDrawer';
import { DiaryDrawer } from './components/DiaryDrawer';
import { DataDrawer } from './components/DataDrawer';
import { DesktopSidebar } from './components/DesktopSidebar';
import { NavTab, ThemeMode, NoteItem, EntryType, TodoSubItem, VoiceNoteAttachment } from './types';
import {
  updateNativeStatusBar,
  registerNativeBackButton,
  triggerHaptic,
} from './lib/capacitor';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('memento_theme');
    return saved === 'light' || saved === 'dark' ? (saved as ThemeMode) : 'dark';
  });

  const [currentPage, setCurrentPage] = useState<'main' | 'settings'>('main');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDataDrawerOpen, setIsDataDrawerOpen] = useState(false);
  const [isSearchDrawerOpen, setIsSearchDrawerOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [selectedPassKeyNote, setSelectedPassKeyNote] = useState<NoteItem | null>(null);
  const [selectedTodoNote, setSelectedTodoNote] = useState<NoteItem | null>(null);
  const [selectedDiaryNote, setSelectedDiaryNote] = useState<NoteItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleOpenNewNote = () => {
    setEditingNote(null);
    setIsNewNoteOpen(true);
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('memento_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('memento_sidebar_collapsed', String(next));
      return next;
    });
  };

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('memento_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('memento_notes', JSON.stringify(notes));
    } catch {
      // ignore storage quota / parsing errors
    }
  }, [notes]);

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
    updateNativeStatusBar(theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    triggerHaptic('light');
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Capacitor native Android hardware back button handler
  useEffect(() => {
    const unregister = registerNativeBackButton(() => {
      if (isNewNoteOpen) {
        setIsNewNoteOpen(false);
        return true;
      }
      if (selectedPassKeyNote) {
        setSelectedPassKeyNote(null);
        return true;
      }
      if (selectedTodoNote) {
        setSelectedTodoNote(null);
        return true;
      }
      if (selectedDiaryNote) {
        setSelectedDiaryNote(null);
        return true;
      }
      if (isSearchDrawerOpen) {
        setIsSearchDrawerOpen(false);
        return true;
      }
      if (isDataDrawerOpen) {
        setIsDataDrawerOpen(false);
        return true;
      }
      if (isDrawerOpen) {
        setIsDrawerOpen(false);
        return true;
      }
      if (currentPage === 'settings') {
        setCurrentPage('main');
        return true;
      }
      return false;
    });

    return () => unregister();
  }, [
    isNewNoteOpen,
    selectedPassKeyNote,
    selectedTodoNote,
    selectedDiaryNote,
    isSearchDrawerOpen,
    isDataDrawerOpen,
    isDrawerOpen,
    currentPage,
  ]);

  // Desktop keyboard shortcuts (⌘K or / for Search, N for New Note)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || e.key === '/') {
        e.preventDefault();
        setIsSearchDrawerOpen(true);
      } else if (e.key.toLowerCase() === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleOpenNewNote();
      } else if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      voiceDuration?: string;
      voiceAudioUrl?: string;
      voiceNotes?: VoiceNoteAttachment[];
      imageUrl?: string;
      images?: string[];
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
      entryType:
        extra?.entryType ??
        (isTodo ? 'todo' : isSafe ? 'passwords' : activeTab === 'diary' ? 'diary' : 'notes'),
      email: extra?.email,
      service: extra?.service,
      password: extra?.password,
      todoItems: extra?.todoItems,
      hasVoiceNote: extra?.hasVoiceNote,
      voiceDuration: extra?.voiceDuration,
      voiceAudioUrl: extra?.voiceAudioUrl,
      voiceNotes: extra?.voiceNotes,
      imageUrl: extra?.imageUrl,
      images: extra?.images,
    };
    triggerHaptic('success');
    setNotes((prev) => [newNote, ...prev]);
  };

  const handleDrawerSelect = (itemId: string) => {
    if (itemId === 'settings') {
      setCurrentPage('settings');
    } else if (itemId === 'data') {
      setIsDataDrawerOpen(true);
    } else if (itemId === 'favorites') {
      setActiveTab('favorites');
      setCurrentPage('main');
    } else if (itemId === 'diary') {
      setActiveTab('diary');
      setCurrentPage('main');
    } else if (itemId === 'archive') {
      setActiveTab('archive');
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
    } else if (note.entryType === 'todo' || note.isTodo) {
      setSelectedTodoNote(note);
    } else {
      setSelectedDiaryNote(note);
    }
  };

  const handleToggleTodoItem = (noteId: string, itemId: string) => {
    triggerHaptic('light');
    setNotes((prevNotes) =>
      prevNotes.map((note) => {
        if (note.id !== noteId) return note;
        const currentItems = parseTodoItemsFromNote(note);
        const updatedItems = currentItems.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        const updatedContent = updatedItems
          .map((t) => `${t.completed ? '[x]' : '[ ]'} ${t.text}`)
          .join('\n');
        const updatedNote: NoteItem = {
          ...note,
          todoItems: updatedItems,
          content: updatedContent,
          isTodo: true,
          entryType: 'todo',
        };
        if (selectedTodoNote?.id === noteId) {
          setSelectedTodoNote(updatedNote);
        }
        return updatedNote;
      })
    );
  };

  const handleToggleFavorite = (id: string) => {
    triggerHaptic('light');
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isFavorite: !n.isFavorite } : n))
    );
  };

  const handleEditNote = (note: NoteItem) => {
    triggerHaptic('light');
    setEditingNote(note);
    setIsNewNoteOpen(true);
  };

  const handleDeleteNote = (id: string) => {
    triggerHaptic('medium');
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedTodoNote?.id === id) setSelectedTodoNote(null);
    if (selectedPassKeyNote?.id === id) setSelectedPassKeyNote(null);
    if (selectedDiaryNote?.id === id) setSelectedDiaryNote(null);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`h-full h-dvh w-full flex justify-center overflow-hidden transition-colors duration-200 ${
        isDark ? 'bg-[#000000] text-[#f4f4f5]' : 'bg-[#e8e9ed] text-[#18181b]'
      }`}
    >
      {/* Responsive Workspace: mobile frame on phone screens, full-width desktop workstation on larger screens */}
      <div
        className={`w-full max-w-md md:max-w-none md:w-full h-full flex flex-col md:flex-row relative overflow-hidden transition-colors duration-200 ${
          isDark ? 'bg-[#0a0a0a]' : 'bg-[#f8f9fa]'
        }`}
      >
        {/* Desktop Sidebar: automatically hidden on mobile, visible on desktop (md+) */}
        <DesktopSidebar
          activeTab={activeTab}
          currentPage={currentPage}
          theme={theme}
          notes={notes}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setCurrentPage('main');
          }}
          onOpenNewNote={handleOpenNewNote}
          onOpenSearch={() => setIsSearchDrawerOpen(true)}
          onOpenData={() => setIsDataDrawerOpen(true)}
          onOpenSettings={() => setCurrentPage('settings')}
          onToggleTheme={toggleTheme}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
          {currentPage === 'settings' ? (
            <SettingsPage
              theme={theme}
              notes={notes}
              onBack={() => setCurrentPage('main')}
              onToggleTheme={toggleTheme}
              onClearAllNotes={() => setNotes([])}
              onImportNotes={(imported) => setNotes(imported)}
            />
          ) : (
            <>
              {/* Top Bar: 'memento' on mobile, Section title + Search on desktop */}
              <TopBar
                theme={theme}
                activeTab={activeTab}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={toggleSidebar}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenSearch={() => setIsSearchDrawerOpen(true)}
              />

              {/* Empty Body: responsive notes grid on desktop, single column on mobile */}
              <EmptyBody
                activeTab={activeTab}
                theme={theme}
                notes={notes}
                searchQuery={searchQuery}
                onOpenNewNote={handleOpenNewNote}
                onSelectNote={handleSelectNote}
                onToggleTodoItem={handleToggleTodoItem}
                onEditNote={handleEditNote}
                onDeleteNote={handleDeleteNote}
                onToggleFavorite={handleToggleFavorite}
                onUpdateNote={(updated) => {
                  setNotes((prev) =>
                    prev.map((n) => (n.id === updated.id ? updated : n))
                  );
                }}
              />
            </>
          )}

          {/* Bottom Nav Bar: auto-hidden on desktop (md:hidden) - always visible on mobile, even in settings */}
          <NavBar
            activeTab={activeTab}
            theme={theme}
            isSettings={currentPage === 'settings'}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              setCurrentPage('main');
            }}
            onOpenNewNote={handleOpenNewNote}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        </div>

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
          editingNote={editingNote}
          initialType={
            editingNote
              ? editingNote.entryType ||
                (editingNote.isTodo
                  ? 'todo'
                  : editingNote.isSafe || editingNote.isVault
                  ? 'passwords'
                  : 'notes')
              : activeTab === 'todo'
              ? 'todo'
              : activeTab === 'vault' || activeTab === 'safe'
              ? 'passwords'
              : activeTab === 'diary'
              ? 'diary'
              : 'notes'
          }
          onClose={() => {
            setIsNewNoteOpen(false);
            setEditingNote(null);
          }}
          onSaveNote={handleSaveNote}
          onUpdateNote={(updated) => {
            triggerHaptic('success');
            setNotes((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
            setIsNewNoteOpen(false);
            setEditingNote(null);
          }}
        />

        {/* Pass / Key Detail Drawer Menu */}
        <PassKeyDrawer
          isOpen={!!selectedPassKeyNote}
          theme={theme}
          note={selectedPassKeyNote}
          onClose={() => setSelectedPassKeyNote(null)}
          onEdit={(note) => {
            setSelectedPassKeyNote(null);
            setEditingNote(note);
            setIsNewNoteOpen(true);
          }}
          onDelete={(id) => {
            setNotes((prev) => prev.filter((n) => n.id !== id));
            setSelectedPassKeyNote(null);
          }}
        />

        {/* Todo Detail Drawer Menu */}
        <TodoDrawer
          isOpen={!!selectedTodoNote}
          theme={theme}
          note={selectedTodoNote}
          onClose={() => setSelectedTodoNote(null)}
          onEdit={(note) => {
            setSelectedTodoNote(null);
            setEditingNote(note);
            setIsNewNoteOpen(true);
          }}
          onUpdateNote={(updated) => {
            setNotes((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
            setSelectedTodoNote(updated);
          }}
          onDelete={(id) => {
            setNotes((prev) => prev.filter((n) => n.id !== id));
            setSelectedTodoNote(null);
          }}
        />

        {/* Diary / Note Detail Drawer Menu */}
        <DiaryDrawer
          isOpen={!!selectedDiaryNote}
          theme={theme}
          note={selectedDiaryNote}
          onClose={() => setSelectedDiaryNote(null)}
          onEdit={(note) => {
            setSelectedDiaryNote(null);
            setEditingNote(note);
            setIsNewNoteOpen(true);
          }}
          onDelete={(id) => {
            setNotes((prev) => prev.filter((n) => n.id !== id));
            setSelectedDiaryNote(null);
          }}
          onToggleFavorite={(id) => {
            handleToggleFavorite(id);
            setSelectedDiaryNote((prev) =>
              prev && prev.id === id ? { ...prev, isFavorite: !prev.isFavorite } : prev
            );
          }}
          onUpdateNote={(updated) => {
            setNotes((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            );
            setSelectedDiaryNote(updated);
          }}
        />

        {/* Data Drawer opened directly or from Drawer menu */}
        <DataDrawer
          isOpen={isDataDrawerOpen}
          theme={theme}
          notes={notes}
          onClose={() => setIsDataDrawerOpen(false)}
          onClearAllNotes={() => setNotes([])}
          onImportNotes={(imported) => setNotes(imported)}
        />
      </div>
    </div>
  );
}
