import { useEffect, useRef, useState } from 'react';
import { Bookmark, Highlighter, X, NotebookPen, Link2, Link2Off } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';
import type { HighlightColor } from '../store/bibleStore';
import { getChapter, TRANSLATIONS } from '../data/bibleLoader';
import type { Translation } from '../data/bibleLoader';
import { VerseText } from './VerseText';
import { CrossRefPopover } from './CrossRefPopover';
import type { RefSegment } from '../utils/crossRefs';
import { NoteEditor } from './NoteEditor';

const HIGHLIGHT_COLORS: { color: HighlightColor; bg: string; label: string }[] = [
  { color: 'yellow', bg: 'bg-yellow-300', label: 'Yellow' },
  { color: 'green',  bg: 'bg-green-300',  label: 'Green'  },
  { color: 'blue',   bg: 'bg-blue-300',   label: 'Blue'   },
  { color: 'pink',   bg: 'bg-pink-300',   label: 'Pink'   },
  { color: 'purple', bg: 'bg-purple-300', label: 'Purple' },
];

const HIGHLIGHT_BG: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-200 dark:bg-yellow-700/40',
  green:  'bg-green-200  dark:bg-green-700/40',
  blue:   'bg-blue-200   dark:bg-blue-700/40',
  pink:   'bg-pink-200   dark:bg-pink-700/40',
  purple: 'bg-purple-200 dark:bg-purple-700/40',
};

interface VerseDisplayProps {
  paneId: string;
  isActive: boolean;
  onActivate: () => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function VerseDisplay({ paneId, isActive, onActivate, onRemove, canRemove }: VerseDisplayProps) {
  const pane = useBibleStore((s) => s.panes.find((p) => p.id === paneId));
  const updatePane = useBibleStore((s) => s.updatePane);
  const togglePaneSync = useBibleStore((s) => s.togglePaneSync);
  const setStrongsWord = useBibleStore((s) => s.setStrongsWord);
  const addBookmark = useBibleStore((s) => s.addBookmark);
  const removeBookmark = useBibleStore((s) => s.removeBookmark);
  const isBookmarked = useBibleStore((s) => s.isBookmarked);
  const addHighlight = useBibleStore((s) => s.addHighlight);
  const removeHighlight = useBibleStore((s) => s.removeHighlight);
  const getHighlightForVerse = useBibleStore((s) => s.getHighlightForVerse);
  const getNoteForVerse = useBibleStore((s) => s.getNoteForVerse);

  const scrollToVerse = useBibleStore((s) => s.panes.find((p) => p.id === paneId)?.scrollToVerse ?? null);

  const [verses, setVerses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hoveredRef, setHoveredRef] = useState<{ ref: RefSegment; anchor: HTMLElement } | null>(null);
  // Index (0-based) of the verse whose highlight picker is open, or null
  const [openPickerIdx, setOpenPickerIdx] = useState<number | null>(null);
  // Index (0-based) of the verse whose note editor is open, or null
  const [openNoteIdx, setOpenNoteIdx] = useState<number | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Close picker when clicking outside
  useEffect(() => {
    if (openPickerIdx === null) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpenPickerIdx(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPickerIdx]);

  const selectedBook = pane?.selectedBook ?? '';
  const selectedChapter = pane?.selectedChapter ?? 0;
  const selectedTranslation = pane?.selectedTranslation ?? 'KJV';
  const id = pane?.id ?? paneId;

  // Load verses whenever book, chapter, or translation changes
  useEffect(() => {
    if (!pane || !selectedBook || !selectedChapter) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      const loaded = getChapter(selectedTranslation, selectedBook, selectedChapter);
      if (!loaded || loaded.length === 0) {
        setLoadError(`No data found for ${selectedBook} ${selectedChapter} (${selectedTranslation})`);
        setVerses([]);
      } else {
        setVerses(loaded);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load chapter');
      setVerses([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBook, selectedChapter, selectedTranslation]);

  // Auto-scroll to target verse after chapter loads; each pane clears its own scroll target
  useEffect(() => {
    if (!scrollToVerse || isLoading || verses.length === 0) return;
    const el = document.getElementById(`verse-${paneId}-${scrollToVerse}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      updatePane(paneId, { scrollToVerse: null });
    }
  }, [scrollToVerse, isLoading, verses, paneId, updatePane]);

  const setSelectedTranslation = (t: Translation) =>
    updatePane(id, { selectedTranslation: t });

  if (!pane) return null;

  return (
    <div
      onClick={onActivate}
      className={`flex flex-col flex-1 min-w-0 border-r last:border-r-0 transition-colors
        ${isActive
          ? 'border-blue-500 dark:border-blue-400'
          : 'border-gray-200 dark:border-gray-700'}
        bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b
        border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <h2 className="text-xl font-bold truncate">
          {selectedBook
            ? `${selectedBook} ${selectedChapter}`
            : <span className="text-gray-400 dark:text-gray-500">Select a book</span>
          }
        </h2>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <select
            value={selectedTranslation}
            onChange={(e) => { e.stopPropagation(); setSelectedTranslation(e.target.value as Translation); }}
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {TRANSLATIONS.map((t: Translation) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {canRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); togglePaneSync(paneId); }}
              title={pane.synced ? 'Unsync pane (currently synced)' : 'Sync pane with others'}
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium border transition-colors
                ${pane.synced
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-800/50'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              {pane.synced
                ? <><Link2 size={13} strokeWidth={2} /><span>Synced</span></>
                : <><Link2Off size={13} strokeWidth={2} /><span>Sync</span></>
              }
            </button>
          )}

          {canRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              title="Close pane"
              className="ml-1 px-2 py-1 rounded text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg leading-none"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Loading state */}
        {isLoading && (
          <div className="text-gray-400 dark:text-gray-500 italic">Loading...</div>
        )}

        {/* Error state */}
        {loadError && !isLoading && (
          <div className="text-red-500 dark:text-red-400">{loadError}</div>
        )}

        {/* Verse list */}
        {!isLoading && !loadError && verses.length > 0 && (
          <div className="space-y-3 leading-relaxed">
            {verses.map((verseText, idx) => {
              const verseKey = { book: selectedBook, chapter: selectedChapter, verse: idx + 1 };
              const bookmarked = isBookmarked(verseKey);
              const highlight = getHighlightForVerse(verseKey);
              const note = getNoteForVerse(verseKey);
              const pickerOpen = openPickerIdx === idx;
              const noteOpen = openNoteIdx === idx;
              return (
                <div key={idx} id={`verse-${paneId}-${idx + 1}`} className="group flex items-start gap-1">
                  {/* Action buttons column */}
                  <div className="mt-0.5 shrink-0 flex flex-col gap-0.5">
                    {/* Bookmark button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        bookmarked ? removeBookmark(verseKey) : addBookmark(verseKey);
                      }}
                      title={bookmarked ? 'Remove bookmark' : 'Bookmark verse'}
                      className={`p-0.5 rounded transition-colors
                        ${bookmarked
                          ? 'text-blue-500 dark:text-blue-400'
                          : 'text-transparent group-hover:text-gray-300 dark:group-hover:text-gray-600 hover:!text-blue-400'}
                      `}
                    >
                      <Bookmark size={13} fill={bookmarked ? 'currentColor' : 'none'} strokeWidth={2} />
                    </button>

                    {/* Highlight button */}
                    <div className="relative" ref={pickerOpen ? pickerRef : null}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenPickerIdx(pickerOpen ? null : idx);
                        }}
                        title="Highlight verse"
                        className={`p-0.5 rounded transition-colors
                          ${highlight
                            ? 'text-amber-500 dark:text-amber-400'
                            : 'text-transparent group-hover:text-gray-300 dark:group-hover:text-gray-600 hover:!text-amber-400'}
                        `}
                      >
                        <Highlighter size={13} strokeWidth={2} />
                      </button>

                      {/* Color picker popover */}
                      {pickerOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-full top-0 ml-1 z-50 flex items-center gap-1 p-1.5 rounded-lg shadow-lg border
                            bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
                        >
                          {HIGHLIGHT_COLORS.map(({ color, bg, label }) => (
                            <button
                              key={color}
                              title={label}
                              onClick={() => {
                                addHighlight(verseKey, color);
                                setOpenPickerIdx(null);
                              }}
                              className={`w-5 h-5 rounded-full ${bg} border-2 transition-transform hover:scale-110
                                ${highlight?.color === color ? 'border-gray-700 dark:border-gray-200 scale-110' : 'border-transparent'}
                              `}
                            />
                          ))}
                          {/* Remove highlight */}
                          {highlight && (
                            <button
                              title="Remove highlight"
                              onClick={() => {
                                removeHighlight(verseKey);
                                setOpenPickerIdx(null);
                              }}
                              className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 border-2 border-transparent hover:border-red-400 transition-colors"
                            >
                              <X size={10} strokeWidth={2.5} className="text-gray-500 dark:text-gray-400" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Note button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenNoteIdx(noteOpen ? null : idx);
                        setOpenPickerIdx(null);
                      }}
                      title={note ? 'Edit note' : 'Add note'}
                      className={`p-0.5 rounded transition-colors
                        ${note
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : 'text-transparent group-hover:text-gray-300 dark:group-hover:text-gray-600 hover:!text-emerald-400'}
                      `}
                    >
                      <NotebookPen size={13} strokeWidth={2} />
                    </button>
                  </div>

                  {/* Verse text */}
                  <p className={`text-base flex-1 px-1 rounded transition-colors ${highlight ? HIGHLIGHT_BG[highlight.color] : ''}`}>
                    <span className="text-xs font-bold text-blue-500 dark:text-blue-400 mr-2 select-none">
                      {idx + 1}
                    </span>
                    <VerseText
                      text={verseText}
                      onRefHover={(ref, anchor) => setHoveredRef({ ref, anchor })}
                      onRefLeave={() => setHoveredRef(null)}
                      onWordClick={(word) => setStrongsWord(word)}
                    />
                  </p>

                  {/* Note editor modal */}
                  {noteOpen && (
                    <NoteEditor
                      verseKey={verseKey}
                      verseText={verseText}
                      onClose={() => setOpenNoteIdx(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Cross-reference popover */}
        {hoveredRef && (
          <CrossRefPopover
            refSeg={hoveredRef.ref}
            anchor={hoveredRef.anchor}
            translation={selectedTranslation}
            onClose={() => setHoveredRef(null)}
          />
        )}

        {/* Empty state */}
        {!isLoading && !loadError && verses.length === 0 && (
          <div className="text-gray-400 dark:text-gray-500 italic">
            Select a book and chapter from the sidebar to start reading.
          </div>
        )}
      </div>
    </div>
  );
}
