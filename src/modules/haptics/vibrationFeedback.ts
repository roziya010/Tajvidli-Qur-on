import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { UserSettings } from '../quran/quranTypes';

export interface VibrationCapabilities {
  isNativeCapacitor: boolean;
  hasWebVibration: boolean;
  supported: boolean;
}

export function getVibrationCapabilities(): VibrationCapabilities {
  const isNativeCapacitor =
    typeof Capacitor !== 'undefined' &&
    typeof Capacitor.isNativePlatform === 'function' &&
    Capacitor.isNativePlatform();

  const hasWebVibration =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  return {
    isNativeCapacitor,
    hasWebVibration,
    supported: isNativeCapacitor || hasWebVibration,
  };
}

function getDurationByIntensity(intensity: UserSettings['vibrationIntensity']): number {
  switch (intensity) {
    case 'light':
      return 65;
    case 'strong':
      return 165;
    case 'medium':
    default:
      return 110;
  }
}

function getImpactByIntensity(intensity: UserSettings['vibrationIntensity']): ImpactStyle {
  switch (intensity) {
    case 'light':
      return ImpactStyle.Light;
    case 'strong':
      return ImpactStyle.Heavy;
    case 'medium':
    default:
      return ImpactStyle.Medium;
  }
}

/**
 * Triggers real physical device vibration on Android (Capacitor native Haptics
 * or Android Web Vibration API) when a pronunciation error is confirmed.
 * - First mistake: 1 short pulse
 * - Repeated mistake: 2 short pulses (if enabled)
 */
export async function triggerErrorVibration(
  settings: UserSettings,
  isRepeatedError: boolean
): Promise<boolean> {
  if (!settings.vibrationEnabled) return false;

  const caps = getVibrationCapabilities();
  const duration = getDurationByIntensity(settings.vibrationIntensity);
  const useDoublePulse = isRepeatedError && settings.repeatedErrorDoublePulse;

  if (caps.isNativeCapacitor) {
    try {
      await Haptics.notification({ type: NotificationType.Error });
      if (useDoublePulse) {
        await new Promise((r) => setTimeout(r, 140));
        await Haptics.impact({ style: getImpactByIntensity(settings.vibrationIntensity) });
      }
      return true;
    } catch {
      // Fallback to navigator.vibrate if native plugin call fails
    }
  }

  if (caps.hasWebVibration) {
    try {
      const pattern = useDoublePulse ? [duration, 90, duration] : [duration];
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Subtle tactile test pulse for Settings verification.
 */
export async function triggerTestVibration(settings: UserSettings): Promise<boolean> {
  const caps = getVibrationCapabilities();
  const duration = getDurationByIntensity(settings.vibrationIntensity);

  if (caps.isNativeCapacitor) {
    try {
      await Haptics.vibrate({ duration });
      return true;
    } catch {
      // fallback
    }
  }

  if (caps.hasWebVibration) {
    try {
      return navigator.vibrate([duration]);
    } catch {
      return false;
    }
  }

  return false;
}
