import { useState, useEffect } from 'react';
import { X, FolderOpen, CheckCircle, XCircle, Loader, Globe, AlertTriangle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { validateBibleJson, previewFromApiBible, fetchFromApiBible } from '../utils/bibleImport';
import type { ValidationResult } from '../utils/bibleImport';
import { validateBrbMod } from '../types/brbmod';
import type { BibleDataTagged } from '../types/brbmod';
import { ErrorBoundary } from './ErrorBoundary';
import { useTranslation } from '../i18n/useTranslation';
import type { TranslationKey } from '../i18n/translations';

/** Defer a synchronous callback behind one event-loop tick so React can paint loading states first. */
function defer<T>(fn: () => T): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => { try { resolve(fn()); } catch (e) { reject(e); } }, 0)
  );
}

const LARGE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

interface ImportModalProps {
  onClose: () => void;
  onImport: (result: ValidationResult, meta: {
    abbreviation: string;
    fullName: string;
    language: string;
    fileName: string;
    moduleFormat?: 'plain' | 'tagged';
    taggedData?: BibleDataTagged;
  }) => void;
}

type FilePhase = 'idle' | 'loading' | 'valid' | 'invalid';
type ApiPhase = 'idle' | 'previewing' | 'preview-ok' | 'preview-err' | 'importing' | 'import-done' | 'import-err';

// ── shared metadata form ──────────────────────────────────────────────────────
function MetaForm({
  abbreviation, setAbbreviation,
  fullName, setFullName,
  language, setLanguage,
  t,
}: {
  abbreviation: string; setAbbreviation: (v: string) => void;
  fullName: string; setFullName: (v: string) => void;
  language: string; setLanguage: (v: string) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}) {
  const inputCls = `px-3 py-1.5 rounded-lg border text-sm
    bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500
    text-gray-800 dark:text-gray-100
    focus:outline-none focus:ring-2 focus:ring-blue-500`;
  const labelCls = 'text-xs font-medium text-gray-600 dark:text-gray-400';

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 dark:border-gray-600 pt-4">
      <div className="flex flex-col gap-1">
        <label className={labelCls}>{t('labelAbbreviation')} <span className="text-gray-400">(e.g. NASB)</span></label>
        <input type="text" value={abbreviation}
          onChange={(e) => setAbbreviation(e.target.value.toUpperCase().slice(0, 12))}
          placeholder="NASB" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>{t('labelFullName')}</label>
        <input type="text" value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="New American Standard Bible" className={inputCls} />
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>{t('labelLanguage')} <span className="text-gray-400">(BCP-47, e.g. en, es, ru)</span></label>
        <input type="text" value={language}
          onChange={(e) => setLanguage(e.target.value.slice(0, 10))}
          placeholder="en" className={`${inputCls} w-32`} />
      </div>
    </div>
  );
}

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    console.log('[ImportModal] mounted — modal is now visible');
    return () => console.log('[ImportModal] unmounted');
  }, []);

  const [tab, setTab] = useState<'file' | 'api'>('file');

  // ── File tab state ────────────────────────────────────────────────────────
  const [filePhase, setFilePhase] = useState<FilePhase>('idle');
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [fileResult, setFileResult] = useState<ValidationResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileAbbr, setFileAbbr] = useState('');
  const [fileFullName, setFileFullName] = useState('');
  const [fileLang, setFileLang] = useState('en');
  const [fileIsModule, setFileIsModule] = useState(false);
  const [fileModuleFormat, setFileModuleFormat] = useState<'plain' | 'tagged' | null>(null);
  const [fileTaggedData, setFileTaggedData] = useState<BibleDataTagged | null>(null);
  const [fileLarge, setFileLarge] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');

  // ── api.bible tab state ───────────────────────────────────────────────────
  const [apiKey, setApiKey] = useState('');
  const [bibleId, setBibleId] = useState('');
  const [apiPhase, setApiPhase] = useState<ApiPhase>('idle');
  const [apiError, setApiError] = useState('');
  const [previewVerses, setPreviewVerses] = useState<string[]>([]);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [apiAbbr, setApiAbbr] = useState('');
  const [apiFullName, setApiFullName] = useState('');
  const [apiLang, setApiLang] = useState('en');

  // ── File tab handlers ─────────────────────────────────────────────────────
  async function handlePickFile() {
    console.log('[ImportModal] handlePickFile — invoking Tauri dialog open()');
    let selected: string | null;
    try {
      const result = await open({
        multiple: false,
        filters: [
          { name: 'BibleReader Module', extensions: ['brbmod'] },
          { name: 'JSON Bible', extensions: ['json'] },
        ],
      });
      selected = typeof result === 'string' ? result : null;
      console.log('[ImportModal] dialog open() resolved — selected:', selected);
    } catch (err) {
      console.error('[ImportModal] dialog open() threw:', err);
      setFilePhase('invalid');
      setFileErrors([`Could not open file picker: ${err instanceof Error ? err.message : String(err)}`]);
      return;
    }
    if (!selected) return;

    setFilePhase('loading');
    setFileErrors([]);
    setFileResult(null);
    setFileLarge(false);
    setFileIsModule(false);
    setFileModuleFormat(null);
    setFileTaggedData(null);
    setLoadingStep('Reading file…');

    try {
      const raw = await readTextFile(selected);
      const name = selected.split(/[\\/]/).pop() ?? selected;
      setFileName(name);
      console.log(`[ImportModal] file read OK: "${name}" — ${raw.length} bytes`);

      // Flag large files (>5 MB of text) so the UI can warn the user
      if (raw.length > LARGE_FILE_BYTES) {
        setFileLarge(true);
        console.log(`[ImportModal] large file detected (${(raw.length / 1024 / 1024).toFixed(1)} MB)`);
      }

      // Defer heavy sync work so the loading spinner is visible before we block
      setLoadingStep('Parsing JSON…');
      let parsed: unknown;
      try {
        parsed = await defer(() => JSON.parse(raw));
        console.log(`[ImportModal] JSON.parse OK — type=${Array.isArray(parsed) ? 'array' : typeof parsed}`);
      } catch (e) {
        setFilePhase('invalid');
        setFileErrors([`File is not valid JSON: ${e instanceof Error ? e.message : String(e)}`]);
        setLoadingStep('');
        return;
      }

      // Detect .brbmod format: has top-level { meta, data } structure
      let biblePayload: unknown = parsed;
      let metaAutoFilled = false;
      let detectedFormat: 'plain' | 'tagged' | null = null;
      if (
        typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) &&
        'meta' in parsed && 'data' in parsed
      ) {
        const mod = parsed as { meta: Record<string, unknown>; data: unknown };
        biblePayload = mod.data;
        setFileIsModule(true);
        metaAutoFilled = true;
        detectedFormat = mod.meta.format === 'tagged' ? 'tagged' : 'plain';
        console.log(`[ImportModal] .brbmod detected — format=${detectedFormat} abbr=${mod.meta.abbreviation}`);
        setFileModuleFormat(detectedFormat);
        // Auto-populate meta fields from the module header
        if (typeof mod.meta.abbreviation === 'string') {
          setFileAbbr(mod.meta.abbreviation.toUpperCase().slice(0, 12));
        }
        if (typeof mod.meta.name === 'string') {
          setFileFullName(mod.meta.name);
        }
        if (typeof mod.meta.language === 'string') {
          setFileLang(mod.meta.language.slice(0, 10));
        }
      } else {
        console.log('[ImportModal] plain JSON bible detected (no .brbmod envelope)');
        setFileIsModule(false);
        setFileModuleFormat(null);
        setFileTaggedData(null);
      }

      setLoadingStep('Validating schema…');

      // Tagged modules store BibleBookTagged[] — an array, not the plain object format.
      // Skip validateBibleJson and use validateBrbMod for structural validation instead.
      if (detectedFormat === 'tagged') {
        try {
          const validated = await defer(() => validateBrbMod(parsed as unknown));
          setLoadingStep('');
          setFileLarge(false);
          const taggedData = validated.data as BibleDataTagged;
          console.log(`[ImportModal] tagged module validated OK — ${taggedData.length} books`);
          setFileTaggedData(taggedData);
          // Placeholder ValidationResult for tagged modules. The actual bible data lives in
          // fileTaggedData (set above). handleImport checks `userMeta.moduleFormat === 'tagged'`
          // before touching result.data, so this empty object is intentionally never read.
          // If you add a code path that reads result.data in the tagged branch, this will break.
          setFileResult({ valid: true, data: {} });
          setFilePhase('valid');
        } catch (e) {
          console.error('[ImportModal] tagged module validation failed:', e);
          setLoadingStep('');
          setFileLarge(false);
          setFilePhase('invalid');
          setFileErrors([`Module validation failed: ${e instanceof Error ? e.message : String(e)}`]);
        }
      } else {
        const result = await defer(() => validateBibleJson(biblePayload));
        setLoadingStep('');
        setFileLarge(false);

        if (result.valid) {
          console.log(`[ImportModal] plain bible validated OK — ${Object.keys(result.data).length} books`);
          setFileResult(result);
          setFilePhase('valid');
          // Only fall back to stem-based abbreviation if not auto-filled from module meta
          if (!metaAutoFilled) {
            const stem = name.replace(/\.(json|brbmod)$/i, '').toUpperCase().slice(0, 8);
            setFileAbbr(stem);
          }
        } else {
          setFilePhase('invalid');
          setFileErrors(result.errors);
        }
      }
    } catch (e) {
      setFilePhase('invalid');
      setLoadingStep('');
      setFileLarge(false);
      setFileErrors([`Failed to read file: ${e instanceof Error ? e.message : String(e)}`]);
    }
  }

  const BUILTIN_ABBRS = ['KJV', 'ASV', 'SYN'];

  function handleFileImport() {
    if (!fileResult) return;
    const trimAbbr = fileAbbr.trim();
    const trimFull = fileFullName.trim();
    const trimLang = fileLang.trim();
    if (!trimAbbr || !trimFull || !trimLang) return;
    if (BUILTIN_ABBRS.includes(trimAbbr.toUpperCase())) {
      setFileErrors([`"${trimAbbr.toUpperCase()}" is a built-in translation and cannot be overwritten. Choose a different abbreviation.`]);
      return;
    }
    onImport(fileResult, {
      abbreviation: trimAbbr,
      fullName: trimFull,
      language: trimLang,
      fileName,
      moduleFormat: fileModuleFormat ?? undefined,
      taggedData: fileTaggedData ?? undefined,
    });
  }

  const canFileImport =
    filePhase === 'valid' &&
    fileAbbr.trim().length > 0 &&
    fileFullName.trim().length > 0 &&
    fileLang.trim().length > 0;

  // ── api.bible tab handlers ────────────────────────────────────────────────
  async function handlePreview() {
    const key = apiKey.trim();
    const id = bibleId.trim();
    if (!key || !id) return;

    setApiPhase('previewing');
    setApiError('');
    setPreviewVerses([]);

    const { verses, error } = await previewFromApiBible(key, id);
    if (error) {
      setApiPhase('preview-err');
      setApiError(error);
    } else {
      setPreviewVerses(verses);
      setApiPhase('preview-ok');
    }
  }

  async function handleApiImport() {
    const key = apiKey.trim();
    const id = bibleId.trim();
    const trimAbbr = apiAbbr.trim();
    const trimFull = apiFullName.trim();
    const trimLang = apiLang.trim();
    if (!key || !id || !trimAbbr || !trimFull || !trimLang) return;
    if (BUILTIN_ABBRS.includes(trimAbbr.toUpperCase())) {
      setApiError(`"${trimAbbr.toUpperCase()}" is a built-in translation and cannot be overwritten. Choose a different abbreviation.`);
      return;
    }

    setApiPhase('importing');
    setProgressLog([]);
    setApiError('');

    const result = await fetchFromApiBible(key, id, (msg) => {
      setProgressLog((prev) => [...prev.slice(-49), msg]); // keep last 50 lines
    });

    if (result.valid) {
      setApiPhase('import-done');
      onImport(result, {
        abbreviation: trimAbbr,
        fullName: trimFull,
        language: trimLang,
        fileName: `${trimAbbr.toLowerCase()}-apibible.json`,
      });
    } else {
      setApiPhase('import-err');
      setApiError(result.errors.join('\n'));
    }
  }

  const canApiImport =
    apiPhase === 'preview-ok' &&
    apiAbbr.trim().length > 0 &&
    apiFullName.trim().length > 0 &&
    apiLang.trim().length > 0;

  const apiImporting = apiPhase === 'importing';

  // ── Shared footer action ──────────────────────────────────────────────────
  function handlePrimaryAction() {
    if (tab === 'file') handleFileImport();
    else handleApiImport();
  }

  const primaryDisabled =
    tab === 'file' ? !canFileImport : (!canApiImport || apiImporting);

  const primaryLabel =
    tab === 'file'
      ? t('importTranslationButton')
      : apiImporting
        ? t('importingButton')
        : t('importFullBibleButton');

  // ── Render ────────────────────────────────────────────────────────────────
  const tabCls = (active: boolean) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
    }`;

  const inputCls = `px-3 py-1.5 rounded-lg border text-sm
    bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500
    text-gray-800 dark:text-gray-100
    focus:outline-none focus:ring-2 focus:ring-blue-500`;

  return (
    <ErrorBoundary label="Import dialog">
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg mx-4 rounded-xl shadow-2xl border
        bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600
        flex flex-col overflow-hidden max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-600 shrink-0">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            {t('importModalHeader')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-600 shrink-0 px-2">
          <button className={tabCls(tab === 'file')} onClick={() => setTab('file')}>
            <span className="flex items-center gap-1.5"><FolderOpen size={13} /> {t('tabLocalFile')}</span>
          </button>
          <button className={tabCls(tab === 'api')} onClick={() => setTab('api')}>
            <span className="flex items-center gap-1.5"><Globe size={13} /> {t('tabApiBible')}</span>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">

          {/* ── LOCAL FILE TAB ── */}
          {tab === 'file' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('localFileInstructions')}
              </p>
              <button
                onClick={handlePickFile}
                disabled={filePhase === 'loading'}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors
                  bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                  text-white border-transparent self-start"
              >
                {filePhase === 'loading'
                  ? <Loader size={14} className="animate-spin" />
                  : <FolderOpen size={14} />}
                {filePhase === 'loading' ? (loadingStep || t('loadingFile')) : t('chooseFile')}
              </button>

              {/* Large file warning — shown while loading a big file */}
              {filePhase === 'loading' && fileLarge && (
                <div className="flex items-center gap-2 p-2 rounded-lg
                  bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700"
                >
                  <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    {t('largeFileWarning')}
                  </p>
                </div>
              )}

              {filePhase === 'valid' && (
                <div className="flex items-start gap-2 p-3 rounded-lg
                  bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700"
                >
                  <CheckCircle size={16} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                  <div className="text-sm text-green-800 dark:text-green-300">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{fileName}</span>
                      {fileIsModule && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded
                          bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300
                          border border-blue-300 dark:border-blue-600">
                          .brbmod
                        </span>
                      )}
                    </div>
                    {fileIsModule
                      ? t('moduleLoaded')
                      : t('schemaValid')}
                  </div>
                </div>
              )}

              {filePhase === 'invalid' && fileErrors.length > 0 && (
                <div className="flex flex-col gap-2 p-3 rounded-lg
                  bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700"
                >
                  <div className="flex items-center gap-2">
                    <XCircle size={16} className="text-red-600 dark:text-red-400 shrink-0" />
                    <span className="text-sm font-medium text-red-800 dark:text-red-300">
                      {t('validationFailed', { count: fileErrors.length })}
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-red-700 dark:text-red-300 space-y-1 max-h-36 overflow-y-auto">
                    {fileErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {filePhase === 'valid' && (
                <MetaForm
                  abbreviation={fileAbbr} setAbbreviation={setFileAbbr}
                  fullName={fileFullName} setFullName={setFileFullName}
                  language={fileLang} setLanguage={setFileLang}
                  t={t}
                />
              )}
            </>
          )}

          {/* ── API.BIBLE TAB ── */}
          {tab === 'api' && (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('apiBibleInstructions')}{' '}
                {t('apiBibleKeyInstructions')}
              </p>

              {/* Credentials */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {t('labelApiKey')}
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t('placeholderApiKey')}
                    className={inputCls}
                    disabled={apiImporting}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {t('labelBibleId')}{' '}
                    <span className="text-gray-400 font-normal">(e.g. de4e12af7f28f599-02 for KJV)</span>
                  </label>
                  <input
                    type="text"
                    value={bibleId}
                    onChange={(e) => setBibleId(e.target.value.trim())}
                    placeholder="de4e12af7f28f599-02"
                    className={inputCls}
                    disabled={apiImporting}
                  />
                </div>

                <button
                  onClick={handlePreview}
                  disabled={!apiKey.trim() || !bibleId.trim() || apiPhase === 'previewing' || apiImporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors self-start
                    bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white"
                >
                  {apiPhase === 'previewing'
                    ? <Loader size={14} className="animate-spin" />
                    : <Globe size={14} />}
                  {apiPhase === 'previewing' ? t('fetchingPreview') : t('previewGenesis')}
                </button>
              </div>

              {/* Preview error */}
              {apiPhase === 'preview-err' && (
                <div className="flex items-start gap-2 p-3 rounded-lg
                  bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700"
                >
                  <XCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300 break-all">{apiError}</p>
                </div>
              )}

              {/* Preview success */}
              {(apiPhase === 'preview-ok' || apiPhase === 'importing' || apiPhase === 'import-done') && previewVerses.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600 dark:text-green-400 shrink-0" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                      {t('connectionOk')}
                    </span>
                  </div>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-600
                    bg-gray-50 dark:bg-gray-900/40 p-3 text-xs text-gray-700 dark:text-gray-300
                    space-y-1 max-h-36 overflow-y-auto"
                  >
                    {previewVerses.slice(0, 5).map((v, i) => (
                      <p key={i}><span className="font-medium text-gray-400 mr-1">{i + 1}</span>{v}</p>
                    ))}
                    {previewVerses.length > 5 && (
                      <p className="text-gray-400 italic">{t('moreVerses', { count: previewVerses.length - 5 })}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata form — shown once preview succeeds */}
              {(apiPhase === 'preview-ok' || apiPhase === 'importing' || apiPhase === 'import-done') && (
                <MetaForm
                  abbreviation={apiAbbr} setAbbreviation={setApiAbbr}
                  fullName={apiFullName} setFullName={setApiFullName}
                  language={apiLang} setLanguage={setApiLang}
                  t={t}
                />
              )}

              {/* Import progress log */}
              {(apiPhase === 'importing' || apiPhase === 'import-done' || apiPhase === 'import-err') && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('sectionProgress')}</span>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-600
                    bg-gray-50 dark:bg-gray-900/40 p-3 text-xs text-gray-600 dark:text-gray-400
                    space-y-0.5 max-h-36 overflow-y-auto font-mono"
                  >
                    {progressLog.length === 0
                      ? <span className="text-gray-400">{t('progressStarting')}</span>
                      : progressLog.map((line, i) => <p key={i}>{line}</p>)
                    }
                  </div>
                </div>
              )}

              {/* Import error */}
              {apiPhase === 'import-err' && (
                <div className="flex items-start gap-2 p-3 rounded-lg
                  bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700"
                >
                  <XCircle size={16} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap">{apiError}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-600 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors
              bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
              border-gray-300 dark:border-gray-500
              hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            {t('cancelButton')}
          </button>
          <button
            onClick={handlePrimaryAction}
            disabled={primaryDisabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white"
          >
            {apiImporting && tab === 'api' && <Loader size={14} className="animate-spin" />}
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
