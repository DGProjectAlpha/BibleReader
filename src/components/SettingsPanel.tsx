import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Upload } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';
import type { Theme, AppLanguage } from '../store/bibleStore';
import { useTranslation } from '../i18n/useTranslation';
import type { TranslationKey } from '../i18n/translations';

interface ThemeOption {
  id: Theme;
  labelKey: TranslationKey;
  description: string;
  swatch: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'light-cool', labelKey: 'themeCoolWhite', description: 'Blue-lavender gradient',       swatch: '#dde8fe' },
  { id: 'light-warm', labelKey: 'themeWarmWhite', description: 'Warm cream / amber wash',      swatch: '#fdf6e3' },
  { id: 'dark-blue',  labelKey: 'themeCoolDark',  description: 'Deep navy-indigo gradient',    swatch: '#0e1222' },
  { id: 'dark-oled',  labelKey: 'themeOled',      description: 'Pure black for OLED displays', swatch: '#000000' },
];

interface SettingsPanelProps {
  onOpenImport?: () => void;
}

export function SettingsPanel({ onOpenImport }: SettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const theme       = useBibleStore((s) => s.theme);
  const setTheme    = useBibleStore((s) => s.setTheme);
  const language    = useBibleStore((s) => s.language);
  const setLanguage = useBibleStore((s) => s.setLanguage);
  const { t } = useTranslation();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={t('settingsTitle')}
        aria-label={t('openSettings')}
        className="p-1.5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
      >
        <Settings size={16} />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="relative w-80 rounded-xl shadow-2xl border p-6
            bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700
            flex flex-col gap-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{t('settingsTitle')}</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                aria-label={t('closeSettings')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Theme section */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-3">
                {t('sectionColorTheme')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {THEME_OPTIONS.map((opt) => {
                  const active = theme === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setTheme(opt.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-left transition-all
                        ${active
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800'
                        }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full shrink-0 border border-black/15 dark:border-white/15"
                        style={{ background: opt.swatch }}
                      />
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className={`text-xs font-medium truncate ${active ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>
                          {t(opt.labelKey)}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{opt.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language section */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-3">
                {t('sectionLanguage')}
              </span>
              <div className="flex gap-2">
                {([
                  { id: 'en' as AppLanguage, label: 'English' },
                  { id: 'ru' as AppLanguage, label: 'Русский' },
                ] as { id: AppLanguage; label: string }[]).map(({ id, label }) => {
                  const active = language === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setLanguage(id)}
                      className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                        ${active
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400 text-blue-700 dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Import Bible section */}
            {onOpenImport && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-3">
                  {t('sectionBibleImport')}
                </span>
                <button
                  onClick={() => { console.log('[SettingsPanel] Import button clicked — closing settings, opening import modal'); setOpen(false); onOpenImport(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors w-full
                    bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                >
                  <Upload size={15} />
                  {t('importBibleButton')}
                </button>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">
                  {t('importBibleDesc')}
                </p>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
