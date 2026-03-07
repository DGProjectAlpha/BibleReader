import { useEffect, useState } from 'react';
import { useBibleStore } from '../store/bibleStore';
import { getChapter, TRANSLATIONS } from '../data/bibleLoader';
import type { Translation } from '../data/bibleLoader';
import { VerseText } from './VerseText';
import { CrossRefPopover } from './CrossRefPopover';
import type { RefSegment } from '../utils/crossRefs';

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
  const setStrongsWord = useBibleStore((s) => s.setStrongsWord);

  const [verses, setVerses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hoveredRef, setHoveredRef] = useState<{ ref: RefSegment; anchor: HTMLElement } | null>(null);

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

  const setSelectedTranslation = (t: Translation) =>
    updatePane(id, { selectedTranslation: t });

  if (!pane) return null;

  return (
    <div
      onClick={onActivate}
      className={`flex flex-col flex-1 min-w-0 overflow-y-auto border-r last:border-r-0 transition-colors
        ${isActive
          ? 'border-blue-500 dark:border-blue-400'
          : 'border-gray-200 dark:border-gray-700'}
        bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
    >
      <div className="p-6">
        {/* Header: title + translation switcher + close button */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold truncate">
            {selectedBook
              ? `${selectedBook} ${selectedChapter}`
              : <span className="text-gray-400 dark:text-gray-500">Select a book</span>
            }
          </h2>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {TRANSLATIONS.map((t: Translation) => (
              <button
                key={t}
                onClick={(e) => { e.stopPropagation(); setSelectedTranslation(t); }}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedTranslation === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t}
              </button>
            ))}

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
            {verses.map((verseText, idx) => (
              <p key={idx} className="text-base">
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
            ))}
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
