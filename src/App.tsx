import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Home,
  RotateCcw,
  Settings,
  WifiOff,
} from 'lucide-react';
import {
  CompleteQuranDataset,
  DailyActivityRecord,
  MistakeLogEntry,
  QuranMetaIndex,
  ReadingPosition,
  UserSettings,
} from './modules/quran/quranTypes';
import {
  DatasetLoadStatus,
  loadCompleteQuranDataset,
  loadQuranMeta,
} from './modules/quran/quranData';
import {
  DEFAULT_SETTINGS,
  DifficultAyahBookmark,
  SavedPageProgress,
  getAllDailyActivity,
  getAllMistakes,
  getAllPageProgress,
  getDifficultAyahs,
  getFavoritePages,
  getLastReadingPosition,
  getSettings,
  saveSettings,
  toggleDifficultAyah,
  toggleFavoritePage,
} from './modules/storage/offlineDb';
import { computeStatisticsSummary } from './modules/stats/statisticsEngine';
import { BackendEvaluationStatus, fetchEvaluationStatus } from './modules/speech/recitationRecognizer';
import { WelcomeScreen } from './modules/ui/WelcomeScreen';
import { MushafReader } from './modules/ui/MushafReader';
import { MemorizationView } from './modules/ui/MemorizationView';
import { RevisionView } from './modules/ui/RevisionView';
import { StatisticsView } from './modules/ui/StatisticsView';
import { SettingsView } from './modules/ui/SettingsView';

type AppTab = 'home' | 'quran' | 'memorization' | 'revision' | 'statistics' | 'settings';

const NAV_ITEMS: Array<{ id: AppTab; label: string; mobileLabel: string; icon: typeof Home }> = [
  { id: 'home', label: 'Bosh sahifa', mobileLabel: 'Bosh', icon: Home },
  { id: 'quran', label: "Qur'on", mobileLabel: "Qur'on", icon: BookOpen },
  { id: 'memorization', label: 'Yodlash', mobileLabel: 'Yodlash', icon: GraduationCap },
  { id: 'revision', label: 'Takrorlash', mobileLabel: 'Takror', icon: RotateCcw },
  { id: 'statistics', label: 'Statistika', mobileLabel: 'Natija', icon: BarChart3 },
  { id: 'settings', label: 'Sozlamalar', mobileLabel: 'Sozlama', icon: Settings },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [dataset, setDataset] = useState<CompleteQuranDataset | null>(null);
  const [meta, setMeta] = useState<QuranMetaIndex | null>(null);
  const [datasetStatus, setDatasetStatus] = useState<DatasetLoadStatus>({
    stage: 'checking_cache',
    progressPercent: 5,
    fromOfflineCache: false,
    message: "Tasdiqlangan to'liq Qur'on matni tayyorlanmoqda…",
  });

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPosition, setLastPosition] = useState<ReadingPosition>({
    page: 1,
    surah: 1,
    ayah: 1,
    wordIndex: 0,
    updatedAt: Date.now(),
  });
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [favoritePages, setFavoritePages] = useState<number[]>([]);
  const [difficultAyahs, setDifficultAyahs] = useState<DifficultAyahBookmark[]>([]);
  const [allProgress, setAllProgress] = useState<SavedPageProgress[]>([]);
  const [mistakes, setMistakes] = useState<MistakeLogEntry[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivityRecord[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [backendStatus, setBackendStatus] = useState<BackendEvaluationStatus>({
    aiAvailable: true,
    model: 'gemini-4-hydrogen',
    mode: 'multimodal-acoustic',
  });

  const refreshLocalState = useCallback(async () => {
    const [pos, favs, diff, prog, mist, act] = await Promise.all([
      getLastReadingPosition(),
      getFavoritePages(),
      getDifficultAyahs(),
      getAllPageProgress(),
      getAllMistakes(),
      getAllDailyActivity(),
    ]);
    setLastPosition(pos);
    setFavoritePages(favs);
    setDifficultAyahs(diff);
    setAllProgress(prog);
    setMistakes(mist);
    setDailyActivity(act);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const [loadedSettings, pos] = await Promise.all([
        getSettings(),
        getLastReadingPosition(),
      ]);
      setSettings(loadedSettings);
      setCurrentPage(pos.page || 1);
      await refreshLocalState();

      try {
        const [loadedMeta, loadedDataset, evalStat] = await Promise.all([
          loadQuranMeta(),
          loadCompleteQuranDataset((st) => setDatasetStatus(st)),
          fetchEvaluationStatus(),
        ]);
        setMeta(loadedMeta);
        setDataset(loadedDataset);
        setBackendStatus(evalStat);
      } catch (err) {
        setDatasetStatus({
          stage: 'error',
          progressPercent: 0,
          fromOfflineCache: false,
          message:
            err instanceof Error
              ? err.message
              : "Oflayn Qur'on to'plamini yuklab bo'lmadi. Internetga ulangan holda sahifani yangilang.",
        });
      }
    })();
  }, [refreshLocalState]);

  const stats = useMemo(
    () => computeStatisticsSummary(allProgress, mistakes, dailyActivity),
    [allProgress, mistakes, dailyActivity]
  );

  const handleOpenPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(604, page)));
    setActiveTab('quran');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleUpdateSettings = useCallback(async (next: UserSettings) => {
    setSettings(next);
    await saveSettings(next);
  }, []);

  const handleToggleFavoritePage = useCallback(async (page: number) => {
    const next = await toggleFavoritePage(page);
    setFavoritePages(next);
  }, []);

  const handleToggleDifficultAyah = useCallback(async (item: DifficultAyahBookmark) => {
    const next = await toggleDifficultAyah(item);
    setDifficultAyahs(next);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#1E1B16] flex flex-col">
      {/* Yuqori Navigatsiya Paneli */}
      <header className="sticky top-0 z-40 border-b border-[#E4DEC9] bg-[#FAF6EE]/95 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-12 lg:h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#065F46] whitespace-nowrap shrink-0 cursor-pointer"
          >
            ZULXUMOR QURAN
          </button>

          <nav
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#5C574B]"
            aria-label="Asosiy navigatsiya"
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 cursor-pointer ${
                  activeTab === item.id
                    ? 'text-[#065F46] border-[#065F46] font-semibold'
                    : 'border-transparent hover:text-[#1E1B16]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleOpenPage(currentPage)}
              disabled={!dataset}
              className="rounded-xl bg-[#065F46] px-3.5 sm:px-4 py-2 text-xs font-semibold text-[#FAF6EE] hover:bg-[#047857] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {currentPage}-sahifa
            </button>
          </div>
        </div>
      </header>

      {/* Oflayn Rejim Bildirishnomasi */}
      {!isOnline && (
        <div className="border-b border-[#D4AF37]/40 bg-[#F4EFE4] px-4 py-2 text-xs text-[#5C574B] flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-[#B4892B]" aria-hidden="true" />
          <span>
            Oflayn rejim — To&rsquo;liq Mushaf, natijalar va mahalliy nutq rejimi faol.
          </span>
        </div>
      )}

      {/* Asosiy Kontent */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 pt-6">
        {activeTab === 'home' && (
          <WelcomeScreen
            datasetStatus={datasetStatus}
            lastPosition={lastPosition}
            completedPagesCount={stats.totalPagesCompleted}
            streakDays={stats.consecutiveDaysStreak}
            onStartQuran={(p) => handleOpenPage(p ?? lastPosition.page ?? 1)}
            onNavigateTab={(t) => setActiveTab(t)}
          />
        )}

        {activeTab !== 'home' && (!dataset || !meta) && (
          <div className="rounded-3xl border border-[#E4DEC9] bg-[#F4EFE4] p-8 text-center space-y-3">
            <p className="font-display text-2xl font-semibold text-[#1E1B16]">
              Tasdiqlangan Mushaf to&rsquo;plami yuklanmoqda…
            </p>
            <p className="text-sm text-[#5C574B]">{datasetStatus.message}</p>
            <div className="mx-auto max-w-md h-2 rounded-full bg-[#E4DEC9] overflow-hidden">
              <div
                className="h-full bg-[#065F46] transition-all duration-300"
                style={{ width: `${datasetStatus.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {activeTab === 'quran' && dataset && meta && (
          <MushafReader
            dataset={dataset}
            meta={meta}
            currentPage={currentPage}
            settings={settings}
            isOnline={isOnline}
            favoritePages={favoritePages}
            difficultAyahs={difficultAyahs}
            onPageChange={(p) => setCurrentPage(Math.max(1, Math.min(604, p)))}
            onToggleFavoritePage={(p) => void handleToggleFavoritePage(p)}
            onToggleDifficultAyah={(item) => void handleToggleDifficultAyah(item)}
            onProgressUpdated={() => void refreshLocalState()}
          />
        )}

        {activeTab === 'memorization' && dataset && meta && (
          <MemorizationView
            dataset={dataset}
            meta={meta}
            lastPosition={lastPosition}
            favoritePages={favoritePages}
            difficultAyahs={difficultAyahs}
            allProgress={allProgress}
            onOpenPage={handleOpenPage}
            onToggleDifficultAyah={(item) => void handleToggleDifficultAyah(item)}
          />
        )}

        {activeTab === 'revision' && dataset && meta && (
          <RevisionView
            meta={meta}
            mistakes={mistakes}
            allProgress={allProgress}
            onOpenPage={handleOpenPage}
          />
        )}

        {activeTab === 'statistics' && (
          <StatisticsView stats={stats} onOpenPage={handleOpenPage} />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={(next) => void handleUpdateSettings(next)}
            backendStatus={backendStatus}
            datasetStatus={datasetStatus}
            isOnline={isOnline}
          />
        )}
      </main>

      {/* Mobil Pastki Navigatsiya Paneli */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#E4DEC9] bg-[#FAF6EE]/95 backdrop-blur-md pb-safe"
        aria-label="Mobil navigatsiya"
      >
        <div className="grid grid-cols-6 h-14 items-center">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors cursor-pointer ${
                  active ? 'text-[#065F46]' : 'text-[#5C574B]'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
                <span className="text-[10px] font-medium tracking-tight mt-0.5 whitespace-nowrap">
                  {item.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
