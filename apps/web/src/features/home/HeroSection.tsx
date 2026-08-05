import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ArrowRightIcon from '../../components/icons/ArrowRightIcon.js';
import MusicOffIcon from '../../components/icons/MusicOffIcon.js';
import MusicOnIcon from '../../components/icons/MusicOnIcon.js';
import StarIcon from '../../components/icons/StarIcon.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { cx } from '../../utils/cx.js';
import styles from './HeroSection.module.css';

/**
 * Erwarteter Ablageort der Originaldatei — siehe public/media/hero/README.md.
 * Nach dem Einfügen der Datei sind keine Codeänderungen nötig.
 */
const HERO_VIDEO_SRC = '/media/hero/sternen-hero.mp4';

type VideoState = 'loading' | 'ready' | 'error' | 'disabled';

export default function HeroSection() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoState, setVideoState] = useState<VideoState>('loading');
  const [isMuted, setIsMuted] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);

  // Bei reduzierter Bewegung wird das Video gar nicht erst angefragt/gestartet —
  // das statische Fallback bleibt stehen (Vorgabe: kein ungefragt laufendes Video).
  useEffect(() => {
    if (prefersReducedMotion) {
      setVideoState('disabled');
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setHasEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleReadyToPlay(): void {
    setVideoState((current) => (current === 'error' || current === 'disabled' ? current : 'ready'));
  }

  function handleVideoError(): void {
    setVideoState('error');
  }

  function toggleMusic(): void {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  }

  const shouldRenderVideo = !prefersReducedMotion && videoState !== 'error';
  const showMusicControl = videoState === 'ready';

  return (
    <section className={styles.hero} aria-label="Restaurant Sternen Albisrieden — Willkommen">
      <div className={styles.mediaLayer}>
        {/* Liegt immer als unterste Ebene bereit — nie ein schwarzer oder leerer
            Bereich, unabhängig davon, ob/wann das Video verfügbar wird. */}
        <div className={styles.fallback} aria-hidden="true">
          <StarIcon className={styles.fallbackStar} />
        </div>

        {shouldRenderVideo && (
          <video
            ref={videoRef}
            className={cx(styles.video, videoState === 'ready' && styles.videoVisible)}
            src={HERO_VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            tabIndex={-1}
            onCanPlay={handleReadyToPlay}
            onPlaying={handleReadyToPlay}
            onError={handleVideoError}
          />
        )}

        <div className={cx(styles.scrim, 'media-overlay', 'media-overlay-bottom')} aria-hidden="true" />
      </div>

      <div className={cx(styles.content, 'container', hasEntered && styles.contentVisible)}>
        <p className={styles.eyebrow}>Zürich Albisrieden</p>
        <h1 className={styles.heading}>Willkommen im Sternen</h1>
        <p className={styles.subtext}>Tradition, Genuss und Gastfreundschaft.</p>
        <div className={styles.actionsRow}>
          <Link
            to="/reservation"
            className={cx('btn', 'btn-primary', styles.primaryAction, 'focus-ring-on-dark')}
          >
            Tisch reservieren
          </Link>
          <Link
            to="/ueber-uns"
            className={cx('link-arrow', styles.secondaryAction, 'focus-ring-on-dark')}
          >
            Restaurant entdecken
            <ArrowRightIcon />
          </Link>
        </div>
      </div>

      {showMusicControl && (
        <button
          type="button"
          className={cx(styles.musicToggle, 'focus-ring-on-dark')}
          onClick={toggleMusic}
          aria-pressed={!isMuted}
          aria-label={isMuted ? 'Musik einschalten' : 'Musik ausschalten'}
        >
          {isMuted ? <MusicOffIcon /> : <MusicOnIcon />}
          <span>{isMuted ? 'Musik einschalten' : 'Musik ausschalten'}</span>
        </button>
      )}

      {videoState !== 'error' && (
        <div className={styles.scrollHint} aria-hidden="true">
          <span className={styles.scrollHintLine} />
        </div>
      )}

      {/* Markiert das Hero-Ende für den Header (Erkennung der Scroll-Transparenz). */}
      <div data-hero-sentinel className={styles.sentinel} />
    </section>
  );
}
