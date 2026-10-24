import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ReadingProgress {
  lastPage: number;
  lastSurah: number;
  lastAyah: number;
  pagesRead: number;
  totalPagesRead: number;
  lastReadAt: string;
  setLastPage: (page: number) => void;
  setLastSurah: (surah: number, ayah?: number) => void;
  incrementPagesRead: () => void;
}

export const useProgressStore = create<ReadingProgress>()(
  persist(
    (set) => ({
      lastPage: 1,
      lastSurah: 1,
      lastAyah: 1,
      pagesRead: 0,
      totalPagesRead: 0,
      lastReadAt: new Date().toISOString(),
      setLastPage: (page) =>
        set({ lastPage: page, lastReadAt: new Date().toISOString() }),
      setLastSurah: (surah, ayah = 1) =>
        set({
          lastSurah: surah,
          lastAyah: ayah,
          lastReadAt: new Date().toISOString(),
        }),
      incrementPagesRead: () =>
        set((state) => ({
          pagesRead: state.pagesRead + 1,
          totalPagesRead: state.totalPagesRead + 1,
        })),
    }),
    {
      name: "quran-yatla-progress",
    }
  )
);
