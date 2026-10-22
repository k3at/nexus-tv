"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-2xl font-bold mb-6">الإعدادات</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">المظهر</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 p-4 border rounded-lg ${
                mounted && theme === "light" ? "border-primary bg-primary/5" : "hover:border-primary"
              }`}
            >
              <Sun className="h-5 w-5" />
              <span>فاتح</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 p-4 border rounded-lg ${
                mounted && theme === "dark" ? "border-primary bg-primary/5" : "hover:border-primary"
              }`}
            >
              <Moon className="h-5 w-5" />
              <span>داكن</span>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">الخط</h2>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">حجم الخط افتراضي</p>
          </div>
        </section>
      </div>
    </div>
  );
}
