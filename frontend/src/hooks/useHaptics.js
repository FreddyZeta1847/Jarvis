import { useCallback } from 'react';

export function useHaptics() {
  const vibrate = useCallback((pattern = 50) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  const vibrateShort = useCallback(() => vibrate(50), [vibrate]);
  const vibrateMedium = useCallback(() => vibrate(100), [vibrate]);
  const vibrateLong = useCallback(() => vibrate(200), [vibrate]);
  const vibrateDouble = useCallback(() => vibrate([50, 50, 50]), [vibrate]);

  return {
    vibrate,
    vibrateShort,
    vibrateMedium,
    vibrateLong,
    vibrateDouble
  };
}
