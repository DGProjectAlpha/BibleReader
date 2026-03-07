import { useEffect } from 'react';
import { useBibleStore } from '../store/bibleStore';
import { getChapter, TRANSLATIONS } from '../data/bibleLoader';
import type { Translation } from '../data/bibleLoader';

export function VerseDisplay() {
  const {
    selectedBook,
    selectedChapter,
    selectedTranslation,
    verses,
    isLoading,
    loadError,
    setVerses,
    setIsLoading,
    setLoadError,
    setSelectedTranslation,
  } = useBibleStore();

  // Load verses whenever book, chapter, or translation changes
  useEffect(() => {
    if (!selectedBook || !selectedChapter) return;

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

  return (
    <main className="flex-1 overflow-y-auto p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto">

        {/* Header: title + translation switcher */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {selectedBook
              ? `${selectedBook} ${selectedChapter}`
              : <span className="text-gray-400 dark:text-gray-500">Select a book to begin reading</span>
            }
          </h2>

          <div className="flex gap-2">
            {TRANSLATIONS.map((t: Translation) => (
              <button
                key={t}
                onClick={() => setSelectedTranslation(t)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedTranslation === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
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
                {verseText}
              </p>
            ))}
          </div>
        )}

        {/* Empty state (no book selected yet) */}
        {!isLoading && !loadError && verses.length === 0 && !selectedBook && (
          <div className="text-gray-400 dark:text-gray-500 italic">
            Select a book and chapter from the sidebar to start reading.
          </div>
        )}

      </div>
    </main>
  );
}
