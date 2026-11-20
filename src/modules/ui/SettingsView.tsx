import React, { useState } from 'react';
import { CheckCircle2, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { UserSettings } from '../quran/quranTypes';
import {
  getVibrationCapabilities,
  triggerTestVibration,
} from '../haptics/vibrationFeedback';
import { BackendEvaluationStatus } from '../speech/recitationRecognizer';
import { DatasetLoadStatus } from '../quran/quranData';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (next: UserSettings) => void;
  backendStatus: BackendEvaluationStatus;
  datasetStatus: DatasetLoadStatus;
  isOnline: boolean;
}

const INTENSITY_LABELS: Record<UserSettings['vibrationIntensity'], string> = {
  light: 'Yengil',
  medium: "O'rtacha",
  strong: 'Kuchli',
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  backendStatus,
  datasetStatus,
  isOnline,
}) => {
  const [vibTestResult, setVibTestResult] = useState<string>('');
  const vibCaps = getVibrationCapabilities();

  const update = (patch: Partial<UserSettings>) => {
    onUpdateSettings({ ...settings, ...patch });
  };

  return (
    <div className="space-y-8 pb-24 lg:pb-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold text-[#065F46]">SOZLAMALAR VA OFLAYN TIZIM</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1E1B16]">
          Qiroat, Tebranish va Oflayn Sozlamalar
        </h1>
      </header>

      {/* Tebranish va Xato Bildirishnomasi */}
      <section className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#1E1B16]">
              Android tebranishi va xato signali
            </h2>
            <p className="text-xs text-[#5C574B] mt-1">
              {vibCaps.isNativeCapacitor
                ? 'Mahalliy Capacitor Haptics faol.'
                : vibCaps.hasWebVibration
                  ? "Ushbu qurilmada Android brauzer tebranish API qo'llab-quvvatlanadi."
                  : "Ushbu kompyuter yoki iOS brauzeri apparat tebranishini bermaydi (vizual qizil ogohlantirish faol qoladi)."}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const ok = await triggerTestVibration(settings);
              setVibTestResult(
                ok
                  ? 'Qurilmaga sinov tebranishi yuborildi!'
                  : "Brauzer jismoniy tebranishni ishga tushirmadi (kompyuter yoki iOS Safari'da kutilgan holat)."
              );
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#065F46]/30 bg-[#065F46]/10 px-4 py-2 text-xs font-semibold text-[#065F46] hover:bg-[#065F46]/20 min-h-[44px] cursor-pointer"
          >
            <Smartphone className="w-4 h-4" aria-hidden="true" />
            <span>Tebranishni sinash</span>
          </button>
        </div>

        {vibTestResult && <p className="text-xs text-[#065F46] font-medium">{vibTestResult}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-center justify-between rounded-xl border border-[#E4DEC9] bg-[#F4EFE4] p-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[#1E1B16]">Xatoda tebranish</p>
              <p className="text-xs text-[#5C574B]">Talaffuz xatosida darhol qisqa tebranish berish</p>
            </div>
            <input
              type="checkbox"
              checked={settings.vibrationEnabled}
              onChange={(e) => update({ vibrationEnabled: e.target.checked })}
              className="w-5 h-5 accent-[#065F46]"
            />
          </label>

          <label className="flex items-center justify-between rounded-xl border border-[#E4DEC9] bg-[#F4EFE4] p-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[#1E1B16]">Takroriy xatoda ikki tebranish</p>
              <p className="text-xs text-[#5C574B]">Bir so&rsquo;zda xato takrorlansa ikki qisqa tebranish</p>
            </div>
            <input
              type="checkbox"
              checked={settings.repeatedErrorDoublePulse}
              onChange={(e) => update({ repeatedErrorDoublePulse: e.target.checked })}
              className="w-5 h-5 accent-[#065F46]"
            />
          </label>
        </div>

        <div>
          <p className="text-xs font-medium text-[#5C574B] mb-2">Tebranish kuchi</p>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#EFE9DA] max-w-sm">
            {(['light', 'medium', 'strong'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => update({ vibrationIntensity: level })}
                className={`flex-1 py-2 text-xs font-medium rounded-lg cursor-pointer ${
                  settings.vibrationIntensity === level
                    ? 'bg-[#FAF6EE] text-[#065F46] shadow-sm'
                    : 'text-[#5C574B]'
                }`}
              >
                {INTENSITY_LABELS[level]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Sun'iy Intellekt va Mushaf Ko'rinishi */}
      <section className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-5">
        <h2 className="font-display text-2xl font-semibold text-[#1E1B16]">
          Talaffuzni baholash va Mushaf ko&rsquo;rinishi
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#5C574B]">Baholash tizimi</label>
            <select
              value={settings.evaluationEngine}
              onChange={(e) =>
                update({ evaluationEngine: e.target.value as UserSettings['evaluationEngine'] })
              }
              className="w-full rounded-xl border border-[#E4DEC9] bg-white px-3 py-2.5 text-sm min-h-[44px]"
            >
              <option value="auto">Avto (Onlayn akustik AI · Oflayn nutq tanish)</option>
              <option value="ai-acoustic">Akustik Maxraj AI baholovchisi (Onlayn)</option>
              <option value="offline-phonetic">Faqat qurilmadagi oflayn nutq tahlili</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#5C574B]">
              Tekshirish qat&rsquo;iyligi
            </label>
            <select
              value={settings.strictness}
              onChange={(e) =>
                update({ strictness: e.target.value as UserSettings['strictness'] })
              }
              className="w-full rounded-xl border border-[#E4DEC9] bg-white px-3 py-2.5 text-sm min-h-[44px]"
            >
              <option value="standard">Standart (Maxraj va asosiy harakatlar)</option>
              <option value="strict">Qat&rsquo;iy (To&rsquo;liq tajvid, madd va sifatlar)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#5C574B]">
              Arabcha Mushaf shrift o&rsquo;lchami
            </label>
            <select
              value={settings.fontSizeScale}
              onChange={(e) =>
                update({ fontSizeScale: e.target.value as UserSettings['fontSizeScale'] })
              }
              className="w-full rounded-xl border border-[#E4DEC9] bg-white px-3 py-2.5 text-sm min-h-[44px]"
            >
              <option value="normal">Oddiy</option>
              <option value="large">Katta (Tavsiya etiladi)</option>
              <option value="xlarge">Juda katta</option>
            </select>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-[#E4DEC9] bg-[#F4EFE4] p-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-[#1E1B16]">Xatodan so&rsquo;ng qayta tinglash</p>
              <p className="text-xs text-[#5C574B]">So&rsquo;zni takrorlash uchun mikrofonni yoqiq tutish</p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoContinueListening}
              onChange={(e) => update({ autoContinueListening: e.target.checked })}
              className="w-5 h-5 accent-[#065F46]"
            />
          </label>
        </div>
      </section>

      {/* Oflayn Xotira va Imkoniyatlar Holati */}
      <section className="rounded-2xl border border-[#E4DEC9] bg-[#FAF6EE] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-[#1E1B16]">
            Oflayn xotira va AI holati
          </h2>
          <PWAInstallButton variant="card" />
        </div>

        <div className="divide-y divide-[#E4DEC9] text-sm">
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-[#1E1B16]">
                To&rsquo;liq 30 juzlik Usmoniy va Tajvid Qur&rsquo;oni (6 236 oyat · 604 sahifa)
              </p>
              <p className="text-xs text-[#5C574B]">{datasetStatus.message}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#065F46] shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              100% Oflayn ishlaydi
            </span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-[#1E1B16]">
                O&rsquo;qish qulfi, statistika, xatcho&rsquo;plar va xatolar jurnali
              </p>
              <p className="text-xs text-[#5C574B]">Qurilmada IndexedDB orqali mahalliy saqlanadi</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#065F46] shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              100% Oflayn ishlaydi
            </span>
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-[#1E1B16]">
                Akustik harf darajasidagi Maxraj va Tajvid tahlili
              </p>
              <p className="text-xs text-[#5C574B]">
                {backendStatus.aiAvailable
                  ? `Onlayn rejimda ${backendStatus.model} akustik tahlilchisi ulangan.`
                  : "Server AI xizmati mavjud emas; oflayn rejimda qurilmaning ar-SA nutq tanishi ishlatiladi."}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
                isOnline && backendStatus.aiAvailable ? 'text-[#065F46]' : 'text-[#B4892B]'
              }`}
            >
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {isOnline && backendStatus.aiAvailable ? 'Onlayn tayyor' : 'Oflayn zaxira'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
