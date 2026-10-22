import { Bookmark } from "lucide-react";
import Link from "next/link";

export default function BookmarksPage() {
  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-2xl font-bold mb-6">المحفوظات</h1>
      <div className="text-center py-12">
        <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">لا توجد آيات محفوظة بعد</p>
        <Link href="/" className="text-primary hover:underline">
          تصفح القرآن الكريم
        </Link>
      </div>
    </div>
  );
}
