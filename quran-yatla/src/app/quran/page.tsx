import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { surahs } from "@/lib/data/surahs";

export default function QuranIndex() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">فهرس السور</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        <div className="mb-4 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="بحث عن سورة..."
            className="w-full bg-card border border-border rounded-xl pr-10 pl-4 py-2.5 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-2">
          {surahs.map((surah) => (
            <Link
              key={surah.number}
              href={`/quran/read/${surah.number}`}
              className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {surah.number}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{surah.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {surah.revelationType === "Meccan" ? "مكية" : "مدنية"} • {surah.ayahs} آية
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground rotate-180" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
