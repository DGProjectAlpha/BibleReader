import { useEffect, useLayoutEffect } from 'react';
import { VerseDisplay } from './components/VerseDisplay';
import { StrongsPanel } from './components/StrongsPanel';
import { useBibleStore } from './store/bibleStore';
import { FONT_FAMILIES } from './components/FontControls';
import { usePersistStore } from './hooks/usePersistStore';
import { useSyncBridge } from './hooks/useSyncBridge';
import type { Translation } from './data/bibleLoader';

/**
 * PopoutApp — renders when the window is opened via the pop-out button.
 * Reads book/chapter/translation/theme from URL search params and initialises
 * a single-pane view with StrongsPanel. No sidebar, no search, no TSK panel.
 */
export function PopoutApp() {
  // Wire persistence so theme/fonts/notes/highlights and modulesReady are loaded.
  usePersistStore();
  // Bridge navigation and theme changes to/from the main window via Tauri events
  useSyncBridge();

  const params = new URLSearchParams(window.location.search);
  const initBook        = params.get('book')        ?? 'Genesis';
  const initChapter     = parseInt(params.get('chapter') ?? '1', 10);
  const initTranslation = (params.get('translation') ?? 'KJV') as Translation;
  // If the source pane was synced, keep it synced in the pop-out so cross-window sync works
  const initSynced   = params.get('synced') === 'true';
  // Theme override from URL (passed by parent window so the popout matches immediately)
  const initTheme    = params.get('theme');
  const initDarkMode = params.get('darkMode');

  const panes           = useBibleStore((s) => s.panes);
  const updatePane      = useBibleStore((s) => s.updatePane);
  const modulesReady    = useBibleStore((s) => s.modulesReady);
  const darkMode        = useBibleStore((s) => s.darkMode);
  const theme           = useBibleStore((s) => s.theme);
  const fontSize        = useBibleStore((s) => s.fontSize);
  const fontFamily      = useBibleStore((s) => s.fontFamily);

  // Apply theme passed via URL params immediately (before usePersistStore hydrates)
  // so there is no flash of wrong theme on open.
  useLayoutEffect(() => {
    if (initTheme) {
      document.documentElement.setAttribute('data-theme', initTheme);
      if (initDarkMode === 'true') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []); // once on mount

  // Keep theme in sync with the Zustand store (updated by usePersistStore hydration)
  useLayoutEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [darkMode, theme]);

  // Sync font prefs
  useEffect(() => {
    const css = FONT_FAMILIES.find((f) => f.id === fontFamily)?.css ?? FONT_FAMILIES[0].css;
    document.documentElement.style.setProperty('--bible-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--bible-font-family', css);
  }, [fontSize, fontFamily]);

  // Once the store is ready, navigate the first pane to the URL-specified location.
  // modulesReady ensures custom translations have been registered before VerseDisplay
  // tries to load — no separate effect needed since VerseDisplay already gates on it.
  useEffect(() => {
    if (!modulesReady || panes.length === 0) return;
    const store = useBibleStore.getState();
    // Set synced flag directly so useSyncBridge can start bridging immediately
    if (initSynced) {
      store.togglePaneSync(panes[0].id);
    }
    updatePane(panes[0].id, {
      selectedBook: initBook,
      selectedChapter: initChapter,
      selectedTranslation: initTranslation,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulesReady]); // Only re-run when modules become ready

  if (panes.length === 0) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <VerseDisplay
        paneId={panes[0].id}
        isActive={true}
        onActivate={() => {}}
        onRemove={() => {}}
        canRemove={false}
        isPopout={true}
      />
      <StrongsPanel />
    </div>
  );
}
