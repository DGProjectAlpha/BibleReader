import { useEffect, useRef, useState } from 'react';
import { Bookmark, Highlighter, X, NotebookPen, Link2, Link2Off } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';
import type { HighlightColor } from '../store/bibleStore';
import { getChapter, BUILTIN_TRANSLATIONS, getBuiltinBookNames } from '../data/bibleLoader';
import type { Translation, TaggedVerse } from '../data/bibleLoader';
import { NoteEditor } from './NoteEditor';
import { books } from '../data/books';
import { useTranslation } from '../i18n/useTranslation';
import type { TranslationKey } from '../i18n/translations';

const HIGHLIGHT_COLORS: { color: HighlightColor; bg: string; labelKey: TranslationKey }[] = [
  { color: 'yellow', bg: 'bg-yellow-300', labelKey: 'colorYellow' },
  { color: 'green',  bg: 'bg-green-300',  labelKey: 'colorGreen'  },
  { color: 'blue',   bg: 'bg-blue-300',   labelKey: 'colorBlue'   },
  { color: 'pink',   bg: 'bg-pink-300',   labelKey: 'colorPink'   },
  { color: 'purple', bg: 'bg-purple-300', labelKey: 'colorPurple' },
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
  const { t } = useTranslation();
  const pane = useBibleStore((s) => s.panes.find((p) => p.id === paneId));
  const updatePane = useBibleStore((s) => s.updatePane);
  const togglePaneSync = useBibleStore((s) => s.togglePaneSync);
  const setStrongsNum = useBibleStore((s) => s.setStrongsNum);
  const setTskVerse = useBibleStore((s) => s.setTskVerse);
  const addBookmark = useBibleStore((s) => s.addBookmark);
  const removeBookmark = useBibleStore((s) => s.removeBookmark);
  const isBookmarked = useBibleStore((s) => s.isBookmarked);
  const addHighlight = useBibleStore((s) => s.addHighlight);
  const removeHighlight = useBibleStore((s) => s.removeHighlight);
  const getHighlightForVerse = useBibleStore((s) => s.getHighlightForVerse);
  const getNoteForVerse = useBibleStore((s) => s.getNoteForVerse);

  const scrollToVerse = useBibleStore((s) => s.panes.find((p) => p.id === paneId)?.scrollToVerse ?? null);
  const customTranslations = useBibleStore((s) => s.customTranslations);
  const modulesReady = useBibleStore((s) => s.modulesReady);

  const [verses, setVerses] = useState<TaggedVerse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  // Localized book names for the current translation, if available.
  // Custom translations carry bookNames on their meta object.
  // Built-in non-English translations (e.g. SYN) use the static map from bibleLoader.
  const translationBookNames =
    customTranslations.find((ct) => ct.abbreviation === selectedTranslation)?.bookNames ??
    getBuiltinBookNames(selectedTranslation);

  const getBookDisplayName = (englishName: string) =>
    translationBookNames?.[englishName] ?? englishName;

  // Load verses whenever book, chapter, or translation changes.
  // modulesReady gates the effect: custom translations registered by usePersistStore
  // after startup are not available until that flag flips, so we wait to avoid a
  // "no data found" error flash on first render with a custom translation selected.
  useEffect(() => {
    if (!pane || !selectedBook || !selectedChapter) return;
    if (!modulesReady) return;

    console.log(`[VerseDisplay] loading: translation=${selectedTranslation} book="${selectedBook}" chapter=${selectedChapter}`);
    setIsLoading(true);
    setLoadError(null);

    try {
      const loaded = getChapter(selectedTranslation, selectedBook, selectedChapter);
      console.log(`[VerseDisplay] getChapter result: ${loaded?.length ?? 0} verses`);
      if (!loaded || loaded.length === 0) {
        console.warn(`[VerseDisplay] no data — translation="${selectedTranslation}" book="${selectedBook}" ch=${selectedChapter}`);
        setLoadError(`No data found for ${selectedBook} ${selectedChapter} (${selectedTranslation})`);
        setVerses([]);
      } else {
        setVerses(loaded);
      }
    } catch (err) {
      console.error('[VerseDisplay] getChapter threw:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load chapter');
      setVerses([]);
    } finally {
      setIsLoading(false);
    }
  // customTranslations included so the effect re-runs when a newly imported
  // translation becomes available; modulesReady ensures we wait for startup
  // registration before attempting any custom-translation lookup.
  }, [selectedBook, selectedChapter, selectedTranslation, customTranslations, modulesReady]);

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
          ? 'border-blue-400/60 dark:border-blue-500/50'
          : 'border-black/[0.10] dark:border-white/[0.10]'}
        bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl text-gray-900 dark:text-gray-100`}
    >
      {/* Sticky header — wraps to two rows when pane is too narrow (3+ panes) */}
      <div className="sticky top-0 z-10 flex items-center flex-wrap px-3 py-1.5 border-b
        border-black/[0.10] dark:border-white/[0.10] bg-white/85 dark:bg-slate-900/85 backdrop-blur-lg shadow-[0_1px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_8px_rgba(0,0,0,0.25)] gap-1.5">

        {/* Per-pane book + chapter navigation — grows to fill available space */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <select
            value={selectedBook}
            onChange={(e) => {
              e.stopPropagation();
              updatePane(paneId, { selectedBook: e.target.value, selectedChapter: 1 });
            }}
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-0 flex-1 max-w-[160px] truncate"
          >
            {books.map((b) => (
              <option key={b.name} value={b.name}>{getBookDisplayName(b.name)}</option>
            ))}
          </select>

          <select
            value={selectedChapter}
            onChange={(e) => {
              e.stopPropagation();
              updatePane(paneId, { selectedChapter: Number(e.target.value) });
            }}
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-[68px] shrink-0"
          >
            {Array.from(
              { length: books.find((b) => b.name === selectedBook)?.chapters ?? 1 },
              (_, i) => i + 1
            ).map((ch) => (
              <option key={ch} value={ch}>Ch {ch}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={selectedTranslation}
            onChange={(e) => { e.stopPropagation(); setSelectedTranslation(e.target.value as Translation); }}
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <optgroup label={t('builtIn')}>
              {BUILTIN_TRANSLATIONS.map((tr: Translation) => (
                <option key={tr} value={tr}>{tr}</option>
              ))}
            </optgroup>
            {customTranslations.length > 0 && (
              <optgroup label={t('imported')}>
                {customTranslations.map((ct) => (
                  <option key={ct.abbreviation} value={ct.abbreviation}>
                    {ct.abbreviation}{ct.fullName ? ` — ${ct.fullName}` : ''}
                  </option>
                ))}
              </optgroup>
            )}
          </select>

          {canRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); togglePaneSync(paneId); }}
              title={pane.synced ? t('unsyncPane') : t('syncPane')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium border transition-colors
                ${pane.synced
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600 hover:bg-blue-200 dark:hover:bg-blue-800/50'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              {pane.synced
                ? <><Link2 size={13} strokeWidth={2} /><span>{t('synced')}</span></>
                : <><Link2Off size={13} strokeWidth={2} /><span>{t('sync')}</span></>
              }
            </button>
          )}

          {canRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              title={t('closePane')}
              className="ml-1 px-2 py-1 rounded text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-lg leading-none"
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
          <div className="text-gray-500 dark:text-gray-400 italic">{t('loading')}</div>
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
                      title={bookmarked ? t('removeBookmark') : t('bookmarkVerse')}
                      className={`p-0.5 rounded transition-colors
                        ${bookmarked
                          ? 'text-blue-500 dark:text-blue-400'
                          : 'text-transparent group-hover:text-gray-500 dark:group-hover:text-gray-400 hover:!text-blue-400'}
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
                        title={t('highlightVerse')}
                        className={`p-0.5 rounded transition-colors
                          ${highlight
                            ? 'text-amber-500 dark:text-amber-400'
                            : 'text-transparent group-hover:text-gray-500 dark:group-hover:text-gray-400 hover:!text-amber-400'}
                        `}
                      >
                        <Highlighter size={13} strokeWidth={2} />
                      </button>

                      {/* Color picker popover */}
                      {pickerOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-full top-0 ml-1 z-50 flex items-center gap-1 p-1.5 rounded-lg shadow-lg border border-black/[0.14] dark:border-white/[0.15]
                            bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl"
                        >
                          {HIGHLIGHT_COLORS.map(({ color, bg, labelKey }) => (
                            <button
                              key={color}
                              title={t(labelKey)}
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
                              title={t('removeHighlight')}
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
                      title={note ? t('editNote') : t('addNote')}
                      className={`p-0.5 rounded transition-colors
                        ${note
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : 'text-transparent group-hover:text-gray-500 dark:group-hover:text-gray-400 hover:!text-emerald-400'}
                      `}
                    >
                      <NotebookPen size={13} strokeWidth={2} />
                    </button>
                  </div>

                  {/* Verse text */}
                  <p
                    className={`flex-1 px-1 rounded transition-colors ${highlight ? HIGHLIGHT_BG[highlight.color] : ''}`}
                    style={{ fontSize: 'var(--bible-font-size)', fontFamily: 'var(--bible-font-family)' }}
                  >
                    {/* Verse number — click to view TSK cross-references */}
                    <span
                      className="text-xs font-bold text-blue-500 dark:text-blue-400 mr-1.5 select-none cursor-pointer hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                      title={t('viewCrossRefs')}
                      onClick={(e) => { e.stopPropagation(); setTskVerse(verseKey); }}
                    >
                      {idx + 1}
                    </span>
                    {/* Word tokens — each word carrying its Strong's number(s) */}
                    {verseText.map((tok, j) => (
                      tok.strongs.length > 0 ? (
                        <span
                          key={j}
                          onClick={(e) => { e.stopPropagation(); setStrongsNum(tok.strongs[0], tok.word); }}
                          title={tok.strongs.join(' ')}
                          className="cursor-pointer rounded px-px hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
                        >
                          {tok.word}{' '}
                        </span>
                      ) : (
                        <span key={j}>{tok.word}{' '}</span>
                      )
                    ))}
                  </p>

                  {/* Note editor modal */}
                  {noteOpen && (
                    <NoteEditor
                      verseKey={verseKey}
                      verseText={verseText.map((t) => t.word).join(' ')}
                      onClose={() => setOpenNoteIdx(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state — show loading hint while startup module scan is in progress */}
        {!isLoading && !loadError && verses.length === 0 && (
          <div className="text-gray-500 dark:text-gray-400 italic">
            {!modulesReady ? t('loading') : t('selectBookChapter')}
          </div>
        )}
      </div>
    </div>
  );
}
