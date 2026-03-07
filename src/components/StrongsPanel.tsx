import { useState } from 'react';
import { useBibleStore } from '../store/bibleStore';
import { getTranslit, isHebrew } from '../data/strongs';
import type { StrongsResult } from '../store/bibleStore';

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
}

function EntryDetail({ result, onClose }: EntryDetailProps) {
  const { num, entry } = result;
  const translit = getTranslit(entry);
  const lang = isHebrew(num) ? 'Hebrew' : 'Greek';
  const usageItems = parseUsage(entry.kjv_def ?? '');
  const total = totalUsageCount(entry.kjv_def ?? '');

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
      </div>
    </div>
  );
}

export function StrongsPanel() {
  const strongsWord = useBibleStore((s) => s.strongsWord);
  const strongsResults = useBibleStore((s) => s.strongsResults);
  const setStrongsWord = useBibleStore((s) => s.setStrongsWord);
  const [selectedResult, setSelectedResult] = useState<StrongsResult | null>(null);

  // Reset detail view when word changes
  const handleClose = () => setSelectedResult(null);

  if (selectedResult) {
    return (
      <div className="w-64 shrink-0 border-l border-black/[0.07] dark:border-white/[0.07] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[-1px_0_12px_rgba(0,0,0,0.06)] dark:shadow-[-1px_0_12px_rgba(0,0,0,0.3)] flex flex-col h-full text-sm">
        <EntryDetail result={selectedResult} onClose={handleClose} />
      </div>
    );
  }

  return (
    <div className="w-64 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full text-sm">
      {/* Panel header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Strong's
        </span>
        {strongsWord && (
          <button
            onClick={() => { setStrongsWord(null); setSelectedResult(null); }}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {!strongsWord ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 text-gray-400 dark:text-gray-500">
            <span className="text-3xl mb-2">📖</span>
            <p className="text-xs leading-relaxed">
              Click any word in the text to look it up in the Strong's Exhaustive Concordance.
            </p>
          </div>
        ) : strongsResults.length === 0 ? (
          <div className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500">
            No Strong's entries found for &ldquo;{strongsWord}&rdquo;.
          </div>
        ) : (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
              Results for &ldquo;{strongsWord}&rdquo;
            </div>
            {strongsResults.map((result) => {
              const translit = getTranslit(result.entry);
              const total = totalUsageCount(result.entry.kjv_def ?? '');
              return (
                <button
                  key={result.num}
                  onClick={() => setSelectedResult(result)}
                  className="w-full text-left px-3 py-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors flex items-start gap-2"
                >
                  {/* Strong's number badge */}
                  <span className="shrink-0 text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 mt-0.5">
                    {result.num}
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* Lemma */}
                    <div
                      className="text-base font-serif text-gray-800 dark:text-gray-100 leading-tight truncate"
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
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
