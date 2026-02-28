import { useRef, useCallback } from 'react';

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 50 }) {
  const touchStart = useRef(null);

  const onTouchStart = useCallback((e) => {
    touchStart.current = e.touches[0].clientX;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(diff) < threshold) return;
    if (diff > 0) onSwipeRight?.();
    else onSwipeLeft?.();
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchEnd };
}
