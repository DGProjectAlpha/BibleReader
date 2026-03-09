import { useLayoutEffect, useEffect } from 'react';
import { ExportNotesModal } from './components/ExportNotesModal';
import { useBibleStore } from './store/bibleStore';
import { FONT_FAMILIES } from './components/FontControls';
import { usePersistStore } from './hooks/usePersistStore';

/**
 * ExportApp — renders when the window is opened via the export button in NotesPanel.
 * Displays ExportNotesModal full-screen in a dedicated Tauri WebviewWindow.
 * Closes the window when the modal is dismissed.
 */
export function ExportApp() {
  // Wire persistence so notes/highlights and theme are loaded from disk
  usePersistStore();

  const params = new URLSearchParams(window.location.search);
  const initTheme    = params.get('theme');
  const initDarkMode = params.get('darkMode');

  const darkMode   = useBibleStore((s) => s.darkMode);
  const theme      = useBibleStore((s) => s.theme);
  const fontSize   = useBibleStore((s) => s.fontSize);
  const fontFamily = useBibleStore((s) => s.fontFamily);

  // Apply theme from URL params immediately before paint to avoid flash
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

  // Keep theme in sync with Zustand store after hydration
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

  async function handleClose() {
    try {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      await getCurrentWebviewWindow().close();
    } catch {
      // fallback for browser dev mode — just do nothing
    }
  }

  return (
    <ExportNotesModal onClose={handleClose} standalone />
  );
}
