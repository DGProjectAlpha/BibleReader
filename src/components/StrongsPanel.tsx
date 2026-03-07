import { useState, useEffect } from 'react';
import { useBibleStore } from '../store/bibleStore';
import { getTranslit, isHebrew } from '../data/strongs';
import type { StrongsResult } from '../store/bibleStore';
import { getBible } from '../data/bibleLoader';

interface VerseRef {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

// Search KJV for all verses containing a given Strong's number.
// Caps at 300 results to keep the UI sane.
function findVersesByStrongs(num: string): VerseRef[] {
  const results: VerseRef[] = [];
  const bible = getBible('KJV');
  outer: for (const book of bible) {
    for (let ci = 0; ci < book.chapters.length; ci++) {
      const chapter = book.chapters[ci];
      for (let vi = 0; vi < chapter.length; vi++) {
        const taggedVerse = chapter[vi];
        const hasNum = taggedVerse.some((token) => token.strongs.includes(num));
        if (hasNum) {
          const text = taggedVerse.map((t) => t.word).join(' ');
          results.push({ book: book.name, chapter: ci + 1, verse: vi + 1, text });
          if (results.length >= 300) break outer;
        }
      }
    }
  }
  return results;
}

// Parse KJV usage string into word → count pairs.
// kjv_def format is typically: "word(3), phrase(1), ×total"
// We extract anything that looks like "word(n)" or bare words.
function parseUsage(kjvDef: string): Array<{ word: string; count: number | null }> {
  const results: Array<{ word: string; count: number | null }> = [];
  // Match patterns like "word(3)" or "word" at boundaries
  const re = /([a-zA-Z][a-zA-Z\s'-]*)(?:\((\d+)\))?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(kjvDef)) !== null) {
    const word = match[1].trim();
    if (!word || word.length < 2) continue;
    // Skip "times" which is a suffix artifact
    if (word.toLowerCase() === 'times') continue;
    const count = match[2] ? parseInt(match[2], 10) : null;
    results.push({ word, count });
  }
  return results;
}

// Sum all explicit counts from kjv_def for a total usage estimate.
function totalUsageCount(kjvDef: string): number | null {
  const re = /\((\d+)\)/g;
  let match: RegExpExecArray | null;
  let total = 0;
  let found = false;
  while ((match = re.exec(kjvDef)) !== null) {
    total += parseInt(match[1], 10);
    found = true;
  }
  // Also check for ×number pattern (Strong's notation for total occurrences)
  const crossMatch = kjvDef.match(/[×x](\d+)/);
  if (crossMatch) return parseInt(crossMatch[1], 10);
  return found ? total : null;
}

interface EntryDetailProps {
  result: StrongsResult;
  onClose: () => void;
  onNavigate?: (book: string, chapter: number, verse: number) => void;
}

function EntryDetail({ result, onClose, onNavigate }: EntryDetailProps) {
  const { num, entry } = result;
  const translit = getTranslit(entry);
  const lang = isHebrew(num) ? 'Hebrew' : 'Greek';
  const usageItems = parseUsage(entry.kjv_def ?? '');
  const total = totalUsageCount(entry.kjv_def ?? '');

  const [versesOpen, setVersesOpen] = useState(false);
  const [verseRefs, setVerseRefs] = useState<VerseRef[] | null>(null);

  function handleToggleVerses() {
    if (!versesOpen && verseRefs === null) {
      setVerseRefs(findVersesByStrongs(num));
    }
    setVersesOpen((v) => !v);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
        <button
          onClick={onClose}
          className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          ← Back
        </button>
        <span className="text-xs text-gray-400 dark:text-gray-500">{lang}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Strong's number + lemma */}
        <div>
          <span className="inline-block text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 mb-2">
            {num}
          </span>
          <div
            className="text-3xl font-serif leading-tight text-gray-800 dark:text-gray-100"
            dir={isHebrew(num) ? 'rtl' : 'ltr'}
          >
            {entry.lemma}
          </div>
          {translit && (
            <div className="text-sm italic text-gray-500 dark:text-gray-400 mt-0.5">
              {translit}
              {entry.pron && (
                <span className="ml-2 text-gray-400 dark:text-gray-500 not-italic">
                  ({entry.pron})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Definition */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
            Definition
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {entry.strongs_def}
          </p>
        </div>

        {/* Derivation */}
        {entry.derivation && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
              Derivation
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {entry.derivation}
            </p>
          </div>
        )}

        {/* KJV Usage */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
            KJV Usage
            {total !== null && (
              <span className="ml-2 normal-case font-normal text-gray-400 dark:text-gray-500">
                ({total} occurrence{total !== 1 ? 's' : ''})
              </span>
            )}
          </h4>
          {usageItems.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {usageItems.map((item, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {item.word}
                  {item.count !== null && (
                    <span className="text-gray-400 dark:text-gray-500 font-mono">
                      ×{item.count}
                    </span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">{entry.kjv_def}</p>
          )}
        </div>

        {/* Verses using this word */}
        <div className="border-t border-black/[0.06] dark:border-white/[0.06] pt-3">
          <button
            onClick={handleToggleVerses}
            className="w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
          >
            <span>Verses using this word</span>
            <span className="normal-case font-normal tracking-normal select-none">
              {versesOpen ? '▲' : '▼'}
            </span>
          </button>

          {versesOpen && verseRefs !== null && (
            <div className="mt-2 space-y-0.5">
              {verseRefs.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  No verses found (KJV only).
                </p>
              ) : (
                <>
                  {verseRefs.length === 300 && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">
                      Showing first 300 results
                    </p>
                  )}
                  {verseRefs.map((ref, i) => (
                    <button
                      key={i}
                      onClick={() => onNavigate?.(ref.book, ref.chapter, ref.verse)}
                      className="w-full text-left group rounded px-1.5 py-1 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                        {ref.book} {ref.chapter}:{ref.verse}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-snug">
                        {ref.text}
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ResultCardProps {
  result: StrongsResult;
  isExact: boolean;
  isExpanded?: boolean;
  onClick: () => void;
}

function ResultCard({ result, isExact, isExpanded, onClick }: ResultCardProps) {
  const translit = getTranslit(result.entry);
  const total = totalUsageCount(result.entry.kjv_def ?? '');
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left px-3 py-2.5 flex items-start gap-2 transition-colors',
        isExact
          ? 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border-b-2 border-blue-200 dark:border-blue-700'
          : isExpanded
          ? 'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 border-b border-amber-200 dark:border-amber-700'
          : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border-b border-black/[0.04] dark:border-white/[0.04]',
      ].join(' ')}
    >
      {/* Strong's number badge */}
      <span
        className={[
          'shrink-0 text-xs font-mono font-bold px-1.5 py-0.5 rounded mt-0.5',
          isExact
            ? 'bg-blue-200 text-blue-900 dark:bg-blue-700 dark:text-blue-100'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        ].join(' ')}
      >
        {result.num}
      </span>
      <div className="min-w-0 flex-1">
        {isExact && (
          <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-400 mb-0.5">
            Best match
          </div>
        )}
        {/* Lemma */}
        <div
          className={[
            'font-serif leading-tight truncate',
            isExact
              ? 'text-lg text-blue-900 dark:text-blue-100'
              : 'text-base text-gray-800 dark:text-gray-100',
          ].join(' ')}
          dir={isHebrew(result.num) ? 'rtl' : 'ltr'}
        >
          {result.entry.lemma}
        </div>
        {/* Transliteration */}
        {translit && (
          <div className="text-xs italic text-gray-500 dark:text-gray-400 truncate">
            {translit}
          </div>
        )}
        {/* Short definition preview */}
        <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2 leading-snug">
          {result.entry.strongs_def}
        </div>
        {/* Usage count */}
        {total !== null && (
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {total} occurrence{total !== 1 ? 's' : ''} in KJV
          </div>
        )}
      </div>
      {/* Expand/collapse chevron for similar entries */}
      {!isExact && (
        <span className="shrink-0 text-gray-400 dark:text-gray-500 text-xs mt-1 select-none">
          {isExpanded ? '▲' : '▼'}
        </span>
      )}
    </button>
  );
}

// Inline expanded detail for similar entries (compact, stays within the list).
interface InlineDetailProps {
  result: StrongsResult;
  onViewFull: () => void;
}

function InlineDetail({ result, onViewFull }: InlineDetailProps) {
  const { entry, num } = result;
  const lang = isHebrew(num) ? 'Hebrew' : 'Greek';
  const usageItems = parseUsage(entry.kjv_def ?? '');
  const total = totalUsageCount(entry.kjv_def ?? '');

  return (
    <div className="px-3 py-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800 space-y-2.5">
      {/* Lang tag */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          {lang}
        </span>
        <button
          onClick={onViewFull}
          className="text-[10px] text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
        >
          Full detail →
        </button>
      </div>

      {/* Definition */}
      {entry.strongs_def && (
        <div>
          <h5 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">
            Definition
          </h5>
          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
            {entry.strongs_def}
          </p>
        </div>
      )}

      {/* Derivation */}
      {entry.derivation && (
        <div>
          <h5 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-0.5">
            Derivation
          </h5>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {entry.derivation}
          </p>
        </div>
      )}

      {/* KJV Usage pills */}
      {usageItems.length > 0 && (
        <div>
          <h5 className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
            KJV Usage
            {total !== null && (
              <span className="ml-1.5 normal-case font-normal">({total}×)</span>
            )}
          </h5>
          <div className="flex flex-wrap gap-1">
            {usageItems.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {item.word}
                {item.count !== null && (
                  <span className="text-gray-400 dark:text-gray-500 font-mono">
                    ×{item.count}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StrongsPanel() {
  const strongsWord = useBibleStore((s) => s.strongsWord);
  const strongsResults = useBibleStore((s) => s.strongsResults);
  const strongsLookup = useBibleStore((s) => s.strongsLookup);
  const setStrongsWord = useBibleStore((s) => s.setStrongsWord);
  const selectedStrongsNum = useBibleStore((s) => s.selectedStrongsNum);
  const setStrongsNum = useBibleStore((s) => s.setStrongsNum);
  const panes = useBibleStore((s) => s.panes);
  const activePaneIndex = useBibleStore((s) => s.activePaneIndex);
  const updatePane = useBibleStore((s) => s.updatePane);
  const [selectedResult, setSelectedResult] = useState<StrongsResult | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSimilarNum, setExpandedSimilarNum] = useState<string | null>(null);

  function handleNavigate(book: string, chapter: number, verse: number) {
    const pane = panes[activePaneIndex] ?? panes[0];
    if (!pane) return;
    updatePane(pane.id, { selectedBook: book, selectedChapter: chapter, scrollToVerse: verse });
  }

  // Unified gate value: exact num takes priority, falls back to fuzzy word.
  const activeSelection = selectedStrongsNum ?? strongsWord;
  const hasSelection = !!activeSelection;

  // Reset detail view when the selection clears or changes.
  useEffect(() => {
    setSelectedResult(null);
    setExpandedSimilarNum(null);
  }, [activeSelection]);

  // Derive the active entry synchronously: explicit user selection, or auto-select
  // when a Strong's number click yields exactly one result (skip the list view).
  const effectiveResult =
    selectedResult ??
    (selectedStrongsNum && strongsResults.length === 1 ? strongsResults[0] : null);

  // Reset detail view when word changes
  const handleClose = () => {
    setSelectedResult(null);
    // Clear whichever selection mode is active
    if (selectedStrongsNum) setStrongsNum(null);
    if (strongsWord) setStrongsWord(null);
  };

  // Collapsed: narrow vertical strip with toggle button
  if (collapsed) {
    return (
      <div className="w-9 shrink-0 border-l border-black/[0.07] dark:border-white/[0.07] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[-1px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[-1px_0_12px_rgba(0,0,0,0.3)] flex flex-col items-center h-full">
        <button
          onClick={() => setCollapsed(false)}
          title="Expand Strong's panel"
          className="w-full flex items-center justify-center py-3 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors border-b border-black/[0.06] dark:border-white/[0.06]"
        >
          ‹
        </button>
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 select-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Strong's
          </span>
        </div>
      </div>
    );
  }

  if (effectiveResult) {
    return (
      <div className="w-64 shrink-0 border-l border-black/[0.07] dark:border-white/[0.07] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[-1px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[-1px_0_12px_rgba(0,0,0,0.3)] flex flex-col h-full text-sm">
        {/* Collapse button row */}
        <div className="flex items-center justify-end px-2 pt-1">
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse Strong's panel"
            className="text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 px-1 py-0.5 transition-colors"
          >
            ›
          </button>
        </div>
        <EntryDetail result={effectiveResult} onClose={handleClose} onNavigate={handleNavigate} />
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border-l border-black/[0.07] dark:border-white/[0.07] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[-1px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[-1px_0_12px_rgba(0,0,0,0.3)] flex flex-col h-full text-sm">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Strong's
        </span>
        <div className="flex items-center gap-2">
          {hasSelection && (
            <button
              onClick={() => { setStrongsWord(null); setStrongsNum(null); setSelectedResult(null); }}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              title="Clear"
            >
              ✕
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse Strong's panel"
            className="text-sm text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors leading-none"
          >
            ›
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {!hasSelection ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 text-gray-400 dark:text-gray-500">
            <span className="text-3xl mb-2">📖</span>
            <p className="text-xs leading-relaxed">
              Click any word in the text to look it up in the Strong's Exhaustive Concordance.
            </p>
          </div>
        ) : strongsResults.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500">
            No Strong&rsquo;s entries found for &ldquo;{activeSelection}&rdquo;.
          </div>
        ) : (
          <div>
            {strongsWord && (
              <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500 border-b border-black/[0.04] dark:border-white/[0.04]">
                Results for &ldquo;{strongsWord}&rdquo;
              </div>
            )}

            {/* Exact match — highlighted accent card */}
            {strongsLookup?.exact && (
              <ResultCard
                result={strongsLookup.exact}
                isExact
                onClick={() => setSelectedResult(strongsLookup!.exact!)}
              />
            )}

            {/* Similar matches section */}
            {strongsLookup?.similar && strongsLookup.similar.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Similar
                  </span>
                  <div className="flex-1 h-px bg-black/[0.07] dark:bg-white/[0.07]" />
                </div>
                <div>
                  {strongsLookup.similar.map((result) => {
                    const isExpanded = expandedSimilarNum === result.num;
                    return (
                      <div key={result.num}>
                        <ResultCard
                          result={result}
                          isExact={false}
                          isExpanded={isExpanded}
                          onClick={() =>
                            setExpandedSimilarNum(isExpanded ? null : result.num)
                          }
                        />
                        {isExpanded && (
                          <InlineDetail
                            result={result}
                            onViewFull={() => setSelectedResult(result)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Fallback: no structured lookup (legacy flat results) */}
            {!strongsLookup && (
              <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {strongsResults.map((result) => (
                  <ResultCard
                    key={result.num}
                    result={result}
                    isExact={false}
                    onClick={() => setSelectedResult(result)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
