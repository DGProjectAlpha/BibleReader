import { useState, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';
import type { Theme } from '../store/bibleStore';

interface ThemeOption {
  id: Theme;
  label: string;
  description: string;
  swatch: string; // CSS color for the preview dot
}

const DARK_THEMES: ThemeOption[] = [
  { id: 'dark-blue', label: 'Navy',  description: 'Deep navy-indigo gradient', swatch: '#0e1222' },
  { id: 'dark-oled', label: 'OLED',  description: 'Pure black for OLED displays', swatch: '#000000' },
];

const LIGHT_THEMES: ThemeOption[] = [
  { id: 'light-cool', label: 'Cool', description: 'Blue-lavender (default)', swatch: '#dde8fe' },
  { id: 'light-warm', label: 'Warm', description: 'Warm cream / amber wash',  swatch: '#fdf6e3' },
];

export function SettingsPanel() {
  const theme    = useBibleStore((s) => s.theme);
  const darkMode = useBibleStore((s) => s.darkMode);
  const setTheme = useBibleStore((s) => s.setTheme);

  const [open, setOpen] = useState(false);
  const panelRef  = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // When the user picks a theme variant we preserve their current light/dark mode
  // and only swap the variant within that mode.
  function pickDark(t: Theme) {
    setTheme(t);
  }
  function pickLight(t: Theme) {
    setTheme(t);
  }

  const activeLabel   = darkMode ? 'Dark mode'  : 'Light mode';
  const inactiveLabel = darkMode ? 'Light mode' : 'Dark mode';

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        title="Appearance settings"
        aria-label="Appearance settings"
        className={`p-1.5 rounded transition-colors
          ${open
            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
          }`}
      >
        <Settings size={16} />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-lg shadow-xl border p-3 space-y-3
            bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600"
        >
          {/* Active mode variants */}
          <Section label={activeLabel}>
            {(darkMode ? DARK_THEMES : LIGHT_THEMES).map((opt) => (
              <ThemeButton
                key={opt.id}
                opt={opt}
                active={theme === opt.id}
                onPick={darkMode ? pickDark : pickLight}
              />
            ))}
          </Section>

          <div className="border-t border-gray-200 dark:border-gray-600" />

          {/* Inactive mode variants — preview only, switch mode + variant at once */}
          <Section label={inactiveLabel}>
            {(darkMode ? LIGHT_THEMES : DARK_THEMES).map((opt) => (
              <ThemeButton
                key={opt.id}
                opt={opt}
                active={theme === opt.id}
                onPick={darkMode ? pickLight : pickDark}
              />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-1.5">
        {label}
      </span>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function ThemeButton({
  opt,
  active,
  onPick,
}: {
  opt: ThemeOption;
  active: boolean;
  onPick: (t: Theme) => void;
}) {
  return (
    <button
      onClick={() => onPick(opt.id)}
      className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-left text-xs transition-colors
        ${active
          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'
        }`}
    >
      {/* Color swatch */}
      <span
        className="w-4 h-4 rounded-full shrink-0 border border-black/10 dark:border-white/10"
        style={{ background: opt.swatch }}
      />
      <div className="flex flex-col leading-tight">
        <span className="font-medium">{opt.label}</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{opt.description}</span>
      </div>
      {active && (
        <span className="ml-auto text-blue-500 dark:text-blue-400 text-[10px] font-bold">✓</span>
      )}
    </button>
  );
}
