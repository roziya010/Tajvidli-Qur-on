import {
  CompleteQuranDataset,
  PageAyahBlock,
  QuranMetaIndex,
  TajweedWord,
} from './quranTypes';
import { buildTajweedWordsForAyah } from '../tajweed/tajweedParser';
import {
  getCachedQuranDataset,
  getCachedQuranMeta,
  saveCachedQuranDataset,
  saveCachedQuranMeta,
} from '../storage/offlineDb';

let inMemoryDataset: CompleteQuranDataset | null = null;
let inMemoryMeta: QuranMetaIndex | null = null;

export interface DatasetLoadStatus {
  stage: 'checking_cache' | 'downloading' | 'indexing' | 'ready' | 'error';
  progressPercent: number;
  fromOfflineCache: boolean;
  message: string;
}

export async function loadQuranMeta(): Promise<QuranMetaIndex> {
  if (inMemoryMeta) return inMemoryMeta;
  const cached = await getCachedQuranMeta();
  if (cached) {
    inMemoryMeta = cached;
    return cached;
  }
  const res = await fetch('/data/quran-meta.json');
  if (!res.ok) throw new Error("Qur'on navigatsiya ma'lumotlarini yuklab bo'lmadi.");
  const meta = (await res.json()) as QuranMetaIndex;
  inMemoryMeta = meta;
  await saveCachedQuranMeta(meta).catch(() => undefined);
  return meta;
}

export async function loadCompleteQuranDataset(
  onStatus?: (status: DatasetLoadStatus) => void
): Promise<CompleteQuranDataset> {
  if (inMemoryDataset) {
    onStatus?.({
      stage: 'ready',
      progressPercent: 100,
      fromOfflineCache: true,
      message: "To'liq tasdiqlangan Qur'on (114 sura · 6 236 oyat · 604 sahifa) tayyor.",
    });
    return inMemoryDataset;
  }

  onStatus?.({
    stage: 'checking_cache',
    progressPercent: 10,
    fromOfflineCache: false,
    message: 'Mahalliy oflayn Mushaf xotirasi tekshirilmoqda…',
  });

  const cached = await getCachedQuranDataset();
  if (cached && cached.totalSurahs === 114 && cached.totalAyahs === 6236) {
    inMemoryDataset = cached;
    onStatus?.({
      stage: 'ready',
      progressPercent: 100,
      fromOfflineCache: true,
      message: "To'liq Qur'on mahalliy oflayn xotiradan yuklandi.",
    });
    return cached;
  }

  onStatus?.({
    stage: 'downloading',
    progressPercent: 25,
    fromOfflineCache: false,
    message: "Oflayn foydalanish uchun to'liq Usmoniy va Tajvid Qur'on to'plami yuklanmoqda…",
  });

  const res = await fetch('/data/quran-complete.json');
  if (!res.ok) {
    throw new Error("Qur'on ma'lumotlar bazasini yuklab bo'lmadi (/data/quran-complete.json).");
  }

  const contentLength = Number(res.headers.get('content-length') || 0);
  let text = '';

  if (res.body && contentLength > 0) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      text += decoder.decode(value, { stream: true });
      const pct = Math.min(88, 25 + Math.round((received / contentLength) * 63));
      onStatus?.({
        stage: 'downloading',
        progressPercent: pct,
        fromOfflineCache: false,
        message: `To'liq Mushaf oflayn o'rnatilmoqda (${Math.round(received / 1024)} KB)…`,
      });
    }
    text += decoder.decode();
  } else {
    text = await res.text();
  }

  onStatus?.({
    stage: 'indexing',
    progressPercent: 92,
    fromOfflineCache: false,
    message: "Tasdiqlangan Qur'on matni oflayn IndexedDB xotirasiga saqlanmoqda…",
  });

  const dataset = JSON.parse(text) as CompleteQuranDataset;
  inMemoryDataset = dataset;
  await saveCachedQuranDataset(dataset).catch(() => undefined);

  onStatus?.({
    stage: 'ready',
    progressPercent: 100,
    fromOfflineCache: true,
    message: "30 juzlik to'liq Usmoniy va Tajvid Qur'on oflayn rejimda tayyor.",
  });

  return dataset;
}

export function getPageBlocksFromDataset(
  dataset: CompleteQuranDataset,
  pageNumber: number
): { blocks: PageAyahBlock[]; words: TajweedWord[]; juz: number } {
  const clamped = Math.max(1, Math.min(604, pageNumber));
  const blocks: PageAyahBlock[] = [];
  const allWords: TajweedWord[] = [];
  let pageJuz = 1;

  for (const surah of dataset.surahs) {
    // Fast skip if no ayahs on this page
    const firstPage = surah.ayahs[0]?.p ?? 0;
    const lastPage = surah.ayahs[surah.ayahs.length - 1]?.p ?? 0;
    if (clamped < firstPage || clamped > lastPage) continue;

    for (const ayah of surah.ayahs) {
      if (ayah.p !== clamped) continue;
      pageJuz = ayah.j;
      const words = buildTajweedWordsForAyah(ayah.t, surah.n, ayah.n, allWords.length);
      allWords.push(...words);
      blocks.push({
        surah: surah.n,
        surahName: surah.name,
        surahEn: surah.en,
        ayahNumber: ayah.n,
        globalAyah: ayah.g,
        juz: ayah.j,
        page: ayah.p,
        sajda: ayah.sj,
        isFirstAyahOfSurah: ayah.n === 1,
        revelationType: surah.rev,
        words,
      });
    }
  }

  return { blocks, words: allWords, juz: pageJuz };
}

export function findPageForAyah(
  dataset: CompleteQuranDataset,
  surahNum: number,
  ayahNum: number
): number {
  const surah = dataset.surahs.find((s) => s.n === surahNum);
  if (!surah) return 1;
  const ayah = surah.ayahs.find((a) => a.n === ayahNum) || surah.ayahs[0];
  return ayah?.p ?? 1;
}
