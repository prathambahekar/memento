import {
  Home,
  ListTodo,
  Shield,
  Bookmark,
  BookOpen,
  Archive,
  Settings,
  Plus,
  Moon,
  Sun,
  PanelLeft,
  PanelLeftClose,
} from 'lucide-react';
import { NavTab, ThemeMode, NoteItem, AppPage } from '../types';

interface DesktopSidebarProps {
  activeTab: NavTab;
  currentPage: AppPage;
  theme: ThemeMode;
  notes: NoteItem[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelectTab: (tab: NavTab) => void;
  onOpenTodo?: () => void;
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
  onOpenTodo,
  onOpenNewNote,
  onOpenSettings,
  onToggleTheme,
}: DesktopSidebarProps) {
  const isDark = theme === 'dark';

  const isSafeActive = activeTab === 'vault' || activeTab === 'safe';

  // 1. All items from the mobile nav bar
  const navBarItems = [
    {
      id: 'home' as NavTab,
      label: 'Home',
      icon: Home,
      isActive: currentPage === 'main' && (activeTab === 'home' || activeTab === 'notes'),
      onClick: () => onSelectTab('home'),
    },
    {
      id: 'todo' as NavTab,
      label: 'Todo',
      icon: ListTodo,
      isActive: currentPage === 'todo',
      onClick: () => {
        if (onOpenTodo) {
          onOpenTodo();
        } else {
          onSelectTab('todo');
        }
      },
    },
    {
      id: 'safe' as NavTab,
      label: 'Safe',
      icon: Shield,
      isActive: currentPage === 'main' && isSafeActive,
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
      onClick: () => onSelectTab('favorites'),
    },
    {
      id: 'diary' as NavTab,
      label: 'Diary',
      icon: BookOpen,
      isActive: currentPage === 'main' && activeTab === 'diary',
      onClick: () => onSelectTab('diary'),
    },
    {
      id: 'archive' as NavTab,
      label: 'Archive',
      icon: Archive,
      isActive: currentPage === 'main' && activeTab === 'archive',
      onClick: () => onSelectTab('archive'),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      isActive: currentPage === 'settings',
      onClick: onOpenSettings,
    },
  ];

  const renderNavItem = (
    item: {
      id: string;
      label: string;
      icon: typeof Home;
      isActive: boolean;
      onClick: () => void;
    },
    sectionPrefix: string
  ) => {
    const Icon = item.icon;
    if (isCollapsed) {
      return (
        <button
          key={`sidebar-collapsed-${sectionPrefix}-${item.id}`}
          id={`desktop-nav-collapsed-${item.id}`}
          type="button"
          onClick={item.onClick}
          title={item.label}
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
        </button>
      );
    }

    return (
      <button
        key={`sidebar-nav-${sectionPrefix}-${item.id}`}
        id={`desktop-nav-${item.id}`}
        type="button"
        onClick={item.onClick}
        className={`w-full relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
          item.isActive
            ? isDark
              ? 'text-white bg-[#1a1a1a] shadow-sm'
              : 'text-neutral-900 bg-[#f1f2f5] shadow-sm font-semibold'
            : isDark
            ? 'text-neutral-400 hover:text-neutral-200 hover:bg-[#151515]'
            : 'text-neutral-600 hover:text-neutral-900 hover:bg-[#f8f9fa]'
        }`}
      >
        <Icon
          className={`w-4 h-4 transition-colors shrink-0 ${
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
          ? 'bg-[#09090b] text-neutral-300 border-r border-neutral-800/60'
          : 'bg-[#f4f4f6] text-neutral-700 border-r border-neutral-200/80'
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
              {navBarItems.map((item) => renderNavItem(item, 'main'))}
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
              {moreItems.map((item) => renderNavItem(item, 'more'))}
            </nav>
          </div>
        </div>

        {/* Footer: Add Button & Theme Toggle */}
        <div className={`mt-auto p-3 transition-colors ${isCollapsed ? 'flex flex-col items-center gap-2.5' : 'space-y-2.5'}`}>
          {/* Primary Action: + Add (at bottom above theme) */}
          {isCollapsed ? (
            <button
              id="desktop-new-note-collapsed-btn"
              type="button"
              onClick={onOpenNewNote}
              title="Add (N)"
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-medium transition-all duration-150 active:scale-95 shadow-xs ${
                isDark
                  ? 'bg-white text-black hover:bg-neutral-200'
                  : 'bg-neutral-900 text-white hover:bg-black'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.2]" />
            </button>
          ) : (
            <button
              id="desktop-new-note-btn"
              type="button"
              onClick={onOpenNewNote}
              className={`w-full h-9 px-3 rounded-xl flex items-center justify-center gap-2 font-medium text-xs transition-all duration-150 active:scale-[0.98] shadow-xs ${
                isDark
                  ? 'bg-white text-black hover:bg-neutral-200'
                  : 'bg-neutral-900 text-white hover:bg-black'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Add</span>
            </button>
          )}

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
