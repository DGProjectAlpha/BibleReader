import { useState } from 'react';
import { useBibleStore } from '../store/bibleStore';
import { getTSKRefs } from '../data/tskLoader';
import type { TSKRef } from '../data/tskLoader';

export function TskPanel() {
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
        <button
          onClick={() => setCollapsed(false)}
          title="Expand cross-references panel"
          className="text-sm text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors leading-none mb-3"
        >
          ‹
        </button>
        <span
          className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 dark:text-gray-300 select-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          TSK Refs
        </span>
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border-l border-black/[0.12] dark:border-white/[0.12] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[-1px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[-1px_0_12px_rgba(0,0,0,0.3)] flex flex-col h-full text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.10] dark:border-white/[0.10]">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
          Cross-References
        </span>
        <div className="flex items-center gap-2">
          {tskVerse && (
            <button
              onClick={() => setTskVerse(null)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
              title="Clear"
            >
              ✕
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse cross-references panel"
            className="text-sm text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors leading-none"
          >
            ›
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {!tskVerse ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 text-gray-500 dark:text-gray-400">
            <span className="text-3xl mb-2">🔗</span>
            <p className="text-xs leading-relaxed">
              Click a verse number in the text to view TSK cross-references.
            </p>
          </div>
        ) : refs.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
            No cross-references found for {tskVerse.book} {tskVerse.chapter}:{tskVerse.verse}.
          </div>
        ) : (
          <div>
            <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300 border-b border-black/[0.10] dark:border-white/[0.12]">
              {tskVerse.book} {tskVerse.chapter}:{tskVerse.verse} — {refs.length} reference{refs.length !== 1 ? 's' : ''}
            </div>
            <div className="divide-y divide-black/[0.10] dark:divide-white/[0.10]">
              {refs.map((ref, i) => (
                <button
                  key={i}
                  onClick={() => navigateToRef(ref)}
                  className="w-full text-left px-3 py-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                >
                  {ref.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
