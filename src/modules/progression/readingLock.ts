import {
  ReadingLockState,
  RecitationEvaluationResponse,
  TajweedWord,
  WordLockStatus,
} from '../quran/quranTypes';

/**
 * Initializes the Strict Reading Lock state for a Quran page.
 * All words start as 'unread' (light gray), with word 0 focused as 'active'
 * (or starting at a saved resume index where prior words were verified).
 */
export function createReadingLockState(
  page: number,
  words: TajweedWord[],
  previouslyVerifiedIndices: number[] = []
): ReadingLockState {
  const verifiedSet = new Set(previouslyVerifiedIndices);
  const wordStatuses: WordLockStatus[] = words.map((_, idx) =>
    verifiedSet.has(idx) ? 'verified' : 'unread'
  );

  // Find first non-verified word sequentially (strict reading lock never leaves gaps)
  let firstUnverified = wordStatuses.findIndex((s) => s !== 'verified');
  if (firstUnverified === -1) {
    firstUnverified = words.length;
  } else {
    // Enforce strict sequential invariant: if any earlier word is unread, reset anything after it
    for (let i = firstUnverified + 1; i < wordStatuses.length; i++) {
      wordStatuses[i] = 'unread';
    }
    wordStatuses[firstUnverified] = 'active';
  }

  const verifiedCount = wordStatuses.filter((s) => s === 'verified').length;

  return {
    page,
    totalWords: words.length,
    currentWordIndex: firstUnverified,
    wordStatuses,
    lockedOnError: false,
    consecutiveErrorsOnCurrentWord: 0,
    activeError: null,
    verifiedCount,
    mistakesCount: 0,
    correctedMistakesCount: 0,
    isPageCompleted: words.length > 0 && verifiedCount === words.length,
  };
}

export interface LockTransitionOutcome {
  nextState: ReadingLockState;
  events: {
    verifiedWordIndices: number[];
    errorTriggered: boolean;
    isRepeatedError: boolean;
    correctedErrorOnWord: boolean;
    pageJustCompleted: boolean;
    uncertainAudio: boolean;
  };
}

/**
 * Applies an evaluation response strictly sequentially against the current ReadingLockState.
 * NON-NEGOTIABLE INVARIANTS:
 * 1. Never advances past currentWordIndex unless that exact word is evaluated 'correct' with confidence >= 0.72.
 * 2. Stops progression IMMEDIATELY at the first 'incorrect' or 'uncertain' word.
 * 3. Never marks future words after an error as verified.
 * 4. Preserves all previously verified words.
 */
export function applyEvaluationToReadingLock(
  state: ReadingLockState,
  words: TajweedWord[],
  evaluation: RecitationEvaluationResponse
): LockTransitionOutcome {
  if (state.isPageCompleted || state.currentWordIndex >= words.length) {
    return {
      nextState: state,
      events: {
        verifiedWordIndices: [],
        errorTriggered: false,
        isRepeatedError: false,
        correctedErrorOnWord: false,
        pageJustCompleted: false,
        uncertainAudio: false,
      },
    };
  }

  // Reject weak/noisy/silent audio cleanly without advancing or falsely penalizing
  if (evaluation.audioQuality === 'silent' || evaluation.audioQuality === 'weak' || evaluation.audioQuality === 'noisy') {
    return {
      nextState: state,
      events: {
        verifiedWordIndices: [],
        errorTriggered: false,
        isRepeatedError: false,
        correctedErrorOnWord: false,
        pageJustCompleted: false,
        uncertainAudio: true,
      },
    };
  }

  const nextStatuses = [...state.wordStatuses];
  let cursor = state.currentWordIndex;
  let lockedOnError = state.lockedOnError;
  let consecutiveErrors = state.consecutiveErrorsOnCurrentWord;
  let activeError = state.activeError;
  let mistakesCount = state.mistakesCount;
  let correctedMistakesCount = state.correctedMistakesCount;

  const verifiedNow: number[] = [];
  let errorTriggered = false;
  let isRepeatedError = false;
  let correctedErrorOnWord = false;
  let uncertainAudio = false;

  const evalByIndex = new Map(evaluation.wordEvaluations.map((e) => [e.wordIndex, e]));

  while (cursor < words.length) {
    const word = words[cursor];
    const evalItem = evalByIndex.get(word.wordIndex);

    if (!evalItem || evalItem.status === 'not_reached') {
      break;
    }

    if (evalItem.status === 'correct' && evalItem.confidence >= 0.72) {
      const wasInError = nextStatuses[cursor] === 'error' || (lockedOnError && cursor === state.currentWordIndex);
      nextStatuses[cursor] = 'verified';
      verifiedNow.push(cursor);
      if (wasInError) {
        correctedErrorOnWord = true;
        correctedMistakesCount += 1;
      }
      lockedOnError = false;
      consecutiveErrors = 0;
      activeError = null;
      cursor += 1;
      continue;
    }

    if (evalItem.status === 'uncertain') {
      uncertainAudio = true;
      // Do not mark as verified; keep focused for repeat
      if (nextStatuses[cursor] !== 'error') {
        nextStatuses[cursor] = 'active';
      }
      break;
    }

    // status === 'incorrect' OR low-confidence approval rejected by strict lock
    nextStatuses[cursor] = 'error';
    lockedOnError = true;
    consecutiveErrors += 1;
    mistakesCount += 1;
    errorTriggered = true;
    isRepeatedError = consecutiveErrors >= 2;
    activeError = {
      wordIndex: word.wordIndex,
      surah: word.surah,
      ayah: word.ayah,
      expectedWord: word.uthmani,
      heardSegment: evalItem.heardSegment || evaluation.heardArabic || '',
      reason: evalItem.mistakeReason || "Talaffuz talab etilgan Qur'on qiroatidan farq qilmoqda.",
      letterError: evalItem.letterError,
    };
    // STRICT STOP: Never advance past the error
    break;
  }

  if (!lockedOnError && cursor < words.length && nextStatuses[cursor] === 'unread') {
    nextStatuses[cursor] = 'active';
  }

  const verifiedCount = nextStatuses.filter((s) => s === 'verified').length;
  const isPageCompleted = words.length > 0 && verifiedCount === words.length;
  const pageJustCompleted = !state.isPageCompleted && isPageCompleted;

  return {
    nextState: {
      ...state,
      currentWordIndex: cursor,
      wordStatuses: nextStatuses,
      lockedOnError,
      consecutiveErrorsOnCurrentWord: consecutiveErrors,
      activeError,
      verifiedCount,
      mistakesCount,
      correctedMistakesCount,
      isPageCompleted,
    },
    events: {
      verifiedWordIndices: verifiedNow,
      errorTriggered,
      isRepeatedError,
      correctedErrorOnWord,
      pageJustCompleted,
      uncertainAudio,
    },
  };
}

/**
 * Resets a page's Reading Lock state completely back to initial light-gray state.
 */
export function resetReadingLockState(page: number, words: TajweedWord[]): ReadingLockState {
  return createReadingLockState(page, words, []);
}
