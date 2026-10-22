"use client";

import { Search } from "lucide-react";
import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="container max-w-3xl py-8">
      <h1 className="text-2xl font-bold mb-6">البحث في القرآن الكريم</h1>
      <div className="relative mb-6">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن آية أو كلمة..."
          className="w-full pr-10 pl-4 py-3 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <p className="text-center text-muted-foreground">
        ابدأ بالبحث عن كلمة أو عبارة في القرآن الكريم
      </p>
    </div>
  );
}
