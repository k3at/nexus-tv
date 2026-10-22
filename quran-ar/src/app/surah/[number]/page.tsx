"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Bookmark, Headphones } from "lucide-react";
import { surahs } from "@/lib/data/surahs";
import { AudioPlayer } from "@/components/quran/audio-player";

export default function SurahPage({ params }: { params: any }) {
  const surahNumber = parseInt(params.number);
  const surah = surahs.find((s) => s.number === surahNumber);
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAudio, setShowAudio] = useState(false);

  useEffect(() => {
    fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?language=ar&words=false&translations=131&fields=text_uthmani&page=1&per_page=286`)
      .then((res) => res.json())
      .then((data) => {
        if (data.verses) {
          setVerses(data.verses);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [surahNumber]);

  return (
    <div className="container max-w-4xl py-6">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
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
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : (
        <div className="space-y-6">
          {verses.map((verse, index) => (
            <div key={verse.id} className="group border-b pb-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary text-sm shrink-0 mt-1">
                  {verse.verse_number}
                </div>
                <div className="flex-1">
                  <p className="arabic-text text-xl md:text-2xl leading-loose text-right mb-4" dir="rtl">
                    {verse.text_uthmani}
                  </p>
                  {verse.translations && verse.translations[0] && (
                    <p className="text-muted-foreground leading-relaxed">
                      {verse.translations[0].text.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 mr-12 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-accent rounded-md" title="تشغيل">
                  <Play className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-accent rounded-md" title="حفظ">
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAudio && <AudioPlayer surahNumber={surahNumber} onClose={() => setShowAudio(false)} />}
    </div>
  );
}
