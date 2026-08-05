import { useEffect } from 'react';

/** Verhindert das Scrollen des Hintergrunds, während z. B. das mobile Menü offen ist. */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) {
      return;
    }
    document.body.classList.add('scroll-locked');
    return () => {
      document.body.classList.remove('scroll-locked');
    };
  }, [locked]);
}
