import { useState } from 'react';
import { useBibleStore } from '../store/bibleStore';
import { getTSKRefs } from '../data/tskLoader';
import type { TSKRef } from '../data/tskLoader';
import { useTranslation } from '../i18n/useTranslation';
import Tooltip from './Tooltip';

export function TskPanel() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const tskVerse = useBibleStore((s) => s.tskVerse);
  const setTskVerse = useBibleStore((s) => s.setTskVerse);
  const panes = useBibleStore((s) => s.panes);
  const activePaneIndex = useBibleStore((s) => s.activePaneIndex);
  const updatePane = useBibleStore((s) => s.updatePane);

  const refs: TSKRef[] = tskVerse
    ? getTSKRefs(tskVerse.book, tskVerse.chapter, tskVerse.verse)
    : [];

  function navigateToRef(ref: TSKRef) {
    const activePane = panes[activePaneIndex];
    if (!activePane) return;
    updatePane(activePane.id, {
      selectedBook: ref.book,
      selectedChapter: ref.chapter,
      scrollToVerse: ref.verse,
    });
  }

  // Collapsed strip
  if (collapsed) {
    return (
      <div className="w-9 shrink-0 border-l border-black/[0.12] dark:border-white/[0.12] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[-1px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[-1px_0_12px_rgba(0,0,0,0.3)] flex flex-col items-center justify-start pt-2 h-full">
        <Tooltip label={t('expandCrossRefs')} position="bottom">
          <button
            onClick={() => setCollapsed(false)}
            className="text-sm text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors leading-none mb-3"
          >
            ‹
          </button>
        </Tooltip>
        <span
          className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 dark:text-gray-300 select-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {t('tskCollapsedLabel')}
        </span>
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border-l border-black/[0.12] dark:border-white/[0.12] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[-1px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[-1px_0_12px_rgba(0,0,0,0.3)] flex flex-col h-full text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.10] dark:border-white/[0.10]">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
          {t('crossRefsHeader')}
        </span>
        <div className="flex items-center gap-2">
          {tskVerse && (
            <Tooltip label={t('clearCrossRefs')}>
              <button
                onClick={() => setTskVerse(null)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </Tooltip>
          )}
          <Tooltip label={t('collapseCrossRefs')}>
            <button
              onClick={() => setCollapsed(true)}
              className="text-sm text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors leading-none"
            >
              ›
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {!tskVerse ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 text-gray-500 dark:text-gray-400">
            <span className="text-3xl mb-2">🔗</span>
            <p className="text-xs leading-relaxed">
              {t('tskEmptyHint')}
            </p>
          </div>
        ) : refs.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
            {t('tskNoRefs', { book: tskVerse.book, chapter: String(tskVerse.chapter), verse: String(tskVerse.verse) })}
          </div>
        ) : (
          <div>
            <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 border-b border-black/[0.10] dark:border-white/[0.12]">
              {t('tskRefHeader', { book: tskVerse.book, chapter: String(tskVerse.chapter), verse: String(tskVerse.verse), count: String(refs.length) })}
            </div>
            <div className="divide-y divide-black/[0.10] dark:divide-white/[0.10]">
              {refs.map((ref, i) => (
                <Tooltip label={t('navigateToCrossRef')} key={i}>
                  <button
                    onClick={() => navigateToRef(ref)}
                    className="w-full text-left px-3 py-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    {ref.label}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
