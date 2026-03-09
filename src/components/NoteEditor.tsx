import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2 } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';
import type { VerseKey } from '../store/bibleStore';
import { useTranslation } from '../i18n/useTranslation';
import Tooltip from './Tooltip';

interface NoteEditorProps {
  verseKey: VerseKey;
  verseText: string;
  onClose: () => void;
}

export function NoteEditor({ verseKey, verseText, onClose }: NoteEditorProps) {
  const getNoteForVerse = useBibleStore((s) => s.getNoteForVerse);
  const addNote = useBibleStore((s) => s.addNote);
  const deleteNote = useBibleStore((s) => s.deleteNote);

  const existing = getNoteForVerse(verseKey);
  const [text, setText] = useState(existing?.text ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

  // Focus textarea on open
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (trimmed) {
      addNote(verseKey, trimmed);
    } else if (existing) {
      deleteNote(existing.id);
    }
    onClose();
  };

  const handleDelete = () => {
    if (existing) deleteNote(existing.id);
    onClose();
  };

  const { book, chapter, verse } = verseKey;

  return createPortal(
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-xl shadow-2xl border
          bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600
          flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('noteEditorHeader', { book, chapter, verse })}
          </span>
          <Tooltip label={t('closeNoteEditorTooltip')}>
            <button
              onClick={onClose}
              className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={16} />
            </button>
          </Tooltip>
        </div>

        {/* Verse preview */}
        <p className="px-4 pt-3 pb-1 text-xs text-gray-400 dark:text-gray-500 italic line-clamp-2">
          {verseText}
        </p>

        {/* Textarea */}
        <div className="px-4 py-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('notePlaceholder')}
            rows={5}
            className="w-full resize-none rounded-lg border px-3 py-2 text-sm
              bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600
              text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div>
            {existing && (
              <Tooltip label={t('deleteButton')}>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={14} />
                  {t('deleteButton')}
                </button>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Tooltip label={t('cancelButton')}>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {t('cancelButton')}
              </button>
            </Tooltip>
            <Tooltip label={t('saveButton')}>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                {t('saveButton')}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
