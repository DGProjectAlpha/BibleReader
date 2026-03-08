import { useState } from 'react';
import { Trash2, BookOpen } from 'lucide-react';
import { useBibleStore } from '../store/bibleStore';
import { deleteCustomTranslation, deleteCustomBibleData } from '../utils/persistence';
import { useTranslation } from '../i18n/useTranslation';

export function ManageTranslationsPanel() {
  const customTranslations = useBibleStore((s) => s.customTranslations);
  const removeCustomTranslation = useBibleStore((s) => s.removeCustomTranslation);
  const panes = useBibleStore((s) => s.panes);
  const updatePane = useBibleStore((s) => s.updatePane);

  const { t } = useTranslation();
  const [deletingAbbr, setDeletingAbbr] = useState<string | null>(null);
  const [confirmAbbr, setConfirmAbbr] = useState<string | null>(null);

  async function handleDelete(abbreviation: string) {
    setDeletingAbbr(abbreviation);
    try {
      await deleteCustomTranslation(abbreviation);
      await deleteCustomBibleData(abbreviation);
    } catch (err) {
      // Running outside Tauri — persistence unavailable
      console.debug('[ManageTranslations] persistence unavailable:', err);
    }

    // If any pane is currently using this translation, fall back to KJV
    panes.forEach((pane) => {
      if (pane.selectedTranslation === abbreviation) {
        updatePane(pane.id, { selectedTranslation: 'KJV' });
      }
    });

    // Remove from Zustand store (also unregisters from bibleLoader)
    removeCustomTranslation(abbreviation);
    setConfirmAbbr(null);
    setDeletingAbbr(null);
  }

  if (customTranslations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
        <BookOpen size={28} className="text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400 dark:text-gray-500">
          {t('noImportedTranslations')}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          {t('useImportButton')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      {customTranslations.map((t) => {
        const isConfirming = confirmAbbr === t.abbreviation;
        const isDeleting = deletingAbbr === t.abbreviation;
        const importDate = new Date(t.importedAt).toLocaleDateString();

        return (
          <div
            key={t.abbreviation}
            className="rounded-lg border border-black/[0.07] dark:border-white/[0.07]
              bg-white/60 dark:bg-white/[0.04] p-3 flex flex-col gap-2"
          >
            {/* Translation info */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {t.abbreviation}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate" title={t.fullName}>
                  {t.fullName}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
                  {t.language.toUpperCase()} · Imported {importDate}
                </span>
              </div>

              {/* Delete / confirm buttons */}
              {!isConfirming ? (
                <button
                  onClick={() => setConfirmAbbr(t.abbreviation)}
                  disabled={isDeleting}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20
                    text-gray-400 hover:text-red-500 dark:hover:text-red-400
                    transition-colors shrink-0"
                  title="Remove translation"
                >
                  <Trash2 size={14} />
                </button>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDelete(t.abbreviation)}
                    disabled={isDeleting}
                    className="px-2 py-1 rounded text-[11px] font-medium
                      bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white transition-colors"
                  >
                    {isDeleting ? t('removingLabel') : t('deleteButton2')}
                  </button>
                  <button
                    onClick={() => setConfirmAbbr(null)}
                    disabled={isDeleting}
                    className="px-2 py-1 rounded text-[11px] font-medium
                      bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                      text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    {t('cancelButton')}
                  </button>
                </div>
              )}
            </div>

            {/* Confirm warning */}
            {isConfirming && (
              <p className="text-[11px] text-red-600 dark:text-red-400">
                {t('confirmRemoveTranslation')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
