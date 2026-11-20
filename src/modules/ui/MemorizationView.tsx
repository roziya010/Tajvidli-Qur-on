import React, { useMemo, useState } from 'react';
import { Bookmark, CheckCircle2, Play, Search } from 'lucide-react';
import {
  CompleteQuranDataset,
  QuranMetaIndex,
  ReadingPosition,
} from '../quran/quranTypes';
import { findPageForAyah } from '../quran/quranData';
import { DifficultAyahBookmark, SavedPageProgress } from '../storage/offlineDb';

interface MemorizationViewProps {
  dataset: CompleteQuranDataset;
  meta: QuranMetaIndex;
  lastPosition: ReadingPosition;
  favoritePages: number[];
  difficultAyahs: DifficultAyahBookmark[];
  allProgress: SavedPageProgress[];
  onOpenPage: (page: number) => void;
  onToggleDifficultAyah: (item: DifficultAyahBookmark) => void;
}

export const MemorizationView: React.FC<MemorizationViewProps> = ({
  dataset,
  meta,
  lastPosition,
  favoritePages,
  difficultAyahs,
  allProgress,
  onOpenPage,
  onToggleDifficultAyah,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [selectedAyah, setSelectedAyah] = useState(1);

  const completedPagesSet = useMemo(
    () => new Set(allProgress.filter((p) => p.completed).map((p) => p.page)),
    [allProgress]
  );

  const filteredSurahs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meta.surahs;
    return meta.surahs.filter(
      (s) => s.en.toLowerCase().includes(q) || s.name.includes(q) || String(s.n) === q
    );
  }, [meta.surahs, search]);

  const surahInfo = meta.surahs.find((s) => s.n === selectedSurah) || meta.surahs[0];

  return (
    <div className="space-y-8 pb-24 lg:pb-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold text-[#065F46]">YODLASH BO&lsquo;LIMI</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1E1B16]">
          Hifz va Yo&rsquo;naltirilgan Yodlash
        </h1>
        <p className="text-sm text-[#5C574B] max-w-2xl">
          Istalgan sura, juz yoki oyatni tanlang, sevimli Mushaf sahifalarini saqlang va har bir
          so&rsquo;z tasdiqlanmaguncha qiyin oyatlarni takrorlang.
        </p>
      </header>

      {/* Oxirgi joylashuv va tezkor oyat tanlash */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 rounded-2xl border border-[#D4AF37]/50 bg-[#F4EFE4] p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[#5C574B]">Oxirgi joydan davom etish</p>
            <h2 className="font-display text-2xl font-semibold text-[#1E1B16]">
              {lastPosition.page}-sahifa · {lastPosition.surah}-sura, {lastPosition.ayah}-oyat
            </h2>
            <p className="text-xs text-[#5C574B]">
              Tezkor davom ettirish uchun qurilmangizda maxfiy saqlanadi.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenPage(lastPosition.page)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#065F46] px-5 py-3 text-sm font-semibold text-[#FAF6EE] hover:bg-[#047857] transition-colors min-h-[44px] cursor-pointer"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>Qiroatni davom ettirish</span>
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onOpenPage(findPageForAyah(dataset, selectedSurah, selectedAyah));
          }}
          className="lg:col-span-7 rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-4"
        >
          <h2 className="font-display text-xl font-semibold text-[#1E1B16]">
            Yodlash uchun Sura va Oyatni tanlang
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#5C574B] mb-1">Sura</label>
              <select
                value={selectedSurah}
                onChange={(e) => {
                  setSelectedSurah(Number(e.target.value));
                  setSelectedAyah(1);
                }}
                className="w-full rounded-xl border border-[#E4DEC9] bg-white px-3 py-2.5 text-sm min-h-[44px]"
              >
                {meta.surahs.map((s) => (
                  <option key={s.n} value={s.n}>
                    {s.n}. {s.en} ({s.count} oyat)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5C574B] mb-1">
                Oyat (1–{surahInfo.count})
              </label>
              <input
                type="number"
                min={1}
                max={surahInfo.count}
                value={selectedAyah}
                onChange={(e) => setSelectedAyah(Number(e.target.value) || 1)}
                className="w-full rounded-xl border border-[#E4DEC9] bg-white px-3 py-2.5 text-sm tabular-nums min-h-[44px]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl border border-[#065F46] bg-[#065F46]/10 px-5 py-2.5 text-sm font-semibold text-[#065F46] hover:bg-[#065F46]/20 transition-colors min-h-[44px] cursor-pointer"
          >
            Oyatni Mushafda ochish
          </button>
        </form>
      </div>

      {/* Sevimli Sahifalar va Qiyin Oyatlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-[#1E1B16]">Sevimli sahifalar</h2>
            <span className="text-xs text-[#5C574B] tabular-nums">{favoritePages.length} ta saqlangan</span>
          </div>
          {favoritePages.length === 0 ? (
            <p className="text-sm text-[#5C574B]">
              Kundalik hifz uchun saqlash maqsadida istalgan Mushaf sahifasidagi xatcho&rsquo;p
              belgisini bosing.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {favoritePages.map((p) => {
                const start = meta.pageStarts[String(p)];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onOpenPage(p)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/50 bg-[#F4EFE4] px-3.5 py-2 text-xs font-medium text-[#1E1B16] hover:bg-[#EFE9DA] min-h-[44px] cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#B4892B]" fill="currentColor" />
                    <span className="tabular-nums">{p}-sahifa</span>
                    {start && <span className="text-[#5C574B]">· {start.surahEn}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-[#1E1B16]">
              Takrorlash uchun qiyin oyatlar
            </h2>
            <span className="text-xs text-[#5C574B] tabular-nums">{difficultAyahs.length} ta saqlangan</span>
          </div>
          {difficultAyahs.length === 0 ? (
            <p className="text-sm text-[#5C574B]">
              Qiyin oyatlarni takrorlash ro&rsquo;yxatiga qo&rsquo;shish uchun Mushafdagi oyat
              raqamiga ﴿٠﴾ bosing.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {difficultAyahs.map((item) => (
                <div
                  key={item.key}
                  className="rounded-xl border border-[#E4DEC9] bg-[#F4EFE4] p-3.5 flex items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => onOpenPage(item.page)}
                    className="text-left flex-1 min-w-0 cursor-pointer"
                  >
                    <p className="text-xs font-semibold text-[#065F46]">
                      {item.surahName} · {item.ayah}-oyat · {item.page}-sahifa
                    </p>
                    <p
                      dir="rtl"
                      lang="ar"
                      className="font-quran text-lg text-[#1E1B16] truncate mt-1"
                    >
                      {item.arabicPreview}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleDifficultAyah(item)}
                    className="text-xs text-[#5C574B] hover:text-[#DC2626] px-2 py-1 min-h-[40px] cursor-pointer"
                  >
                    O&rsquo;chirish
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Barcha 114 Sura Ro'yxati */}
      <section className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-[#1E1B16]">
            Barcha 114 sura
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#5C574B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suralarni qidirish…"
              className="w-full rounded-xl border border-[#E4DEC9] bg-white pl-10 pr-4 py-2 text-sm min-h-[44px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSurahs.map((s) => {
            const pageDone = completedPagesSet.has(s.startPage);
            return (
              <button
                key={s.n}
                type="button"
                onClick={() => onOpenPage(s.startPage)}
                className="flex items-center justify-between rounded-xl border border-[#E4DEC9] bg-[#F4EFE4]/70 hover:bg-[#F4EFE4] px-4 py-3 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-[#FAF6EE] border border-[#E4DEC9] text-xs font-semibold text-[#065F46] flex items-center justify-center shrink-0 tabular-nums">
                    {s.n}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-[#1E1B16] truncate">{s.en}</p>
                      {pageDone && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#065F46] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[#5C574B] truncate">
                      {s.count} oyat · {s.startJuz}-juz · {s.startPage}-sah.
                    </p>
                  </div>
                </div>
                <span dir="rtl" lang="ar" className="font-quran text-xl text-[#065F46] shrink-0 ml-2">
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};
