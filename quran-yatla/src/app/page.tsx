"use client";

import Link from "next/link";
import { BookOpen, Headphones, Clock, Compass, BookMarked, Sparkles, BarChart3, Settings } from "lucide-react";
import { useProgressStore } from "@/lib/store/progress";

export default function Home() {
  const { lastPage, lastSurah } = useProgressStore();

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex-1" />
          <div className="text-center flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">قرآن يتلى</h1>
            <p className="text-center text-muted-foreground mt-1">قراءة، استماع، تفسير، عبادة</p>
          </div>
          <div className="flex-1 flex justify-end">
            <Link href="/settings" className="p-2 hover:bg-accent rounded-lg">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* متابعة القراءة */}
        <section className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">متابعة القراءة</h2>
          </div>
          <p className="text-muted-foreground mb-4">استأنف من حيث توقفت</p>
          <Link
            href={`/quran/mushaf/${lastPage}`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            <BookOpen className="w-4 h-4" />
            متابعة القراءة من صفحة {lastPage}
          </Link>
        </section>

        {/* الأقسام الرئيسية */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Link href="/quran" className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <BookOpen className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold">الفهرس</h3>
            <p className="text-sm text-muted-foreground">سور القرآن</p>
          </Link>

          <Link href="/quran/mushaf/1" className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <BookMarked className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold">مصحف</h3>
            <p className="text-sm text-muted-foreground">صفحة مصحف الملك فهد</p>
          </Link>

          <Link href="/audio" className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <Headphones className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold">الاستماع</h3>
            <p className="text-sm text-muted-foreground">القراء كامل القائمة</p>
          </Link>

          <Link href="/prayer" className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <Clock className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold">أوقات الصلاة</h3>
            <p className="text-sm text-muted-foreground">حسب الموقع</p>
          </Link>

          <Link href="/qibla" className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <Compass className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold">القبلة</h3>
            <p className="text-sm text-muted-foreground">اتجاه القبلة</p>
          </Link>

          <Link href="/hadith" className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <BookOpen className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold">الأحاديث</h3>
            <p className="text-sm text-muted-foreground">الأحاديث النبوية</p>
          </Link>

          <Link href="/adhkar" className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <Sparkles className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold">الأذكار</h3>
            <p className="text-sm text-muted-foreground">صباح ومساء</p>
          </Link>

          <Link href="/progress" className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <BarChart3 className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold">إحصائياتي</h3>
            <p className="text-sm text-muted-foreground">الصفحات المقروءة</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
