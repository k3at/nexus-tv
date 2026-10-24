"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeft, Bookmark } from "lucide-react";
import { useEffect } from "react";
import { useProgressStore } from "@/lib/store/progress";

export default function MushafPage({ params }: { params: any }) {
  const pageNum = parseInt(params.page);
  const { setLastPage, incrementPagesRead } = useProgressStore();

  useEffect(() => {
    setLastPage(pageNum);
    incrementPagesRead();
  }, [pageNum]);

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">صفحة {pageNum} من ٦٠٤</h1>
          <div className="flex items-center gap-1">
            {pageNum > 1 && (
              <Link href={`/quran/mushaf/${pageNum - 1}`} className="p-2 hover:bg-accent rounded-lg">
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
            {pageNum < 604 && (
              <Link href={`/quran/mushaf/${pageNum + 1}`} className="p-2 hover:bg-accent rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-3xl mx-auto bg-card border border-border rounded-xl p-6 md:p-10 shadow-sm">
          <div className="mushaf-page text-center text-xl md:text-2xl leading-loose" dir="rtl">
            <p className="mb-6">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
            <p className="text-muted-foreground text-base">
              صفحة مصحف طبعة مجمع الملك فهد بالمدينة المنورة
            </p>
            <p className="text-muted-foreground text-sm mt-4">
              سيتم عرض نص الصفحة مع حفظ مكان التوقف تلقائياً
            </p>
            <p className="text-primary text-sm mt-6">✓ تم حفظ مكان التوقف</p>
          </div>
        </div>
      </div>
    </main>
  );
}
