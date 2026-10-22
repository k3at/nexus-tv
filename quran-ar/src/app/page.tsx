import Link from "next/link";
import { BookOpen, FileText, Headphones } from "lucide-react";
import { surahs } from "@/lib/data/surahs";

export default function Home() {
  return (
    <div className="container py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">القرآن الكريم</h1>
        <p className="text-muted-foreground">اقرأ واستمع وتدبر</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/surah/1" className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-colors">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h3 className="font-semibold">قراءة السور</h3>
            <p className="text-sm text-muted-foreground">اقرأ سورة كاملة</p>
          </div>
        </Link>
        <Link href="/page/1" className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-colors">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h3 className="font-semibold">وضع المصحف</h3>
            <p className="text-sm text-muted-foreground">عرض كصفحات مصحف</p>
          </div>
        </Link>
        <Link href="/surah/1" className="flex items-center gap-3 p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-colors">
          <Headphones className="h-8 w-8 text-primary" />
          <div>
            <h3 className="font-semibold">الاستماع</h3>
            <p className="text-sm text-muted-foreground">استمع للقرآن الكريم</p>
          </div>
        </Link>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">السور</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {surahs.map((surah) => (
            <Link
              key={surah.number}
              href={`/surah/${surah.number}`}
              className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-colors"
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                {surah.number}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{surah.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {surah.type} • {surah.verses} آية
                </p>
              </div>
              <div className="text-left">
                <p className="text-sm text-muted-foreground">{surah.englishName}</p>
              </div>
            </Link>
          ))}
        </div>
        <p className="text-center text-muted-foreground mt-4 text-sm">
          جاري إضافة جميع السور ١١٤
        </p>
      </div>
    </div>
  );
}
