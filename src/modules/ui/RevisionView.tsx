import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { MistakeLogEntry, QuranMetaIndex } from '../quran/quranTypes';
import { SavedPageProgress } from '../storage/offlineDb';

interface RevisionViewProps {
  meta: QuranMetaIndex;
  mistakes: MistakeLogEntry[];
  allProgress: SavedPageProgress[];
  onOpenPage: (page: number) => void;
}

export const RevisionView: React.FC<RevisionViewProps> = ({
  meta,
  mistakes,
  allProgress,
  onOpenPage,
}) => {
  const [filter, setFilter] = useState<'unresolved' | 'all'>('unresolved');

  const completedPages = allProgress
    .filter((p) => p.completed)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const visibleMistakes =
    filter === 'unresolved' ? mistakes.filter((m) => !m.corrected) : mistakes;

  return (
    <div className="space-y-8 pb-24 lg:pb-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold text-[#065F46]">MUROJAA VA TAKRORLASH</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1E1B16]">
          Talaffuz xatolari va Yakunlangan sahifalar
        </h1>
        <p className="text-sm text-[#5C574B] max-w-2xl">
          Avvalgi maxraj va tajvid xatolarini ko&rsquo;rib chiqing yoki hifzingizni mustahkamlash
          uchun tasdiqlangan Mushaf sahifalarini qaytadan mashq qiling.
        </p>
      </header>

      {/* Oldingi Xatolarni Ko'rib Chiqish */}
      <section className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-[#1E1B16]">
            Qayd etilgan talaffuz xatolari
          </h2>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#EFE9DA]">
            <button
              type="button"
              onClick={() => setFilter('unresolved')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'unresolved'
                  ? 'bg-[#FAF6EE] text-[#1E1B16] shadow-sm'
                  : 'text-[#5C574B]'
              }`}
            >
              Tuzatish kerak
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-[#FAF6EE] text-[#1E1B16] shadow-sm' : 'text-[#5C574B]'
              }`}
            >
              Barcha tarix
            </button>
          </div>
        </div>

        {visibleMistakes.length === 0 ? (
          <div className="rounded-xl border border-[#E4DEC9] bg-[#F4EFE4] p-6 text-center space-y-1">
            <p className="text-sm font-medium text-[#1E1B16]">
              {filter === 'unresolved'
                ? "Tuzatish kutilayotgan xatolar yo'q."
                : "Hali hech qanday talaffuz xatosi qayd etilmagan."}
            </p>
            <p className="text-xs text-[#5C574B]">
              Jonli mikrofon qiroati davomida aniqlangan har qanday so&rsquo;z yoki harf xatosi
              maxraj tavsiyasi bilan shu yerda ko&rsquo;rinadi.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E4DEC9]">
            {visibleMistakes.map((m) => (
              <div
                key={m.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#5C574B]">
                    {m.corrected ? (
                      <span className="inline-flex items-center gap-1 text-[#065F46] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Tuzatilgan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#DC2626] font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Tuzatish kutilmoqda
                      </span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>
                      {m.surahName} ({m.surah}:{m.ayah})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{m.page}-sahifa</span>
                    {m.repeatCount > 1 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{m.repeatCount} marta takrorlangan</span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <span dir="rtl" lang="ar" className="font-quran text-2xl text-[#1E1B16]">
                      {m.expectedWord}
                    </span>
                    <span className="text-xs text-[#5C574B]">
                      {m.letterError && m.letterError.letterConfidence !== 'word_only'
                        ? `${m.letterError.expectedLetter} harfi — ${m.letterError.makhrajCategory}`
                        : m.reason}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenPage(m.page)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#065F46]/30 bg-[#065F46]/10 px-4 py-2 text-xs font-semibold text-[#065F46] hover:bg-[#065F46]/20 min-h-[44px] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{m.page}-sahifani mashq qilish</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Yakunlangan Sahifalarni Takrorlash */}
      <section className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[#1E1B16]">
          Takrorlash uchun yakunlangan sahifalar
        </h2>
        {completedPages.length === 0 ? (
          <p className="text-sm text-[#5C574B]">
            Mushaf sahifasidagi barcha so&rsquo;zlar 100% tasdiqlangach, tezkor murojaa uchun bu
            yerda ochiladi.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {completedPages.map((p) => {
              const info = meta.pageStarts[String(p.page)];
              return (
                <button
                  key={p.page}
                  type="button"
                  onClick={() => onOpenPage(p.page)}
                  className="rounded-xl border border-[#E4DEC9] bg-[#F4EFE4] hover:bg-[#EFE9DA] p-4 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#065F46] tabular-nums">
                      {p.page}-sahifa
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-[#065F46]" />
                  </div>
                  <p className="mt-1 text-xs text-[#1E1B16]">{info?.surahEn || "Qur'on"}</p>
                  <p className="mt-0.5 text-xs text-[#5C574B] tabular-nums">
                    {p.verifiedIndices.length} ta tasdiqlangan so&rsquo;z
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
