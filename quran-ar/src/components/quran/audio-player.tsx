"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipBack, SkipForward, X } from "lucide-react";

interface AudioPlayerProps {
  surahNumber: number;
  onClose: () => void;
}

const readers = [
  { id: 7, name: "مشاري العفاسي", reciter: "Alafasy" },
  { id: 1, name: "عبد الباسط", reciter: "AbdulBaset/Mujawwad" },
  { id: 2, name: "الحصري", reciter: "Husary" },
];

export function AudioPlayer({ surahNumber, onClose }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedReader, setSelectedReader] = useState(readers[0]);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audioUrl = `https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/${String(surahNumber).padStart(3, '0')}.mp3`;
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
    }
  }, [surahNumber]);

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
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
      <div className="container flex items-center gap-4 py-3">
        <button onClick={onClose} className="p-2 hover:bg-accent rounded-md">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="font-semibold text-sm">سورة {surahNumber}</p>
          <p className="text-xs text-muted-foreground">{selectedReader.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-accent rounded-md">
            <SkipBack className="h-5 w-5" />
          </button>
          <button onClick={togglePlay} className="p-2 bg-primary text-primary-foreground rounded-full">
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button className="p-2 hover:bg-accent rounded-md">
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
      </div>
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
