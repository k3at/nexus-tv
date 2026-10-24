"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Calendar, FileText } from "lucide-react";
import { useProgressStore } from "@/lib/store/progress";

export default function ProgressPage() {
  const { totalPagesRead, lastPage } = useProgressStore();

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">إحصائياتي</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <BookOpen className="w-6 h-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{totalPagesRead}</p>
            <p className="text-sm text-muted-foreground">إجمالي الصفحات</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <FileText className="w-6 h-6 text-primary mb-2" />
            <p className="text-2xl font-bold">{lastPage}</p>
            <p className="text-sm text-muted-foreground">آخر صفحة</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">مكان التوقف</h3>
          </div>
          <p className="text-muted-foreground">صفحة {lastPage} من ٦٠٤</p>
          <Link
            href={`/quran/mushaf/${lastPage}`}
            className="inline-flex items-center gap-2 mt-3 text-primary hover:underline"
          >
            متابعة القراءة
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      </div>
    </main>
  );
}
