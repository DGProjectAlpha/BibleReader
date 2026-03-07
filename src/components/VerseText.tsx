import { parseVerseRefs } from '../utils/crossRefs';
import type { RefSegment } from '../utils/crossRefs';

interface VerseTextProps {
  text: string;
  onRefHover?: (ref: RefSegment, anchorEl: HTMLElement) => void;
  onRefLeave?: () => void;
}

export function VerseText({ text, onRefHover, onRefLeave }: VerseTextProps) {
  const segments = parseVerseRefs(text);

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return <span key={i}>{seg.text}</span>;
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
