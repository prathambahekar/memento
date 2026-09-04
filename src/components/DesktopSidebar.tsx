import {
  Home,
  ListTodo,
  Shield,
  Bookmark,
  BookOpen,
  Settings,
  Plus,
  Moon,
  Sun,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import { NavTab, ThemeMode, NoteItem } from '../types';

interface DesktopSidebarProps {
  activeTab: NavTab;
  currentPage: 'main' | 'settings';
  theme: ThemeMode;
  notes: NoteItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelectTab: (tab: NavTab) => void;
  onOpenNewNote: () => void;
  onOpenSearch?: () => void;
  onOpenData?: () => void;
  onOpenSettings: () => void;
  onToggleTheme: () => void;
}

export function DesktopSidebar({
  activeTab,
  currentPage,
  theme,
  notes,
  isCollapsed = false,
  onToggleCollapse,
  onSelectTab,
  onOpenNewNote,
  onOpenSettings,
  onToggleTheme,
}: DesktopSidebarProps) {
  const isDark = theme === 'dark';

  // Computed counts for badges
  const totalNotes = notes.filter((n) => !n.isArchived).length;
  const todoCount = notes.filter((n) => (n.isTodo || n.entryType === 'todo') && !n.isArchived).length;
  const vaultCount = notes.filter((n) => (n.isSafe || n.isVault || n.entryType === 'passwords') && !n.isArchived).length;
  const favCount = notes.filter((n) => n.isFavorite && !n.isArchived).length;
  const diaryCount = notes.filter((n) => n.entryType === 'diary' && !n.isArchived).length;

  const isSafeActive = activeTab === 'vault' || activeTab === 'safe';

  // 1. All items from the mobile nav bar
  const navBarItems = [
    {
      id: 'home' as NavTab,
      label: 'Home',
      icon: Home,
      isActive: currentPage === 'main' && (activeTab === 'home' || activeTab === 'notes'),
      count: totalNotes,
      onClick: () => onSelectTab('home'),
    },
    {
      id: 'todo' as NavTab,
      label: 'Todo',
      icon: ListTodo,
      isActive: currentPage === 'main' && activeTab === 'todo',
      count: todoCount,
      onClick: () => onSelectTab('todo'),
    },
    {
      id: 'safe' as NavTab,
      label: 'Safe',
      icon: Shield,
      isActive: currentPage === 'main' && isSafeActive,
      count: vaultCount,
      onClick: () => onSelectTab('safe'),
    },
  ];

  // 2. All items from the mobile more menu
  const moreItems = [
    {
      id: 'favorites' as NavTab,
      label: 'Favourites',
      icon: Bookmark,
      isActive: currentPage === 'main' && activeTab === 'favorites',
      count: favCount,
      onClick: () => onSelectTab('favorites'),
    },
    {
      id: 'diary' as NavTab,
      label: 'Diary',
      icon: BookOpen,
      isActive: currentPage === 'main' && activeTab === 'diary',
      count: diaryCount,
      onClick: () => onSelectTab('diary'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      isActive: currentPage === 'settings',
      count: 0,
      onClick: onOpenSettings,
    },
  ];

  const renderNavItem = (item: {
    id: string;
    label: string;
    icon: typeof Home;
    isActive: boolean;
    count: number;
    onClick: () => void;
  }) => {
    const Icon = item.icon;
    if (isCollapsed) {
      return (
        <button
          key={item.id}
          id={`desktop-nav-collapsed-${item.id}`}
          type="button"
          onClick={item.onClick}
          title={item.label + (item.count > 0 ? ` (${item.count})` : '')}
          className={`w-10 h-10 mx-auto rounded-2xl flex items-center justify-center transition-all relative ${
            item.isActive
              ? isDark
                ? 'text-white bg-[#1a1a1a] shadow-xs'
                : 'text-neutral-900 bg-[#e8eaee] shadow-xs'
              : isDark
              ? 'text-neutral-400 hover:text-neutral-200 hover:bg-[#151515]'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#f0f1f4]'
          }`}
        >
          <Icon className="w-4 h-4" />
          {item.count > 0 && (
            <span
              className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
                item.isActive
                  ? isDark
                    ? 'bg-white'
                    : 'bg-neutral-900'
                  : isDark
                  ? 'bg-neutral-500'
                  : 'bg-neutral-400'
              }`}
            />
          )}
        </button>
      );
    }

    return (
      <button
        key={item.id}
        id={`desktop-nav-${item.id}`}
        type="button"
        onClick={item.onClick}
        className={`w-full relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
          item.isActive
            ? isDark
              ? 'text-white bg-[#1a1a1a] shadow-sm'
              : 'text-neutral-900 bg-[#f1f2f5] shadow-sm font-semibold'
            : isDark
            ? 'text-neutral-400 hover:text-neutral-200 hover:bg-[#151515]'
            : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#f8f9fa]'
        }`}
      >
        <div className="flex items-center gap-3 relative z-10">
          <Icon
            className={`w-4 h-4 transition-colors ${
              item.isActive
                ? isDark
                  ? 'text-white'
                  : 'text-neutral-900'
                : isDark
                ? 'text-neutral-400'
                : 'text-neutral-500'
            }`}
          />
          <span>{item.label}</span>
        </div>

        {item.count > 0 && (
          <span
            className={`text-[10.5px] px-2 py-0.5 rounded-full font-mono transition-colors relative z-10 ${
              item.isActive
                ? isDark
                  ? 'bg-[#252525] text-neutral-200'
                  : 'bg-white text-neutral-800 shadow-xs'
                : isDark
                ? 'bg-[#181818] text-neutral-500'
                : 'bg-[#eeeff2] text-neutral-500'
            }`}
          >
            {item.count}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      id="desktop-sidebar"
      aria-label="Desktop Navigation Sidebar"
      className={`hidden md:flex flex-col h-full shrink-0 select-none transition-all duration-200 ease-in-out ${
        isCollapsed ? 'w-18 lg:w-20' : 'w-64 lg:w-72'
      } ${
        isDark
          ? 'bg-[#0a0a0a] text-neutral-300'
          : 'bg-[#f8f9fa] text-neutral-700'
      }`}
    >
      <div className="w-full flex flex-col h-full overflow-hidden">
        {/* Brand Header with Collapse/Expand Button */}
        {isCollapsed ? (
          <div className="pt-6 pb-2 flex flex-col items-center justify-center">
            {onToggleCollapse && (
              <button
                id="desktop-expand-sidebar-rail-btn"
                type="button"
                onClick={onToggleCollapse}
                title="Expand sidebar (⌘\)"
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                  isDark
                    ? 'text-neutral-400 hover:text-white bg-[#141414] hover:bg-[#1f1f1f]'
                    : 'text-neutral-600 hover:text-neutral-900 bg-[#eeeff2] hover:bg-[#e4e6eb]'
                }`}
              >
                <PanelLeft className="w-5 h-5 stroke-[1.8]" />
              </button>
            )}
          </div>
        ) : (
          <div className="px-6 pt-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm shrink-0 ${
                  isDark
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-neutral-900 text-white'
                }`}
              >
                <span className="text-lg font-bold tracking-tight">m</span>
              </div>
              <div>
                <h1
                  className={`text-lg font-bold tracking-tight leading-tight ${
                    isDark ? 'text-white' : 'text-neutral-900'
                  }`}
                >
                  memento
                </h1>
                <p className={`text-[11px] ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  minimal notebook
                </p>
              </div>
            </div>

            {/* Collapse Button */}
            {onToggleCollapse && (
              <button
                id="desktop-collapse-sidebar-btn"
                type="button"
                onClick={onToggleCollapse}
                title="Collapse sidebar (⌘\)"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95 ${
                  isDark
                    ? 'text-neutral-400 hover:text-white hover:bg-[#161616]'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-[#eceef2]'
                }`}
              >
                <PanelLeftClose className="w-4 h-4 stroke-[1.8]" />
              </button>
            )}
          </div>
        )}

        {/* Primary Action: + New Note */}
        <div className={isCollapsed ? 'px-2.5 py-3 flex justify-center' : 'px-5 py-3'}>
          {isCollapsed ? (
            <button
              id="desktop-new-note-collapsed-btn"
              type="button"
              onClick={onOpenNewNote}
              title="New Thought (N)"
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-semibold transition-all duration-150 active:scale-95 shadow-sm ${
                isDark
                  ? 'bg-white text-black hover:bg-neutral-200'
                  : 'bg-neutral-900 text-white hover:bg-black'
              }`}
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <button
              id="desktop-new-note-btn"
              type="button"
              onClick={onOpenNewNote}
              className={`w-full py-3 px-4 rounded-2xl flex items-center justify-between font-semibold text-xs transition-all duration-150 active:scale-[0.98] shadow-sm ${
                isDark
                  ? 'bg-white text-black hover:bg-neutral-200'
                  : 'bg-neutral-900 text-white hover:bg-black'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>New Thought</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isDark ? 'bg-black/10 text-neutral-700' : 'bg-white/20 text-neutral-300'
                }`}
              >
                N
              </span>
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className={`flex-1 overflow-y-auto no-scrollbar space-y-5 ${isCollapsed ? 'px-2' : 'px-3 py-2'}`}>
          {/* Main Categories (all items from the nav bar) */}
          <div>
            {!isCollapsed && (
              <div
                className={`px-3 mb-2 text-[10px] font-bold tracking-wider uppercase ${
                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                Nav Bar
              </div>
            )}
            <nav className="space-y-1.5">
              {navBarItems.map((item) => renderNavItem(item))}
            </nav>
          </div>

          {/* More Menu Categories (Favourites, Diary, Settings) */}
          <div>
            {!isCollapsed && (
              <div
                className={`px-3 mb-2 text-[10px] font-bold tracking-wider uppercase ${
                  isDark ? 'text-neutral-500' : 'text-neutral-400'
                }`}
              >
                More Menu
              </div>
            )}
            {isCollapsed && (
              <div
                className={`w-6 h-[1px] mx-auto my-2 ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-200'
                }`}
              />
            )}
            <nav className="space-y-1.5">
              {moreItems.map((item) => renderNavItem(item))}
            </nav>
          </div>
        </div>

        {/* Footer: Theme Toggle */}
        <div className={`mt-auto p-3.5 transition-colors ${isCollapsed ? 'flex flex-col items-center gap-2.5' : 'space-y-3'}`}>
          {/* Theme Toggle */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={onToggleTheme}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                isDark
                  ? 'bg-[#161616] text-neutral-300 hover:text-white hover:bg-[#202020]'
                  : 'bg-[#eeeff2] text-neutral-600 hover:text-neutral-900 hover:bg-[#e4e6eb]'
              }`}
            >
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          ) : (
            <div className="flex items-center justify-between px-1">
              <div
                onClick={onToggleTheme}
                role="button"
                tabIndex={0}
                className="cursor-pointer select-none text-xs flex items-center gap-1.5"
              >
                <span className={isDark ? 'text-neutral-500' : 'text-neutral-500'}>Theme:</span>
                <span className="font-semibold text-xs text-neutral-200 dark:text-neutral-200">
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>
              <div
                className={`flex items-center p-1 rounded-xl ${
                  isDark ? 'bg-[#161616]' : 'bg-[#eeeff2]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => theme !== 'light' && onToggleTheme()}
                  aria-label="Light theme"
                  className={`p-1.5 rounded-lg transition-all ${
                    !isDark
                      ? 'bg-neutral-900 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => theme !== 'dark' && onToggleTheme()}
                  aria-label="Dark theme"
                  className={`p-1.5 rounded-lg transition-all ${
                    isDark
                      ? 'bg-white text-black shadow-xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
