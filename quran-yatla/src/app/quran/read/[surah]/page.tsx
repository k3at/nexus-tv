"use client";

import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useProgressStore } from "@/lib/store/progress";
import { surahs } from "@/lib/data/surahs";
import { tafsirIbnKathir } from "@/lib/data/tafsir-ibn-kathir";

export default function ReadSurah({ params }: { params: any }) {
  const surahNum = parseInt(params.surah);
  const { setLastSurah, setLastPage } = useProgressStore();
  const surah = surahs.find((s) => s.number === surahNum);
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLastSurah(surahNum, 1);
    setLastPage(1);
    
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === 200) {
          setAyahs(data.data.ayahs);
        }
        setLoading(false);
      })
      .catch(() => {
        // fallback data
        if (surahNum === 1) {
          setAyahs([
            { number: 1, numberInSurah: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", page: 1 },
            { number: 2, numberInSurah: 2, text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ", page: 1 },
          ]);
        }
        setLoading(false);
      });
  }, [surahNum]);

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/quran" className="p-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold">سورة {surah?.name}</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            {surahNum !== 9 && (
              <div className="arabic-text text-xl md:text-2xl text-center leading-loose mb-8">
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
            )}
            {loading ? (
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            ) : (
              <div className="space-y-8">
                {ayahs.map((ayah) => (
                  <div key={ayah.number || ayah.numberInSurah} className="pb-6 border-b border-border last:border-0">
                    <p className="arabic-text text-lg md:text-xl leading-loose">
                      {ayah.text?.replace("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", "").replace("بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ", "").trim() || ""}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">آية {ayah.numberInSurah}</p>
                      <Link href={`/quran/mushaf/${ayah.page || 1}`} className="text-xs text-primary hover:underline">
                        عرض في المصحف - صفحة {ayah.page || 1}
                      </Link>
                    </div>
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm font-semibold mb-2">تفسير ابن كثير</p>
                      <p className="text-sm leading-relaxed">
                        {tafsirIbnKathir[`${surahNum}:${ayah.numberInSurah}`] || 
                         (surahNum === 1 && ayah.numberInSurah === 1 ? "بسم الله الرحمن الرحيم: ابتدأ الكتاب باسمه تعالى دلالة على البركة" : 
                          surahNum === 1 && ayah.numberInSurah === 2 ? "الحمد لله رب العالمين: الثناء بالجميل، لله سبحانه هو المألوه المحمود على كل حال" : 
                          "تفسير الآية - تفسير ابن كثير")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
