import { useState } from 'react';
import { FileText, ChevronDown, ChevronRight, X, FileDown } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';
import { useTranslation } from '../i18n/useTranslation';
import Tooltip from './Tooltip';

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
  const theme = useBibleStore((s) => s.theme);
  const darkMode = useBibleStore((s) => s.darkMode);
  const { t } = useTranslation();

  // Most recently updated first
  const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);

  function navigate(book: string, chapter: number) {
    setSelectedBook(book);
    setSelectedChapter(chapter);
  }

  async function openExportWindow() {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const label = `export-notes-${Date.now()}`;
      const params = new URLSearchParams({
        export: '1',
        theme,
        darkMode: String(darkMode),
      });
      const base = window.location.pathname;
      const url = `${base}?${params.toString()}`;
      const win = new WebviewWindow(label, {
        url,
        title: 'Export Notes to PDF',
        width: 760,
        height: 640,
        decorations: true,
        resizable: true,
        dragDropEnabled: false,
      });
      win.once('tauri://error', (e) => console.error('Export window error:', e));
    } catch {
      // Fallback for browser dev mode — do nothing
    }
  }

  const listContent = (
    <>
      {sorted.length === 0 ? (
        <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 italic">
          {t('notesEmpty')}
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
                title={`${note.book} ${note.chapter}:${note.verse} \u2014 ${note.text}`}
              >
                <span className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  {note.book} {note.chapter}:{note.verse}
                </span>
                <span className="block text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                  {note.text.length > 70 ? note.text.slice(0, 67) + '…' : note.text}
                </span>
              </button>

              <Tooltip label={t('deleteButton')}>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 mt-0.5 p-0.5 rounded text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity shrink-0"
                >
                  <X size={11} />
                </button>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  // Full-height tab mode: skip the collapsible header
  if (fullHeight) {
    return (
      <div>
        {notes.length > 0 && (
          <div className="flex justify-end px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            <Tooltip label={t('exportNotesToPdf')}>
              <button
                onClick={openExportWindow}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              >
                <FileDown size={12} />
                Export PDF
              </button>
            </Tooltip>
          </div>
        )}
        {listContent}
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 shrink-0">
      {/* Section header */}
      <div className="flex items-center w-full">
        <Tooltip label={collapsed ? t('expandPanel') : t('collapsePanel')}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-2 flex-1 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <FileText size={13} />
          <span className="flex-1 text-left">{t('tabNotes')}</span>
          <span className="text-gray-500 dark:text-gray-400 font-normal normal-case tracking-normal">
            {sorted.length}
          </span>
          {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </button>
        </Tooltip>
        {notes.length > 0 && (
          <Tooltip label={t('exportNotesToPdf')}>
            <button
              onClick={openExportWindow}
              className="px-2 py-2 text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <FileDown size={13} />
            </button>
          </Tooltip>
        )}
      </div>

      {!collapsed && (
        <div className="max-h-56 overflow-y-auto">{listContent}</div>
      )}
    </div>
  );
}
