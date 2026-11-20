import {
  CompleteQuranDataset,
  DailyActivityRecord,
  MistakeLogEntry,
  QuranMetaIndex,
  ReadingPosition,
  UserSettings,
} from '../quran/quranTypes';

const DB_NAME = 'ZulxumorQuranDB';
const DB_VERSION = 1;

const STORES = {
  DATASET: 'dataset',
  PROGRESS: 'progress',
  META: 'userMeta',
  MISTAKES: 'mistakes',
  ACTIVITY: 'activity',
} as const;

export interface SavedPageProgress {
  page: number;
  verifiedIndices: number[];
  totalWords: number;
  completed: boolean;
  completedAt?: number;
  mistakesCount: number;
  correctedMistakesCount: number;
  updatedAt: number;
}

export interface DifficultAyahBookmark {
  key: string; // `${surah}:${ayah}`
  surah: number;
  surahName: string;
  ayah: number;
  page: number;
  arabicPreview: string;
  addedAt: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  vibrationEnabled: true,
  vibrationIntensity: 'medium',
  repeatedErrorDoublePulse: true,
  evaluationEngine: 'auto',
  strictness: 'standard',
  showTajweedLegend: true,
  fontSizeScale: 'large',
  autoContinueListening: true,
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORES.DATASET)) db.createObjectStore(STORES.DATASET);
      if (!db.objectStoreNames.contains(STORES.PROGRESS)) db.createObjectStore(STORES.PROGRESS, { keyPath: 'page' });
      if (!db.objectStoreNames.contains(STORES.META)) db.createObjectStore(STORES.META);
      if (!db.objectStoreNames.contains(STORES.MISTAKES)) db.createObjectStore(STORES.MISTAKES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(STORES.ACTIVITY)) db.createObjectStore(STORES.ACTIVITY, { keyPath: 'date' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open IndexedDB.'));
  });
}

async function idbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut<T>(storeName: string, value: T, key?: IDBValidKey): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = key !== undefined ? store.put(value, key) : store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedQuranDataset(): Promise<CompleteQuranDataset | null> {
  try {
    const data = await idbGet<CompleteQuranDataset>(STORES.DATASET, 'quran-complete-v1');
    return data ?? null;
  } catch {
    return null;
  }
}

export async function saveCachedQuranDataset(data: CompleteQuranDataset): Promise<void> {
  await idbPut(STORES.DATASET, data, 'quran-complete-v1');
}

export async function getCachedQuranMeta(): Promise<QuranMetaIndex | null> {
  try {
    const data = await idbGet<QuranMetaIndex>(STORES.DATASET, 'quran-meta-v1');
    return data ?? null;
  } catch {
    return null;
  }
}

export async function saveCachedQuranMeta(meta: QuranMetaIndex): Promise<void> {
  await idbPut(STORES.DATASET, meta, 'quran-meta-v1');
}

export async function getPageProgress(page: number): Promise<SavedPageProgress | null> {
  try {
    const row = await idbGet<SavedPageProgress>(STORES.PROGRESS, page);
    return row ?? null;
  } catch {
    return null;
  }
}

export async function savePageProgress(progress: SavedPageProgress): Promise<void> {
  await idbPut(STORES.PROGRESS, progress);
}

export async function getAllPageProgress(): Promise<SavedPageProgress[]> {
  try {
    return await idbGetAll<SavedPageProgress>(STORES.PROGRESS);
  } catch {
    return [];
  }
}

export async function getSettings(): Promise<UserSettings> {
  try {
    const saved = await idbGet<Partial<UserSettings>>(STORES.META, 'settings');
    return { ...DEFAULT_SETTINGS, ...(saved || {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await idbPut(STORES.META, settings, 'settings');
}

export async function getLastReadingPosition(): Promise<ReadingPosition> {
  try {
    const pos = await idbGet<ReadingPosition>(STORES.META, 'lastPosition');
    return pos ?? { page: 1, surah: 1, ayah: 1, wordIndex: 0, updatedAt: Date.now() };
  } catch {
    return { page: 1, surah: 1, ayah: 1, wordIndex: 0, updatedAt: Date.now() };
  }
}

export async function saveLastReadingPosition(pos: ReadingPosition): Promise<void> {
  await idbPut(STORES.META, pos, 'lastPosition');
}

export async function getFavoritePages(): Promise<number[]> {
  try {
    const favs = await idbGet<number[]>(STORES.META, 'favoritePages');
    return favs ?? [];
  } catch {
    return [];
  }
}

export async function toggleFavoritePage(page: number): Promise<number[]> {
  const current = await getFavoritePages();
  const exists = current.includes(page);
  const next = exists ? current.filter((p) => p !== page) : [...current, page].sort((a, b) => a - b);
  await idbPut(STORES.META, next, 'favoritePages');
  return next;
}

export async function getDifficultAyahs(): Promise<DifficultAyahBookmark[]> {
  try {
    const list = await idbGet<DifficultAyahBookmark[]>(STORES.META, 'difficultAyahs');
    return list ?? [];
  } catch {
    return [];
  }
}

export async function toggleDifficultAyah(item: DifficultAyahBookmark): Promise<DifficultAyahBookmark[]> {
  const current = await getDifficultAyahs();
  const exists = current.some((x) => x.key === item.key);
  const next = exists ? current.filter((x) => x.key !== item.key) : [item, ...current];
  await idbPut(STORES.META, next, 'difficultAyahs');
  return next;
}

export async function logMistakeEntry(entry: MistakeLogEntry): Promise<void> {
  const existing = await getAllMistakes();
  // Check if same surah/ayah/wordIndex exists recently to increment repeatCount
  const match = existing.find(
    (m) => m.surah === entry.surah && m.ayah === entry.ayah && m.wordIndex === entry.wordIndex && !m.corrected
  );
  if (match) {
    match.repeatCount += 1;
    match.timestamp = entry.timestamp;
    match.heardSegment = entry.heardSegment || match.heardSegment;
    match.letterError = entry.letterError || match.letterError;
    await idbPut(STORES.MISTAKES, match);
  } else {
    await idbPut(STORES.MISTAKES, entry);
  }
}

export async function markMistakeCorrected(surah: number, ayah: number, wordIndex: number): Promise<void> {
  const existing = await getAllMistakes();
  for (const m of existing) {
    if (m.surah === surah && m.ayah === ayah && m.wordIndex === wordIndex && !m.corrected) {
      m.corrected = true;
      await idbPut(STORES.MISTAKES, m);
    }
  }
}

export async function getAllMistakes(): Promise<MistakeLogEntry[]> {
  try {
    const all = await idbGetAll<MistakeLogEntry>(STORES.MISTAKES);
    return all.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function getTodayKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function recordDailyActivityDelta(delta: {
  verifiedWords?: number;
  ayahsCompleted?: number;
  pagesCompleted?: number;
  mistakesCount?: number;
  correctedCount?: number;
}): Promise<void> {
  const today = getTodayKey();
  const existing = await idbGet<DailyActivityRecord>(STORES.ACTIVITY, today);
  const updated: DailyActivityRecord = {
    date: today,
    verifiedWords: (existing?.verifiedWords ?? 0) + (delta.verifiedWords ?? 0),
    ayahsCompleted: (existing?.ayahsCompleted ?? 0) + (delta.ayahsCompleted ?? 0),
    pagesCompleted: (existing?.pagesCompleted ?? 0) + (delta.pagesCompleted ?? 0),
    mistakesCount: (existing?.mistakesCount ?? 0) + (delta.mistakesCount ?? 0),
    correctedCount: (existing?.correctedCount ?? 0) + (delta.correctedCount ?? 0),
  };
  await idbPut(STORES.ACTIVITY, updated);
}

export async function getAllDailyActivity(): Promise<DailyActivityRecord[]> {
  try {
    const rows = await idbGetAll<DailyActivityRecord>(STORES.ACTIVITY);
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}
