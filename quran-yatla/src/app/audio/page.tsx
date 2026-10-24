"use client";

import Link from "next/link";
import { ArrowRight, Play, Headphones, Pause } from "lucide-react";
import { readers } from "@/lib/data/readers";
import { useState, useRef } from "react";
import { surahs } from "@/lib/data/surahs";

export default function AudioPage() {
  const [selectedReader, setSelectedReader] = useState(readers[0]);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const playSurah = (surahNumber: number) => {
    setSelectedSurah(surahNumber);
    const url = `https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/${String(surahNumber).padStart(3, '0')}.mp3`;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.load();
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error("Audio error:", err);
            setIsPlaying(false);
          });
      } else {
        setIsPlaying(true);
      }
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <main className="min-h-screen pb-24">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-accent rounded-lg">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">الاستماع للقرآن الكريم</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">اختر القارئ</h2>
          <select
            value={selectedReader.id}
            onChange={(e) => {
              const reader = readers.find((r) => r.id === Number(e.target.value));
              if (reader) setSelectedReader(reader);
            }}
            className="w-full bg-card border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary"
          >
            {readers.map((reader) => (
              <option key={reader.id} value={reader.id}>
                {reader.name} - {reader.rewaya}
              </option>
            ))}
          </select>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">اختر السورة</h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {surahs.slice(0, 30).map((surah) => (
              <button
                key={surah.number}
                onClick={() => playSurah(surah.number)}
                className={`w-full flex items-center gap-4 rounded-xl p-3 transition-colors text-right ${
                  selectedSurah === surah.number
                    ? "bg-primary/10 border border-primary"
                    : "bg-card border border-border hover:border-primary/50"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                  {surah.number}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{surah.name}</h3>
                </div>
                {selectedSurah === surah.number && isPlaying ? (
                  <Pause className="w-5 h-5 text-primary" />
                ) : (
                  <Play className="w-5 h-5 text-primary" />
                )}
              </button>
            ))}
          </div>
          <p className="text-center text-muted-foreground text-sm mt-3">يتم عرض أول ٣٠ سورة</p>
        </section>
      </div>

      {selectedSurah && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
          <div className="container mx-auto flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <div className="flex-1">
              <p className="font-semibold">{surahs.find((s) => s.number === selectedSurah)?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedReader.name}</p>
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} controlsList="nodownload" />
    </main>
  );
}
