"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";

export default function MushafPage({ params }: { params: any }) {
  const pageNumber = parseInt(params.page);

  return (
    <div className="container max-w-5xl py-6">
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="p-2 hover:bg-accent rounded-md">
          <ArrowRight className="h-5 w-5" />
        </Link>
        <h1 className="text-lg font-semibold">صفحة {pageNumber} من ٦٠٤</h1>
        <div className="flex items-center gap-1">
          {pageNumber > 1 && (
            <Link href={`/page/${pageNumber - 1}`} className="p-2 hover:bg-accent rounded-md">
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
          {pageNumber < 604 && (
            <Link href={`/page/${pageNumber + 1}`} className="p-2 hover:bg-accent rounded-md">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      <div className="border rounded-lg p-8 md:p-12 min-h-[600px] bg-card">
        <div className="mushaf-text text-center text-xl md:text-2xl leading-loose" dir="rtl">
          <p className="mb-6">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ</p>
          <p className="text-muted-foreground text-sm">
            عرض صفحات المصحف - طبعة مجمع الملك فهد
          </p>
        </div>
      </div>
    </div>
  );
}
