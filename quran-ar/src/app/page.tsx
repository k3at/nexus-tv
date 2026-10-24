import Link from "next/link";
import { surahs } from "@/lib/data/surahs";
import { ContinueReading } from "@/components/quran/continue-reading";
import { OrnamentDivider } from "@/components/quran/ornament";

export default function Home() {
  return (
    <div className="container max-w-6xl py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">القرآن الكريم</h1>
        <p className="text-muted-foreground text-sm">اختر سورة للقراءة</p>
        <OrnamentDivider className="mt-4 justify-start" />
      </div>

      <ContinueReading />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {surahs.map((surah) => (
          <Link
            key={surah.number}
            href={`/surah/${surah.number}`}
            className="flex items-center gap-3 p-3 border rounded hover:bg-accent/50 hover:border-primary/50 transition-colors"
          >
            <div className="w-9 h-9 flex items-center justify-center text-sm text-muted-foreground">
              {surah.number}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium">{surah.name}</h3>
              <p className="text-xs text-muted-foreground">
                {surah.type} • {surah.verses} آية
              </p>
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">{surah.englishName}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
