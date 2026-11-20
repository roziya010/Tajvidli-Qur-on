import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Info,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import {
  CompleteQuranDataset,
  MicrophoneState,
  QuranMetaIndex,
  ReadingLockState,
  TajweedWord,
  UserSettings,
} from '../quran/quranTypes';
import { findPageForAyah, getPageBlocksFromDataset } from '../quran/quranData';
import { TAJWEED_RULES } from '../tajweed/tajweedParser';
import {
  applyEvaluationToReadingLock,
  createReadingLockState,
  resetReadingLockState,
} from '../progression/readingLock';
import { CapturedAudioSegment, MicrophoneCaptureSession } from '../audio/microphoneCapture';
import { evaluateAudioSegment } from '../speech/recitationRecognizer';
import { triggerErrorVibration } from '../haptics/vibrationFeedback';
import {
  DifficultAyahBookmark,
  getPageProgress,
  logMistakeEntry,
  markMistakeCorrected,
  recordDailyActivityDelta,
  saveLastReadingPosition,
  savePageProgress,
} from '../storage/offlineDb';
import { TajweedWordView } from './TajweedWordView';
import { CompletionCelebration } from './CompletionCelebration';

interface MushafReaderProps {
  dataset: CompleteQuranDataset;
  meta: QuranMetaIndex;
  currentPage: number;
  settings: UserSettings;
  isOnline: boolean;
  favoritePages: number[];
  difficultAyahs: DifficultAyahBookmark[];
  onPageChange: (page: number) => void;
  onToggleFavoritePage: (page: number) => void;
  onToggleDifficultAyah: (item: DifficultAyahBookmark) => void;
  onProgressUpdated: () => void;
}

function toArabicNumerals(num: number): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map((d) => digits[Number(d)] ?? d)
    .join('');
}

const FONT_SIZE_CLASSES: Record<UserSettings['fontSizeScale'], string> = {
  normal: 'text-2xl sm:text-[28px] leading-[2.4]',
  large: 'text-[28px] sm:text-[34px] leading-[2.5]',
  xlarge: 'text-[34px] sm:text-[40px] leading-[2.6]',
};

const NAV_TAB_LABELS: Record<'surah' | 'juz' | 'page' | 'ayah', string> = {
  surah: 'Sura',
  juz: 'Juz',
  page: 'Sahifa',
  ayah: 'Oyat',
};

export const MushafReader: React.FC<MushafReaderProps> = ({
  dataset,
  meta,
  currentPage,
  settings,
  isOnline,
  favoritePages,
  difficultAyahs,
  onPageChange,
  onToggleFavoritePage,
  onToggleDifficultAyah,
  onProgressUpdated,
}) => {
  const { blocks, words, juz } = useMemo(
    () => getPageBlocksFromDataset(dataset, currentPage),
    [dataset, currentPage]
  );

  const [lockState, setLockState] = useState<ReadingLockState>(() =>
    createReadingLockState(currentPage, words)
  );
  const [micState, setMicState] = useState<MicrophoneState>('ready');
  const [waveform, setWaveform] = useState<number[]>(new Array(24).fill(0.08));
  const [statusMessage, setStatusMessage] = useState<string>(
    "Mikrofon tugmasini bosing va qiroat qiling. So'zlar tasdiqlangach tajvid ranglari ochiladi."
  );
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  const [lastHeardText, setLastHeardText] = useState<string>('');
  const [showCelebration, setShowCelebration] = useState<boolean>(false);
  const [showNavigator, setShowNavigator] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [inspectedWord, setInspectedWord] = useState<TajweedWord | null>(null);

  const [navTab, setNavTab] = useState<'surah' | 'juz' | 'page' | 'ayah'>('surah');
  const [surahQuery, setSurahQuery] = useState('');
  const [jumpPageInput, setJumpPageInput] = useState(String(currentPage));
  const [jumpSurah, setJumpSurah] = useState(blocks[0]?.surah || 1);
  const [jumpAyah, setJumpAyah] = useState(1);

  const micSessionRef = useRef<MicrophoneCaptureSession | null>(null);
  const speechRecRef = useRef<{ stop: () => void } | null>(null);
  const latestTranscriptRef = useRef<string>('');
  const lockStateRef = useRef<ReadingLockState>(lockState);
  lockStateRef.current = lockState;
  const wordsRef = useRef<TajweedWord[]>(words);
  wordsRef.current = words;
  const settingsRef = useRef<UserSettings>(settings);
  settingsRef.current = settings;
  const isOnlineRef = useRef<boolean>(isOnline);
  isOnlineRef.current = isOnline;
  const isEvaluatingRef = useRef<boolean>(false);

  useEffect(() => {
    let active = true;
    setShowCelebration(false);
    setInspectedWord(null);
    setJumpPageInput(String(currentPage));

    if (micSessionRef.current) {
      micSessionRef.current.stop();
      micSessionRef.current = null;
    }
    if (speechRecRef.current) {
      speechRecRef.current.stop();
      speechRecRef.current = null;
    }
    setMicState('ready');

    void (async () => {
      const saved = await getPageProgress(currentPage);
      if (!active) return;
      const initial = createReadingLockState(
        currentPage,
        words,
        saved?.verifiedIndices ?? []
      );
      if (saved) {
        initial.mistakesCount = saved.mistakesCount;
        initial.correctedMistakesCount = saved.correctedMistakesCount;
      }
      setLockState(initial);
      const focusWord = words[initial.currentWordIndex] || words[0];
      if (focusWord) {
        await saveLastReadingPosition({
          page: currentPage,
          surah: focusWord.surah,
          ayah: focusWord.ayah,
          wordIndex: initial.currentWordIndex,
          updatedAt: Date.now(),
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [currentPage, words]);

  useEffect(() => {
    return () => {
      micSessionRef.current?.stop();
      speechRecRef.current?.stop();
      if (lastAudioUrl) URL.revokeObjectURL(lastAudioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistLockState = useCallback(
    async (
      nextState: ReadingLockState,
      verifiedDelta: number,
      mistakesDelta: number,
      correctedDelta: number,
      justCompleted: boolean
    ) => {
      const verifiedIndices = nextState.wordStatuses
        .map((st, idx) => (st === 'verified' ? idx : -1))
        .filter((idx) => idx !== -1);

      await savePageProgress({
        page: currentPage,
        verifiedIndices,
        totalWords: nextState.totalWords,
        completed: nextState.isPageCompleted,
        completedAt: nextState.isPageCompleted ? Date.now() : undefined,
        mistakesCount: nextState.mistakesCount,
        correctedMistakesCount: nextState.correctedMistakesCount,
        updatedAt: Date.now(),
      });

      const currentWord = wordsRef.current[Math.min(nextState.currentWordIndex, wordsRef.current.length - 1)];
      if (currentWord) {
        await saveLastReadingPosition({
          page: currentPage,
          surah: currentWord.surah,
          ayah: currentWord.ayah,
          wordIndex: nextState.currentWordIndex,
          updatedAt: Date.now(),
        });
      }

      if (verifiedDelta > 0 || mistakesDelta > 0 || correctedDelta > 0 || justCompleted) {
        await recordDailyActivityDelta({
          verifiedWords: verifiedDelta,
          ayahsCompleted: justCompleted ? blocks.length : 0,
          pagesCompleted: justCompleted ? 1 : 0,
          mistakesCount: mistakesDelta,
          correctedCount: correctedDelta,
        });
      }

      onProgressUpdated();
    },
    [blocks.length, currentPage, onProgressUpdated]
  );

  const handleSegmentCaptured = useCallback(
    async (segment: CapturedAudioSegment) => {
      if (isEvaluatingRef.current) return;
      const currentState = lockStateRef.current;
      const pageWords = wordsRef.current;

      if (currentState.isPageCompleted || currentState.currentWordIndex >= pageWords.length) {
        return;
      }

      isEvaluatingRef.current = true;
      micSessionRef.current?.setPaused(true);
      setMicState('processing');
      setStatusMessage('Talaffuz va maxrajlar tekshirilmoqda…');

      setLastAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return segment.audioUrl;
      });

      const expectedWindow = pageWords.slice(
        currentState.currentWordIndex,
        currentState.currentWordIndex + 8
      );

      try {
        const transcriptSnapshot = latestTranscriptRef.current;
        latestTranscriptRef.current = '';

        const evaluation = await evaluateAudioSegment(
          segment,
          expectedWindow,
          settingsRef.current,
          isOnlineRef.current,
          transcriptSnapshot
        );

        setLastHeardText(evaluation.heardArabic || '');

        const outcome = applyEvaluationToReadingLock(currentState, pageWords, evaluation);
        setLockState(outcome.nextState);

        if (outcome.events.uncertainAudio) {
          setMicState('paused');
          setStatusMessage(
            evaluation.overallFeedback ||
              "Ovoz yetarlicha aniq eshitilmadi. Iltimos, belgilangan so'zni qaytadan aniq o'qing."
          );
        } else if (outcome.events.errorTriggered && outcome.nextState.activeError) {
          setMicState('error');
          const err = outcome.nextState.activeError;
          const surahMeta = meta.surahs.find((s) => s.n === err.surah);

          await triggerErrorVibration(settingsRef.current, outcome.events.isRepeatedError);

          await logMistakeEntry({
            id: `${err.surah}:${err.ayah}:${err.wordIndex}:${Date.now()}`,
            timestamp: Date.now(),
            surah: err.surah,
            surahName: surahMeta?.en || `${err.surah}-sura`,
            ayah: err.ayah,
            page: currentPage,
            wordIndex: err.wordIndex,
            expectedWord: err.expectedWord,
            heardSegment: err.heardSegment,
            reason: err.reason,
            letterError: err.letterError,
            corrected: false,
            repeatCount: 1,
          });

          const hasLetter =
            err.letterError &&
            (err.letterError.letterConfidence === 'high' ||
              err.letterError.letterConfidence === 'medium');

          setStatusMessage(
            hasLetter
              ? "Talaffuzda xatolik aniqlandi. Iltimos, belgilangan harfni qaytadan o'qing."
              : "Talaffuzda xatolik bo'lishi mumkin. Iltimos, ushbu so'zni qaytadan o'qing."
          );

          await persistLockState(outcome.nextState, outcome.events.verifiedWordIndices.length, 1, 0, false);

          if (!settingsRef.current.autoContinueListening) {
            micSessionRef.current?.stop();
          }
        } else if (outcome.events.verifiedWordIndices.length > 0) {
          if (outcome.events.correctedErrorOnWord) {
            const firstCorrected = pageWords[outcome.events.verifiedWordIndices[0]];
            if (firstCorrected) {
              await markMistakeCorrected(
                firstCorrected.surah,
                firstCorrected.ayah,
                firstCorrected.wordIndex
              );
            }
          }

          setMicState('correct');
          setStatusMessage(
            outcome.events.pageJustCompleted
              ? "MashaAlloh! Sahifadagi barcha so'zlar tasdiqlandi."
              : outcome.events.correctedErrorOnWord
                ? "To'g'ri tuzatildi! Keyingi so'zga o'tilmoqda…"
                : `${outcome.events.verifiedWordIndices.length} ta so'z haqiqiy tajvid ranglari bilan tasdiqlandi.`
          );

          await persistLockState(
            outcome.nextState,
            outcome.events.verifiedWordIndices.length,
            0,
            outcome.events.correctedErrorOnWord ? 1 : 0,
            outcome.events.pageJustCompleted
          );

          if (outcome.events.pageJustCompleted) {
            micSessionRef.current?.stop();
            speechRecRef.current?.stop();
            setShowCelebration(true);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Baholashda xatolik yuz berdi.';
        setMicState('paused');
        setStatusMessage(msg);
      } finally {
        isEvaluatingRef.current = false;
        if (micSessionRef.current && !lockStateRef.current.isPageCompleted) {
          micSessionRef.current.setPaused(false);
          setMicState((prev) => (prev === 'processing' ? 'listening' : prev));
        }
      }
    },
    [currentPage, meta.surahs, persistLockState]
  );

  const startWebSpeechParallel = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;

    if (!SpeechRec) return;
    try {
      const rec = new SpeechRec();
      rec.lang = 'ar-SA';
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = (event: any) => {
        let txt = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            txt += ' ' + event.results[i][0].transcript;
          }
        }
        if (txt.trim()) {
          latestTranscriptRef.current = (latestTranscriptRef.current + ' ' + txt).trim();
        }
      };
      rec.onerror = () => undefined;
      rec.start();
      speechRecRef.current = rec;
    } catch {
      // Ixtiyoriy qo'shimcha transkripsiya
    }
  };

  const handleToggleMic = async () => {
    if (micState === 'listening' || micState === 'correct' || micState === 'error' || micState === 'paused') {
      if (micSessionRef.current) {
        await micSessionRef.current.stopAndFlush();
        micSessionRef.current = null;
        speechRecRef.current?.stop();
        speechRecRef.current = null;
        setMicState('stopped');
        setStatusMessage("Mikrofon to'xtatildi. Davom etish uchun yana bosing.");
        return;
      }
    }

    if (lockState.isPageCompleted) {
      setShowCelebration(true);
      return;
    }

    setMicState('requesting_permission');
    setStatusMessage("Mikrofonga ruxsat so'ralmoqda…");

    const session = new MicrophoneCaptureSession({
      onWaveform: (levels) => setWaveform(levels),
      onSegmentCaptured: (seg) => void handleSegmentCaptured(seg),
      onError: (msg) => {
        setMicState('stopped');
        setStatusMessage(msg);
      },
      onStateChange: (listening) => {
        if (listening) {
          setMicState('listening');
          setStatusMessage("Tinglanmoqda… Ravon o'qing va har bir jumladan so'ng qisqa pauza qiling.");
        }
      },
    });

    micSessionRef.current = session;
    const ok = await session.start();
    if (ok) {
      startWebSpeechParallel();
    } else {
      micSessionRef.current = null;
    }
  };

  const handleEvaluateNow = async () => {
    if (micSessionRef.current) {
      await micSessionRef.current.flushSegment();
    }
  };

  const handleResetPage = async () => {
    micSessionRef.current?.stop();
    micSessionRef.current = null;
    speechRecRef.current?.stop();
    speechRecRef.current = null;
    const reset = resetReadingLockState(currentPage, words);
    setLockState(reset);
    setShowCelebration(false);
    setMicState('ready');
    setStatusMessage("Sahifa boshidan och kulrang holatga qaytarildi. Qayta boshlash uchun mikrofonni bosing.");
    await savePageProgress({
      page: currentPage,
      verifiedIndices: [],
      totalWords: words.length,
      completed: false,
      mistakesCount: 0,
      correctedMistakesCount: 0,
      updatedAt: Date.now(),
    });
    onProgressUpdated();
  };

  const isFavorite = favoritePages.includes(currentPage);
  const pageCompletionPct =
    lockState.totalWords > 0
      ? Math.round((lockState.verifiedCount / lockState.totalWords) * 100)
      : 0;

  const isMicActive =
    micState === 'listening' ||
    micState === 'processing' ||
    micState === 'correct' ||
    micState === 'error' ||
    micState === 'paused';

  const filteredSurahs = useMemo(() => {
    const q = surahQuery.trim().toLowerCase();
    if (!q) return meta.surahs;
    return meta.surahs.filter(
      (s) =>
        s.en.toLowerCase().includes(q) ||
        s.tr.toLowerCase().includes(q) ||
        s.name.includes(q) ||
        String(s.n) === q
    );
  }, [meta.surahs, surahQuery]);

  const selectedJumpSurahMeta = meta.surahs.find((s) => s.n === jumpSurah) || meta.surahs[0];

  const surahGroups = useMemo(() => {
    const groups: Array<{
      surah: number;
      surahName: string;
      surahEn: string;
      revelationType: 'Meccan' | 'Medinan';
      ayahs: typeof blocks;
    }> = [];
    for (const block of blocks) {
      const last = groups[groups.length - 1];
      if (!last || last.surah !== block.surah) {
        groups.push({
          surah: block.surah,
          surahName: block.surahName,
          surahEn: block.surahEn,
          revelationType: block.revelationType,
          ayahs: [block],
        });
      } else {
        last.ayahs.push(block);
      }
    }
    return groups;
  }, [blocks]);

  return (
    <div className="space-y-4 pb-52 lg:pb-44">
      {/* Mushaf Sahifasi Boshqaruv Paneli */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E4DEC9] bg-[#F4EFE4] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowNavigator(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/50 bg-[#FAF6EE] px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#1E1B16] hover:bg-[#EFE9DA] transition-colors min-h-[44px] whitespace-nowrap cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#065F46]" aria-hidden="true" />
            <span>
              {blocks[0]?.surahEn || 'Al-Fotiha'} · {juz}-juz · {currentPage}-sahifa
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-xs text-[#5C574B] mr-2 tabular-nums">
            <span>
              Tasdiqlandi {lockState.verifiedCount}/{lockState.totalWords}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-[#065F46]">{pageCompletionPct}%</span>
          </div>

          <button
            type="button"
            onClick={() => onToggleFavoritePage(currentPage)}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
              isFavorite
                ? 'border-[#B4892B] bg-[#D4AF37]/15 text-[#9E7A1B]'
                : 'border-[#E4DEC9] bg-[#FAF6EE] text-[#5C574B] hover:text-[#1E1B16]'
            }`}
            aria-label={isFavorite ? 'Sahifani sevimlilardan olib tashlash' : 'Sahifani sevimlilarga saqlash'}
            title="Sevimli sahifa sifatida saqlash"
          >
            <Bookmark className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={() => setShowLegend((v) => !v)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#E4DEC9] bg-[#FAF6EE] text-[#5C574B] hover:text-[#1E1B16] transition-colors cursor-pointer"
            aria-label="Tajvid ranglari qo'llanmasini ko'rsatish"
            title="Tajvid ranglari qo'llanmasi"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => void handleResetPage()}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#E4DEC9] bg-[#FAF6EE] text-[#5C574B] hover:text-[#1E1B16] transition-colors cursor-pointer"
            aria-label="Sahifani qaytadan boshlash"
            title="Sahifani boshidan takrorlash"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#E4DEC9] bg-[#FAF6EE] text-[#1E1B16] disabled:opacity-40 hover:bg-[#EFE9DA] cursor-pointer"
              aria-label="Oldingi Qur'on sahifasi"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={currentPage >= 604}
              onClick={() => onPageChange(currentPage + 1)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#E4DEC9] bg-[#FAF6EE] text-[#1E1B16] disabled:opacity-40 hover:bg-[#EFE9DA] cursor-pointer"
              aria-label="Keyingi Qur'on sahifasi"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sahifa Jarayoni Chizig'i */}
      <div className="h-1.5 w-full rounded-full bg-[#E4DEC9] overflow-hidden">
        <div
          className="h-full bg-[#065F46] transition-all duration-300"
          style={{ width: `${pageCompletionPct}%` }}
        />
      </div>

      {/* Tajvid Ranglari Jadvali */}
      {showLegend && (
        <div className="rounded-2xl border border-[#E4DEC9] bg-[#F4EFE4] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1E1B16]">
              Haqiqiy Tajvid Ranglari Qo&rsquo;llanmasi
            </h3>
            <button
              type="button"
              onClick={() => setShowLegend(false)}
              className="text-xs text-[#5C574B] hover:text-[#1E1B16] cursor-pointer"
            >
              Yopish
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {(['g', 'q', 'f', 'a', 'i', 'n', 'o', 'm'] as const).map((code) => {
              const rule = TAJWEED_RULES[code];
              return (
                <div key={code} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: rule.color }}
                  />
                  <span className="text-[#1E1B16] truncate">{rule.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* An'anaviy Naqshinkor Mushaf Sahifasi */}
      <article
        className="relative rounded-3xl border-2 border-[#D4AF37]/45 bg-[#FFFDF8] p-5 sm:p-10 shadow-sm"
        aria-label={`Qur'on Mushafi ${currentPage}-sahifa`}
      >
        <div className="pointer-events-none absolute inset-2.5 rounded-2xl border border-[#D4AF37]/25" />

        <div className="relative z-10 space-y-8">
          {surahGroups.map((group) => {
            const startsAtAyahOne = group.ayahs[0]?.isFirstAyahOfSurah;
            const showBismillahBanner = startsAtAyahOne && group.surah !== 1 && group.surah !== 9;
            const sMeta = meta.surahs.find((s) => s.n === group.surah);

            return (
              <div key={group.surah} className="space-y-5">
                {startsAtAyahOne && (
                  <div className="rounded-2xl border border-[#D4AF37]/50 bg-[#F4EFE4] px-5 py-4 text-center space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#5C574B]">
                      <span>{group.revelationType === 'Meccan' ? 'Makkiy' : 'Madaniy'}</span>
                      <span className="font-semibold text-[#065F46]">{group.surahEn}</span>
                      <span className="tabular-nums">{sMeta?.count ?? group.ayahs.length} oyat</span>
                    </div>
                    <h2 dir="rtl" lang="ar" className="font-quran text-3xl sm:text-4xl text-[#065F46]">
                      {group.surahName}
                    </h2>
                  </div>
                )}

                {showBismillahBanner && (
                  <p
                    dir="rtl"
                    lang="ar"
                    className="font-quran text-2xl sm:text-3xl text-center text-[#1E1B16]/85 py-1"
                  >
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </p>
                )}

                {/* Asl Arabcha Usmoniy Matn */}
                <div
                  dir="rtl"
                  lang="ar"
                  className={`font-quran text-right select-none ${FONT_SIZE_CLASSES[settings.fontSizeScale]}`}
                >
                  {group.ayahs.map((ayah) => {
                    const isDiff = difficultAyahs.some(
                      (d) => d.surah === ayah.surah && d.ayah === ayah.ayahNumber
                    );
                    const ayahCompleted = ayah.words.every(
                      (w) => lockState.wordStatuses[w.wordIndex] === 'verified'
                    );

                    return (
                      <React.Fragment key={ayah.globalAyah}>
                        {ayah.words.map((word) => {
                          const st = lockState.wordStatuses[word.wordIndex] ?? 'unread';
                          const errDetail =
                            st === 'error' && lockState.activeError?.wordIndex === word.wordIndex
                              ? lockState.activeError.letterError
                              : undefined;
                          return (
                            <React.Fragment key={word.wordIndex}>
                              <TajweedWordView
                                word={word}
                                status={st}
                                letterError={errDetail}
                                onSelectWord={(w) => setInspectedWord(w)}
                              />{' '}
                            </React.Fragment>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() =>
                            onToggleDifficultAyah({
                              key: `${ayah.surah}:${ayah.ayahNumber}`,
                              surah: ayah.surah,
                              surahName: ayah.surahEn,
                              ayah: ayah.ayahNumber,
                              page: currentPage,
                              arabicPreview: ayah.words.map((w) => w.uthmani).join(' '),
                              addedAt: Date.now(),
                            })
                          }
                          title={
                            isDiff
                              ? "Qiyin oyatlar ro'yxatidan olib tashlash"
                              : 'Takrorlash uchun oyatni saqlash'
                          }
                          className={`inline-flex items-center justify-center mx-1.5 text-xl sm:text-2xl align-middle transition-colors cursor-pointer ${
                            isDiff
                              ? 'text-[#B4892B]'
                              : ayahCompleted
                                ? 'text-[#065F46]'
                                : 'text-[#A8A092] hover:text-[#5C574B]'
                          }`}
                        >
                          ﴿{toArabicNumerals(ayah.ayahNumber)}﴾
                        </button>{' '}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t border-[#E4DEC9] flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C574B]">
            <span>{juz}-juz</span>
            <span className="font-semibold tabular-nums text-[#1E1B16]">
              {currentPage}-sahifa / 604
            </span>
            <span>Tajvidni ko&rsquo;rish uchun so&rsquo;zga bosing · Saqlash uchun ﴿٠﴾ ga bosing</span>
          </div>
        </div>
      </article>

      {/* Tanlangan So'z Tafsiloti */}
      {inspectedWord && (
        <div className="rounded-2xl border border-[#E4DEC9] bg-[#F4EFE4] p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-[#5C574B]">
              {inspectedWord.surah}-sura · {inspectedWord.ayah}-oyat · {inspectedWord.wordInAyah}-so&rsquo;z
            </p>
            <p dir="rtl" lang="ar" className="font-quran text-3xl text-[#1E1B16]">
              {inspectedWord.uthmani}
            </p>
            <p className="text-xs text-[#065F46]">
              {inspectedWord.rulesPresent.length > 0
                ? inspectedWord.rulesPresent
                    .map((r) => `${TAJWEED_RULES[r].name} (${TAJWEED_RULES[r].arabicName})`)
                    .join(' · ')
                : 'Oddiy Usmoniy talaffuz'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInspectedWord(null)}
            className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#E4DEC9] bg-[#FAF6EE] text-xs font-medium text-[#5C574B] hover:text-[#1E1B16] cursor-pointer"
          >
            Yopish
          </button>
        </div>
      )}

      {/* Pastki Boshqaruv Paneli (Mikrofon va Xato Bildirishnomasi) */}
      <div className="fixed bottom-16 lg:bottom-4 left-0 right-0 z-30 px-3 sm:px-6 pointer-events-none">
        <div className="mx-auto max-w-3xl pointer-events-auto rounded-3xl border border-[#E4DEC9] bg-[#FAF6EE]/95 backdrop-blur-md shadow-xl p-3.5 sm:p-4 space-y-2.5">
          {lockState.lockedOnError && lockState.activeError && (
            <div
              role="alert"
              className="rounded-2xl border border-[#DC2626]/35 bg-[#DC2626]/8 px-3.5 py-2.5 text-xs sm:text-sm space-y-1"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 text-[#991B1B] font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" aria-hidden="true" />
                  <span>
                    {lockState.activeError.letterError &&
                    (lockState.activeError.letterError.letterConfidence === 'high' ||
                      lockState.activeError.letterError.letterConfidence === 'medium')
                      ? "Talaffuzda xatolik aniqlandi. Iltimos, belgilangan harfni qaytadan o'qing."
                      : "Talaffuzda xatolik bo'lishi mumkin. Iltimos, ushbu so'zni qaytadan o'qing."}
                  </span>
                </div>
                <span className="text-[11px] text-[#7F1D1D] tabular-nums shrink-0">
                  {lockState.activeError.surah}:{lockState.activeError.ayah}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5C574B] pl-6">
                <span>
                  Kutilgan:{' '}
                  <strong dir="rtl" lang="ar" className="font-quran text-base text-[#1E1B16]">
                    {lockState.activeError.expectedWord}
                  </strong>
                </span>
                {lockState.activeError.heardSegment && (
                  <span>
                    Eshitildi:{' '}
                    <span dir="rtl" lang="ar" className="font-quran text-base text-[#DC2626]">
                      {lockState.activeError.heardSegment}
                    </span>
                  </span>
                )}
                {lockState.activeError.letterError &&
                  lockState.activeError.letterError.letterConfidence !== 'word_only' && (
                    <span className="text-[#991B1B] font-medium">
                      Harf: {lockState.activeError.letterError.expectedLetter} (
                      {lockState.activeError.letterError.makhrajCategory})
                    </span>
                  )}
              </div>

              {lockState.activeError.letterError?.coachingTip && (
                <p className="text-xs text-[#5C574B] pl-6">
                  {lockState.activeError.letterError.coachingTip}
                </p>
              )}
            </div>
          )}

          {/* Asosiy Mikrofon Qatori */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium">
                {micState === 'correct' && (
                  <CheckCircle2 className="w-4 h-4 text-[#065F46] shrink-0" aria-hidden="true" />
                )}
                {micState === 'error' && (
                  <AlertTriangle className="w-4 h-4 text-[#DC2626] shrink-0" aria-hidden="true" />
                )}
                <span
                  className={`truncate ${
                    micState === 'error'
                      ? 'text-[#DC2626]'
                      : micState === 'correct'
                        ? 'text-[#065F46]'
                        : 'text-[#1E1B16]'
                  }`}
                >
                  {statusMessage}
                </span>
              </div>

              {/* Jonli Audio To'lqin */}
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-[3px] h-6 flex-1 max-w-[200px]"
                  aria-label="Jonli mikrofon ovoz darajasi"
                >
                  {waveform.map((lvl, idx) => (
                    <span
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        isMicActive
                          ? micState === 'error'
                            ? 'bg-[#DC2626]/70'
                            : 'bg-[#065F46]'
                          : 'bg-[#D4CBB8]'
                      }`}
                      style={{ height: `${Math.max(15, Math.round(lvl * 100))}%` }}
                    />
                  ))}
                </div>

                {lastHeardText && (
                  <span
                    dir="rtl"
                    lang="ar"
                    className="hidden sm:inline font-quran text-sm text-[#5C574B] truncate max-w-[180px]"
                  >
                    {lastHeardText}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {lastAudioUrl && (
                <button
                  type="button"
                  onClick={() => {
                    const audio = new Audio(lastAudioUrl);
                    void audio.play();
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#E4DEC9] bg-[#F4EFE4] text-[#1E1B16] hover:bg-[#EFE9DA] transition-colors cursor-pointer"
                  title="Oxirgi ovoz yozuvini qayta tinglash"
                  aria-label="Oxirgi ovoz yozuvini qayta tinglash"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}

              {micState === 'listening' && (
                <button
                  type="button"
                  onClick={() => void handleEvaluateNow()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#065F46]/30 bg-[#065F46]/10 px-3 py-2 text-xs font-semibold text-[#065F46] hover:bg-[#065F46]/20 min-h-[44px] whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Tekshirish</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleToggleMic()}
                disabled={micState === 'requesting_permission'}
                className={`min-h-[54px] px-5 rounded-2xl font-semibold text-sm inline-flex items-center justify-center gap-2 shadow-md transition-transform active:scale-[0.97] cursor-pointer ${
                  isMicActive
                    ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                    : 'bg-[#065F46] text-[#FAF6EE] hover:bg-[#047857]'
                }`}
                aria-label={isMicActive ? "Mikrofon yozuvini to'xtatish" : "Qur'on qiroatini boshlash"}
              >
                {isMicActive ? (
                  <>
                    <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                    <span>To&rsquo;xtatish</span>
                  </>
                ) : micState === 'requesting_permission' ? (
                  <>
                    <MicOff className="w-5 h-5" aria-hidden="true" />
                    <span>Boshlanmoqda…</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" aria-hidden="true" />
                    <span>O&rsquo;qish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sura / Juz / Sahifa / Oyat Navigatsiya Oynasi */}
      {showNavigator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-[#E4DEC9] bg-[#FAF6EE] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4DEC9]">
              <h2 className="font-display text-2xl font-semibold text-[#1E1B16]">
                Qur&rsquo;oni Karim bo&rsquo;ylab o&rsquo;tish
              </h2>
              <button
                type="button"
                onClick={() => setShowNavigator(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#5C574B] hover:bg-[#EFE9DA] cursor-pointer"
                aria-label="Navigatsiya oynasini yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-1 p-2 mx-6 mt-4 rounded-xl bg-[#EFE9DA]">
              {(['surah', 'juz', 'page', 'ayah'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setNavTab(tab)}
                  className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    navTab === tab
                      ? 'bg-[#FAF6EE] text-[#065F46] shadow-sm'
                      : 'text-[#5C574B] hover:text-[#1E1B16]'
                  }`}
                >
                  {NAV_TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {navTab === 'surah' && (
                <>
                  <input
                    type="search"
                    value={surahQuery}
                    onChange={(e) => setSurahQuery(e.target.value)}
                    placeholder="114 suradan nomi yoki raqami bo'yicha qidiring…"
                    className="w-full rounded-xl border border-[#E4DEC9] bg-white px-4 py-2.5 text-sm text-[#1E1B16] focus:outline-none focus:ring-2 focus:ring-[#065F46]/40"
                  />
                  <div className="divide-y divide-[#E4DEC9]">
                    {filteredSurahs.map((s) => (
                      <button
                        key={s.n}
                        type="button"
                        onClick={() => {
                          onPageChange(s.startPage);
                          setShowNavigator(false);
                        }}
                        className="w-full flex items-center justify-between py-3 px-2 hover:bg-[#F4EFE4] rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-lg bg-[#065F46]/10 text-[#065F46] text-xs font-semibold flex items-center justify-center tabular-nums">
                            {s.n}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-[#1E1B16]">{s.en}</p>
                            <p className="text-xs text-[#5C574B]">
                              {s.count} oyat · {s.startPage}-sahifa
                            </p>
                          </div>
                        </div>
                        <span dir="rtl" lang="ar" className="font-quran text-xl text-[#065F46]">
                          {s.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {navTab === 'juz' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 30 }, (_, idx) => idx + 1).map((jNum) => {
                    const info = meta.juzStarts[String(jNum)];
                    const surahInfo = meta.surahs.find((s) => s.n === info?.surah);
                    return (
                      <button
                        key={jNum}
                        type="button"
                        onClick={() => {
                          if (info?.page) onPageChange(info.page);
                          setShowNavigator(false);
                        }}
                        className="rounded-xl border border-[#E4DEC9] bg-[#F4EFE4] hover:bg-[#EFE9DA] p-3.5 text-left transition-colors cursor-pointer"
                      >
                        <p className="text-sm font-semibold text-[#065F46] tabular-nums">
                          {jNum}-juz
                        </p>
                        <p className="text-xs text-[#1E1B16] truncate mt-0.5">
                          {surahInfo?.en} ({info?.surah}:{info?.ayah})
                        </p>
                        <p className="text-xs text-[#5C574B] tabular-nums mt-0.5">
                          {info?.page}-sahifa
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {navTab === 'page' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const p = Math.max(1, Math.min(604, Number(jumpPageInput) || 1));
                    onPageChange(p);
                    setShowNavigator(false);
                  }}
                  className="space-y-4"
                >
                  <label className="block text-sm font-medium text-[#1E1B16]">
                    Mushaf sahifasiga o&rsquo;tish (1 – 604)
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      min={1}
                      max={604}
                      value={jumpPageInput}
                      onChange={(e) => setJumpPageInput(e.target.value)}
                      className="flex-1 rounded-xl border border-[#E4DEC9] bg-white px-4 py-2.5 text-sm tabular-nums"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-[#065F46] px-6 py-2.5 text-sm font-semibold text-[#FAF6EE] hover:bg-[#047857] cursor-pointer"
                    >
                      Sahifani ochish
                    </button>
                  </div>
                </form>
              )}

              {navTab === 'ayah' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const p = findPageForAyah(dataset, jumpSurah, jumpAyah);
                    onPageChange(p);
                    setShowNavigator(false);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#5C574B] mb-1.5">
                        Sura
                      </label>
                      <select
                        value={jumpSurah}
                        onChange={(e) => {
                          setJumpSurah(Number(e.target.value));
                          setJumpAyah(1);
                        }}
                        className="w-full rounded-xl border border-[#E4DEC9] bg-white px-3 py-2.5 text-sm"
                      >
                        {meta.surahs.map((s) => (
                          <option key={s.n} value={s.n}>
                            {s.n}. {s.en} ({s.count} oyat)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C574B] mb-1.5">
                        Oyat raqami (1 – {selectedJumpSurahMeta?.count ?? 7})
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={selectedJumpSurahMeta?.count ?? 286}
                        value={jumpAyah}
                        onChange={(e) => setJumpAyah(Number(e.target.value) || 1)}
                        className="w-full rounded-xl border border-[#E4DEC9] bg-white px-3 py-2.5 text-sm tabular-nums"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#065F46] px-6 py-3 text-sm font-semibold text-[#FAF6EE] hover:bg-[#047857] cursor-pointer"
                  >
                    Oyatga o&rsquo;tish
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sahifa Yakunlanganda Shaxsiylashtirilgan Tabriklash */}
      {showCelebration && lockState.isPageCompleted && (
        <CompletionCelebration
          pageNumber={currentPage}
          ayahsCount={blocks.length}
          verifiedWordsCount={lockState.verifiedCount}
          correctedMistakesCount={lockState.correctedMistakesCount}
          onNextPage={() => {
            setShowCelebration(false);
            onPageChange(Math.min(604, currentPage + 1));
          }}
          onRepeatPage={() => void handleResetPage()}
          onReturnToQuran={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
};
