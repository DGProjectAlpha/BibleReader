import { create } from 'zustand';
import type { Translation, Verse } from '../data/bibleLoader';

interface BibleStore {
  selectedBook: string;
  selectedChapter: number;
  selectedTranslation: Translation;
  darkMode: boolean;
  // Loaded verse data for the current book/chapter/translation
  verses: Verse[];
  isLoading: boolean;
  loadError: string | null;
  setSelectedBook: (book: string) => void;
  setSelectedChapter: (chapter: number) => void;
  setSelectedTranslation: (translation: Translation) => void;
  toggleDarkMode: () => void;
  setVerses: (verses: Verse[]) => void;
  setIsLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
}

export const useBibleStore = create<BibleStore>((set) => ({
  selectedBook: 'Genesis',
  selectedChapter: 1,
  selectedTranslation: 'KJV',
  darkMode: false,
  verses: [],
  isLoading: false,
  loadError: null,
  setSelectedBook: (book) => set({ selectedBook: book, selectedChapter: 1, verses: [] }),
  setSelectedChapter: (chapter) => set({ selectedChapter: chapter, verses: [] }),
  setSelectedTranslation: (translation) => set({ selectedTranslation: translation, verses: [] }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setVerses: (verses) => set({ verses }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setLoadError: (loadError) => set({ loadError }),
}));
