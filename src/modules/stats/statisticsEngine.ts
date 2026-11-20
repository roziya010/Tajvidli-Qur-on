import { DailyActivityRecord, MistakeLogEntry } from '../quran/quranTypes';
import { SavedPageProgress } from '../storage/offlineDb';

export interface UserStatisticsSummary {
  totalPagesCompleted: number;
  totalAyahsEstimated: number;
  totalVerifiedWords: number;
  totalMistakes: number;
  totalCorrectedMistakes: number;
  consecutiveDaysStreak: number;
  memorizationPercent: number;
  mostRepeatedWords: Array<{ word: string; surah: number; ayah: number; page: number; count: number }>;
  last14Days: DailyActivityRecord[];
}

export function computeStatisticsSummary(
  pageProgressList: SavedPageProgress[],
  mistakes: MistakeLogEntry[],
  dailyActivity: DailyActivityRecord[]
): UserStatisticsSummary {
  const totalPagesCompleted = pageProgressList.filter((p) => p.completed).length;
  const totalVerifiedWords = pageProgressList.reduce((acc, p) => acc + p.verifiedIndices.length, 0);
  const totalMistakes = mistakes.reduce((acc, m) => acc + Math.max(1, m.repeatCount), 0);
  const totalCorrectedMistakes = mistakes.filter((m) => m.corrected).length;

  // Roughly 10.3 ayahs per Mushaf page on average; exact count scales with verified pages
  const totalAyahsFromActivity = dailyActivity.reduce((acc, d) => acc + d.ayahsCompleted, 0);
  const totalAyahsEstimated = Math.max(totalAyahsFromActivity, Math.round(totalPagesCompleted * 10.3));

  // Consecutive reading days streak up to today/yesterday
  const activeDates = new Set(
    dailyActivity.filter((d) => d.verifiedWords > 0 || d.pagesCompleted > 0).map((d) => d.date)
  );
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 365; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
      cursor.getDate()
    ).padStart(2, '0')}`;
    if (activeDates.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      // Allow streak to continue if user hasn't read yet today but read yesterday
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Group repeated words
  const wordMap = new Map<string, { word: string; surah: number; ayah: number; page: number; count: number }>();
  for (const m of mistakes) {
    const k = `${m.surah}:${m.ayah}:${m.expectedWord}`;
    const existing = wordMap.get(k);
    if (existing) {
      existing.count += Math.max(1, m.repeatCount);
    } else {
      wordMap.set(k, {
        word: m.expectedWord,
        surah: m.surah,
        ayah: m.ayah,
        page: m.page,
        count: Math.max(1, m.repeatCount),
      });
    }
  }
  const mostRepeatedWords = Array.from(wordMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Build 14-day timeline
  const activityByDate = new Map(dailyActivity.map((d) => [d.date, d]));
  const last14Days: DailyActivityRecord[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    last14Days.push(
      activityByDate.get(key) ?? {
        date: key,
        verifiedWords: 0,
        ayahsCompleted: 0,
        pagesCompleted: 0,
        mistakesCount: 0,
        correctedCount: 0,
      }
    );
  }

  const memorizationPercent = Number(((totalPagesCompleted / 604) * 100).toFixed(1));

  return {
    totalPagesCompleted,
    totalAyahsEstimated,
    totalVerifiedWords,
    totalMistakes,
    totalCorrectedMistakes,
    consecutiveDaysStreak: streak,
    memorizationPercent,
    mostRepeatedWords,
    last14Days,
  };
}
