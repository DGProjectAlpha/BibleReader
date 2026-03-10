import { useState, useCallback } from 'react';
import { RefreshCw, Download, Check, AlertCircle, Globe, Clock } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useBibleStore } from '../store/bibleStore';
import {
  checkForUpdates,
  downloadModule,
  formatBytes,
  type UpdateCheckResult,
  type RegistryModule,
  type DownloadProgress,
} from '../utils/moduleUpdates';
import { saveCustomBibleData, saveCustomTranslation } from '../utils/persistence';
import { validateBrbMod } from '../types/brbmod';
import type { CustomTranslationMeta } from '../store/bibleStore';
import type { BibleDataTagged } from '../types/brbmod';
import Tooltip from './Tooltip';

export function ModuleUpdateChecker() {
  const { t } = useTranslation();
  const addCustomTranslation = useBibleStore((s) => s.addCustomTranslation);

  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null); // abbreviation currently downloading
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const res = await checkForUpdates();
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  }, []);

  const handleDownload = useCallback(async (entry: RegistryModule) => {
    setDownloading(entry.abbreviation);
    setDownloadProgress({ phase: 'downloading' });

    try {
      const raw = await downloadModule(entry, setDownloadProgress);

      // Validate the downloaded module
      setDownloadProgress({ phase: 'validating' });
      const mod = validateBrbMod(raw);

      // Save to disk
      setDownloadProgress({ phase: 'saving' });
      await saveCustomBibleData(mod.meta.abbreviation, raw);

      const meta: CustomTranslationMeta = {
        abbreviation: mod.meta.abbreviation,
        fullName: mod.meta.name,
        language: mod.meta.language,
        fileName: `${mod.meta.abbreviation}.brbmod`,
        importedAt: Date.now(),
        ...(mod.meta.bookNames ? { bookNames: mod.meta.bookNames } : {}),
      };

      await saveCustomTranslation(meta);

      // Register in store
      if (mod.meta.format === 'tagged') {
        addCustomTranslation(meta, null, mod.data as BibleDataTagged);
      } else {
        addCustomTranslation(meta, mod.data as Record<string, Record<string, string[]>>, null);
      }

      setInstalled((prev) => new Set([...prev, entry.abbreviation]));
      setDownloadProgress({ phase: 'done' });
    } catch (err) {
      setDownloadProgress({
        phase: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDownloading(null);
    }
  }, [addCustomTranslation]);

  const hasUpdates = result && (result.newModules.length > 0 || result.updatedModules.length > 0);
  const checkedTime = result
    ? new Date(result.checkedAt).toLocaleTimeString()
    : null;

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Check for updates button */}
      <button
        onClick={handleCheck}
        disabled={checking}
        className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg
          border border-black/[0.07] dark:border-white/[0.07]
          bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30
          text-blue-700 dark:text-blue-300 text-sm font-medium
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
        {checking ? t('moduleCheckingUpdates') : t('moduleCheckForUpdates')}
      </button>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Last checked timestamp */}
      {checkedTime && !checking && (
        <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-600 px-1">
          <Clock size={10} />
          <span>{t('moduleLastChecked')}: {checkedTime}</span>
        </div>
      )}

      {/* No updates */}
      {result && !hasUpdates && (
        <div className="flex flex-col items-center gap-2 py-4 px-2 text-center">
          <Check size={20} className="text-green-500" />
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('moduleAllUpToDate')}</p>
        </div>
      )}

      {/* New modules available */}
      {result && result.newModules.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider px-1">
            {t('moduleNewAvailable')}
          </h4>
          {result.newModules.map((mod) => (
            <ModuleCard
              key={mod.abbreviation}
              module={mod}
              isNew
              isInstalled={installed.has(mod.abbreviation)}
              isDownloading={downloading === mod.abbreviation}
              progress={downloading === mod.abbreviation ? downloadProgress : null}
              onDownload={() => handleDownload(mod)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Updated modules */}
      {result && result.updatedModules.length > 0 && (
        <div className="flex flex-col gap-1">
          <h4 className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider px-1">
            {t('moduleUpdatesAvailable')}
          </h4>
          {result.updatedModules.map(({ remote, localVersion }) => (
            <ModuleCard
              key={remote.abbreviation}
              module={remote}
              localVersion={localVersion}
              isInstalled={installed.has(remote.abbreviation)}
              isDownloading={downloading === remote.abbreviation}
              progress={downloading === remote.abbreviation ? downloadProgress : null}
              onDownload={() => handleDownload(remote)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Up to date modules (collapsed summary) */}
      {result && result.upToDate.length > 0 && (
        <div className="px-1 pt-1">
          <p className="text-[10px] text-gray-400 dark:text-gray-600">
            {t('moduleUpToDateCount').replace('{count}', String(result.upToDate.length))}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Module card sub-component
// ---------------------------------------------------------------------------

interface ModuleCardProps {
  module: RegistryModule;
  isNew?: boolean;
  localVersion?: number;
  isInstalled: boolean;
  isDownloading: boolean;
  progress: DownloadProgress | null;
  onDownload: () => void;
  t: (key: string) => string;
}

function ModuleCard({
  module,
  isNew,
  localVersion,
  isInstalled,
  isDownloading,
  progress,
  onDownload,
  t,
}: ModuleCardProps) {
  const phaseLabel =
    progress?.phase === 'downloading' ? t('moduleDownloading') :
    progress?.phase === 'validating' ? t('moduleValidating') :
    progress?.phase === 'saving' ? t('moduleSaving') :
    progress?.phase === 'error' ? progress.error ?? t('moduleDownloadError') :
    null;

  return (
    <div className="rounded-lg border border-black/[0.07] dark:border-white/[0.07]
      bg-white/60 dark:bg-white/[0.04] p-3 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {module.abbreviation}
            </span>
            {isNew && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase
                bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                {t('moduleNewBadge')}
              </span>
            )}
            {localVersion !== undefined && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase
                bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                v{localVersion} → v{module.version}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate" title={module.name}>
            {module.name}
          </span>
          {module.description && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5 line-clamp-2">
              {module.description}
            </span>
          )}
          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 dark:text-gray-600">
            <span className="flex items-center gap-0.5">
              <Globe size={9} />
              {module.language.toUpperCase()}
            </span>
            <span>{formatBytes(module.sizeBytes)}</span>
            <span>v{module.version}</span>
          </div>
        </div>

        {/* Download / installed button */}
        <div className="shrink-0">
          {isInstalled ? (
            <span className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium
              text-green-600 dark:text-green-400">
              <Check size={12} />
              {t('moduleInstalled')}
            </span>
          ) : (
            <Tooltip label={isNew ? t('moduleDownloadNew') : t('moduleDownloadUpdate')}>
              <button
                onClick={onDownload}
                disabled={isDownloading}
                className="flex items-center gap-1 px-2 py-1.5 rounded text-[11px] font-medium
                  bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors"
              >
                <Download size={12} className={isDownloading ? 'animate-bounce' : ''} />
                {isDownloading ? t('moduleDownloading') : t('moduleDownloadButton')}
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Download progress */}
      {isDownloading && phaseLabel && (
        <p className="text-[10px] text-blue-600 dark:text-blue-400">{phaseLabel}</p>
      )}

      {/* Error display */}
      {progress?.phase === 'error' && (
        <p className="text-[10px] text-red-600 dark:text-red-400">{progress.error}</p>
      )}
    </div>
  );
}
