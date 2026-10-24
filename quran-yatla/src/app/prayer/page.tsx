"use client";

import Link from "next/link";
import { ArrowRight, MapPin, Clock } from "lucide-react";
import { useState } from "react";

export default function PrayerPage() {
  const [location, setLocation] = useState<string>("");

  const prayers = [
    { name: "الفجر", time: "--:--" },
    { name: "الشروق", time: "--:--" },
    { name: "الظهر", time: "--:--" },
    { name: "العصر", time: "--:--" },
    { name: "المغرب", time: "--:--" },
    { name: "العشاء", time: "--:--" },
  ];

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">أوقات الصلاة</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-4">
        <button className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-2 hover:border-primary/50 transition-colors">
          <MapPin className="w-5 h-5 text-primary" />
          <span className="text-muted-foreground">تحديد الموقع تلقائياً</span>
        </button>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {prayers.map((prayer, index) => (
            <div
              key={prayer.name}
              className={`flex items-center justify-between p-4 ${
                index !== prayers.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="font-semibold">{prayer.name}</span>
              <span className="text-lg font-mono">{prayer.time}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-muted-foreground text-sm">
          سيتم استخدام Aladhan API لحساب أوقات الصلاة بناءً على الموقع
        </p>
      </div>
    </main>
  );
}
