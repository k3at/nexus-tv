"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BOOKMARKS_EVENT,
  Bookmark,
  addBookmark,
  clearBookmarks,
  getBookmarks,
  removeBookmark,
  toggleBookmark,
} from "@/lib/bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setBookmarks(getBookmarks());

    sync();
    setReady(true);

    // Keep every open page/tab in sync with localStorage.
    window.addEventListener(BOOKMARKS_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener(BOOKMARKS_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const toggle = useCallback((bookmark: Bookmark) => {
    const saved = toggleBookmark(bookmark);
    setBookmarks(getBookmarks());
    return saved;
  }, []);

  const add = useCallback((bookmark: Bookmark) => {
    addBookmark(bookmark);
    setBookmarks(getBookmarks());
  }, []);

  const remove = useCallback((id: string) => {
    removeBookmark(id);
    setBookmarks(getBookmarks());
  }, []);

  const clear = useCallback(() => {
    clearBookmarks();
    setBookmarks(getBookmarks());
  }, []);

  const isSaved = useCallback(
    (id: string) => bookmarks.some((bookmark) => bookmark.id === id),
    [bookmarks]
  );

  return { bookmarks, ready, toggle, add, remove, clear, isSaved };
}
