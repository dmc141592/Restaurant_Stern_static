import { useEffect, useState } from 'react';

const SENTINEL_SELECTOR = '[data-hero-sentinel]';

/**
 * Erkennt, ob der Header aktuell über einem Video-Hero schwebt (transparenter
 * Ausgangszustand) oder nicht (z. B. weil die Seite keinen Hero besitzt oder
 * der Nutzer bereits ein Stück gescrollt hat — dann der kompakte, helle
 * Zustand).
 *
 * Die Hero-Komponente markiert eine kurze Zone an ihrem oberen Rand mit
 * `data-hero-sentinel`. Sobald diese Zone aus dem Viewport scrollt (nach
 * wenigen Pixeln Scroll-Distanz), wechselt der Header in den kompakten
 * Zustand — deutlich bevor der unten verankerte Hero-Text in die Höhe des
 * Headers wandern könnte. Existiert die Zone nicht (alle Seiten ausser der
 * Startseite), bleibt der Header sofort im kompakten Zustand.
 */
export function useIsOverHero(routeKey: string): boolean {
  const [isOverHero, setIsOverHero] = useState(false);

  useEffect(() => {
    const sentinel = document.querySelector(SENTINEL_SELECTOR);
    if (!sentinel) {
      setIsOverHero(false);
      return;
    }

    setIsOverHero(true);

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsOverHero(entry.isIntersecting);
        }
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [routeKey]);

  return isOverHero;
}
