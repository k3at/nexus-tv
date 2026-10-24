"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  X,
  ChevronUp,
  ChevronDown,
  Search,
  Check,
  Loader2,
  Volume2,
  VolumeX,
  RotateCcw,
  RotateCw,
  Headphones,
} from "lucide-react";
import { surahs } from "@/lib/data/surahs";
import {
  Reciter,
  defaultReciter,
  getAudioUrl,
  isReciterAvailable,
  loadReciters,
  loadSavedReciter,
  saveReciter,
} from "@/lib/audio/reciters";

interface AudioPlayerProps {
  surahNumber: number;
  onClose: () => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function AudioPlayer({ surahNumber, onClose }: AudioPlayerProps) {
  const surah = surahs.find((s) => s.number === surahNumber);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [reciter, setReciter] = useState<Reciter>(() => defaultReciter(surahNumber));
  const [listLoading, setListLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);

  const audioUrl = useMemo(
    () => getAudioUrl(reciter, surahNumber),
    [reciter, surahNumber]
  );

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  // استرجاع آخر قارئ اختاره المستخدم
  useEffect(() => {
    const saved = loadSavedReciter();
    if (saved) setReciter(saved);
  }, []);

  // تحميل قائمة القراء الكاملة
  useEffect(() => {
    let cancelled = false;
    loadReciters()
      .then((list) => {
        if (cancelled) return;
        setReciters(list);
        setListLoading(false);
        setReciter((current) => {
          const canonical = list.find((r) => r.id === current.id);
          if (canonical) return canonical;
          if (isReciterAvailable(current, surahNumber)) return current;
          return list.find((r) => isReciterAvailable(r, surahNumber)) ?? current;
        });
      })
      .catch(() => {
        if (!cancelled) setListLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [surahNumber]);

  // إعادة التهيئة عند تغيير القارئ أو السورة
  useEffect(() => {
    const audio = audioRef.current;
    setCurrentTime(0);
    setDuration(0);
    setError(null);

    if (!audio) return;

    if (!audioUrl) {
      audio.pause();
      setIsPlaying(false);
      setAudioLoading(false);
      return;
    }

    setAudioLoading(true);
    audio.load();
    if (playingRef.current) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [audioUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const filteredReciters = useMemo(() => {
    const q = query.trim();
    if (!q) return reciters;
    return reciters.filter(
      (r) => r.name.includes(q) || r.style.includes(q)
    );
  }, [reciters, query]);

  const available = isReciterAvailable(reciter, surahNumber);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    setError(null);
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setError("تعذّر تشغيل التلاوة، تحقّق من اتصالك بالإنترنت ثم حاول مجددًا.");
      }
    } else {
      audio.pause();
    }
  };

  const seekBy = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    const next = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration);
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const chooseReciter = (next: Reciter) => {
    setReciter(next);
    saveReciter(next);
    setPickerOpen(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      {pickerOpen && (
        <div className="border-t border-border bg-popover text-popover-foreground shadow-[0_-16px_50px_rgba(0,0,0,0.18)]">
          <div className="container max-w-4xl px-3 py-3 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold leading-tight">اختر القارئ</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {reciters.length > 0 ? `${reciters.length} تلاوة متاحة` : "جاري تحميل القائمة..."}
                  {listLoading && reciters.length > 0 ? " • يتم التحديث" : ""}
                </p>
              </div>
              <button
                onClick={() => setPickerOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                title="إغلاق قائمة القراء"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            <div className="relative mt-2.5">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث باسم القارئ أو الرواية..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-3 pr-9 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div className="mt-2 max-h-[45vh] overflow-y-auto overscroll-contain pb-1">
              {listLoading && reciters.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تحميل قائمة القراء...
                </div>
              ) : filteredReciters.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  لا توجد نتائج لـ «{query}»
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {filteredReciters.map((r) => {
                    const canPlay = isReciterAvailable(r, surahNumber);
                    const active = r.id === reciter.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => chooseReciter(r)}
                        disabled={!canPlay}
                        title={
                          canPlay
                            ? `${r.name} — ${r.style}`
                            : "لا يتوفر تسجيل لهذه السورة لدى هذا القارئ"
                        }
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-right transition ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-accent"
                        } ${!canPlay ? "cursor-not-allowed opacity-40" : ""}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.style}
                            {!canPlay ? " — غير متوفرة لهذه السورة" : ""}
                          </span>
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-border bg-background/95 shadow-[0_-6px_24px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container max-w-4xl px-3 py-2.5 sm:px-6">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button
              onClick={onClose}
              className="shrink-0 rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
              title="إغلاق المشغل"
            >
              <X className="h-5 w-5" />
            </button>

            <button
              onClick={() => setPickerOpen((v) => !v)}
              aria-expanded={pickerOpen}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-right transition hover:bg-accent"
              title="تغيير القارئ"
            >
              <Headphones className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  سورة {surah?.name ?? surahNumber}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {reciter.name} • {reciter.style}
                </span>
              </span>
              <ChevronUp
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  pickerOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setMuted((v) => !v)}
                className="hidden rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground sm:block"
                title={muted ? "إلغاء كتم الصوت" : "كتم الصوت"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => seekBy(-10)}
                disabled={!audioUrl}
                className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
                title="رجوع ١٠ ثوانٍ"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!audioUrl}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-40"
                title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
              >
                {audioLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 -scale-x-100" />
                )}
              </button>
              <button
                onClick={() => seekBy(10)}
                disabled={!audioUrl}
                className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-40"
                title="تقديم ١٠ ثوانٍ"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span className="w-9 shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (audioRef.current) audioRef.current.currentTime = value;
                setCurrentTime(value);
              }}
              disabled={!audioUrl || duration === 0}
              aria-label="موضع التلاوة"
              className="h-1.5 w-full cursor-pointer accent-primary disabled:cursor-default"
            />
            <span className="w-9 shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {formatTime(duration)}
            </span>
          </div>

          {error && (
            <p className="mt-1 truncate text-center text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          {!audioUrl && !error && (
            <p className="mt-1 text-center text-xs text-muted-foreground">
              لا يتوفر تسجيل لهذه السورة لدى هذا القارئ — اختر قارئًا آخر من القائمة.
            </p>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl ?? undefined}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onCanPlay={() => setAudioLoading(false)}
        onWaiting={() => setAudioLoading(true)}
        onPlaying={() => setAudioLoading(false)}
        onLoadedMetadata={(e) => {
          const value = e.currentTarget.duration;
          if (Number.isFinite(value)) setDuration(value);
          setAudioLoading(false);
        }}
        onDurationChange={(e) => {
          const value = e.currentTarget.duration;
          if (Number.isFinite(value)) setDuration(value);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onError={() => {
          if (!audioUrl) return;
          setError("تعذّر تحميل التلاوة. جرّب قارئًا آخر أو تحقّق من اتصالك بالإنترنت.");
          setAudioLoading(false);
          setIsPlaying(false);
        }}
      />
    </div>
  );
}
