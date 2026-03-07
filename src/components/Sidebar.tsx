import { useBibleStore, selectActivePane } from '../store/bibleStore';
import { books } from '../data/books';
import { Moon, Sun } from 'lucide-react';

export function Sidebar() {
  const activePane = useBibleStore(selectActivePane);
  const selectedBook = activePane.selectedBook;
  const selectedChapter = activePane.selectedChapter;
  const darkMode = useBibleStore((s) => s.darkMode);
  const setSelectedBook = useBibleStore((s) => s.setSelectedBook);
  const setSelectedChapter = useBibleStore((s) => s.setSelectedChapter);
  const toggleDarkMode = useBibleStore((s) => s.toggleDarkMode);

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

      {/* Book list */}
      <div className="flex-1 overflow-y-auto">
        {books.map(book => (
          <div key={book.name}>
            {/* Book button */}
            <button
              onClick={() => {
                setSelectedBook(book.name);
                setSelectedChapter(1);
              }}
              className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors
                ${selectedBook === book.name
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              {book.name}
            </button>

            {/* Chapter grid — only shown for selected book */}
            {selectedBook === book.name && (
              <div className="px-3 pb-2 grid grid-cols-5 gap-1">
                {Array.from({ length: book.chapters }, (_, i) => i + 1).map(ch => (
                  <button
                    key={ch}
                    onClick={() => setSelectedChapter(ch)}
                    className={`text-xs py-1 rounded transition-colors
                      ${selectedChapter === ch
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/40'
                      }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
