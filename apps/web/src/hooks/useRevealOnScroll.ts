import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion.js';

export interface RevealOnScrollOptions {
  threshold?: number;
  rootMargin?: string;
}

/**
 * Generische Sichtbarkeits-Erkennung für dezente Eintritts-Animationen
 * ("sanftes Einblenden beim Eintritt in den sichtbaren Bereich"). Löst genau
 * einmal aus und bleibt danach sichtbar — keine dauerhaft laufende oder beim
 * Zurückscrollen erneut startende Animation. Bei `prefers-reduced-motion`
 * ist der Inhalt von Anfang an vollständig sichtbar, ganz ohne Observer.
 */
export function useRevealOnScroll<T extends HTMLElement>(options: RevealOnScrollOptions = {}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: options.threshold ?? 0.2, rootMargin: options.rootMargin ?? '0px 0px -40px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return { ref, isVisible };
}
