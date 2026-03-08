import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getChapterText } from '../data/bibleLoader';
import type { Translation } from '../data/bibleLoader';
import type { RefSegment } from '../utils/crossRefs';
import { useBibleStore } from '../store/bibleStore';
import { useTranslation } from '../i18n/useTranslation';

interface CrossRefPopoverProps {
  refSeg: RefSegment;
  anchor: HTMLElement;
  translation: Translation;
  onClose?: () => void;
}

export function CrossRefPopover({ refSeg, anchor, translation, onClose }: CrossRefPopoverProps) {
  const { t } = useTranslation();
  const addPaneWithRef = useBibleStore((s) => s.addPaneWithRef);
  const [verseText, setVerseText] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute position from anchor bounding rect
  useEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const MARGIN = 8;
    const POPOVER_WIDTH = 320;

    let left = rect.left + window.scrollX;
    // Clamp so it doesn't overflow right edge
    if (left + POPOVER_WIDTH > window.innerWidth - MARGIN) {
      left = window.innerWidth - POPOVER_WIDTH - MARGIN;
    }
    if (left < MARGIN) left = MARGIN;

    setPos({
      top: rect.bottom + window.scrollY + MARGIN,
      left,
    });
  }, [anchor]);

  // Fetch verse text
  useEffect(() => {
    setVerseText(null);
    setError(false);

    try {
      const verses = getChapterText(translation, refSeg.book, refSeg.chapter);
      const verse = verses[refSeg.verse - 1]; // verse is 1-indexed
      if (verse) {
        setVerseText(verse);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  }, [refSeg.book, refSeg.chapter, refSeg.verse, translation]);

  const label = `${refSeg.book} ${refSeg.chapter}:${refSeg.verse}`;

  return createPortal(
    <div
      ref={popoverRef}
      style={{ top: pos.top, left: pos.left, width: 320 }}
      className="fixed z-50 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wide">
          {label} &middot; {translation}
        </div>
        <button
          onClick={() => {
            addPaneWithRef(refSeg.book, refSeg.chapter, translation);
            onClose?.();
          }}
          title={t('openInPane')}
          className="ml-3 text-xs px-2 py-0.5 rounded bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors whitespace-nowrap"
        >
          {t('openInPane')}
        </button>
      </div>
      {verseText == null && !error && (
        <div className="text-sm text-gray-400 dark:text-gray-500 italic">{t('loading')}</div>
      )}
      {error && (
        <div className="text-sm text-red-500 dark:text-red-400">{t('verseNotFound')}</div>
      )}
      {verseText != null && (
        <p className="text-sm leading-relaxed">{verseText}</p>
      )}
    </div>,
    document.body
  );
}
