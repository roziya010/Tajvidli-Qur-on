import React from 'react';
import { ArrowRight, BookOpen, CheckCircle2, Mic, ShieldCheck, Smartphone } from 'lucide-react';
import { DatasetLoadStatus } from '../quran/quranData';
import { ReadingPosition } from '../quran/quranTypes';
import { PWAInstallButton } from './PWAInstallButton';

interface WelcomeScreenProps {
  datasetStatus: DatasetLoadStatus;
  lastPosition: ReadingPosition;
  completedPagesCount: number;
  streakDays: number;
  onStartQuran: (page?: number) => void;
  onNavigateTab: (tab: 'quran' | 'memorization' | 'revision' | 'statistics' | 'settings') => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  datasetStatus,
  lastPosition,
  completedPagesCount,
  streakDays,
  onStartQuran,
  onNavigateTab,
}) => {
  const isReady = datasetStatus.stage === 'ready';

  return (
    <div className="space-y-10 pb-24 lg:pb-12">
      {/* Asosiy Salomlashish Qismi */}
      <section className="relative overflow-hidden rounded-3xl border border-[#E4DEC9] bg-[#F4EFE4] p-6 sm:p-10 lg:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#5C574B]">
                <span className="text-[#065F46] font-semibold">ZULXUMOR QURAN</span>
                <span aria-hidden="true">·</span>
                <span>30 juz · 114 sura · 604 sahifa</span>
                <span aria-hidden="true">·</span>
                <span>Usmoniy va Tajvid</span>
              </div>

              <h1
                className="font-display text-3xl sm:text-5xl font-semibold tracking-tight text-[#1E1B16] leading-[1.12]"
                style={{ textWrap: 'balance' }}
              >
                Zulxumor, Alloh ilmingizni ziyoda qilsin!
              </h1>

              <p className="text-base sm:text-lg leading-relaxed text-[#5C574B] max-w-2xl">
                Siz o&rsquo;qigan har bir oyat qalbingizga nur olib kiradi. Har bir takror esa sizni
                maqsadingizga yanada yaqinlashtiradi.
              </p>

              {/* Arabcha Duo Matni */}
              <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] px-5 py-4 max-w-xl">
                <p
                  dir="rtl"
                  lang="ar"
                  className="font-quran text-2xl sm:text-3xl text-[#065F46] leading-loose text-right"
                >
                  رَبِّ زِدْنِي عِلْمًا
                </p>
                <p className="mt-1 text-sm text-[#5C574B] italic">
                  &ldquo;Robbim, ilmimni ziyoda qil.&rdquo;
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onStartQuran(lastPosition.page || 1)}
                  disabled={!isReady}
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#065F46] px-6 py-3.5 text-sm font-semibold text-[#FAF6EE] hover:bg-[#047857] disabled:opacity-60 transition-colors min-h-[48px] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {lastPosition.page > 1
                      ? `${lastPosition.page}-sahifadan davom etish`
                      : "Qur'onni boshlash"}
                  </span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                {lastPosition.page > 1 && (
                  <button
                    type="button"
                    onClick={() => onStartQuran(1)}
                    disabled={!isReady}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/50 bg-[#FAF6EE] px-5 py-3.5 text-sm font-medium text-[#1E1B16] hover:bg-[#EFE9DA] transition-colors min-h-[48px] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Fotiha surasini ochish (1-sahifa)</span>
                  </button>
                )}

                <PWAInstallButton variant="card" />
              </div>

              {/* Oflayn Ma'lumotlar Holati */}
              <div className="text-xs text-[#5C574B]">
                {isReady ? (
                  <div className="inline-flex items-center gap-2 text-[#065F46] font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{datasetStatus.message}</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-w-md">
                    <div className="flex items-center justify-between">
                      <span>{datasetStatus.message}</span>
                      <span className="tabular-nums font-medium">{datasetStatus.progressPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#E4DEC9] overflow-hidden">
                      <div
                        className="h-full bg-[#065F46] transition-all duration-300"
                        style={{ width: `${datasetStatus.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <div className="relative h-64 sm:h-80 lg:h-full min-h-[280px] rounded-2xl overflow-hidden border border-[#E4DEC9] bg-[#EFE9DA]">
              <img
                src="/src/assets/images/welcome_quran_hero_1795195271369.jpg"
                alt="Yog'och lavh ustida ochilgan muqaddas Qur'on Mushafi"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Shaxsiy Natijalar Qatori */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-5">
          <p className="text-xs font-medium text-[#5C574B]">Oxirgi joylashuv</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-[#1E1B16] tabular-nums">
            {lastPosition.page}-sahifa
          </p>
          <p className="mt-1 text-xs text-[#5C574B]">
            {lastPosition.surah}-sura · {lastPosition.ayah}-oyat
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-5">
          <p className="text-xs font-medium text-[#5C574B]">Tasdiqlangan sahifalar</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-[#065F46] tabular-nums">
            {completedPagesCount} / 604
          </p>
          <p className="mt-1 text-xs text-[#5C574B]">100% so&rsquo;zma-so&rsquo;z yakunlangan</p>
        </div>

        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-5">
          <p className="text-xs font-medium text-[#5C574B]">Uzluksiz kunlar</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-[#B4892B] tabular-nums">
            {streakDays} kun
          </p>
          <p className="mt-1 text-xs text-[#5C574B]">Qurilmada maxfiy saqlanadi</p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('revision')}
          className="text-left rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] hover:bg-[#F4EFE4] p-5 transition-colors cursor-pointer"
        >
          <p className="text-xs font-medium text-[#5C574B]">Takrorlash va Xatolar</p>
          <p className="mt-1.5 font-display text-2xl font-semibold text-[#1E1B16]">
            Ko&rsquo;rib chiqish
          </p>
          <p className="mt-1 text-xs text-[#065F46] font-medium">Xatolar jurnalini ochish →</p>
        </button>
      </section>

      {/* Asosiy Qiroat Kafolatlari */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-2.5">
          <Mic className="w-5 h-5 text-[#065F46]" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-[#1E1B16]">
            Haqiqiy mikrofon va Maxraj tahlili
          </h2>
          <p className="text-sm leading-relaxed text-[#5C574B]">
            Haqiqiy ovozingizni asl Usmoniy matn bilan solishtiradi hamda س/ص, ت/ط, د/ض, ح/ه va ع/أ
            kabi o&rsquo;xshash harflardagi farqlarni aniqlaydi.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-2.5">
          <ShieldCheck className="w-5 h-5 text-[#065F46]" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-[#1E1B16]">
            Qat&rsquo;iy o&rsquo;qish qulfi
          </h2>
          <p className="text-sm leading-relaxed text-[#5C574B]">
            Matn och kulrang ko&rsquo;rinishda boshlanadi va faqat to&rsquo;g&rsquo;ri o&rsquo;qilgandagina haqiqiy
            tajvid ranglariga o&rsquo;tadi. Xatolik tuzatilmaguncha keyingi so&rsquo;z ochilmaydi.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-2.5">
          <Smartphone className="w-5 h-5 text-[#065F46]" aria-hidden="true" />
          <h2 className="font-display text-xl font-semibold text-[#1E1B16]">
            Tebranish signali va Oflayn Mushaf
          </h2>
          <p className="text-sm leading-relaxed text-[#5C574B]">
            Talaffuzda xatolik bo&rsquo;lganda Android tebranishi darhol ogohlantiradi, barcha 604
            sahifa esa qurilmangizda doimiy oflayn saqlanadi.
          </p>
        </div>
      </section>
    </div>
  );
};
