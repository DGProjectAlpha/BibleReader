import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { VerseDisplay } from './components/VerseDisplay';
import { useBibleStore } from './store/bibleStore';

export function App() {
  const darkMode = useBibleStore((s) => s.darkMode);
  const panes = useBibleStore((s) => s.panes);
  const activePaneIndex = useBibleStore((s) => s.activePaneIndex);
  const addPane = useBibleStore((s) => s.addPane);
  const removePane = useBibleStore((s) => s.removePane);
  const setActivePaneIndex = useBibleStore((s) => s.setActivePaneIndex);

  // Sync dark mode to <html> class for Tailwind's dark: variant
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      <Sidebar />

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

        {/* Add pane button */}
        <button
          onClick={addPane}
          title="Add pane"
          className="shrink-0 w-10 flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-2xl border-l border-gray-200 dark:border-gray-700"
        >
          +
        </button>
      </div>
    </div>
  );
}
