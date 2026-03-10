import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useBibleStore, selectActivePane } from '../store/bibleStore';
import type { SearchScope } from '../store/bibleStore';
import { books } from '../data/books';
import { useTranslation } from '../i18n/useTranslation';
import Tooltip from './Tooltip';
import { searchBible } from '../utils/searchBible';


export function SearchBar() {
  const {
    searchQuery, setSearchQuery,
    searchScope, setSearchScope,
    searchScopeBook, setSearchScopeBook,
    searchScopeChapter, setSearchScopeChapter,
    searchResults, setSearchResults,
    searchOpen, setSearchOpen,
  } = useBibleStore();

  const activePane = useBibleStore(selectActivePane);
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);

  const scopeBook = books.find((b) => b.name === searchScopeBook) ?? books[0];
  const chapterCount = scopeBook.chapters;

  const handleSearch = useCallback(() => {
    setLoading(true);
    // Defer to next tick so loading state renders before heavy compute
    setTimeout(() => {
      const results = searchBible(searchQuery, {
        translation: activePane.selectedTranslation,
        scope: searchScope,
        scopeBook: searchScopeBook,
        scopeChapter: searchScopeChapter,
      });
      setSearchResults(results);
      setLoading(false);
    }, 0);
  }, [searchQuery, searchScope, searchScopeBook, searchScopeChapter, activePane.selectedTranslation, setSearchResults]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') setSearchOpen(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  if (!searchOpen) {
    return (
      <Tooltip label={t('searchBibleTitle')}>
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
        >
          <Search size={14} />
          <span>{t('searchButton')}</span>
        </button>
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 border-b border-gray-300 dark:border-gray-600">
      {/* Search input row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Search size={16} className="text-gray-400 shrink-0" />

        <input
          autoFocus
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('searchPlaceholder')}
          className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none"
        />

        {searchQuery && (
          <Tooltip label={t('clearSearchTooltip')}>
            <button onClick={clearSearch} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={14} />
            </button>
          </Tooltip>
        )}

        <Tooltip label={t('searchButton')}>
          <button
            onClick={handleSearch}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors"
          >
            {t('searchButton')}
          </button>
        </Tooltip>

        <Tooltip label={t('closeSearchTooltip')}>
          <button
            onClick={() => setSearchOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </Tooltip>
      </div>

      {/* Scope controls */}
      <div className="flex flex-wrap items-center gap-2 px-3 pb-2 text-xs">
        <span className="text-gray-500 dark:text-gray-400 font-medium">{t('searchScope')}</span>

        {(['bible', 'OT', 'NT', 'book', 'chapter'] as SearchScope[]).map((s) => {
          const labelKey = s === 'bible' ? 'scopeWholeBible' as const : s === 'OT' ? 'scopeOT' as const : s === 'NT' ? 'scopeNT' as const : s === 'book' ? 'scopeBook' as const : 'scopeChapter' as const;
          return (
            <Tooltip label={t(labelKey)} key={s}>
              <button
                onClick={() => setSearchScope(s)}
                className={`px-2 py-0.5 rounded-full border transition-colors ${
                  searchScope === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                }`}
              >
                {t(labelKey)}
              </button>
            </Tooltip>
          );
        })}

        {/* Book selector (shown for 'book' and 'chapter' scopes) */}
        {(searchScope === 'book' || searchScope === 'chapter') && (
          <select
            value={searchScopeBook}
            onChange={(e) => {
              setSearchScopeBook(e.target.value);
              setSearchScopeChapter(1);
            }}
            className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs"
          >
            {books.map((b) => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        )}

        {/* Chapter selector (shown only for 'chapter' scope) */}
        {searchScope === 'chapter' && (
          <select
            value={searchScopeChapter}
            onChange={(e) => setSearchScopeChapter(Number(e.target.value))}
            className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs"
          >
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
              <option key={ch} value={ch}>{t('scopeChapter')} {ch}</option>
            ))}
          </select>
        )}

        {searchResults.length > 0 && (
          <span className="ml-auto text-gray-400">
            {searchResults.length === 500 ? t('resultCountMany') : t('resultCount', { count: searchResults.length })}
          </span>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">{t('searching')}</div>
      )}

      {!loading && searchQuery && searchResults.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800">
          {t('noResults')}
        </div>
      )}
    </div>
  );
}
