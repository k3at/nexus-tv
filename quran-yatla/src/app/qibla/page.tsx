"use client";

import Link from "next/link";
import { ArrowRight, Compass, MapPin } from "lucide-react";

export default function QiblaPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">اتجاه القبلة</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center space-y-6">
          <button className="w-full bg-card border border-border rounded-xl p-4 flex items-center justify-center gap-2 hover:border-primary/50 transition-colors">
            <MapPin className="w-5 h-5 text-primary" />
            <span>تحديد الموقع</span>
          </button>
          
          <div className="w-72 h-72 mx-auto bg-card border-2 border-border rounded-full flex items-center justify-center relative shadow-lg">
            <div className="absolute inset-0 rounded-full border border-primary/20" />
            <Compass className="w-40 h-40 text-primary" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1 h-8 bg-primary rounded-full" />
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-semibold">اتجاه الكعبة المشرفة</p>
            <p className="text-muted-foreground">
              استخدم البوصلة لتحديد اتجاه القبلة بناءً على موقعك
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
