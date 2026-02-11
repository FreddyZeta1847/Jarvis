import { useCallback, useRef } from 'react';

export function useWakeLock() {
  const wakeLockRef = useRef(null);

  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake lock acquired');
      } catch (err) {
        console.log('Wake lock request failed:', err);
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake lock released');
      } catch (err) {
        console.log('Wake lock release failed:', err);
      }
    }
  }, []);

  return { requestWakeLock, releaseWakeLock };
}
