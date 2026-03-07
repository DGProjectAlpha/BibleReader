import { parseVerseRefs } from '../utils/crossRefs';
import type { RefSegment } from '../utils/crossRefs';

interface VerseTextProps {
  text: string;
  onRefHover?: (ref: RefSegment, anchorEl: HTMLElement) => void;
  onRefLeave?: () => void;
  onWordClick?: (word: string) => void;
}

// Split a plain text string into alternating word/non-word tokens for clickability
function tokenizeText(text: string): Array<{ word: boolean; value: string }> {
  const tokens: Array<{ word: boolean; value: string }> = [];
  // Match sequences of letters/apostrophes as words; everything else as punctuation/space
  const re = /([A-Za-z']+)|([^A-Za-z']+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match[1] !== undefined) {
      tokens.push({ word: true, value: match[1] });
    } else {
      tokens.push({ word: false, value: match[2] });
    }
  }
  return tokens;
}

export function VerseText({ text, onRefHover, onRefLeave, onWordClick }: VerseTextProps) {
  const segments = parseVerseRefs(text);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          if (!onWordClick) return <span key={i}>{seg.text}</span>;
          // Render each word as a clickable span
          const tokens = tokenizeText(seg.text);
          return (
            <span key={i}>
              {tokens.map((tok, j) =>
                tok.word ? (
                  <span
                    key={j}
                    onClick={(e) => {
                      e.stopPropagation();
                      onWordClick(tok.value);
                    }}
                    className="cursor-pointer rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
                  >
                    {tok.value}
                  </span>
                ) : (
                  <span key={j}>{tok.value}</span>
                )
              )}
            </span>
          );
        }

        return (
          <span
            key={i}
            data-book={seg.book}
            data-chapter={seg.chapter}
            data-verse={seg.verse}
            onMouseEnter={(e) => onRefHover?.(seg, e.currentTarget)}
            onMouseLeave={() => onRefLeave?.()}
            className="cursor-pointer underline decoration-dotted text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
          >
            {seg.text}
          </span>
        );
      })}
    </>
  );
}
