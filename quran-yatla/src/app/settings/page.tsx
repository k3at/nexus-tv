"use client";

import Link from "next/link";
import { ArrowRight, Sun, Moon, FileText } from "lucide-react";
import { useThemeStore } from "@/lib/store/theme";

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();

  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">الإعدادات</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">وضع القراءة</h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTheme("light")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                theme === "light"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <Sun className="w-5 h-5" />
              <span className="text-sm">نهاري</span>
            </button>
            <button
              onClick={() => setTheme("sepia")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                theme === "sepia"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-sm">ورقي دافئ</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                theme === "dark"
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="text-sm">ليلي</span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
