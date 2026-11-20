export type TajweedRuleCode =
  | 'h' // Hamzat al-Wasl
  | 'l' // Lam Shamsiyyah
  | 's' // Silent letter
  | 'n' // Madd Asli (Normal 2 counts)
  | 'p' // Madd Arid lis-Sukun (2/4/6 counts)
  | 'o' // Madd Ja'iz / Wajib (4-5 counts)
  | 'm' // Madd Lazim (6 counts)
  | 'g' // Ghunna
  | 'q' // Qalqalah
  | 'f' // Ikhfa
  | 'c' // Ikhfa Shafawi
  | 'i' // Iqlab
  | 'a' // Idgham with Ghunna
  | 'u' // Idgham without Ghunna
  | 'w' // Idgham Shafawi
  | 'd' // Idgham Mutajanisayn
  | 'b'; // Idgham Mutaqaribayn

export interface TajweedSegment {
  text: string;
  rule: TajweedRuleCode | null;
}

export interface TajweedWord {
  wordIndex: number; // 0-based index on the current page
  surah: number;
  ayah: number;
  wordInAyah: number;
  uthmani: string; // Exact original Uthmani word (never modified)
  normalized: string; // Stripped diacritics for comparison only
  segments: TajweedSegment[];
  rulesPresent: TajweedRuleCode[];
}

export interface RawQuranAyah {
  n: number; // numberInSurah
  g: number; // global ayah number 1..6236
  j: number; // juz 1..30
  p: number; // page 1..604
  sj: boolean; // sajda
  t: string; // tajweed-bracketed text
  u: string; // clean uthmani text
}

export interface RawQuranSurah {
  n: number; // 1..114
  name: string;
  en: string;
  tr: string;
  rev: 'Meccan' | 'Medinan';
  ayahs: RawQuranAyah[];
}

export interface CompleteQuranDataset {
  edition: string;
  totalSurahs: number;
  totalAyahs: number;
  totalPages: number;
  totalJuz: number;
  surahs: RawQuranSurah[];
}

export interface SurahMeta {
  n: number;
  name: string;
  en: string;
  tr: string;
  rev: 'Meccan' | 'Medinan';
  count: number;
  startPage: number;
  endPage: number;
  startJuz: number;
}

export interface QuranMetaIndex {
  surahs: SurahMeta[];
  juzStarts: Record<string, { surah: number; ayah: number; page: number }>;
  pageStarts: Record<
    string,
    { surah: number; ayah: number; juz: number; surahName: string; surahEn: string }
  >;
}

export interface PageAyahBlock {
  surah: number;
  surahName: string;
  surahEn: string;
  ayahNumber: number;
  globalAyah: number;
  juz: number;
  page: number;
  sajda: boolean;
  isFirstAyahOfSurah: boolean;
  revelationType: 'Meccan' | 'Medinan';
  words: TajweedWord[];
}

export type WordLockStatus = 'unread' | 'active' | 'verified' | 'error';

export type MicrophoneState =
  | 'ready'
  | 'requesting_permission'
  | 'listening'
  | 'processing'
  | 'correct'
  | 'error'
  | 'paused'
  | 'stopped';

export interface LetterErrorDetail {
  letterConfidence: 'high' | 'medium' | 'word_only';
  expectedLetter: string;
  heardLetter: string;
  letterPositionInWord: number;
  makhrajCategory: string;
  sifatNote: string;
  coachingTip: string;
}

export interface WordEvaluationResult {
  wordIndex: number;
  expectedWord: string;
  status: 'correct' | 'incorrect' | 'uncertain' | 'not_reached';
  confidence: number;
  heardSegment: string;
  mistakeReason: string;
  letterError?: LetterErrorDetail;
}

export interface RecitationEvaluationResponse {
  audioQuality: 'clear' | 'weak' | 'noisy' | 'silent';
  heardArabic: string;
  wordEvaluations: WordEvaluationResult[];
  overallFeedback: string;
  engineUsed: 'ai-acoustic' | 'offline-phonetic';
}

export interface ReadingLockState {
  page: number;
  totalWords: number;
  currentWordIndex: number;
  wordStatuses: WordLockStatus[];
  lockedOnError: boolean;
  consecutiveErrorsOnCurrentWord: number;
  activeError: {
    wordIndex: number;
    surah: number;
    ayah: number;
    expectedWord: string;
    heardSegment: string;
    reason: string;
    letterError?: LetterErrorDetail;
  } | null;
  verifiedCount: number;
  mistakesCount: number;
  correctedMistakesCount: number;
  isPageCompleted: boolean;
}

export interface MistakeLogEntry {
  id: string;
  timestamp: number;
  surah: number;
  surahName: string;
  ayah: number;
  page: number;
  wordIndex: number;
  expectedWord: string;
  heardSegment: string;
  reason: string;
  letterError?: LetterErrorDetail;
  corrected: boolean;
  repeatCount: number;
}

export interface DailyActivityRecord {
  date: string; // YYYY-MM-DD
  verifiedWords: number;
  ayahsCompleted: number;
  pagesCompleted: number;
  mistakesCount: number;
  correctedCount: number;
}

export interface UserSettings {
  vibrationEnabled: boolean;
  vibrationIntensity: 'light' | 'medium' | 'strong';
  repeatedErrorDoublePulse: boolean;
  evaluationEngine: 'auto' | 'ai-acoustic' | 'offline-phonetic';
  strictness: 'standard' | 'strict';
  showTajweedLegend: boolean;
  fontSizeScale: 'normal' | 'large' | 'xlarge';
  autoContinueListening: boolean;
}

export interface ReadingPosition {
  page: number;
  surah: number;
  ayah: number;
  wordIndex: number;
  updatedAt: number;
}
