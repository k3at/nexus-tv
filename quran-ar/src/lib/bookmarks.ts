export type Bookmark =
  | {
      id: string;
      type: "verse";
      verseKey: string;
      surahNumber: number;
      verseNumber: number;
      surahName: string;
      text: string;
      page?: number;
      createdAt: number;
    }
  | {
      id: string;
      type: "page";
      page: number;
      label: string;
      createdAt: number;
    };

export const BOOKMARKS_KEY = "quran-bookmarks";
export const BOOKMARKS_EVENT = "quran-bookmarks-updated";
export const LAST_READ_KEY = "quran-last-read";
export const LAST_READ_EVENT = "quran-last-read-updated";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getBookmarks(): Bookmark[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Bookmark[];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: Bookmark[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  window.dispatchEvent(new Event(BOOKMARKS_EVENT));
}

export function isBookmarked(id: string) {
  return getBookmarks().some((bookmark) => bookmark.id === id);
}

export function addBookmark(bookmark: Bookmark) {
  const bookmarks = getBookmarks();
  if (bookmarks.some((item) => item.id === bookmark.id)) return;
  saveBookmarks([bookmark, ...bookmarks]);
}

export function removeBookmark(id: string) {
  saveBookmarks(getBookmarks().filter((bookmark) => bookmark.id !== id));
}

export function clearBookmarks() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(BOOKMARKS_KEY);
  window.dispatchEvent(new Event(BOOKMARKS_EVENT));
}

export function toggleBookmark(bookmark: Bookmark): boolean {
  const bookmarks = getBookmarks();
  const exists = bookmarks.some((item) => item.id === bookmark.id);
  if (exists) {
    saveBookmarks(bookmarks.filter((item) => item.id !== bookmark.id));
    return false;
  }
  saveBookmarks([bookmark, ...bookmarks]);
  return true;
}

export type LastRead = {
  page: number;
  surahNumber: number;
  surahName: string;
  verseKey: string;
  verseText: string;
  updatedAt: number;
};

export function getLastRead(): LastRead | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(LAST_READ_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastRead;
  } catch {
    return null;
  }
}

export function saveLastRead(lastRead: LastRead) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(LAST_READ_KEY, JSON.stringify(lastRead));
  window.dispatchEvent(new Event(LAST_READ_EVENT));
}

export function clearLastRead() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(LAST_READ_KEY);
  window.dispatchEvent(new Event(LAST_READ_EVENT));
}
