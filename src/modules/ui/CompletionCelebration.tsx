import React from 'react';
import { ArrowRight, BookOpen, RotateCcw } from 'lucide-react';

interface CompletionCelebrationProps {
  pageNumber: number;
  ayahsCount: number;
  verifiedWordsCount: number;
  correctedMistakesCount: number;
  onNextPage: () => void;
  onRepeatPage: () => void;
  onReturnToQuran: () => void;
}

export const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({
  pageNumber,
  ayahsCount,
  verifiedWordsCount,
  correctedMistakesCount,
  onNextPage,
  onRepeatPage,
  onReturnToQuran,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B16]/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completion-heading"
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-[#D4AF37]/50 bg-[#FAF6EE] p-6 sm:p-10 shadow-2xl overflow-hidden my-auto">
        {/* Oltin nur bezaklari */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)',
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 w-64 h-64 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #065F46 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 text-center space-y-5">
          {/* Shamsa Muhri */}
          <div className="mx-auto w-28 h-28 rounded-full overflow-hidden border-2 border-[#D4AF37]/60 shadow-md">
            <img
              src="/src/assets/images/completion_shamsa_seal_1795195271328.jpg"
              alt="Shamsa naqshli tabriklash muhri"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-wider text-[#B4892B]">MASHAALLOH!</p>
            <h2
              id="completion-heading"
              className="font-display text-2xl sm:text-3xl font-semibold text-[#1E1B16]"
              style={{ textWrap: 'balance' }}
            >
              Zulxumor, siz ushbu Qur&rsquo;on sahifasini muvaffaqiyatli yakunladingiz!
            </h2>
            <p className="text-sm sm:text-base text-[#5C574B] leading-relaxed">
              Alloh ilmingizni ziyoda qilsin, hifzingizni mustahkamlasin va qalbingizni Qur&rsquo;on
              nuri bilan to&rsquo;ldirsin.
            </p>
          </div>

          {/* Shaxsiylashtirilgan arabcha tabrik iborasi (Qur'on oyati emas) */}
          <div className="rounded-2xl border border-[#E4DEC9] bg-[#F4EFE4] px-5 py-3.5">
            <p dir="rtl" lang="ar" className="font-quran text-2xl text-[#065F46] leading-loose">
              اللَّهُمَّ زِدْ زُلْخُمُورَ عِلْمًا وَنُورًا
            </p>
          </div>

          {/* Tasdiqlangan Sahifa Ko'rsatkichlari */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
            <div className="rounded-xl border border-[#E4DEC9] bg-[#F4EFE4]/60 p-3.5">
              <p className="text-xs text-[#5C574B]">Yakunlangan sahifa</p>
              <p className="mt-0.5 font-display text-xl font-semibold text-[#1E1B16] tabular-nums">
                {pageNumber}-sahifa
              </p>
            </div>
            <div className="rounded-xl border border-[#E4DEC9] bg-[#F4EFE4]/60 p-3.5">
              <p className="text-xs text-[#5C574B]">O&rsquo;qilgan oyatlar</p>
              <p className="mt-0.5 font-display text-xl font-semibold text-[#1E1B16] tabular-nums">
                {ayahsCount}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4DEC9] bg-[#F4EFE4]/60 p-3.5">
              <p className="text-xs text-[#5C574B]">Tasdiqlangan so&rsquo;zlar</p>
              <p className="mt-0.5 font-display text-xl font-semibold text-[#065F46] tabular-nums">
                {verifiedWordsCount}
              </p>
            </div>
            <div className="rounded-xl border border-[#E4DEC9] bg-[#F4EFE4]/60 p-3.5">
              <p className="text-xs text-[#5C574B]">Tuzatilgan xatolar</p>
              <p className="mt-0.5 font-display text-xl font-semibold text-[#B4892B] tabular-nums">
                {correctedMistakesCount}
              </p>
            </div>
            <div className="col-span-2 rounded-xl border border-[#065F46]/25 bg-[#065F46]/8 p-3.5 flex items-center justify-between">
              <span className="text-xs font-medium text-[#065F46]">Sahifa yakunlanishi</span>
              <span className="font-display text-xl font-bold text-[#065F46] tabular-nums">
                100% Tasdiqlandi
              </span>
            </div>
          </div>

          {/* Amallar Tugmalari */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {pageNumber < 604 && (
              <button
                type="button"
                onClick={onNextPage}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#065F46] px-5 py-3 text-sm font-semibold text-[#FAF6EE] hover:bg-[#047857] transition-colors min-h-[48px] cursor-pointer"
              >
                <span>{pageNumber + 1}-sahifaga o&rsquo;tish</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onRepeatPage}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/60 bg-[#FAF6EE] px-4 py-3 text-sm font-medium text-[#1E1B16] hover:bg-[#EFE9DA] transition-colors min-h-[48px] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Shu sahifani takrorlash</span>
            </button>
            <button
              type="button"
              onClick={onReturnToQuran}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E4DEC9] bg-[#F4EFE4] px-4 py-3 text-sm font-medium text-[#5C574B] hover:text-[#1E1B16] transition-colors min-h-[48px] cursor-pointer"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>Qur&rsquo;onga qaytish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
