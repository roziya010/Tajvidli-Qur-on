import React from 'react';
import { UserStatisticsSummary } from '../stats/statisticsEngine';

interface StatisticsViewProps {
  stats: UserStatisticsSummary;
  onOpenPage: (page: number) => void;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ stats, onOpenPage }) => {
  const maxDailyWords = Math.max(10, ...stats.last14Days.map((d) => d.verifiedWords));

  return (
    <div className="space-y-8 pb-24 lg:pb-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold text-[#065F46]">SHAXSIY MAHALLIY STATISTIKA</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1E1B16]">
          Zulxumorning qiroat ko&rsquo;rsatkichlari
        </h1>
        <p className="text-sm text-[#5C574B] max-w-2xl">
          Quyidagi barcha ko&rsquo;rsatkichlar faqat qurilmangizda maxfiy saqlanadigan va
          tasdiqlangan so&rsquo;zlar asosida hisoblanadi. Shubhali yoki o&rsquo;tkazib yuborilgan
          so&rsquo;zlar hisobga olinmaydi.
        </p>
      </header>

      {/* Asosiy Ko'rsatkichlar */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-5">
          <p className="text-xs text-[#5C574B]">Yakunlangan sahifalar</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#065F46] tabular-nums">
            {stats.totalPagesCompleted}
          </p>
          <p className="mt-1 text-xs text-[#5C574B] tabular-nums">
            604 sahifadan {stats.memorizationPercent}%
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-5">
          <p className="text-xs text-[#5C574B]">Tasdiqlangan so&rsquo;zlar</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#1E1B16] tabular-nums">
            {stats.totalVerifiedWords.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-[#5C574B] tabular-nums">
            ~{stats.totalAyahsEstimated} ta oyat o&rsquo;qildi
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-5">
          <p className="text-xs text-[#5C574B]">Ketma-ket o&rsquo;qilgan kunlar</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#B4892B] tabular-nums">
            {stats.consecutiveDaysStreak}
          </p>
          <p className="mt-1 text-xs text-[#5C574B]">Kundalik muntazamlik seriyasi</p>
        </div>

        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-5">
          <p className="text-xs text-[#5C574B]">Talaffuz xatolari</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#DC2626] tabular-nums">
            {stats.totalMistakes}
          </p>
          <p className="mt-1 text-xs text-[#5C574B]">Qat&rsquo;iy o&rsquo;qish qulfi aniqlagan</p>
        </div>

        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-5">
          <p className="text-xs text-[#5C574B]">Tuzatilgan xatolar</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#065F46] tabular-nums">
            {stats.totalCorrectedMistakes}
          </p>
          <p className="mt-1 text-xs text-[#5C574B]">Qaytadan to&rsquo;g&rsquo;ri tasdiqlangan</p>
        </div>

        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-5">
          <p className="text-xs text-[#5C574B]">Yodlash jarayoni</p>
          <p className="mt-1 font-display text-3xl font-semibold text-[#1E1B16] tabular-nums">
            {stats.memorizationPercent}%
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-[#E4DEC9] overflow-hidden">
            <div
              className="h-full bg-[#065F46]"
              style={{ width: `${Math.min(100, stats.memorizationPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 14 Kunlik Faollik Grafigi */}
      <section className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-[#1E1B16]">
            Kundalik o&rsquo;qish faolligi (So&rsquo;nggi 14 kun)
          </h2>
          <span className="text-xs text-[#5C574B]">Kuniga tasdiqlangan so&rsquo;zlar</span>
        </div>

        <div className="grid grid-cols-14 gap-1.5 sm:gap-2 items-end h-40 pt-4">
          {stats.last14Days.map((day) => {
            const pct =
              day.verifiedWords > 0
                ? Math.max(8, Math.round((day.verifiedWords / maxDailyWords) * 100))
                : 4;
            return (
              <div key={day.date} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    day.verifiedWords > 0 ? 'bg-[#065F46]' : 'bg-[#E4DEC9]'
                  }`}
                  style={{ height: `${pct}%` }}
                  title={`${day.date}: ${day.verifiedWords} ta tasdiqlangan so'z`}
                />
                <span className="text-[10px] text-[#5C574B] tabular-nums">
                  {day.date.slice(8)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Eng Ko'p Takrorlangan So'zlar */}
      <section className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-4">
        <h2 className="font-display text-2xl font-semibold text-[#1E1B16]">
          Eng ko&rsquo;p takrorlangan so&rsquo;zlar
        </h2>
        {stats.mostRepeatedWords.length === 0 ? (
          <p className="text-sm text-[#5C574B]">
            Hali takrorlangan so&rsquo;zlar qayd etilmagan. Qiroat mashq qilganingiz sari alohida
            e&rsquo;tibor talab etuvchi so&rsquo;zlar shu yerda ko&rsquo;rinadi.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.mostRepeatedWords.map((item, idx) => (
              <button
                key={`${item.surah}:${item.ayah}:${idx}`}
                type="button"
                onClick={() => onOpenPage(item.page)}
                className="rounded-xl border border-[#E4DEC9] bg-[#F4EFE4] hover:bg-[#EFE9DA] p-4 flex items-center justify-between text-left transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-xs text-[#5C574B] tabular-nums">
                    {item.surah}-sura, {item.ayah}-oyat · {item.page}-sahifa
                  </p>
                  <p className="text-xs font-semibold text-[#DC2626] mt-0.5 tabular-nums">
                    {item.count} marta takrorlandi
                  </p>
                </div>
                <span dir="rtl" lang="ar" className="font-quran text-2xl text-[#1E1B16]">
                  {item.word}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
