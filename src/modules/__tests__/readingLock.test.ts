import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  buildTajweedWordsForAyah,
  normalizeArabicForMatch,
  parseTajweedAyahSegments,
  splitArabicWordIntoClusters,
} from '../tajweed/tajweedParser';
import {
  applyEvaluationToReadingLock,
  createReadingLockState,
  resetReadingLockState,
} from '../progression/readingLock';
import { detectLetterMismatchFromTranscript } from '../evaluation/letterErrorDetector';
import { evaluateTranscriptOfflineStrict } from '../speech/recitationRecognizer';
import { CompleteQuranDataset } from '../quran/quranTypes';

describe('ZULXUMOR QURAN - Verified Dataset, Tajweed & Strict Reading Lock', () => {
  it('verifies complete offline Quran dataset (114 Surahs, 6236 Ayahs, 604 Pages, 30 Juz)', () => {
    const filePath = path.resolve(process.cwd(), 'public/data/quran-complete.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const dataset = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CompleteQuranDataset;
    expect(dataset.totalSurahs).toBe(114);
    expect(dataset.surahs.length).toBe(114);
    expect(dataset.totalAyahs).toBe(6236);

    let count = 0;
    const pages = new Set<number>();
    const juzs = new Set<number>();
    for (const s of dataset.surahs) {
      for (const a of s.ayahs) {
        count++;
        pages.add(a.p);
        juzs.add(a.j);
      }
    }
    expect(count).toBe(6236);
    expect(pages.size).toBe(604);
    expect(juzs.size).toBe(30);
  });

  it('parses bracketed Tajweed annotations without altering a single Uthmani character', () => {
    const sample = 'بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ';
    const segs = parseTajweedAyahSegments(sample);
    const reconstructed = segs.map((s) => s.text).join('');
    expect(reconstructed).toBe('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ');

    const words = buildTajweedWordsForAyah(sample, 1, 1, 0);
    expect(words).toHaveLength(4);
    expect(words[0].uthmani).toBe('بِسْمِ');
    expect(words[1].rulesPresent).toContain('h');
    expect(words[2].rulesPresent).toEqual(expect.arrayContaining(['h', 'l', 'n']));
    expect(words[3].rulesPresent).toContain('p');
  });

  it('enforces Strict Reading Lock: halts progression at first error and never skips ahead', () => {
    const words = buildTajweedWordsForAyah(
      'بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ',
      1,
      1,
      0
    );
    const initial = createReadingLockState(1, words);
    expect(initial.wordStatuses).toEqual(['active', 'unread', 'unread', 'unread']);

    // Word 0 correct, Word 1 incorrect -> AI even tries to return Word 2 correct (must be blocked!)
    const step1 = applyEvaluationToReadingLock(initial, words, {
      audioQuality: 'clear',
      heardArabic: 'بسم اله الرحمن',
      overallFeedback: 'Mistake on word 2',
      engineUsed: 'ai-acoustic',
      wordEvaluations: [
        {
          wordIndex: 0,
          expectedWord: words[0].uthmani,
          status: 'correct',
          confidence: 0.96,
          heardSegment: 'بسم',
          mistakeReason: '',
        },
        {
          wordIndex: 1,
          expectedWord: words[1].uthmani,
          status: 'incorrect',
          confidence: 0.4,
          heardSegment: 'اله',
          mistakeReason: 'Missing Shaddah on Lam',
        },
        {
          wordIndex: 2,
          expectedWord: words[2].uthmani,
          status: 'correct',
          confidence: 0.99,
          heardSegment: 'الرحمن',
          mistakeReason: '',
        },
      ],
    });

    expect(step1.events.verifiedWordIndices).toEqual([0]);
    expect(step1.events.errorTriggered).toBe(true);
    expect(step1.events.isRepeatedError).toBe(false);
    expect(step1.nextState.lockedOnError).toBe(true);
    expect(step1.nextState.currentWordIndex).toBe(1);
    expect(step1.nextState.wordStatuses).toEqual(['verified', 'error', 'unread', 'unread']);
    expect(step1.nextState.isPageCompleted).toBe(false);

    // Repeat mistake on word 1 -> triggers repeated error flag (for double vibration pulse)
    const step2 = applyEvaluationToReadingLock(step1.nextState, words, {
      audioQuality: 'clear',
      heardArabic: 'اله',
      overallFeedback: 'Still missing Lam shaddah',
      engineUsed: 'ai-acoustic',
      wordEvaluations: [
        {
          wordIndex: 1,
          expectedWord: words[1].uthmani,
          status: 'incorrect',
          confidence: 0.35,
          heardSegment: 'اله',
          mistakeReason: 'Missing Shaddah on Lam',
        },
      ],
    });
    expect(step2.events.isRepeatedError).toBe(true);
    expect(step2.nextState.consecutiveErrorsOnCurrentWord).toBe(2);

    // Now correct word 1, 2, 3 -> page completes 100%!
    const step3 = applyEvaluationToReadingLock(step2.nextState, words, {
      audioQuality: 'clear',
      heardArabic: 'الله الرحمن الرحيم',
      overallFeedback: 'Excellent',
      engineUsed: 'ai-acoustic',
      wordEvaluations: [
        {
          wordIndex: 1,
          expectedWord: words[1].uthmani,
          status: 'correct',
          confidence: 0.95,
          heardSegment: 'الله',
          mistakeReason: '',
        },
        {
          wordIndex: 2,
          expectedWord: words[2].uthmani,
          status: 'correct',
          confidence: 0.95,
          heardSegment: 'الرحمن',
          mistakeReason: '',
        },
        {
          wordIndex: 3,
          expectedWord: words[3].uthmani,
          status: 'correct',
          confidence: 0.95,
          heardSegment: 'الرحيم',
          mistakeReason: '',
        },
      ],
    });

    expect(step3.events.correctedErrorOnWord).toBe(true);
    expect(step3.events.pageJustCompleted).toBe(true);
    expect(step3.nextState.isPageCompleted).toBe(true);
    expect(step3.nextState.wordStatuses).toEqual(['verified', 'verified', 'verified', 'verified']);

    // Reset restores unread light gray
    const reset = resetReadingLockState(1, words);
    expect(reset.wordStatuses).toEqual(['active', 'unread', 'unread', 'unread']);
    expect(reset.verifiedCount).toBe(0);
  });

  it('never marks silent/weak audio or low-confidence matches as verified', () => {
    const words = buildTajweedWordsForAyah('ٱلْحَمْدُ لِلَّهِ', 1, 2, 0);
    const initial = createReadingLockState(1, words);

    const silentOutcome = applyEvaluationToReadingLock(initial, words, {
      audioQuality: 'weak',
      heardArabic: '',
      overallFeedback: 'Too quiet',
      engineUsed: 'ai-acoustic',
      wordEvaluations: [
        {
          wordIndex: 0,
          expectedWord: words[0].uthmani,
          status: 'correct',
          confidence: 0.99,
          heardSegment: '',
          mistakeReason: '',
        },
      ],
    });

    expect(silentOutcome.events.uncertainAudio).toBe(true);
    expect(silentOutcome.events.verifiedWordIndices).toEqual([]);
    expect(silentOutcome.nextState.currentWordIndex).toBe(0);
  });

  it('detects specific confusable letter mistakes (س vs ص) and refuses to fabricate unclear ones', () => {
    const sadError = detectLetterMismatchFromTranscript('ٱلصِّرَٲطَ', 'السراط');
    expect(sadError?.letterConfidence).toBe('medium');
    expect(sadError?.expectedLetter).toBe('ص');
    expect(sadError?.heardLetter).toBe('س');

    const unclear = detectLetterMismatchFromTranscript('ٱلْمُسْتَقِيمَ', 'كلمةمختلفة');
    expect(unclear?.letterConfidence).toBe('word_only');
    expect(unclear?.coachingTip).toContain("Talaffuzda xatolik bo'lishi mumkin");
  });

  it('splits Arabic words into combining clusters cleanly without detaching harakat', () => {
    const clusters = splitArabicWordIntoClusters('صِرَٰطَ');
    expect(clusters[0]).toBe('صِ');
    expect(clusters.join('')).toBe('صِرَٰطَ');
    expect(normalizeArabicForMatch('ٱلصِّرَٰطَ', true)).toBe('الصراط');
  });

  it('evaluates offline transcript strictly in sequence', () => {
    const words = buildTajweedWordsForAyah('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', 1, 1, 0);
    const res = evaluateTranscriptOfflineStrict('بسم الله الرحمن الرحيم', words, 'standard');
    expect(res.wordEvaluations.every((w) => w.status === 'correct')).toBe(true);
  });
});
