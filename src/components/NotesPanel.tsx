import { useState } from 'react';
import { FileText, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';

interface NotesPanelProps {
  /** When true, renders as full-height tab content (no collapsible header) */
  fullHeight?: boolean;
}

export function NotesPanel({ fullHeight = false }: NotesPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const notes = useBibleStore((s) => s.notes);
  const deleteNote = useBibleStore((s) => s.deleteNote);
  const setSelectedBook = useBibleStore((s) => s.setSelectedBook);
  const setSelectedChapter = useBibleStore((s) => s.setSelectedChapter);

  // Most recently updated first
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  function navigate(book: string, chapter: number) {
    setSelectedBook(book);
    setSelectedChapter(chapter);
  }

  const listContent = (
    <>
      {sorted.length === 0 ? (
        <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 italic">
          No notes yet. Click the note icon on any verse to add one.
        </p>
      ) : (
        <ul>
          {sorted.map((note) => (
            <li
              key={note.id}
              className="group flex items-start gap-1 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <button
                onClick={() => navigate(note.book, note.chapter)}
                className="flex-1 text-left min-w-0"
                title={`${note.book} ${note.chapter}:${note.verse} — ${note.text}`}
              >
                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  {note.book} {note.chapter}:{note.verse}
                </span>
                <span className="block text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {note.text.length > 70 ? note.text.slice(0, 67) + '…' : note.text}
                </span>
              </button>

              <button
                onClick={() => deleteNote(note.id)}
                className="opacity-0 group-hover:opacity-100 mt-0.5 p-0.5 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity shrink-0"
                title="Delete note"
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
        <FileText size={13} />
        <span className="flex-1 text-left">Notes</span>
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
