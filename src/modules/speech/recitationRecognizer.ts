import {
  RecitationEvaluationResponse,
  TajweedWord,
  UserSettings,
  WordEvaluationResult,
} from '../quran/quranTypes';
import { CapturedAudioSegment } from '../audio/microphoneCapture';
import { normalizeArabicForMatch } from '../tajweed/tajweedParser';
import { detectLetterMismatchFromTranscript } from '../evaluation/letterErrorDetector';

export interface BackendEvaluationStatus {
  aiAvailable: boolean;
  model: string;
  mode: string;
}

export async function fetchEvaluationStatus(): Promise<BackendEvaluationStatus> {
  try {
    const res = await fetch('/api/recitation/status');
    if (!res.ok) throw new Error("Holatni tekshirib bo'lmadi");
    return (await res.json()) as BackendEvaluationStatus;
  } catch {
    return {
      aiAvailable: false,
      model: 'offline',
      mode: 'offline-only',
    };
  }
}

function similarityRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return 1 - dp[m][n] / Math.max(m, n);
}

/**
 * Arabcha transkripsiyani ketma-ket qat'iy tartibda baholaydi.
 */
export function evaluateTranscriptOfflineStrict(
  transcript: string,
  expectedWords: TajweedWord[],
  strictness: UserSettings['strictness']
): RecitationEvaluationResponse {
  const cleanedTokens = transcript
    .trim()
    .split(/\s+/)
    .map((t) => normalizeArabicForMatch(t))
    .filter(Boolean);

  if (cleanedTokens.length === 0) {
    return {
      audioQuality: 'weak',
      heardArabic: '',
      wordEvaluations: expectedWords.map((w, idx) => ({
        wordIndex: w.wordIndex,
        expectedWord: w.uthmani,
        status: idx === 0 ? 'uncertain' : 'not_reached',
        confidence: 0,
        heardSegment: '',
        mistakeReason: "Aniq arabcha qiroat eshitilmadi. Iltimos, mikrofonga yaqinroq va aniqroq o'qing.",
      })),
      overallFeedback: "Aniq arabcha so'zlar eshitilmadi. Iltimos, qaytadan o'qing.",
      engineUsed: 'offline-phonetic',
    };
  }

  const evaluations: WordEvaluationResult[] = [];
  const threshold = strictness === 'strict' ? 0.92 : 0.85;
  let stopped = false;

  for (let i = 0; i < expectedWords.length; i++) {
    const exp = expectedWords[i];
    if (stopped || i >= cleanedTokens.length) {
      evaluations.push({
        wordIndex: exp.wordIndex,
        expectedWord: exp.uthmani,
        status: 'not_reached',
        confidence: 0,
        heardSegment: '',
        mistakeReason: '',
      });
      continue;
    }

    const heardNorm = cleanedTokens[i];
    const expExpanded = normalizeArabicForMatch(exp.uthmani, true);
    const simCompact = similarityRatio(exp.normalized, heardNorm);
    const simExpanded = similarityRatio(expExpanded, heardNorm);
    const sim = Math.max(simCompact, simExpanded);

    if (
      exp.normalized === heardNorm ||
      expExpanded === heardNorm ||
      (sim >= threshold && exp.normalized.length >= 4)
    ) {
      evaluations.push({
        wordIndex: exp.wordIndex,
        expectedWord: exp.uthmani,
        status: 'correct',
        confidence: sim,
        heardSegment: heardNorm,
        mistakeReason: '',
      });
    } else {
      stopped = true;
      const letterError = detectLetterMismatchFromTranscript(exp.uthmani, heardNorm);
      evaluations.push({
        wordIndex: exp.wordIndex,
        expectedWord: exp.uthmani,
        status: 'incorrect',
        confidence: sim,
        heardSegment: heardNorm,
        mistakeReason:
          letterError?.letterConfidence === 'medium'
            ? `Talaffuzda xatolik aniqlandi (${letterError.makhrajCategory}).`
            : "Talaffuzda xatolik bo'lishi mumkin. Iltimos, ushbu so'zni qaytadan o'qing.",
        letterError,
      });
    }
  }

  return {
    audioQuality: 'clear',
    heardArabic: transcript,
    wordEvaluations: evaluations,
    overallFeedback: stopped
      ? "Belgilangan so'zning talaffuzini tuzatish kerak."
      : "Oflayn transkripsiya rejimida so'zlar muvofiqligi tasdiqlandi.",
    engineUsed: 'offline-phonetic',
  };
}

/**
 * Yozib olingan haqiqiy WAV audio qismini baholaydi.
 */
export async function evaluateAudioSegment(
  segment: CapturedAudioSegment,
  expectedWindow: TajweedWord[],
  settings: UserSettings,
  isOnline: boolean,
  offlineTranscript?: string
): Promise<RecitationEvaluationResponse> {
  if (segment.rmsLevel < 0.008) {
    return {
      audioQuality: 'silent',
      heardArabic: '',
      wordEvaluations: expectedWindow.map((w, idx) => ({
        wordIndex: w.wordIndex,
        expectedWord: w.uthmani,
        status: idx === 0 ? 'uncertain' : 'not_reached',
        confidence: 0,
        heardSegment: '',
        mistakeReason: "Ovoz juda past eshitildi. Iltimos, mikrofonga yaqinroq aniq o'qing.",
      })),
      overallFeedback: "Ovoz darajasi ishonchli baholash uchun juda past. Iltimos, qaytadan o'qing.",
      engineUsed: 'offline-phonetic',
    };
  }

  const shouldUseAi =
    settings.evaluationEngine === 'ai-acoustic' ||
    (settings.evaluationEngine === 'auto' && isOnline);

  if (shouldUseAi && isOnline) {
    const res = await fetch('/api/recitation/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: segment.base64Wav,
        mimeType: segment.mimeType,
        strictness: settings.strictness,
        expectedWords: expectedWindow.map((w) => ({
          wordIndex: w.wordIndex,
          uthmani: w.uthmani,
          normalized: w.normalized,
          tajweedRules: w.rulesPresent,
          surah: w.surah,
          ayah: w.ayah,
        })),
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Baholash so'rovi muvaffaqiyatsiz tugadi (${res.status})`);
    }

    const data = (await res.json()) as Omit<RecitationEvaluationResponse, 'engineUsed'>;
    return {
      ...data,
      engineUsed: 'ai-acoustic',
    };
  }

  if (offlineTranscript && offlineTranscript.trim().length > 0) {
    return evaluateTranscriptOfflineStrict(offlineTranscript, expectedWindow, settings.strictness);
  }

  throw new Error(
    isOnline
      ? "Qurilmadagi oflayn nutqni tanish tizimi arabcha nutqni qabul qilmadi. To'liq akustik baholash uchun Sozlamalarda baholash tizimini Avto / Sun'iy intellekt rejimiga o'tkazing."
      : "Siz hozir oflayn rejimdasiz va qurilmada arabcha nutq modeli matni olinmadi. Akustik maxraj tahlili uchun internetga ulaning yoki oflayn ar-SA nutq tanishini yoqing."
  );
}
