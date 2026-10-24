export type Reciter = {
  /** معرّف فريد للقارئ + روايته */
  id: string;
  name: string;
  style: string;
  server: string;
  /** أرقام السور المتوفرة لهذه الرواية */
  surahs: number[];
};

const API_URL = "https://www.mp3quran.net/api/v3/reciters?language=ar";
const CACHE_KEY = "quran-reciters-v1";
const SELECTED_KEY = "quran-selected-reciter";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const ALL_SURAHS = Array.from({ length: 114 }, (_, i) => i + 1);

/** القراء الأكثر شهرة تظهر في أعلى القائمة */
const POPULAR_NAMES = [
  "مشاري العفاسي",
  "عبدالباسط عبدالصمد",
  "محمود خليل الحصري",
  "محمد صديق المنشاوي",
  "عبدالرحمن السديس",
  "سعود الشريم",
  "ماهر المعيقلي",
  "شيخ أبو بكر الشاطري",
  "محمد الطبلاوي",
  "أحمد بن علي العجمي",
  "سعد الغامدي",
  "ياسر الدوسري",
  "علي بن عبدالرحمن الحذيفي",
  "محمد أيوب",
  "إدريس أبكر",
  "إبراهيم الأخضر",
];

function priorityOf(name: string) {
  const index = POPULAR_NAMES.findIndex((n) => name.includes(n));
  return index === -1 ? POPULAR_NAMES.length : index;
}

function byPreference(a: Reciter, b: Reciter) {
  const pa = priorityOf(a.name);
  const pb = priorityOf(b.name);
  if (pa !== pb) return pa - pb;
  return a.name.localeCompare(b.name, "ar");
}

function reciterId(reciter: { id: number | string; name: string }, moshaf: { id: number | string; name: string }) {
  return `${reciter.id}-${moshaf.id}`;
}

/** قائمة احتياطية في حال تعذّر الوصول إلى الخدمة */
export const FALLBACK_RECITERS: Reciter[] = [
  { id: "alafasy-r1", name: "مشاري العفاسي", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/mishary-alafasy/r1/", surahs: ALL_SURAHS },
  { id: "abdulbasit-r3", name: "عبدالباسط عبدالصمد", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/abdulbasit-abdulsamad/r3/", surahs: ALL_SURAHS },
  { id: "husary-r1", name: "محمود خليل الحصري", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/mahmoud-husary/r1/", surahs: ALL_SURAHS },
  { id: "minshawi-r1", name: "محمد صديق المنشاوي", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/", surahs: ALL_SURAHS },
  { id: "sudais-r1", name: "عبدالرحمن السديس", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/abdulrahman-sudais/r1/", surahs: ALL_SURAHS },
  { id: "shuraim-r1", name: "سعود الشريم", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/saud-shuraim/r1/", surahs: ALL_SURAHS },
  { id: "muaiqly-r1", name: "ماهر المعيقلي", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/maher-muaiqly/r1/", surahs: ALL_SURAHS },
  { id: "shatri-r1", name: "شيخ أبو بكر الشاطري", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/abubakr-shatri/r1/", surahs: ALL_SURAHS },
  { id: "ajmi-r1", name: "أحمد بن علي العجمي", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/ahmad-ajmi/r1/", surahs: ALL_SURAHS },
  { id: "ghamdi-r1", name: "سعد الغامدي", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/saad-ghamdi/r1/", surahs: ALL_SURAHS },
  { id: "dosari-r1", name: "ياسر الدوسري", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/yasser-dosari/r1/", surahs: ALL_SURAHS },
  { id: "hudhaifi-r1", name: "علي بن عبدالرحمن الحذيفي", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/ali-hudhaifi/r1/", surahs: ALL_SURAHS },
  { id: "ayyub-r2", name: "محمد أيوب", style: "حفص عن عاصم - تلاوة مميزة", server: "https://cdn.mp3quran.net/audio/muhammad-ayyub/r2/", surahs: ALL_SURAHS },
  { id: "abkar-r1", name: "إدريس أبكر", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/idrees-abkar/r1/", surahs: ALL_SURAHS },
  { id: "akhdar-r1", name: "إبراهيم الأخضر", style: "حفص عن عاصم - مرتل", server: "https://cdn.mp3quran.net/audio/ibrahim-akhdar/r1/", surahs: ALL_SURAHS },
];

let memoryCache: Reciter[] | null = null;

function readCache(): Reciter[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: Reciter[] };
    if (!parsed?.savedAt || !Array.isArray(parsed.data) || parsed.data.length === 0) return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(data: Reciter[]) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    // تجاهل امتلاء مساحة التخزين
  }
}

/** تحميل قائمة القراء من mp3quran مع تخزين مؤقت */
export async function loadReciters(): Promise<Reciter[]> {
  if (memoryCache) return memoryCache;

  const cached = readCache();
  if (cached) {
    memoryCache = cached;
    return cached;
  }

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as {
      reciters?: Array<{
        id: number;
        name: string;
        moshaf?: Array<{
          id: number;
          name: string;
          server: string;
          surah_list?: string;
          surah_total?: number;
        }>;
      }>;
    };

    const list: Reciter[] = [];
    for (const reciter of json.reciters ?? []) {
      for (const moshaf of reciter.moshaf ?? []) {
        const surahs = (moshaf.surah_list ?? "")
          .split(",")
          .map((n) => parseInt(n, 10))
          .filter((n) => n >= 1 && n <= 114);
        if (!moshaf.server || surahs.length === 0) continue;
        list.push({
          id: reciterId(reciter, moshaf),
          name: reciter.name,
          style: moshaf.name,
          server: moshaf.server,
          surahs,
        });
      }
    }

    if (list.length === 0) throw new Error("empty list");
    list.sort(byPreference);
    memoryCache = list;
    writeCache(list);
    return list;
  } catch {
    const fallback = [...FALLBACK_RECITERS].sort(byPreference);
    memoryCache = fallback;
    return fallback;
  }
}

export function getAudioUrl(reciter: Reciter, surahNumber: number): string | null {
  if (!reciter.surahs.includes(surahNumber)) return null;
  return `${reciter.server}${String(surahNumber).padStart(3, "0")}.mp3`;
}

export function isReciterAvailable(reciter: Reciter, surahNumber: number) {
  return reciter.surahs.includes(surahNumber);
}

export function loadSavedReciter(): Reciter | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SELECTED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Reciter;
    if (!parsed?.server || !Array.isArray(parsed.surahs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveReciter(reciter: Reciter) {
  try {
    window.localStorage.setItem(SELECTED_KEY, JSON.stringify(reciter));
  } catch {
    // تجاهل
  }
}

export function defaultReciter(availableFor?: number): Reciter {
  const pool = FALLBACK_RECITERS.filter((r) => (availableFor ? r.surahs.includes(availableFor) : true));
  return pool[0] ?? FALLBACK_RECITERS[0];
}
