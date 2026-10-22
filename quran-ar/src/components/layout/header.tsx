"use client";

import Link from "next/link";
import { BookOpen, Search, Bookmark, Settings, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Header() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <BookOpen className="h-6 w-6 text-primary" />
          <span>القرآن الكريم</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">
            الرئيسية
          </Link>
          <Link href="/surah/1" className="text-sm font-medium hover:text-primary transition-colors">
            قراءة
          </Link>
          <Link href="/page/1" className="text-sm font-medium hover:text-primary transition-colors">
            المصحف
          </Link>
          <Link href="/search" className="text-sm font-medium hover:text-primary transition-colors">
            البحث
          </Link>
          <Link href="/bookmarks" className="text-sm font-medium hover:text-primary transition-colors">
            المحفوظات
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/search" className="p-2 hover:bg-accent rounded-md md:hidden">
            <Search className="h-5 w-5" />
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 hover:bg-accent rounded-md"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
          <Link href="/settings" className="p-2 hover:bg-accent rounded-md">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
