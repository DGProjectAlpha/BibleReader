import { useState } from 'react';
import { Bookmark, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';

interface BookmarkPanelProps {
  /** When true, renders as full-height tab content (no collapsible header) */
  fullHeight?: boolean;
}

export function BookmarkPanel({ fullHeight = false }: BookmarkPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const bookmarks = useBibleStore((s) => s.bookmarks);
  const removeBookmark = useBibleStore((s) => s.removeBookmark);
  const setSelectedBook = useBibleStore((s) => s.setSelectedBook);
  const setSelectedChapter = useBibleStore((s) => s.setSelectedChapter);

  // Newest first
  const sorted = [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);

  function navigate(book: string, chapter: number) {
    setSelectedBook(book);
    setSelectedChapter(chapter);
  }

  const listContent = (
    <>
      {sorted.length === 0 ? (
        <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 italic">
          No bookmarks yet. Click the ribbon icon on any verse to add one.
        </p>
      ) : (
        <ul>
          {sorted.map((bm) => (
            <li
              key={bm.id}
              className="group flex items-center gap-1 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <button
                onClick={() => navigate(bm.book, bm.chapter)}
                className="flex-1 text-left text-xs text-gray-700 dark:text-gray-300 truncate"
                title={bm.label ?? `${bm.book} ${bm.chapter}:${bm.verse}`}
              >
                {bm.label ? (
                  <>
                    <span className="font-medium">{bm.label}</span>
                    <span className="text-gray-400 dark:text-gray-500 ml-1">
                      — {bm.book} {bm.chapter}:{bm.verse}
                    </span>
                  </>
                ) : (
                  <span>
                    <span className="font-medium">{bm.book}</span>{' '}
                    {bm.chapter}:{bm.verse}
                  </span>
                )}
              </button>

              <button
                onClick={() => removeBookmark({ book: bm.book, chapter: bm.chapter, verse: bm.verse })}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
                title="Remove bookmark"
              >
                <X size={11} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  // Full-height tab mode: skip the collapsible header
  if (fullHeight) {
    return <div>{listContent}</div>;
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 shrink-0">
      {/* Section header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <Bookmark size={13} />
        <span className="flex-1 text-left">Bookmarks</span>
        <span className="text-gray-500 dark:text-gray-400 font-normal normal-case tracking-normal">
          {sorted.length}
        </span>
        {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
      </button>

      {!collapsed && (
        <div className="max-h-56 overflow-y-auto">{listContent}</div>
      )}
    </div>
  );
}
