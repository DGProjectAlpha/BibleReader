import { useEffect, useLayoutEffect, useCallback, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { VerseDisplay } from './components/VerseDisplay';
import { StrongsPanel } from './components/StrongsPanel';
import { TskPanel } from './components/TskPanel';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { FontControls } from './components/FontControls';
import { FONT_FAMILIES } from './components/FontControls';
import { ImportModal } from './components/ImportModal';
import { useBibleStore, MAX_PANES } from './store/bibleStore';
import type { CustomTranslationMeta } from './store/bibleStore';
import { usePersistStore } from './hooks/usePersistStore';
import type { BibleData } from './data/bibleLoader';
import type { ValidationResult } from './utils/bibleImport';
import type { BibleDataTagged } from './types/brbmod';
import { saveCustomBibleData, saveCustomTranslation } from './utils/persistence';

export function App() {
  // Load persisted state on mount; sync changes back to disk
  usePersistStore();

  const [importOpen, setImportOpen] = useState(false);
  const addCustomTranslation = useBibleStore((s) => s.addCustomTranslation);

  /**
   * Called by ImportModal when the user confirms an import.
   * 1. Builds CustomTranslationMeta with a fresh UUID.
   * 2. Saves the bible verse data to the Tauri store.
   * 3. Saves metadata to the Tauri store.
   * 4. Registers the translation in bibleLoader so panes can load it immediately.
   * 5. Pushes metadata into the Zustand store (updates the UI translation list).
   */
  const handleImport = useCallback(async (
    result: ValidationResult,
    userMeta: {
      abbreviation: string;
      fullName: string;
      language: string;
      fileName: string;
      moduleFormat?: 'plain' | 'tagged';
      taggedData?: BibleDataTagged;
    }
  ) => {
    const id = crypto.randomUUID();
    const meta: CustomTranslationMeta = {
      id,
      abbreviation: userMeta.abbreviation,
      fullName: userMeta.fullName,
      language: userMeta.language,
      fileName: userMeta.fileName,
      importedAt: Date.now(),
    };

    // Determine the payload to persist: tagged modules supply pre-parsed tagged data;
    // plain modules and raw JSON imports use the validated string verse data.
    const isTagged = userMeta.moduleFormat === 'tagged' && userMeta.taggedData != null;
    const biblePayload = isTagged ? userMeta.taggedData : result.data;

    // Wrap in a full BrbMod envelope so scanAndLoadModules() can read it back on startup.
    // Saving bare data (without meta) causes validateBrbMod to fail and silently skip the module.
    const moduleEnvelope = {
      meta: {
        name: meta.fullName,
        abbreviation: meta.abbreviation,
        language: meta.language,
        format: isTagged ? 'tagged' : 'plain',
        version: 1,
      },
      data: biblePayload,
    };

    console.log('[handleImport] starting import:', {
      abbreviation: meta.abbreviation,
      fullName: meta.fullName,
      language: meta.language,
      isTagged,
      dataKeys: isTagged
        ? `tagged array length=${Array.isArray(biblePayload) ? (biblePayload as unknown[]).length : 'N/A'}`
        : `plain keys=${Object.keys(biblePayload as object ?? {}).slice(0, 5).join(', ')}...`,
    });

    try {
      // Persist verse data to AppData/modules/{abbreviation}.brbmod
      await saveCustomBibleData(meta.abbreviation, moduleEnvelope);
      console.log(`[handleImport] saveCustomBibleData OK — ${meta.abbreviation}.brbmod written`);
      await saveCustomTranslation(meta);
      console.log('[handleImport] saveCustomTranslation OK');
    } catch (err) {
      // Running outside Tauri (browser dev) — persistence unavailable; still register in memory
      console.warn('[handleImport] persistence unavailable:', err);
    }

    // Register in bibleLoader + update Zustand in one atomic store action.
    // The store action is the single indexing point — it calls registerCustomTranslation /
    // registerTaggedTranslation internally and prevents duplicate entries.
    if (isTagged) {
      console.log('[handleImport] registering tagged translation via store:', meta.abbreviation);
      addCustomTranslation(meta, null, userMeta.taggedData as BibleDataTagged);
    } else {
      const plainData = result.data as BibleData;
      console.log('[handleImport] registering plain translation via store:', meta.abbreviation, '— books:', Object.keys(plainData).length);
      addCustomTranslation(meta, plainData, null);
    }

    setImportOpen(false);
  }, [addCustomTranslation]);

  const darkMode = useBibleStore((s) => s.darkMode);
  const theme = useBibleStore((s) => s.theme);
  const fontSize = useBibleStore((s) => s.fontSize);
  const fontFamily = useBibleStore((s) => s.fontFamily);
  const panes = useBibleStore((s) => s.panes);
  const activePaneIndex = useBibleStore((s) => s.activePaneIndex);
  const addPane = useBibleStore((s) => s.addPane);
  const removePane = useBibleStore((s) => s.removePane);
  const setActivePaneIndex = useBibleStore((s) => s.setActivePaneIndex);
  const setSearchOpen = useBibleStore((s) => s.setSearchOpen);
  const searchOpen = useBibleStore((s) => s.searchOpen);

  // Sync dark mode to <html> class for Tailwind's dark: variant
  // and data-theme attribute for CSS variable theming.
  // useLayoutEffect fires synchronously before paint so the .dark class and
  // data-theme are both set before the browser renders — prevents a frame where
  // CSS-variable-driven backgrounds (data-theme) go dark while Tailwind dark:
  // text/border classes are still in light mode (they need .dark on <html>).
  useLayoutEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [darkMode, theme]);

  // Sync font prefs to CSS custom properties on <html>
  useEffect(() => {
    const css = FONT_FAMILIES.find((f) => f.id === fontFamily)?.css ?? FONT_FAMILIES[0].css;
    document.documentElement.style.setProperty('--bible-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--bible-font-family', css);
  }, [fontSize, fontFamily]);

  // Ctrl+F / Cmd+F opens search
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      setSearchOpen(true);
    }
    if (e.key === 'Escape' && searchOpen) {
      setSearchOpen(false);
    }
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onOpenImport={() => setImportOpen(true)} />

      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      )}

      {/* Main column: header bar + search overlay + multi-pane reading area */}
      <div className="relative flex flex-col flex-1 overflow-hidden">
        {/* Top header bar — always visible, contains the search button/bar */}
        <div className="relative z-10 shrink-0">
          {/* When search is closed, render a minimal header strip with the search button */}
          {!searchOpen ? (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-black/[0.10] dark:border-white/[0.10] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
              <SearchBar />
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">Ctrl+F</span>
              <div className="ml-auto">
                <FontControls />
              </div>
            </div>
          ) : (
            <SearchBar />
          )}
        </div>

        {/* Search results — renders between header and panes when open */}
        <SearchResults />

      {/* Multi-pane reading area */}
      <div className="flex flex-1 overflow-hidden">
        {panes.map((pane, index) => (
          <VerseDisplay
            key={pane.id}
            paneId={pane.id}
            isActive={index === activePaneIndex}
            onActivate={() => setActivePaneIndex(index)}
            onRemove={() => removePane(pane.id)}
            canRemove={panes.length > 1}
          />
        ))}

        {/* Add pane button — hidden at max panes */}
        {panes.length < MAX_PANES && (
          <button
            onClick={addPane}
            title="Add pane"
            className="shrink-0 w-10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-500 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors text-2xl border-l border-black/[0.10] dark:border-white/[0.12]"
          >
            +
          </button>
        )}
      </div>
      </div>

      {/* Strong's concordance panel — always visible; shows empty-state prompt until a word is clicked */}
      <StrongsPanel />

      {/* TSK cross-reference panel — always visible; shows empty-state prompt until a verse number is clicked */}
      <TskPanel />
    </div>
  );
}
