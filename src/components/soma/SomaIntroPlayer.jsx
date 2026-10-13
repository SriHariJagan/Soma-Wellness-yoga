import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { INTRO_VIDEO, hasSeenIntro, markIntroSeen } from "../../config/introVideo";
import { usePrefersReducedMotion } from "../../lib/motion";
import styles from "./SomaIntroPlayer.module.css";

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

/**
 * SomaIntroPlayer — reusable, lazy intro video overlay.
 *
 * - Opens full-screen on landing (once per session), same <video> element
 *   morphs into a YouTube-style bottom-right floating player on Minimize,
 *   continuing at the exact timestamp. Restore returns to full-screen.
 * - Video bytes load lazily AFTER the page is interactive (idle callback);
 *   the source is a public URL string — never bundled, never preloaded.
 * - Never blocks React mounting: renders null until idle + home route.
 * - Muted autoplay first (universally allowed); Play fallback on block;
 *   one-tap unmute; Skip / Minimize / Restore / Close; end-card replay.
 * - Keyboard accessible (dialog semantics, focus trap, Esc), reduced-motion
 *   aware (opt-in pill instead of auto-open), mobile responsive.
 * - Progress/time update via refs (no per-frame rerenders); all media
 *   listeners + idle handles cleaned up on unmount.
 */
export default function SomaIntroPlayer({ autoOpen = true }) {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();

  const videoRef = useRef(null);
  const dialogRef = useRef(null);
  const seekRef = useRef(null);
  const curRef = useRef(null);
  const durRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const srcAssignedRef = useRef(false);

  const [stage, setStage] = useState("pending"); // pending | cta | fs | pip | done
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(false);
  const [ended, setEnded] = useState(false);

  const str = {
    skip: t("intro.skip", "Skip intro"),
    minimize: t("intro.minimize", "Minimize"),
    restore: t("intro.restore", "Back to full screen"),
    close: t("intro.close", "Close"),
    mute: t("intro.mute", "Mute"),
    unmute: t("intro.unmute", "Unmute"),
    play: t("intro.play", "Play"),
    pause: t("intro.pause", "Pause"),
    replay: t("intro.replay", "Replay"),
    seek: t("intro.seek", "Seek"),
    unmutePill: t("intro.tapToUnmute", "Tap to unmute"),
    watch: t("intro.watch", "Watch intro"),
    title: t("intro.title", INTRO_VIDEO.title),
    loadError: t("intro.loadError", "The video could not be loaded. Check your connection and try again."),
    retry: t("intro.retry", "Retry"),
    endTitle: t("intro.endTitle", "Karibu to Soma Wellness"),
  };

  const assignSrc = useCallback(() => {
    const v = videoRef.current;
    if (!v || srcAssignedRef.current) return;
    srcAssignedRef.current = true;
    v.preload = "metadata";
    if (!v.querySelector("source")) {
      const s = document.createElement("source");
      s.src = INTRO_VIDEO.src;
      s.type = "video/mp4";
      v.appendChild(s);
      v.load();
    }
  }, []);

  const tryAutoplay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    setMuted(true);
    setNeedsGesture(false);
    let p;
    try {
      p = v.play();
    } catch {
      setNeedsGesture(true);
      return;
    }
    if (p && typeof p.catch === "function") {
      p.catch(() => setNeedsGesture(true));
    }
  }, []);

  const openFullscreen = useCallback(() => {
    lastFocusedRef.current = document.activeElement;
    assignSrc();
    setEnded(false);
    setError(false);
    setStage("fs");
  }, [assignSrc]);

  // ── Idle-gated auto-open: never competes with first paint / hydration ──
  useEffect(() => {
    if (!INTRO_VIDEO.enabled || !autoOpen) return;
    if (INTRO_VIDEO.repeat === "session" && hasSeenIntro()) return;
    let idleId = 0;
    let timer = 0;
    const kick = () => {
      if (reduced) {
        setStage("cta");
        return;
      }
      openFullscreen();
      // Autoplay attempt runs after paint so the overlay is visible first.
      timer = window.setTimeout(tryAutoplay, 60);
    };
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(kick, { timeout: 1800 });
    } else {
      timer = window.setTimeout(kick, 1200);
    }
    return () => {
      if (typeof window.cancelIdleCallback === "function" && idleId) window.cancelIdleCallback(idleId);
      window.clearTimeout(timer);
    };
  }, [autoOpen, reduced, openFullscreen, tryAutoplay]);

  const finish = useCallback(
    (replayable) => {
      videoRef.current?.pause();
      setPlaying(false);
      markIntroSeen();
      if (document.body) document.body.style.overflow = "";
      const back = lastFocusedRef.current;
      if (back && typeof back.focus === "function") {
        try {
          back.focus({ preventScroll: true });
        } catch {
          /* noop */
        }
      }
      if (!replayable) setStage("done");
    },
    []
  );

  const handleSkip = useCallback(() => finish(false), [finish]);
  const handleClose = useCallback(() => finish(false), [finish]);
  const handleMinimize = useCallback(() => {
    if (document.body) document.body.style.overflow = "";
    setStage("pip");
  }, []);
  const handleRestore = useCallback(() => {
    lastFocusedRef.current = document.activeElement;
    setStage("fs");
  }, []);

  const handleReplay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setEnded(false);
    setError(false);
    try {
      v.currentTime = 0;
    } catch {
      /* noop */
    }
    let p;
    try {
      p = v.play();
    } catch {
      setNeedsGesture(true);
      return;
    }
    if (p && typeof p.catch === "function") p.catch(() => setNeedsGesture(true));
  }, []);

  const handlePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      setEnded(false);
      let p;
      try {
        p = v.play();
      } catch {
        setNeedsGesture(true);
        return;
      }
      if (p && typeof p.catch === "function") p.catch(() => setNeedsGesture(true));
    } else {
      v.pause();
    }
  }, []);

  const handleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  }, []);

  const handleGesturePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    // Real user gesture: try with sound first, fall back to muted.
    v.muted = false;
    setMuted(false);
    let p;
    try {
      p = v.play();
    } catch {
      v.muted = true;
      setMuted(true);
      try {
        p = v.play();
      } catch {
        /* still blocked — keep overlay */
      }
      return;
    }
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        v.muted = true;
        setMuted(true);
        try {
          const q = v.play();
          if (q && typeof q.catch === "function") q.catch(() => setNeedsGesture(true));
        } catch {
          setNeedsGesture(true);
        }
      });
    }
    setNeedsGesture(false);
  }, []);

  const handleSeek = useCallback((e) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    const val = Number(e.target.value);
    try {
      v.currentTime = (val / 1000) * v.duration;
    } catch {
      /* noop */
    }
  }, []);

  const handleRetry = useCallback(() => {
    const v = videoRef.current;
    setError(false);
    setNeedsGesture(false);
    if (!v) return;
    try {
      v.load();
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => setNeedsGesture(true));
    } catch {
      setNeedsGesture(true);
    }
  }, []);

  // ── Media listeners (single subscription, imperative progress — no rerenders) ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v || (stage !== "fs" && stage !== "pip")) return;
    // The <video> node only exists once the stage renders — attach the
    // lazy source here so first open never misses it.
    assignSrc();
    const onPlay = () => {
      setPlaying(true);
      setNeedsGesture(false);
      setBuffering(false);
    };
    const onPause = () => setPlaying(false);
    const onWaiting = () => setBuffering(true);
    const onCanPlay = () => setBuffering(false);
    const onPlaying = () => setBuffering(false);
    const onTime = () => {
      if (seekRef.current && Number.isFinite(v.duration) && v.duration > 0) {
        const pct = (v.currentTime / v.duration) * 100;
        seekRef.current.value = String(Math.round(pct * 10));
        seekRef.current.style.setProperty("--seek-fill", `${pct}%`);
      }
      if (curRef.current) curRef.current.textContent = fmt(v.currentTime);
    };
    const onMeta = () => {
      if (durRef.current && Number.isFinite(v.duration)) durRef.current.textContent = fmt(v.duration);
      if (seekRef.current) seekRef.current.value = "0";
      if (curRef.current) curRef.current.textContent = fmt(v.currentTime || 0);
    };
    const onEnded = () => {
      setPlaying(false);
      setEnded(true);
      markIntroSeen();
    };
    const onError = () => {
      setBuffering(false);
      setPlaying(false);
      setError(true);
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
    };
  }, [stage, assignSrc]);

  // ── Scroll lock only while full-screen; keyboard: Esc + light focus trap ──
  useEffect(() => {
    if (stage !== "fs" && stage !== "pip") return;
    let prevOverflow = "";
    if (stage === "fs") {
      prevOverflow = document.body ? document.body.style.overflow : "";
      if (document.body) document.body.style.overflow = "hidden";
      // Move focus into the dialog for screen readers / keyboard users.
      const t = window.setTimeout(() => {
        const first = dialogRef.current?.querySelector("[data-autofocus]");
        if (first && typeof first.focus === "function") {
          try {
            first.focus({ preventScroll: true });
          } catch {
            /* noop */
          }
        }
      }, 80);
      return () => {
        window.clearTimeout(t);
        if (document.body) document.body.style.overflow = prevOverflow;
      };
    }
    return undefined;
  }, [stage]);

  useEffect(() => {
    if (stage !== "fs" && stage !== "pip") return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (stage === "fs") handleMinimize();
        else handleClose();
        return;
      }
      if (e.key !== "Tab" || stage !== "fs") return;
      const root = dialogRef.current;
      if (!root) return;
      const items = root.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [stage, handleMinimize, handleClose]);

  // ── Full cleanup on unmount ──
  useEffect(
    () => () => {
      try {
        videoRef.current?.pause();
      } catch {
        /* noop */
      }
      if (document.body) document.body.style.overflow = "";
    },
    []
  );

  if (stage === "pending" || stage === "done") return null;

  // Reduced-motion opt-in: no auto-open, no autoplay — a quiet pill instead.
  if (stage === "cta") {
    return (
      <button type="button" className={styles.ctaPill} onClick={openFullscreen} aria-label={`${str.watch} — ${str.title}`}>
        <span aria-hidden="true" className={styles.ctaDot} />
        {str.watch} · 0:18
      </button>
    );
  }

  const isFs = stage === "pip" ? false : true;
  const showPlayFallback = needsGesture && !error && !ended;

  return (
    <>
      {isFs && <div className={styles.backdrop} aria-hidden="true" />}
      <div className={isFs ? styles.layerFs : styles.layerPip}>
        <div
          ref={dialogRef}
          role={isFs ? "dialog" : "region"}
          aria-modal={isFs ? "true" : undefined}
          aria-label={str.title}
          className={`${styles.stage} ${isFs ? styles.stageFs : styles.stagePip}`}
        >
          <div className={styles.topbar}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" className={styles.liveDot} />
              {str.title}
            </p>
            <div className={styles.topActions}>
              {isFs ? (
                <>
                  <button type="button" className={styles.chipBtn} onClick={handleMinimize} data-autofocus aria-label={str.minimize} title="Esc">
                    <span aria-hidden="true">⇲</span> {str.minimize}
                  </button>
                  <button type="button" className={styles.skipBtn} onClick={handleSkip} aria-label={str.skip}>
                    {str.skip} →
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className={styles.iconBtn} onClick={handleRestore} aria-label={str.restore} title={str.restore}>
                    <span aria-hidden="true">⛶</span>
                  </button>
                  <button type="button" className={styles.iconBtn} onClick={handleClose} aria-label={str.close} title="Esc">
                    <span aria-hidden="true">✕</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.screen}>
            <video
              ref={videoRef}
              className={styles.video}
              poster={INTRO_VIDEO.poster}
              playsInline
              muted
              preload="none"
              disablePictureInPicture={false}
              aria-label={str.title}
            />
            {buffering && !error && (
              <div className={styles.spinner} role="status" aria-label={t("intro.loading", "Loading video")}>
                <span aria-hidden="true" className={styles.spinnerRing} />
              </div>
            )}
            {showPlayFallback && (
              <button type="button" className={styles.bigPlay} onClick={handleGesturePlay} aria-label={str.play}>
                <span aria-hidden="true" className={styles.bigPlayIcon}>▶</span>
                <span className={styles.bigPlayText}>{str.play}</span>
              </button>
            )}
            {muted && playing && !showPlayFallback && !error && !ended && isFs && (
              <button type="button" className={styles.unmutePill} onClick={handleMute} aria-label={str.unmute}>
                <span aria-hidden="true">🔇</span> {str.unmutePill}
              </button>
            )}
            {ended && !error && (
              <div className={styles.endcard}>
                <p className={styles.endTitle}>{str.endTitle}</p>
                <div className={styles.endActions}>
                  <button type="button" className={styles.primaryBtn} onClick={handleReplay} data-autofocus={ended || undefined} aria-label={str.replay}>
                    ↻ {str.replay}
                  </button>
                  <button type="button" className={styles.chipBtn} onClick={handleClose} aria-label={str.close}>
                    {str.close}
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className={styles.endcard} role="alert">
                <p className={styles.endTitle}>{str.loadError}</p>
                <div className={styles.endActions}>
                  <button type="button" className={styles.primaryBtn} onClick={handleRetry} aria-label={str.retry}>
                    ↻ {str.retry}
                  </button>
                  <button type="button" className={styles.chipBtn} onClick={handleClose} aria-label={str.close}>
                    {str.close}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={handlePlayPause}
              aria-label={playing ? str.pause : str.play}
              aria-pressed={playing}
            >
              <span aria-hidden="true">{playing ? "⏸" : "▶"}</span>
            </button>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={handleMute}
              aria-label={muted ? str.unmute : str.mute}
              aria-pressed={!muted}
            >
              <span aria-hidden="true">{muted ? "🔇" : "🔊"}</span>
            </button>
            <span className={styles.time} aria-hidden="true">
              <span ref={curRef}>0:00</span> / <span ref={durRef}>0:18</span>
            </span>
            <input
              ref={seekRef}
              type="range"
              min="0"
              max="1000"
              defaultValue="0"
              step="1"
              className={styles.seek}
              aria-label={str.seek}
              onChange={handleSeek}
            />
          </div>
          {isFs && INTRO_VIDEO.caption && <p className={styles.caption}>{INTRO_VIDEO.caption}</p>}
        </div>
      </div>
    </>
  );
}
