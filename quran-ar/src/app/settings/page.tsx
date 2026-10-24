"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check } from "lucide-react";
import { OrnamentDivider } from "@/components/quran/ornament";

const themes = [
  {
    id: "light",
    name: "فاتح هادئ",
    description: "ألوان دافئة ومخففة مريحة للعين",
    colors: ["#faf8f4", "#efece4", "#2f7d5b"],
  },
  {
    id: "sepia",
    name: "ورقي",
    description: "أجواء المصحف الورقي بلون السيبيا",
    colors: ["#f3e9d7", "#e7d8bd", "#7a5a2f"],
  },
  {
    id: "emerald",
    name: "زمردي",
    description: "خلفية خضراء فاتحة وهادئة",
    colors: ["#eaf4ee", "#d9eae0", "#1f7a52"],
  },
  {
    id: "dark",
    name: "داكن",
    description: "قراءة مسائية بألوان رمادية متوازنة",
    colors: ["#101614", "#1a2420", "#4fc38b"],
  },
  {
    id: "night",
    name: "ليلي",
    description: "أزرق ليلي عميق مريح للعين",
    colors: ["#111a2b", "#1a2438", "#5aa9e6"],
  },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="container max-w-3xl py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">الإعدادات</h1>
        <p className="text-sm text-muted-foreground">اختر المظهر الذي يناسبك</p>
        <OrnamentDivider className="mt-4" />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-1">المظهر</h2>
        <p className="text-sm text-muted-foreground mb-4">
          يتم حفظ اختيارك تلقائياً على هذا الجهاز
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {themes.map((item) => {
            const active = mounted && theme === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setTheme(item.id)}
                className={`relative flex items-center gap-3 p-3 border rounded-lg text-right transition-all ${
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "hover:border-primary/40 hover:bg-accent/40"
                }`}
              >
                <div
                  className="w-14 h-14 rounded-md border border-black/5 shrink-0 overflow-hidden flex flex-col"
                  style={{ backgroundColor: item.colors[0] }}
                  aria-hidden="true"
                >
                  <div className="h-1/2 w-full" style={{ backgroundColor: item.colors[1] }} />
                  <div
                    className="mt-auto h-2 w-full"
                    style={{ backgroundColor: item.colors[2] }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {active && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-1">معاينة</h2>
        <p className="text-sm text-muted-foreground mb-4">
          هكذا يظهر النص القرآني مع الزخرفة الإسلامية
        </p>
        <div className="mushaf-frame p-6 sm:p-8">
          <OrnamentDivider className="mb-4" />
          <p className="arabic-text text-center text-xl leading-loose">
            بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ
          </p>
          <p className="text-center text-xs text-muted-foreground mt-4">
            ﴿ إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ ﴾
          </p>
          <OrnamentDivider className="mt-4" />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-1">الخط</h2>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-muted-foreground">
            يمكنك تكبير وتصغير خط المصحف مباشرة من صفحة المصحف باستخدام زرّي (+ و −).
          </p>
        </div>
      </section>
    </div>
  );
}
