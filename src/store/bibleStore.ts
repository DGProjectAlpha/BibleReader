import { create } from 'zustand';
import type { Translation } from '../data/bibleLoader';

export interface Pane {
  id: string;
  selectedBook: string;
  selectedChapter: number;
  selectedTranslation: Translation;
}

interface BibleStore {
  panes: Pane[];
  activePaneIndex: number;
  syncScroll: boolean;
  darkMode: boolean;

  // Pane management
  addPane: () => void;
  addPaneWithRef: (book: string, chapter: number, translation: Translation) => void;
  removePane: (id: string) => void;
  setActivePaneIndex: (index: number) => void;
  updatePane: (id: string, updates: Partial<Pick<Pane, 'selectedBook' | 'selectedChapter' | 'selectedTranslation'>>) => void;

  // Convenience setters that target the active pane
  setSelectedBook: (book: string) => void;
  setSelectedChapter: (chapter: number) => void;
  setSelectedTranslation: (translation: Translation) => void;

  toggleDarkMode: () => void;
  toggleSyncScroll: () => void;
}

const DEFAULT_PANE = (): Pane => ({
  id: crypto.randomUUID(),
  selectedBook: 'Genesis',
  selectedChapter: 1,
  selectedTranslation: 'KJV',
});

export const useBibleStore = create<BibleStore>((set, get) => ({
  panes: [DEFAULT_PANE()],
  activePaneIndex: 0,
  syncScroll: false,
  darkMode: false,

  addPane: () =>
    set((state) => ({
      panes: [...state.panes, DEFAULT_PANE()],
      activePaneIndex: state.panes.length,
    })),

  addPaneWithRef: (book, chapter, translation) =>
    set((state) => {
      const newPane: Pane = {
        id: crypto.randomUUID(),
        selectedBook: book,
        selectedChapter: chapter,
        selectedTranslation: translation,
      };
      return {
        panes: [...state.panes, newPane],
        activePaneIndex: state.panes.length,
      };
    }),

  removePane: (id) =>
    set((state) => {
      if (state.panes.length <= 1) return state; // always keep at least one pane
      const newPanes = state.panes.filter((p) => p.id !== id);
      const newActive = Math.min(state.activePaneIndex, newPanes.length - 1);
      return { panes: newPanes, activePaneIndex: newActive };
    }),

  setActivePaneIndex: (index) => set({ activePaneIndex: index }),

  updatePane: (id, updates) =>
    set((state) => {
      const { syncScroll } = state;
      // When synced, propagate book/chapter changes to all panes
      const syncFields: Partial<Pick<Pane, 'selectedBook' | 'selectedChapter'>> = {};
      if (syncScroll) {
        if (updates.selectedBook !== undefined) syncFields.selectedBook = updates.selectedBook;
        if (updates.selectedChapter !== undefined) syncFields.selectedChapter = updates.selectedChapter;
      }
      const hasSyncFields = Object.keys(syncFields).length > 0;
      return {
        panes: state.panes.map((p) => {
          if (p.id === id) return { ...p, ...updates };
          if (hasSyncFields) return { ...p, ...syncFields };
          return p;
        }),
      };
    }),

  // Convenience setters — operate on whichever pane is active
  setSelectedBook: (book) =>
    set((state) => {
      const { syncScroll } = state;
      const panes = state.panes.map((p, i) => {
        if (syncScroll) return { ...p, selectedBook: book, selectedChapter: 1 };
        return i === state.activePaneIndex ? { ...p, selectedBook: book, selectedChapter: 1 } : p;
      });
      return { panes };
    }),

  setSelectedChapter: (chapter) =>
    set((state) => {
      const { syncScroll } = state;
      const panes = state.panes.map((p, i) => {
        if (syncScroll) return { ...p, selectedChapter: chapter };
        return i === state.activePaneIndex ? { ...p, selectedChapter: chapter } : p;
      });
      return { panes };
    }),

  setSelectedTranslation: (translation) =>
    set((state) => {
      const panes = state.panes.map((p, i) =>
        i === state.activePaneIndex ? { ...p, selectedTranslation: translation } : p
      );
      return { panes };
    }),

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  toggleSyncScroll: () => set((state) => ({ syncScroll: !state.syncScroll })),
}));

// Selector helpers
export const selectActivePane = (state: BibleStore): Pane =>
  state.panes[state.activePaneIndex] ?? state.panes[0];
