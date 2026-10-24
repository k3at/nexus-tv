"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { OrnamentDivider } from "@/components/quran/ornament";

type Dhikr = {
  id: number;
  title: string;
  arabic: string;
  translation?: string;
  count?: number;
  reference?: string;
};

const categories: Array<{ id: string; name: string; items: Dhikr[] }> = [
  {
    id: "morning",
    name: "أذكار الصباح",
    items: [
      { id: 1, title: "أعوذ بالله من الشيطان الرجيم", arabic: "أَعُوذُ بِاللّٰهِ مِنَ الشَّيْطَانِ الرَّجِيمِ" },
      { id: 2, title: "آية الكرسي", arabic: "اللّٰهُ لَا إِلٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ", count: 1 },
      { id: 3, title: "سورة الإخلاص، الفلق، الناس", arabic: "قُلْ هُوَ اللّٰهُ أَحَدٌ ۞ اللّٰهُ الصَّمَدُ ۞ لَمْ يَلِدْ وَلَمْ يُولَدْ ۞ وَلَمْ يَكُن لَّهُ۟ كُفُوًا أَحَدٌ\nبِسْمِ اللّٰهِ الرَّحْمَـٰنِ الرَّحِيمِ ﴿قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ...﴾\nبِسْمِ اللّٰهِ الرَّحْمَـٰنِ الرَّحِيمِ ﴿قُلْ أَعُوذُ بِرَبِّ النَّاسِ...﴾", count: 3 },
      { id: 4, title: "أصبحنا وأصبح الملك لله", arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلّٰهِ، وَالْحَمْدُ لِلّٰهِ، لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", count: 1 },
      { id: 5, title: "اللهم بك أصبحنا وبك أمسينا", arabic: "اللّٰهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ", count: 1 },
      { id: 6, title: "سيد الاستغفار", arabic: "اللّٰهُمَّ أَنْتَ رَبِّي لَا إِلٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ", count: 1 },
    ],
  },
  {
    id: "evening",
    name: "أذكار المساء",
    items: [
      { id: 101, title: "أعوذ بالله من الشيطان الرجيم", arabic: "أَعُوذُ بِاللّٰهِ مِنَ الشَّيْطَانِ الرَّجِيمِ" },
      { id: 102, title: "آية الكرسي", arabic: "اللّٰهُ لَا إِلٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ...", count: 1 },
      { id: 103, title: "المعوذات", arabic: "قُلْ هُوَ اللّٰهُ أَحَدٌ... ثُمَّ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ... ثُمَّ قُلْ أَعُوذُ بِرَبِّ النَّاسِ...", count: 3 },
      { id: 104, title: "أمسينا وأمسى الملك لله", arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلّٰهِ، وَالْحَمْدُ لِلّٰهِ، لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", count: 1 },
      { id: 105, title: "اللهم بك أمسينا وبك أصبحنا", arabic: "اللّٰهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ", count: 1 },
      { id: 106, title: "أعوذ بكلمات الله التامات", arabic: "أَعُوذُ بِكَلِمَاتِ اللّٰهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ", count: 3 },
    ],
  },
  {
    id: "sleep",
    name: "أذكار النوم",
    items: [
      { id: 201, title: "باسمك اللهم أموت وأحيا", arabic: "بِاسْمِكَ اللّٰهُمَّ أَمُوتُ وَأَحْيَا", count: 1 },
      { id: 202, title: "آية الكرسي", arabic: "اللّٰهُ لَا إِلٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...", count: 1 },
      { id: 203, title: "المعوذات", arabic: "قُلْ هُوَ اللّٰهُ أَحَدٌ، قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ، قُلْ أَعُوذُ بِرَبِّ النَّاسِ", count: 1 },
      { id: 204, title: "سورة البقرة آخر آيتين", arabic: "آمَنَ الرَّسُولُ بِمَا أُنْزِلَ إِلَيْهِ مِنْ رَبِّهِ وَالْمُؤْمِنُونَ...", count: 1 },
    ],
  },
  {
    id: "prayer",
    name: "أذكار بعد الصلاة",
    items: [
      { id: 301, title: "أستغفر الله", arabic: "أَسْتَغْفِرُ اللّٰهَ", count: 3 },
      { id: 302, title: "اللهم أنت السلام ومنك السلام", arabic: "اللّٰهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ", count: 1 },
      { id: 303, title: "لا إله إلا الله وحده", arabic: "لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", count: 1 },
      { id: 304, title: "سبحان الله والحمد لله والله أكبر", arabic: "سُبْحَانَ اللّٰهِ، وَالْحَمْدُ لِلّٰهِ، وَاللّٰهُ أَكْبَرُ", count: 33 },
      { id: 305, title: "كلمة التوحيد كاملة", arabic: "لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ", count: 1 },
    ],
  },
  {
    id: "general",
    name: "أذكار عامة",
    items: [
      { id: 401, title: "بسم الله الذي لا يضر مع اسمه شيء", arabic: "بِسْمِ اللّٰهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ", count: 3 },
      { id: 402, title: "رضيت بالله ربا وبالإسلام دينا", arabic: "رَضِيتُ بِاللّٰهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا", count: 3 },
      { id: 403, title: "حسبي الله لا إله إلا هو", arabic: "حَسْبِيَ اللّٰهُ لَا إِلٰهَ إِلَّا هُوَ، عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ", count: 7 },
    ],
  },
];

export default function HisnMuslimPage() {
  const [open, setOpen] = useState<string>("morning");
  const [counts, setCounts] = useState<Record<number, number>>({});

  const increment = (id: number, max = 1) => {
    setCounts((prev) => {
      const current = prev[id] || 0;
      if (current >= max) return prev;
      return { ...prev, [id]: current + 1 };
    });
  };

  const reset = () => setCounts({});

  return (
    <div className="container max-w-4xl py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">حصن المسلم</h1>
        <p className="text-muted-foreground">أذكار الصباح والمساء والنوم وما يتطلبه المسلم من الأذكار</p>
        <OrnamentDivider className="mt-5" />
      </div>

      <div className="mb-4 flex justify-end">
        <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          إعادة العد
        </button>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const isOpen = open === cat.id;
          return (
            <div key={cat.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? "" : cat.id)}
                className="w-full flex items-center justify-between p-4 bg-card hover:bg-accent/50 transition-colors"
              >
                <span className="font-semibold">{cat.name}</span>
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              {isOpen && (
                <div className="divide-y">
                  {cat.items.map((item) => {
                    const max = item.count || 1;
                    const current = counts[item.id] || 0;
                    const done = current >= max;
                    return (
                      <button
                        key={item.id}
                        onClick={() => increment(item.id, max)}
                        className={`w-full text-right p-4 transition-colors ${
                          done ? "bg-primary/5" : "hover:bg-accent/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <p className="font-medium mb-1">{item.title}</p>
                            {item.reference && <p className="text-xs text-muted-foreground">{item.reference}</p>}
                          </div>
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 shrink-0 ${
                            done ? "border-primary bg-primary text-primary-foreground" : "border-primary/40"
                          }`}>
                            <span className="text-sm font-bold">{current}/{max}</span>
                          </div>
                        </div>
                        <p className="arabic-text text-lg leading-loose whitespace-pre-wrap" dir="rtl">
                          {item.arabic}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
