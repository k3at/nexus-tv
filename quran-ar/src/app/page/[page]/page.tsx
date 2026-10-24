"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Plus, Minus, Bookmark, BookmarkCheck } from "lucide-react";
import { surahs } from "@/lib/data/surahs";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { StarOrnament } from "@/components/quran/ornament";
import { saveLastRead } from "@/lib/bookmarks";

type Verse = {
  id: number;
  verse_key: string;
  verse_number: number;
  text_uthmani: string;
};

export default function MushafPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = use(params);
  const pageNumber = parseInt(page);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [fontSize, setFontSize] = useState(2.25);
  const [lineHeight, setLineHeight] = useState(3.2);
  const [loading, setLoading] = useState(true);
  const { toggle, isSaved } = useBookmarks();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(
      `https://api.quran.com/api/v4/verses/by_page/${pageNumber}?language=ar&words=false&fields=text_uthmani,verse_key`
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const list: Verse[] = data.verses || [];
        setVerses(list);
        setLoading(false);

        if (list.length > 0) {
          const first = list[0];
          const surahNumber = parseInt(first.verse_key.split(":")[0]);
          const surah = surahs.find((item) => item.number === surahNumber);
          saveLastRead({
            page: pageNumber,
            surahNumber,
            surahName: surah?.name || `سورة ${surahNumber}`,
            verseKey: first.verse_key,
            verseText: first.text_uthmani,
            updatedAt: Date.now(),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pageNumber]);

  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, verses]);

  const surahName = useMemo(() => {
    if (verses.length === 0) return "";
    const surahNumber = parseInt(verses[0].verse_key.split(":")[0]);
    return surahs.find((item) => item.number === surahNumber)?.name || "";
  }, [verses]);

  const pageBookmarkId = `page:${pageNumber}`;
  const pageSaved = isSaved(pageBookmarkId);

  const increaseFont = () => {
    if (fontSize < 3.5) setFontSize((s) => s + 0.15);
    if (lineHeight < 4) setLineHeight((l) => l + 0.1);
  };

  const decreaseFont = () => {
    if (fontSize > 1.5) setFontSize((s) => s - 0.15);
    if (lineHeight > 2.5) setLineHeight((l) => l - 0.1);
  };

  const togglePageBookmark = () => {
    toggle({
      id: pageBookmarkId,
      type: "page",
      page: pageNumber,
      label: surahName ? `صفحة ${pageNumber} • ${surahName}` : `صفحة ${pageNumber}`,
      createdAt: Date.now(),
    });
  };

  return (
    <div className="container max-w-5xl py-4">
      <div className="flex items-center justify-between mb-4 gap-2">
        <Link href="/" className="p-2 hover:bg-accent rounded-md" title="الرئيسية">
          <ArrowRight className="h-5 w-5" />
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={togglePageBookmark}
            className={`flex items-center gap-1 px-2 py-2 text-xs rounded-md hover:bg-accent ${
              pageSaved ? "text-primary" : "text-muted-foreground"
            }`}
            title={pageSaved ? "إزالة علامة الصفحة" : "إضافة علامة لهذه الصفحة"}
          >
            {pageSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            <span className="hidden sm:inline">{pageSaved ? "الصفحة محفوظة" : "حفظ الصفحة"}</span>
          </button>
          <span className="text-sm text-muted-foreground px-1 hidden sm:inline">
            {surahName ? `${surahName} • ` : ""}صفحة {pageNumber} / ٦٠٤
          </span>
          <button onClick={decreaseFont} className="p-2 hover:bg-accent rounded-md" title="تصغير الخط">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={increaseFont} className="p-2 hover:bg-accent rounded-md" title="تكبير الخط">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {pageNumber > 1 && (
            <Link href={`/page/${pageNumber - 1}`} className="p-2 hover:bg-accent rounded-md" title="الصفحة السابقة">
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
          {pageNumber < 604 && (
            <Link href={`/page/${pageNumber + 1}`} className="p-2 hover:bg-accent rounded-md" title="الصفحة التالية">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl mushaf-frame">
        <div
          className="px-6 py-10 md:px-12 md:py-14 lg:px-16 min-h-[calc(100vh-200px)] flex flex-col items-center justify-center gap-6"
          dir="rtl"
        >
          {loading ? (
            <div className="text-center text-muted-foreground">جاري التحميل...</div>
          ) : (
            <>
            <StarOrnament className="h-5 w-5 text-primary/40 shrink-0" />
            <div
              className="mushaf-text text-center w-full"
              style={{ fontSize: `${fontSize}rem`, lineHeight: lineHeight }}
            >
              {verses.map((verse) => {
                const bookmarkId = `verse:${verse.verse_key}`;
                const saved = isSaved(bookmarkId);
                const surahNumber = parseInt(verse.verse_key.split(":")[0]);
                const name =
                  surahs.find((item) => item.number === surahNumber)?.name || `سورة ${surahNumber}`;

                return (
                  <span
                    key={verse.id}
                    id={`verse-${verse.verse_key.replace(":", "-")}`}
                    className="group/verse"
                  >
                    {verse.text_uthmani}{" "}
                    <span className="text-primary/60 text-[0.6em] align-middle">
                      ﴿{verse.verse_number}﴾
                    </span>
                    <button
                      onClick={() =>
                        toggle({
                          id: bookmarkId,
                          type: "verse",
                          verseKey: verse.verse_key,
                          surahNumber,
                          verseNumber: verse.verse_number,
                          surahName: name,
                          text: verse.text_uthmani,
                          page: pageNumber,
                          createdAt: Date.now(),
                        })
                      }
                      className={`inline-flex align-middle mx-1 rounded p-0.5 transition-opacity ${
                        saved
                          ? "text-primary opacity-100"
                          : "text-muted-foreground opacity-0 group-hover/verse:opacity-100 focus:opacity-100"
                      }`}
                      title={saved ? "إزالة العلامة من الآية" : "حفظ هذه الآية"}
                    >
                      {saved ? (
                        <BookmarkCheck className="h-[0.6em] w-[0.6em]" />
                      ) : (
                        <Bookmark className="h-[0.6em] w-[0.6em]" />
                      )}
                    </button>{" "}
                  </span>
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl flex items-center justify-between mt-4 text-sm text-muted-foreground">
        {pageNumber > 1 ? (
          <Link href={`/page/${pageNumber - 1}`} className="hover:text-primary flex items-center gap-1">
            <ArrowRight className="h-4 w-4" /> السابقة
          </Link>
        ) : (
          <span />
        )}
        <span>{pageNumber}</span>
        {pageNumber < 604 ? (
          <Link href={`/page/${pageNumber + 1}`} className="hover:text-primary flex items-center gap-1">
            التالية <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
