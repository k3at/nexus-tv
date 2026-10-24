"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getLastRead, LAST_READ_EVENT, LastRead } from "@/lib/bookmarks";

export function ContinueReading() {
  const [lastRead, setLastRead] = useState<LastRead | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setLastRead(getLastRead());
      setReady(true);
    };

    sync();
    window.addEventListener(LAST_READ_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LAST_READ_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!ready || !lastRead) return null;

  return (
    <Link
      href={`/page/${lastRead.page}`}
      className="flex items-center gap-4 p-4 mb-6 border rounded-lg bg-primary/5 border-primary/25 hover:bg-primary/10 transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <BookOpen className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">
          متابعة القراءة من {lastRead.surahName}
        </p>
        <p className="text-xs text-muted-foreground">
          صفحة {lastRead.page} • آخر قراءة
        </p>
      </div>
      <ArrowLeft className="h-5 w-5 text-muted-foreground shrink-0" />
    </Link>
  );
}
