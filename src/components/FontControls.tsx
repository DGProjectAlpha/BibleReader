import { useState, useRef, useEffect } from 'react';
import { Type } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';
import { useTranslation } from '../i18n/useTranslation';

// Font family ids — labels are resolved via translation keys at render time
export const FONT_FAMILIES: { id: string; labelKey: 'fontSans' | 'fontSerif' | 'fontMono'; css: string }[] = [
  { id: 'sans',  labelKey: 'fontSans',  css: 'system-ui, -apple-system, sans-serif' },
  { id: 'serif', labelKey: 'fontSerif', css: 'Georgia, "Times New Roman", serif' },
  { id: 'mono',  labelKey: 'fontMono',  css: 'ui-monospace, "Cascadia Code", monospace' },
];

export const FONT_SIZE_MIN = 13;
export const FONT_SIZE_MAX = 26;

export function FontControls() {
  const fontSize = useBibleStore((s) => s.fontSize);
  const fontFamily = useBibleStore((s) => s.fontFamily);
  const setFontSize = useBibleStore((s) => s.setFontSize);
  const setFontFamily = useBibleStore((s) => s.setFontFamily);
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        title={t('fontSizeStyle')}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-sm border transition-colors
          ${open
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-600'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:text-blue-500 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
      >
        <Type size={14} strokeWidth={2} />
        <span className="text-xs font-medium">{fontSize}px</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-lg shadow-lg border p-3 space-y-3
            bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
        >
          {/* Size slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t('sectionSize')}</span>
              <span className="text-xs font-mono text-gray-700 dark:text-gray-200">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              <span>{FONT_SIZE_MIN}</span>
              <span>{FONT_SIZE_MAX}</span>
            </div>
          </div>

          {/* Font family picker */}
          <div>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">{t('sectionFont')}</span>
            <div className="flex gap-1.5">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontFamily(f.id)}
                  title={t(f.labelKey)}
                  style={{ fontFamily: f.css }}
                  className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors
                    ${fontFamily === f.id
                      ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-400 dark:border-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Reset to defaults */}
          <button
            onClick={() => { setFontSize(16); setFontFamily('sans'); }}
            className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {t('resetDefaults')}
          </button>
        </div>
      )}
    </div>
  );
}
