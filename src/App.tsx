import { useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { VerseDisplay } from './components/VerseDisplay';
import { StrongsPanel } from './components/StrongsPanel';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { FontControls } from './components/FontControls';
import { FONT_FAMILIES } from './components/FontControls';
import { useBibleStore, MAX_PANES } from './store/bibleStore';
import { usePersistStore } from './hooks/usePersistStore';

export function App() {
  // Load persisted state on mount; sync changes back to disk
  usePersistStore();

  const darkMode = useBibleStore((s) => s.darkMode);
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
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

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
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      <Sidebar />

      {/* Main column: header bar + search overlay + multi-pane reading area */}
      <div className="relative flex flex-col flex-1 overflow-hidden">
        {/* Top header bar — always visible, contains the search button/bar */}
        <div className="shrink-0">
          {/* When search is closed, render a minimal header strip with the search button */}
          {!searchOpen ? (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <SearchBar />
              <span className="text-xs text-gray-400 dark:text-gray-600 ml-1">Ctrl+F</span>
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
            className="shrink-0 w-10 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-2xl border-l border-gray-200 dark:border-gray-700"
          >
            +
          </button>
        )}
      </div>
      </div>

      {/* Strong's concordance panel — always visible; shows empty-state prompt until a word is clicked */}
      <StrongsPanel />
    </div>
  );
}
