import React from 'react';
import { LetterErrorDetail, TajweedWord, WordLockStatus } from '../quran/quranTypes';
import { TAJWEED_RULES, splitArabicWordIntoClusters } from '../tajweed/tajweedParser';

interface TajweedWordViewProps {
  word: TajweedWord;
  status: WordLockStatus;
  letterError?: LetterErrorDetail;
  onSelectWord?: (word: TajweedWord) => void;
}

export const TajweedWordView: React.FC<TajweedWordViewProps> = React.memo(
  ({ word, status, letterError, onSelectWord }) => {
    if (status === 'verified') {
      return (
        <span
          className="quran-word-span inline transition-colors duration-200 cursor-pointer hover:bg-[#065F46]/6 rounded px-0.5"
          onClick={() => onSelectWord?.(word)}
          title={
            word.rulesPresent.length > 0
              ? word.rulesPresent.map((r) => TAJWEED_RULES[r].name).join(' · ')
              : "Tasdiqlangan so'z"
          }
        >
          {word.segments.map((seg, idx) => (
            <span
              key={idx}
              style={{
                color: seg.rule ? TAJWEED_RULES[seg.rule].color : '#1E1B16',
              }}
            >
              {seg.text}
            </span>
          ))}
        </span>
      );
    }

    if (status === 'error') {
      const hasReliableLetter =
        letterError &&
        (letterError.letterConfidence === 'high' || letterError.letterConfidence === 'medium') &&
        letterError.letterPositionInWord >= 0;

      if (hasReliableLetter && letterError) {
        const clusters = splitArabicWordIntoClusters(word.uthmani);
        const targetIdx = Math.min(clusters.length - 1, letterError.letterPositionInWord);
        return (
          <span
            className="quran-word-span inline rounded-md bg-[#DC2626]/12 px-1 ring-1 ring-[#DC2626]/40 cursor-pointer"
            onClick={() => onSelectWord?.(word)}
            aria-label={`${letterError.expectedLetter} harfi talaffuzida xatolik`}
          >
            {clusters.map((cluster, idx) => (
              <span
                key={idx}
                style={{
                  color: idx === targetIdx ? '#DC2626' : '#7F1D1D',
                  textDecoration: idx === targetIdx ? 'underline' : undefined,
                  textDecorationColor: idx === targetIdx ? '#DC2626' : undefined,
                  textUnderlineOffset: idx === targetIdx ? '6px' : undefined,
                  fontWeight: idx === targetIdx ? 700 : undefined,
                }}
              >
                {cluster}
              </span>
            ))}
          </span>
        );
      }

      return (
        <span
          className="quran-word-span inline rounded-md bg-[#DC2626]/12 px-1 text-[#DC2626] ring-1 ring-[#DC2626]/45 cursor-pointer"
          onClick={() => onSelectWord?.(word)}
          aria-label="Ushbu so'z talaffuzida xatolik bo'lishi mumkin"
        >
          {word.uthmani}
        </span>
      );
    }

    if (status === 'active') {
      return (
        <span
          className="quran-word-span inline rounded-md bg-[#D4AF37]/14 px-0.5 text-[#8E8678] underline decoration-[#B4892B] decoration-2 underline-offset-8 cursor-pointer"
          onClick={() => onSelectWord?.(word)}
          aria-current="step"
        >
          {word.uthmani}
        </span>
      );
    }

    // Dastlabki o'qilmagan holat: och kulrang
    return (
      <span
        className="quran-word-span inline text-[#C0B9AB] hover:text-[#9D9587] transition-colors cursor-pointer"
        onClick={() => onSelectWord?.(word)}
      >
        {word.uthmani}
      </span>
    );
  }
);
TajweedWordView.displayName = 'TajweedWordView';
