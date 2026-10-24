"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Bookmark, BookmarkCheck, Headphones } from "lucide-react";
import { surahs } from "@/lib/data/surahs";
import { AudioPlayer } from "@/components/quran/audio-player";
import { OrnamentDivider } from "@/components/quran/ornament";
import { useBookmarks } from "@/hooks/use-bookmarks";

type Verse = {
  id: number;
  verse_key: string;
  verse_number: number;
  text_uthmani: string;
  page_number?: number;
  translations?: { id: number; text: string }[];
};

export default function SurahPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = use(params);
  const surahNumber = parseInt(number);
  const surah = surahs.find((s) => s.number === surahNumber);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAudio, setShowAudio] = useState(false);
  const { toggle, isSaved } = useBookmarks();

  useEffect(() => {
    setLoading(true);
    fetch(
      `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?language=ar&words=false&translations=131&fields=text_uthmani&page=1&per_page=286`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data.verses) {
          setVerses(data.verses);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [surahNumber]);

  useEffect(() => {
    if (loading || verses.length === 0) return;
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, verses]);

  return (
    <div className={`container max-w-4xl py-6 ${showAudio ? "pb-40" : ""}`}>
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للرئيسية
        </Link>
        <div className="text-center py-8 border-b">
          <h1 className="text-3xl font-bold mb-2">{surah?.name}</h1>
          <p className="text-muted-foreground mb-4">
            {surah?.type} • {surah?.verses} آية
          </p>
          <button
            onClick={() => setShowAudio(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 mb-4"
          >
            <Headphones className="h-4 w-4" />
            استماع للسورة
          </button>
          {surahNumber !== 9 && (
            <p className="arabic-text text-2xl">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ</p>
          )}
          <OrnamentDivider className="mt-5" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="space-y-6">
          {verses.map((verse) => {
            const bookmarkId = `verse:${verse.verse_key}`;
            const saved = isSaved(bookmarkId);

            return (
              <div
                key={verse.id}
                id={`verse-${verse.verse_number}`}
                className="group border-b pb-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary text-sm shrink-0 mt-1">
                    {verse.verse_number}
                  </div>
                  <div className="flex-1">
                    <p
                      className="arabic-text text-xl md:text-2xl leading-loose text-right mb-4"
                      dir="rtl"
                    >
                      {verse.text_uthmani}
                    </p>
                    {verse.translations && verse.translations[0] && (
                      <p className="text-muted-foreground leading-relaxed">
                        {verse.translations[0].text.replace(/<[^>]*>/g, "")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 mr-12">
                  <button className="p-2 hover:bg-accent rounded-md" title="تشغيل">
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      toggle({
                        id: bookmarkId,
                        type: "verse",
                        verseKey: verse.verse_key,
                        surahNumber,
                        verseNumber: verse.verse_number,
                        surahName: surah?.name || `سورة ${surahNumber}`,
                        text: verse.text_uthmani,
                        page: verse.page_number,
                        createdAt: Date.now(),
                      })
                    }
                    className={`p-2 hover:bg-accent rounded-md ${
                      saved ? "text-primary" : "text-muted-foreground"
                    }`}
                    title={saved ? "إزالة العلامة" : "حفظ هذه الآية"}
                  >
                    {saved ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showAudio && <AudioPlayer surahNumber={surahNumber} onClose={() => setShowAudio(false)} />}
    </div>
  );
}
