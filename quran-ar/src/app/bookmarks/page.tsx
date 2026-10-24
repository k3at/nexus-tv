"use client";

import Link from "next/link";
import { Bookmark, BookmarkCheck, FileText, Trash2, X, History } from "lucide-react";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { clearLastRead, getLastRead, LAST_READ_EVENT, LastRead } from "@/lib/bookmarks";
import { useEffect, useState } from "react";

export default function BookmarksPage() {
  const { bookmarks, remove, clear, ready } = useBookmarks();
  const [lastRead, setLastRead] = useState<LastRead | null>(null);

  useEffect(() => {
    const sync = () => setLastRead(getLastRead());
    sync();
    window.addEventListener(LAST_READ_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      window.removeEventListener(LAST_READ_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);

  const verseBookmarks = bookmarks.filter((bookmark) => bookmark.type === "verse");
  const pageBookmarks = bookmarks.filter((bookmark) => bookmark.type === "page");

  return (
    <div className="container max-w-3xl py-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-primary" />
            العلامات المرجعية
          </h1>
          <p className="text-muted-foreground text-sm">
            الآيات والصفحات التي حفظتها. تُحفظ على هذا الجهاز.
          </p>
        </div>
        {ready && bookmarks.length > 0 && (
          <button
            onClick={clear}
            className="shrink-0 px-3 py-2 text-sm border rounded-md text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
          >
            حذف الكل ({bookmarks.length})
          </button>
        )}
      </div>

      {lastRead && (
        <div className="flex items-center gap-3 p-4 mb-6 border rounded-lg bg-muted/40">
          <div className="w-10 h-10 rounded-full bg-background text-primary flex items-center justify-center shrink-0">
            <History className="h-5 w-5" />
          </div>
          <Link href={`/page/${lastRead.page}`} className="flex-1 min-w-0">
            <p className="text-sm font-medium">آخر قراءة — متابعة من {lastRead.surahName}</p>
            <p className="text-xs text-muted-foreground">
              صفحة {lastRead.page} (سجل القراءة، وليس علامة مرجعية)
            </p>
          </Link>
          <button
            onClick={() => {
              clearLastRead();
              setLastRead(null);
            }}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-accent rounded-md shrink-0"
            title="مسح سجل آخر قراءة"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!ready ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">لا توجد علامات مرجعية بعد</p>
          <p className="text-sm text-muted-foreground mb-4">
            اضغط على أيقونة الحفظ بجانب أي آية في صفحة السورة أو صفحة المصحف.
          </p>
          <Link href="/page/1" className="text-primary hover:underline">
            ابدأ القراءة من المصحف
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {verseBookmarks.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                الآيات المحفوظة ({verseBookmarks.length})
              </h2>
              <div className="space-y-2">
                {verseBookmarks.map((bookmark) => {
                  if (bookmark.type !== "verse") return null;
                  return (
                    <div
                      key={bookmark.id}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:border-primary/40 transition-colors"
                    >
                      <BookmarkCheck className="h-5 w-5 text-primary shrink-0 mt-1" />
                      <Link
                        href={`/surah/${bookmark.surahNumber}#verse-${bookmark.verseNumber}`}
                        className="flex-1 min-w-0"
                      >
                        <p className="text-sm font-medium mb-1">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary ml-1">
                            آية
                          </span>
                          {bookmark.surahName} • الآية {bookmark.verseNumber}
                        </p>
                        <p className="arabic-text text-base leading-relaxed line-clamp-2">
                          {bookmark.text}
                        </p>
                      </Link>
                      <button
                        onClick={() => remove(bookmark.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-accent rounded-md shrink-0"
                        title="حذف العلامة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {pageBookmarks.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                الصفحات المحفوظة ({pageBookmarks.length})
              </h2>
              <div className="space-y-2">
                {pageBookmarks.map((bookmark) => {
                  if (bookmark.type !== "page") return null;
                  return (
                    <div
                      key={bookmark.id}
                      className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary/40 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-primary shrink-0" />
                      <Link href={`/page/${bookmark.page}`} className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary ml-1">
                            صفحة
                          </span>
                          {bookmark.label}
                        </p>
                      </Link>
                      <button
                        onClick={() => remove(bookmark.id)}
                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-accent rounded-md shrink-0"
                        title="حذف العلامة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
