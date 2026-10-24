import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HadithPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">الأحاديث النبوية</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">قريبًا - قسم الأحاديث</p>
      </div>
    </main>
  );
}
