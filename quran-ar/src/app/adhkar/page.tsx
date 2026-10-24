"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

const adhkar = {
  morning: [
    { text: "أَعُوذُ بِاللّٰهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", count: 1 },
    { text: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ قُلْ هُوَ اللّٰهُ أَحَدٌ * اللّٰهُ الصَّمَدُ * لَمْ يَلِدْ وَلَمْ يُولَدْ * وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ", count: 3 },
    { text: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلّٰهِ، وَالْحَمْدُ لِلّٰهِ، لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ", count: 1 },
    { text: "سُبْحَانَ اللّٰهِ وَبِحَمْدِهِ", count: 100 },
    { text: "أَسْتَغْفِرُ اللّٰهَ وَأَتُوبُ إِلَيْهِ", count: 100 },
  ],
  evening: [
    { text: "أَعُوذُ بِكَلِمَاتِ اللّٰهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", count: 3 },
    { text: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلّٰهِ، وَالْحَمْدُ لِلّٰهِ", count: 1 },
    { text: "أَعُوذُ بِاللّٰهِ مِنَ الشَّيْطَانِ الرَّجِيمِ", count: 1 },
  ],
  afterPrayer: [
    { text: "أَسْتَغْفِرُ اللّٰهَ (ثَلَاثًا) اللّٰهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ", count: 1 },
    { text: "سُبْحَانَ اللّٰهِ", count: 33 },
    { text: "الْحَمْدُ لِلّٰهِ", count: 33 },
    { text: "اللّٰهُ أَكْبَرُ", count: 34 },
  ],
};

export default function AdhkarPage() {
  const [activeTab, setActiveTab] = useState<"morning" | "evening" | "afterPrayer">("morning");
  const [counters, setCounters] = useState<Record<string, number>>({});

  const increment = (key: string, max: number) => {
    setCounters((prev) => ({
      ...prev,
      [key]: Math.min((prev[key] || 0) + 1, max),
    }));
  };

  return (
    <div className="container max-w-3xl py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          الأذكار
        </h1>
        <p className="text-muted-foreground">أذكار الصباح والمساء وما بعد الصلاة</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("morning")}
          className={`px-4 py-2 rounded-lg text-sm ${
            activeTab === "morning" ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/80"
          }`}
        >
          أذكار الصباح
        </button>
        <button
          onClick={() => setActiveTab("evening")}
          className={`px-4 py-2 rounded-lg text-sm ${
            activeTab === "evening" ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/80"
          }`}
        >
          أذكار المساء
        </button>
        <button
          onClick={() => setActiveTab("afterPrayer")}
          className={`px-4 py-2 rounded-lg text-sm ${
            activeTab === "afterPrayer" ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-accent/80"
          }`}
        >
          أذكار ما بعد الصلاة
        </button>
      </div>

      <div className="space-y-4">
        {adhkar[activeTab].map((dhikr, idx) => {
          const key = `${activeTab}-${idx}`;
          const count = counters[key] || 0;
          const done = count >= dhikr.count;

          return (
            <div
              key={idx}
              onClick={() => increment(key, dhikr.count)}
              className={`border rounded-lg p-6 cursor-pointer transition-all ${
                done ? "bg-primary/5 border-primary" : "hover:border-primary/50"
              }`}
            >
              <p className="arabic-text text-lg leading-loose mb-4 text-center">{dhikr.text}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">التكرار: {dhikr.count}</span>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    done ? "bg-primary text-primary-foreground" : "bg-accent"
                  }`}
                >
                  {done ? "✓" : count}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
