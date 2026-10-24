"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { OrnamentDivider } from "@/components/quran/ornament";

type SearchResult = {
  verse_key: string;
  verse_id: number;
  text: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSearch = async (q: string) => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setTotal(0);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = "https://api.quran.com/api/v4/search?q=" + encodeURIComponent(term) + "&size=25&page=1";
      const res = await fetch(url);
      if (!res.ok) throw new Error("bad");
      const data = await res.json();
      if (data && data.search && Array.isArray(data.search.results)) {
        setResults(data.search.results);
        setTotal(data.search.total_results || 0);
      } else {
        setResults([]);
        setTotal(0);
      }
    } catch (e) {
      setError("حدث خطأ أثناء البحث.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getSurahVerse = (verseKey: string) => {
    const parts = verseKey.split(":");
    return { surah: parseInt(parts[0]), verse: parseInt(parts[1]) };
  };

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">البحث في القرآن الكريم</h1>
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              doSearch(query);
            }
          }}
          placeholder="ابحث عن آية أو كلمة..."
          className="w-full pr-10 pl-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          autoComplete="off"
        />
      </div>
      <button
        onClick={() => doSearch(query)}
        className="mb-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
      >
        بحث
      </button>

      {query.trim().length >= 2 && !loading && (
        <div className="mb-4 text-sm text-muted-foreground">
          {total > 0 ? "عدد النتائج: " + total.toLocaleString("ar-EG") : "لا توجد نتائج"}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري البحث...
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center gap-2 py-8 text-destructive">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {!loading && !error && query.trim().length < 2 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-6">ابدأ بالبحث عن كلمة أو عبارة في القرآن الكريم</p>
          <OrnamentDivider />
        </div>
      )}

      <div className="space-y-4">
        {results.map((result) => {
          const { surah, verse } = getSurahVerse(result.verse_key);
          return (
            <Link
              key={result.verse_id}
              href={"/surah/" + surah + "#verse-" + verse}
              className="block border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-primary">
                  {"سورة " + surah + " • آية " + verse}
                </span>
                <span className="text-xs text-muted-foreground">{result.verse_key}</span>
              </div>
              <p className="arabic-text text-lg md:text-xl leading-loose text-right" dir="rtl">
                {result.text}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
