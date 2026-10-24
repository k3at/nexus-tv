"use client";

import Link from "next/link";
import { Search, Menu, Moon, Sun, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { StarOrnament } from "@/components/quran/ornament";

export function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === "dark" || resolvedTheme === "night");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <StarOrnament className="h-5 w-5" />
            <span className="text-lg font-bold text-foreground">القرآن</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5">
            <Link href="/" className="text-sm hover:text-primary transition-colors">
              القراءة
            </Link>
            <Link href="/page/1" className="text-sm hover:text-primary transition-colors">
              المصحف
            </Link>
            <Link href="/adhkar" className="text-sm hover:text-primary transition-colors">
              الأذكار
            </Link>
            <Link href="/hisn-muslim" className="text-sm hover:text-primary transition-colors">
              حصن المسلم
            </Link>
            <Link href="/prayer-times" className="text-sm hover:text-primary transition-colors">
              مواقيت الصلاة
            </Link>
            <Link href="/search" className="text-sm hover:text-primary transition-colors">
              البحث
            </Link>
            <Link href="/bookmarks" className="text-sm hover:text-primary transition-colors">
              العلامات المرجعية
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Link href="/search" className="p-2 hover:bg-accent rounded-md" title="البحث">
            <Search className="h-4 w-4" />
          </Link>
          <Link href="/settings" className="p-2 hover:bg-accent rounded-md" title="المظهر والإعدادات">
            <Palette className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="p-2 hover:bg-accent rounded-md"
            title={isDark ? "الوضع النهاري" : "الوضع الليلي"}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button className="p-2 hover:bg-accent rounded-md md:hidden" title="القائمة">
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
