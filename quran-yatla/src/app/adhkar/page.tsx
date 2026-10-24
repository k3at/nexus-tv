import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AdhkarPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">الأذكار</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-3">
        <Link href="/adhkar/morning" className="block bg-card border border-border rounded-xl p-4 hover:border-primary/50">
          <h3 className="font-semibold">أذكار الصباح</h3>
        </Link>
        <Link href="/adhkar/evening" className="block bg-card border border-border rounded-xl p-4 hover:border-primary/50">
          <h3 className="font-semibold">أذكار المساء</h3>
        </Link>
        <Link href="/adhkar/sleep" className="block bg-card border border-border rounded-xl p-4 hover:border-primary/50">
          <h3 className="font-semibold">أذكار النوم</h3>
        </Link>
      </div>
    </main>
  );
}
