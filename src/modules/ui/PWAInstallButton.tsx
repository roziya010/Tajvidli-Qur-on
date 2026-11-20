import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'card' }> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className={
          variant === 'card'
            ? 'inline-flex items-center gap-2 rounded-xl bg-[#065F46] px-4 py-2.5 text-sm font-medium text-[#FAF6EE] hover:bg-[#047857] transition-colors whitespace-nowrap shrink-0 min-h-[44px]'
            : 'inline-flex items-center gap-1.5 rounded-lg border border-[#065F46]/25 bg-[#065F46]/8 px-3 py-1.5 text-xs font-medium text-[#065F46] hover:bg-[#065F46]/15 transition-colors whitespace-nowrap shrink-0 min-h-[40px]'
        }
      >
        <Download className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Ilovani o&rsquo;rnatish</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-[#FAF6EE] px-3 py-1.5 text-xs font-medium text-[#5C574B] hover:text-[#1E1B16] transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          <span>iOS ga o&rsquo;rnatish</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#FAF6EE] border border-[#E4DEC9] p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl font-semibold text-[#1E1B16]">
                  Zulxumor Qur&rsquo;on ilovasini o&rsquo;rnatish
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#5C574B] hover:bg-[#EFE9DA]"
                  aria-label="O'rnatish yo'riqnomasini yopish"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#5C574B]">
                1. Safari panelidagi <strong>Ulashish</strong> tugmasini bosing.
                <br />
                2. Pastga surib, oflayn Mushafdan to&rsquo;liq foydalanish uchun{' '}
                <strong>Bosh ekranga qo&rsquo;shish</strong> bandini tanlang.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#065F46] py-2.5 text-sm font-medium text-[#FAF6EE] hover:bg-[#047857] transition-colors min-h-[44px]"
              >
                Tushunarli
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
