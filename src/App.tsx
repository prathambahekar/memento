import { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { NavBar } from './components/NavBar';
import { EmptyBody } from './components/EmptyBody';
import { DrawerMenu } from './components/DrawerMenu';
import { SearchDrawer } from './components/SearchDrawer';
import { NewNoteModal } from './components/NewNoteModal';
import { SettingsPage } from './components/SettingsPage';
import { TodoPage } from './components/TodoPage';
import { SafePage } from './components/SafePage';
import { PassKeyDrawer } from './components/PassKeyDrawer';
import { TodoDrawer, parseTodoItemsFromNote } from './components/TodoDrawer';
import { DiaryDrawer } from './components/DiaryDrawer';
import { DataDrawer } from './components/DataDrawer';
import { DesktopSidebar } from './components/DesktopSidebar';
import {
  NavTab,
  ThemeMode,
  NoteItem,
  EntryType,
  TodoSubItem,
  VoiceNoteAttachment,
  DocumentAttachment,
  PersonalInfoField,
  AppPage,
  HomeChipFilter,
} from './types';
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

  const [currentPage, setCurrentPage] = useState<AppPage>('main');
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
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [homeChip, setHomeChip] = useState<HomeChipFilter>('all');
  const [newNoteInitialType, setNewNoteInitialType] = useState<EntryType | undefined>(undefined);

  const handleOpenNewNote = (preferredType?: unknown) => {
    const validTypes: EntryType[] = ['notes', 'todo', 'passwords', 'diary'];
    const safeType: EntryType | undefined =
      typeof preferredType === 'string' && (validTypes as string[]).includes(preferredType)
        ? (preferredType as EntryType)
        : undefined;
    setEditingNote(null);
    setNewNoteInitialType(safeType);
    setIsNewNoteOpen(true);
  };

  const handleSelectHomeChip = (chip: HomeChipFilter) => {
    setHomeChip(chip);
    if (activeTab !== 'home' && activeTab !== 'notes') {
      setActiveTab('home');
    }
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      return true;
    }
    return localStorage.getItem('memento_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('memento_sidebar_collapsed', String(next));
      return next;
    });
  };

  const [isNavbarFloating, setIsNavbarFloating] = useState<boolean>(() => {
    return localStorage.getItem('memento_navbar_floating') === 'true';
  });

  const toggleNavbarFloating = () => {
    triggerHaptic('selection');
    setIsNavbarFloating((prev) => {
      const next = !prev;
      localStorage.setItem('memento_navbar_floating', String(next));
      return next;
    });
  };

  const [autoOpenKeyboard, setAutoOpenKeyboard] = useState<boolean>(() => {
    const saved = localStorage.getItem('memento_auto_open_keyboard');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleAutoOpenKeyboard = () => {
    triggerHaptic('selection');
    setAutoOpenKeyboard((prev) => {
      const next = !prev;
      localStorage.setItem('memento_auto_open_keyboard', String(next));
      return next;
    });
  };

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem('memento_notes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Clean out previous mock data and empty auto-generated Today notes
          const cleaned = parsed.filter((item) => {
            if (!item) return false;
            // Remove initial mock safe notes
            if (
              item.id === 'safe-personal-identity' ||
              item.id === 'safe-discord' ||
              item.id === 'safe-netflix' ||
              item.id === 'safe-prime-video'
            ) {
              return false;
            }
            // Remove empty auto-generated Today notes with no tasks and empty content
            const isToday =
              item.isTodayList ||
              (item.title || '').trim().toLowerCase() === 'today' ||
              (typeof item.id === 'string' && item.id.startsWith('todo-today-'));
            const tasks = parseTodoItemsFromNote(item);
            if (isToday && tasks.length === 0 && (!item.content || !item.content.trim())) {
              return false;
            }
            return true;
          });

          // Deduplicate any duplicate today notes or duplicate IDs
          const seenIds = new Set<string>();
          let seenToday = false;
          const deduplicated: NoteItem[] = [];

          for (const item of cleaned) {
            let id = item.id ? String(item.id).trim() : `note-${deduplicated.length}`;
            const isToday =
              item.isTodayList ||
              (item.title || '').trim().toLowerCase() === 'today' ||
              (typeof id === 'string' && id.startsWith('todo-today-'));

            if (isToday) {
              if (seenToday) continue; // Keep only one Today list
              seenToday = true;
            }

            if (seenIds.has(id)) {
              id = `${id}-${deduplicated.length}-${Math.random().toString(36).substring(2, 6)}`;
            }
            seenIds.add(id);
            deduplicated.push({ ...item, id });
          }

          return deduplicated;
        }
      }
    } catch {
      // ignore
    }
    return [];
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
      if (currentPage === 'settings' || currentPage === 'todo' || currentPage === 'safe') {
        setCurrentPage('main');
        setActiveTab('home');
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
      tags?: string[];
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
  ) => {
    const isTodo = extra?.isTodo ?? (activeTab === 'todo');
    const isSafe = extra?.isSafe ?? (activeTab === 'vault' || activeTab === 'safe');

    const newNote: NoteItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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
      tags: extra?.tags,
      todoItems: extra?.todoItems,
      hasVoiceNote: extra?.hasVoiceNote,
      voiceDuration: extra?.voiceDuration,
      voiceAudioUrl: extra?.voiceAudioUrl,
      voiceNotes: extra?.voiceNotes,
      imageUrl: extra?.imageUrl,
      images: extra?.images,
      documents: extra?.documents,
      personalInfo: extra?.personalInfo,
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
      setCurrentPage('todo');
    } else if (itemId === 'safe' || itemId === 'vault') {
      setActiveTab('safe');
      setHomeChip('safe');
      setCurrentPage('safe');
    } else if (itemId === 'my-things') {
      setActiveTab('home');
      setCurrentPage('main');
    } else if (itemId === 'reorder') {
      setIsReorderMode((prev) => !prev);
      triggerHaptic('medium');
      if (currentPage !== 'main') {
        setCurrentPage('main');
      }
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

  const handleUpdateNote = (updatedNote: NoteItem) => {
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === updatedNote.id);
      if (!exists) {
        return [updatedNote, ...prev];
      }
      return prev.map((n) => (n.id === updatedNote.id ? updatedNote : n));
    });
    if (selectedTodoNote?.id === updatedNote.id) {
      setSelectedTodoNote(updatedNote);
    }
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
        isDark ? 'bg-[#09090b] text-[#f4f4f5]' : 'bg-[#f4f4f6] text-[#18181b]'
      }`}
    >
      {/* Responsive Workspace: mobile frame on phone screens, full-width desktop workstation on larger screens */}
      <div
        className={`w-full max-w-md md:max-w-none md:w-full h-full flex flex-col md:flex-row relative overflow-hidden transition-colors duration-200 ${
          isDark ? 'bg-[#09090b]' : 'bg-[#f4f4f6]'
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
            if (tab === 'todo') {
              setCurrentPage('todo');
            } else if (tab === 'vault' || tab === 'safe') {
              setHomeChip('safe');
              setActiveTab('safe');
              setCurrentPage('safe');
            } else {
              if (tab === 'home' || tab === 'notes') {
                setHomeChip('all');
              }
              setActiveTab(tab);
              setCurrentPage('main');
            }
          }}
          onOpenTodo={() => setCurrentPage('todo')}
          onOpenNewNote={() => {
            if (currentPage === 'todo' || activeTab === 'todo') {
              handleOpenNewNote('todo');
            } else if (currentPage === 'safe' || activeTab === 'vault' || activeTab === 'safe') {
              handleOpenNewNote('passwords');
            } else if (activeTab === 'diary') {
              handleOpenNewNote('diary');
            } else {
              handleOpenNewNote('notes');
            }
          }}
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
              isNavbarFloating={isNavbarFloating}
              autoOpenKeyboard={autoOpenKeyboard}
              onBack={() => setCurrentPage('main')}
              onOpenSearch={() => setIsSearchDrawerOpen(true)}
              onToggleTheme={toggleTheme}
              onToggleNavbarFloating={toggleNavbarFloating}
              onToggleAutoOpenKeyboard={toggleAutoOpenKeyboard}
              onClearAllNotes={() => setNotes([])}
              onImportNotes={(imported) => {
                const seen = new Set<string>();
                const cleaned = imported.map((item, idx) => {
                  let id = item?.id ? String(item.id) : `imported-${idx}-${Date.now()}`;
                  if (seen.has(id)) {
                    id = `${id}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
                  }
                  seen.add(id);
                  return { ...item, id };
                });
                setNotes(cleaned);
              }}
            />
          ) : currentPage === 'todo' ? (
            <TodoPage
              theme={theme}
              notes={notes}
              autoOpenKeyboard={autoOpenKeyboard}
              onBack={() => setCurrentPage('main')}
              onUpdateNote={handleUpdateNote}
              onAddNote={(newNote) => {
                setNotes((prev) => {
                  if (prev.some((n) => n.id === newNote.id)) {
                    return prev.map((n) => (n.id === newNote.id ? newNote : n));
                  }
                  return [newNote, ...prev];
                });
              }}
              onDeleteNote={handleDeleteNote}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenSearch={() => setIsSearchDrawerOpen(true)}
              onSelectNote={handleSelectNote}
              onOpenNewNote={handleOpenNewNote}
            />
          ) : currentPage === 'safe' ? (
            <SafePage
              theme={theme}
              notes={notes}
              onBack={() => {
                setActiveTab('home');
                setCurrentPage('main');
              }}
              onSelectNote={handleSelectNote}
              onOpenNewSafeNote={() => handleOpenNewNote('passwords')}
              onUpdateNote={handleUpdateNote}
              onDeleteNote={handleDeleteNote}
              onToggleFavorite={handleToggleFavorite}
              searchQuery={searchQuery}
              onOpenSearch={() => setIsSearchDrawerOpen(true)}
            />
          ) : (
            <>
              {/* Top Bar: 'memento' on mobile, Section title + Search on desktop */}
              <TopBar
                theme={theme}
                activeTab={activeTab}
                activeChip={homeChip}
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
                isReorderMode={isReorderMode}
                selectedChip={homeChip}
                onSelectChip={handleSelectHomeChip}
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
                onReorderNotes={(reordered) => {
                  triggerHaptic('medium');
                  setNotes(reordered);
                }}
              />
            </>
          )}

          {/* Bottom Nav Bar: auto-hidden on desktop (md:hidden) - always visible on mobile, even in settings */}
          <NavBar
            activeTab={activeTab}
            currentPage={currentPage}
            theme={theme}
            isSettings={currentPage === 'settings'}
            isNavbarFloating={isNavbarFloating}
            onSelectTab={(tab) => {
              if (tab === 'todo') {
                setCurrentPage('todo');
              } else if (tab === 'vault' || tab === 'safe') {
                setHomeChip('safe');
                setActiveTab('safe');
                setCurrentPage('safe');
              } else {
                if (tab === 'home' || tab === 'notes') {
                  setHomeChip('all');
                }
                setActiveTab(tab);
                setCurrentPage('main');
              }
            }}
            onOpenTodo={() => setCurrentPage('todo')}
            onOpenNewNote={handleOpenNewNote}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        </div>

        {/* Search Drawer opened by top-bar Search button */}
        <SearchDrawer
          isOpen={isSearchDrawerOpen}
          theme={theme}
          notes={notes}
          autoOpenKeyboard={autoOpenKeyboard}
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
          autoOpenKeyboard={autoOpenKeyboard}
          editingNote={editingNote}
          existingNotes={notes}
          initialType={
            editingNote
              ? editingNote.entryType ||
                (editingNote.isTodo
                  ? 'todo'
                  : editingNote.isSafe || editingNote.isVault
                  ? 'passwords'
                  : 'notes')
              : newNoteInitialType ||
                (currentPage === 'todo' || activeTab === 'todo' || homeChip === 'todo'
                  ? 'todo'
                  : activeTab === 'vault' || activeTab === 'safe' || homeChip === 'safe' || homeChip === 'key'
                  ? 'passwords'
                  : activeTab === 'diary' || homeChip === 'diary'
                  ? 'diary'
                  : 'notes')
          }
          onClose={() => {
            setIsNewNoteOpen(false);
            setEditingNote(null);
            setNewNoteInitialType(undefined);
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
          onUpdateNote={(updatedNote) => {
            handleUpdateNote(updatedNote);
            setSelectedPassKeyNote(updatedNote);
          }}
          onEdit={(note) => {
            setSelectedPassKeyNote(null);
            setEditingNote(note);
            setIsNewNoteOpen(true);
          }}
          onDelete={(id) => {
            setNotes((prev) => prev.filter((n) => n.id !== id));
            setSelectedPassKeyNote(null);
          }}
          onToggleFavorite={(id) => {
            handleToggleFavorite(id);
            setSelectedPassKeyNote((prev) =>
              prev && prev.id === id ? { ...prev, isFavorite: !prev.isFavorite } : prev
            );
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
          onToggleFavorite={(id) => {
            handleToggleFavorite(id);
            setSelectedTodoNote((prev) =>
              prev && prev.id === id ? { ...prev, isFavorite: !prev.isFavorite } : prev
            );
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
          onImportNotes={(imported) => {
            const seen = new Set<string>();
            const sanitized = imported.map((item, idx) => {
              let id = item?.id ? String(item.id).trim() : `note-${idx}-${Date.now()}`;
              if (!id || seen.has(id)) {
                id = `${id || 'note'}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
              }
              seen.add(id);
              return { ...item, id };
            });
            setNotes(sanitized);
          }}
        />
      </div>
    </div>
  );
}
