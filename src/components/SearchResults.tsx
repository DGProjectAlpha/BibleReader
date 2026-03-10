import { useRef, useState, useCallback } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useBibleStore, selectActivePane, MAX_PANES } from '../store/bibleStore';
import type { SearchResult } from '../store/bibleStore';
import { getChapterText } from '../data/bibleLoader';
import { useTranslation } from '../i18n/useTranslation';
import Tooltip from './Tooltip';

// Highlight matched substring
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const needle = query.trim();
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">
        {text.slice(idx, idx + needle.length)}
      </mark>
      {text.slice(idx + needle.length)}
    </span>
  );
}

// Get surrounding verse text for context (returns null if out of range)
function getContextVerse(
  book: string,
  chapter: number,
  verseIndex: number, // 0-indexed
  translation: import('../data/bibleLoader').Translation,
): string | null {
  if (verseIndex < 0) return null;
  const verses = getChapterText(translation, book, chapter);
  if (verseIndex >= verses.length) return null;
  return verses[verseIndex] ?? null;
}

interface ResultCardProps {
  result: SearchResult;
  query: string;
  onClick: () => void;
  onSyncAll?: () => void;
  onOpenParallel?: () => void;
  multiPane: boolean;
  canAddPane: boolean;
  translation: import('../data/bibleLoader').Translation;
}

function ResultCard({ result, query, onClick, onSyncAll, onOpenParallel, multiPane, canAddPane, translation }: ResultCardProps) {
  const verseIndex = result.verse - 1; // convert to 0-indexed
  const { t } = useTranslation();

  // Use the result's own translation for context (may differ from active pane)
  const resultTranslation = result.translation ?? translation;
  const prevVerse = getContextVerse(result.book, result.chapter, verseIndex - 1, resultTranslation);
  const nextVerse = getContextVerse(result.book, result.chapter, verseIndex + 1, resultTranslation);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 group">
      {/* Main clickable area */}
      <button
        onClick={onClick}
        className="w-full text-left px-4 pt-3 pb-2 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors"
      >
        {/* Reference badge */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
            {result.translation && (
              <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-semibold uppercase">
                {result.translation}
              </span>
            )}
            {result.book} {result.chapter}:{result.verse}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {multiPane ? t('activePaneArrow') : t('navigateTo')}
          </span>
        </div>

        {/* Previous verse context */}
        {prevVerse && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 leading-relaxed">
            <span className="font-medium text-gray-500 dark:text-gray-400 mr-1">
              {result.verse - 1}
            </span>
            {prevVerse}
          </p>
        )}

        {/* Matched verse — highlighted */}
        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
          <span className="font-semibold text-gray-600 dark:text-gray-300 mr-1">
            {result.verse}
          </span>
          <HighlightedText text={result.text} query={query} />
        </p>

        {/* Next verse context */}
        {nextVerse && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            <span className="font-medium text-gray-500 dark:text-gray-400 mr-1">
              {result.verse + 1}
            </span>
            {nextVerse}
          </p>
        )}
      </button>

      {/* Action buttons */}
      <div className="px-4 pb-3 flex items-center gap-3">
        {multiPane && (
          <Tooltip label={t('syncAllPanes')}>
            <button
              onClick={onSyncAll}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-md ring-1 ring-indigo-500/50 transition-colors"
            >
              <ArrowLeftRight size={12} strokeWidth={2.5} />
              {t('syncAllPanes')}
            </button>
          </Tooltip>
        )}
        {canAddPane && (
          <Tooltip label={t('openParallel')}>
            <button
              onClick={onOpenParallel}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 hover:underline"
            >
              {t('openParallel')}
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT = window.innerHeight * 0.8;
const DEFAULT_HEIGHT = 300;

export function SearchResults() {
  const searchResults = useBibleStore((s) => s.searchResults);
  const searchQuery = useBibleStore((s) => s.searchQuery);
  const searchOpen = useBibleStore((s) => s.searchOpen);
  const setSearchOpen = useBibleStore((s) => s.setSearchOpen);
  const activePane = useBibleStore(selectActivePane);
  const updatePane = useBibleStore((s) => s.updatePane);
  const navigateAllPanes = useBibleStore((s) => s.navigateAllPanes);
  const addPaneWithRef = useBibleStore((s) => s.addPaneWithRef);
  const paneCount = useBibleStore((s) => s.panes.length);

  const { t } = useTranslation();

  const [panelHeight, setPanelHeight] = useState(DEFAULT_HEIGHT);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef<number>(DEFAULT_HEIGHT);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartHeight.current + delta));
    setPanelHeight(next);
  }, []);

  const onMouseUp = useCallback(() => {
    dragStartY.current = null;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, [onMouseMove]);

  const onDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    dragStartHeight.current = panelHeight;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ns-resize';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [panelHeight, onMouseMove, onMouseUp]);

  // Only render when search is open and we have results
  if (!searchOpen || searchResults.length === 0) return null;

  // navigateTo: updates active pane (sync logic in updatePane propagates to all panes when syncScroll is on)
  const navigateTo = (result: SearchResult) => {
    updatePane(activePane.id, {
      selectedBook: result.book,
      selectedChapter: result.chapter,
      scrollToVerse: result.verse,
    });
    setSearchOpen(false);
  };

  // syncAllTo: explicitly syncs all panes regardless of syncScroll toggle
  const syncAllTo = (result: SearchResult) => {
    navigateAllPanes(result.book, result.chapter, result.verse);
    setSearchOpen(false);
  };

  // openParallel: add a new pane pointed at this result without touching existing panes
  const openParallel = (result: SearchResult) => {
    addPaneWithRef(result.book, result.chapter, activePane.selectedTranslation, result.verse);
    setSearchOpen(false);
  };

  const resultCount = searchResults.length;
  const label = resultCount === 500 ? t('resultCountMany') : t('resultCount', { count: resultCount });

  return (
    // Sits below the SearchBar in the flex column, above the reading panes
    <div
      className="shrink-0 flex flex-col bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg"
      style={{ height: panelHeight }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
          {label} <span className="text-blue-600 dark:text-blue-400 font-semibold">{t('forQuery', { query: searchQuery })}</span>
          <span className="ml-2 text-gray-500 dark:text-gray-400">{t('clickToNavigate')}</span>
        </span>
        <Tooltip label={t('closeResultsTooltip')}>
          <button
            onClick={() => setSearchOpen(false)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 px-2 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t('closeButton')}
          </button>
        </Tooltip>
      </div>

      {/* Scrollable result list */}
      <div className="overflow-y-auto flex-1">
        {searchResults.map((r, i) => (
          <ResultCard
            key={i}
            result={r}
            query={searchQuery}
            onClick={() => navigateTo(r)}
            onSyncAll={() => syncAllTo(r)}
            onOpenParallel={() => openParallel(r)}
            multiPane={paneCount > 1}
            canAddPane={paneCount < MAX_PANES}
            translation={activePane.selectedTranslation}
          />
        ))}
      </div>

      {/* Drag-to-resize handle */}
      <Tooltip label={t('dragToResize')} position="bottom">
      <div
        onMouseDown={onDragHandleMouseDown}
        className="shrink-0 h-2 cursor-ns-resize flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors group"
      >
        <div className="w-8 h-0.5 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-400 dark:group-hover:bg-blue-500 transition-colors" />
      </div>
      </Tooltip>
    </div>
  );
}
