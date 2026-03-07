import { useState } from 'react';
import { useBibleStore, selectActivePane } from '../store/bibleStore';
import { books } from '../data/books';
import { BookmarkPanel } from './BookmarkPanel';
import { NotesPanel } from './NotesPanel';
import { Moon, Sun, BookOpen, Bookmark, FileText } from 'lucide-react';

type SidebarTab = 'nav' | 'bookmarks' | 'notes';

export function Sidebar() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('nav');

  const activePane = useBibleStore(selectActivePane);
  const selectedBook = activePane.selectedBook;
  const selectedChapter = activePane.selectedChapter;
  const darkMode = useBibleStore((s) => s.darkMode);
  const setSelectedBook = useBibleStore((s) => s.setSelectedBook);
  const setSelectedChapter = useBibleStore((s) => s.setSelectedChapter);
  const toggleDarkMode = useBibleStore((s) => s.toggleDarkMode);
  const bookmarkCount = useBibleStore((s) => s.bookmarks.length);
  const noteCount = useBibleStore((s) => s.notes.length);

  const tabs: { id: SidebarTab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'nav',       icon: <BookOpen size={15} />,  label: 'Navigate' },
    { id: 'bookmarks', icon: <Bookmark size={15} />,  label: 'Bookmarks', badge: bookmarkCount },
    { id: 'notes',     icon: <FileText size={15} />,  label: 'Notes',     badge: noteCount },
  ];

  return (
    <div className="flex flex-col h-full w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <span className="font-bold text-lg text-gray-800 dark:text-gray-100">BibleReader</span>
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors relative
              ${activeTab === tab.id
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            title={tab.label}
          >
            <span className="relative">
              {tab.icon}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[14px] h-3.5 px-0.5 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center leading-none">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'nav' && (
          <div className="p-3 flex flex-col gap-3">
            {/* Book dropdown */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Book
              </label>
              <select
                value={selectedBook}
                onChange={(e) => {
                  setSelectedBook(e.target.value);
                  setSelectedChapter(1);
                }}
                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {books.map(book => (
                  <option key={book.name} value={book.name}>{book.name}</option>
                ))}
              </select>
            </div>

            {/* Chapter dropdown */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                Chapter
              </label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from(
                  { length: books.find(b => b.name === selectedBook)?.chapters ?? 1 },
                  (_, i) => i + 1
                ).map(ch => (
                  <option key={ch} value={ch}>Chapter {ch}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'bookmarks' && <BookmarkPanel fullHeight />}
        {activeTab === 'notes' && <NotesPanel fullHeight />}
      </div>
    </div>
  );
}
