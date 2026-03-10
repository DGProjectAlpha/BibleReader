import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Upload, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';
import type { Theme, AppLanguage } from '../store/bibleStore';
import { useTranslation } from '../i18n/useTranslation';
import type { TranslationKey } from '../i18n/translations';
import { deleteProfileData, saveProfiles } from '../utils/persistence';
import Tooltip from './Tooltip';

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
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [profileError, setProfileError] = useState('');
  const theme          = useBibleStore((s) => s.theme);
  const setTheme       = useBibleStore((s) => s.setTheme);
  const language       = useBibleStore((s) => s.language);
  const setLanguage    = useBibleStore((s) => s.setLanguage);
  const activeProfile  = useBibleStore((s) => s.activeProfile);
  const profiles       = useBibleStore((s) => s.profiles);
  const setActiveProfile = useBibleStore((s) => s.setActiveProfile);
  const addProfile     = useBibleStore((s) => s.addProfile);
  const deleteProfile  = useBibleStore((s) => s.deleteProfile);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDeleteProfile = async (name: string) => {
    await deleteProfileData(name);
    deleteProfile(name);
    const updatedProfiles = useBibleStore.getState().profiles;
    await saveProfiles(updatedProfiles);
    setConfirmDelete(null);
  };

  const handleCreateProfile = () => {
    const trimmed = newProfileName.trim();
    if (!trimmed) return;
    if (profiles.includes(trimmed)) {
      setProfileError(t('profileAlreadyExists'));
      return;
    }
    addProfile(trimmed);
    setActiveProfile(trimmed);
    setNewProfileName('');
    setProfileError('');
    setShowNewProfile(false);
  };
  const { t } = useTranslation();

  return (
    <>
      <Tooltip label={t('settingsTitle')}>
        <button
          onClick={() => setOpen(true)}
          aria-label={t('openSettings')}
          className="p-1.5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
        >
          <Settings size={16} />
        </button>
      </Tooltip>

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
              <Tooltip label={t('closeSettings')}>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                  aria-label={t('closeSettings')}
                >
                  <X size={16} />
                </button>
              </Tooltip>
            </div>

            {/* Profile section */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-3">
                {t('sectionProfile')}
              </span>
              <div className="relative">
                <select
                  value={activeProfile}
                  onChange={(e) => setActiveProfile(e.target.value)}
                  className="w-full appearance-none px-3 py-2 pr-8 rounded-lg border text-xs font-medium transition-all
                    border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200
                    hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-500"
                >
                  {profiles.map((name) => (
                    <option key={name} value={name}>
                      {name === 'Default' ? t('defaultProfileName') : name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => { setShowNewProfile(true); setNewProfileName(''); setProfileError(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                    border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500
                    bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                >
                  <Plus size={13} />
                  {t('newProfileButton')}
                </button>
                {activeProfile !== 'Default' && (
                  <button
                    onClick={() => setConfirmDelete(activeProfile)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                      border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600
                      bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <Trash2 size={13} />
                    {t('deleteProfileButton')}
                  </button>
                )}
              </div>
            </div>

            {/* Delete profile confirmation */}
            {confirmDelete && (
              <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-3 flex flex-col gap-2">
                <span className="text-xs text-red-700 dark:text-red-300">
                  {t('deleteProfileConfirm').replace('{name}', confirmDelete)}
                </span>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="px-3 py-1 rounded-md text-xs font-medium
                      text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('newProfileCancel')}
                  </button>
                  <button
                    onClick={() => handleDeleteProfile(confirmDelete)}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-colors
                      bg-red-600 hover:bg-red-700 text-white"
                  >
                    {t('deleteProfileButton')}
                  </button>
                </div>
              </div>
            )}

            {/* New profile dialog */}
            {showNewProfile && (
              <div className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-3 flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {t('newProfileDialogTitle')}
                </span>
                <input
                  autoFocus
                  type="text"
                  value={newProfileName}
                  onChange={(e) => { setNewProfileName(e.target.value); setProfileError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateProfile(); if (e.key === 'Escape') setShowNewProfile(false); }}
                  placeholder={t('newProfilePlaceholder')}
                  className="w-full px-3 py-1.5 rounded-md border text-xs
                    border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800
                    text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                    focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-500"
                />
                {profileError && (
                  <span className="text-[11px] text-red-500 dark:text-red-400">{profileError}</span>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowNewProfile(false)}
                    className="px-3 py-1 rounded-md text-xs font-medium
                      text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('newProfileCancel')}
                  </button>
                  <button
                    onClick={handleCreateProfile}
                    disabled={!newProfileName.trim()}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-colors
                      bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {t('newProfileCreate')}
                  </button>
                </div>
              </div>
            )}

            {/* Theme section */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 block mb-3">
                {t('sectionColorTheme')}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {THEME_OPTIONS.map((opt) => {
                  const active = theme === opt.id;
                  return (
                    <Tooltip label={t(opt.labelKey)} key={opt.id}>
                    <button
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
                    </Tooltip>
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
                    <Tooltip label={label} key={id}>
                      <button
                        onClick={() => setLanguage(id)}
                        className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all
                          ${active
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-400 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
                          }`}
                      >
                        {label}
                      </button>
                    </Tooltip>
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
                <Tooltip label={t('importBibleButton')}>
                  <button
                    onClick={() => { console.log('[SettingsPanel] Import button clicked — closing settings, opening import modal'); setOpen(false); onOpenImport(); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors w-full
                      bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                  >
                    <Upload size={15} />
                    {t('importBibleButton')}
                  </button>
                </Tooltip>
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
