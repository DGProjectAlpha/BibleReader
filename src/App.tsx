import { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { VerseDisplay } from './components/VerseDisplay';
import { useBibleStore } from './store/bibleStore';

export function App() {
  const darkMode = useBibleStore((s) => s.darkMode);

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
      <VerseDisplay />
    </div>
  );
}
