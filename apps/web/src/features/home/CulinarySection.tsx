import { Link } from 'react-router-dom';
import ArrowRightIcon from '../../components/icons/ArrowRightIcon.js';
import { useRevealOnScroll } from '../../hooks/useRevealOnScroll.js';
import { cx } from '../../utils/cx.js';
import styles from './CulinarySection.module.css';

/**
 * Editorialer Übergang vom Video-Hero zu den kulinarischen Inhalten der
 * Startseite. Bild und Routingziel siehe Abschlussmeldung/README-Hinweis in
 * public/media/food/ — Speisekarten-Route und -Inhalte werden hier nur
 * verlinkt, nicht verändert.
 */
export default function CulinarySection() {
  const { ref, isVisible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <section aria-labelledby="culinary-heading" className={styles.section}>
      <div ref={ref} className={cx(styles.grid, isVisible && styles.gridVisible)}>
        <div className={styles.textCol}>
          <span className={styles.rule} aria-hidden="true" />
          <p className={styles.eyebrow}>Kulinarik im Sternen</p>
          <h2 id="culinary-heading" className={styles.heading}>
            Genuss mit Charakter
          </h2>
          <p className={styles.body}>
            Mit Sorgfalt zubereitet und mit Freude serviert – für genussvolle Momente im Sternen.
          </p>
          <Link to="/speisekarte" className={cx('link-arrow', styles.menuLink)}>
            Speisekarte entdecken
            <ArrowRightIcon />
          </Link>
        </div>

        <figure className={styles.mediaCol}>
          <div className={styles.imageFrame}>
            <img
              className={styles.image}
              src="/media/food/stake_pommes_teller.jpg"
              width={1707}
              height={2560}
              loading="lazy"
              decoding="async"
              alt="Gebratenes Steak mit Pommes frites, Blumenkohl, Broccoli und Ofengemüse, serviert auf einem gedeckten Tisch im Restaurant Sternen."
            />
          </div>
        </figure>
      </div>
    </section>
  );
}
