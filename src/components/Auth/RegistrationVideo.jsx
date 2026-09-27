import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * RegistrationVideo — premium, non-blocking intro video block.
 * - Lazy loads (preload="none") so initial page weight is unaffected.
 * - playsInline + muted autoplay only when configured (browser-safe).
 * - Native controls (play/pause), optional skip/collapse.
 * - All copy/URL comes from config — replace video without code changes.
 */
export default function RegistrationVideo({ config, compact = false, onEvent }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [playing, setPlaying] = useState(false);

  if (!config || config.enabled === false) return null;
  if (collapsed && config.skippable) {
    return (
      <button
        type="button"
        onClick={() => { setCollapsed(false); onEvent?.("video_reopened"); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600,
          color: "var(--soma-primary)", background: "var(--soma-soft-sage)",
          border: "1px solid var(--soma-line-light)", borderRadius: 9999, padding: "8px 14px",
        }}
        aria-label={t("auth.watchIntro", "Watch introduction video")}
      >
        <span aria-hidden="true">▶</span> {t("auth.watchIntro", "Watch introduction video")}
      </button>
    );
  }

  const emit = (name) => onEvent?.(name);

  return (
    <section
      aria-label={config.title}
      style={{
        borderRadius: 16, overflow: "hidden", border: "1px solid var(--soma-line-light)",
        background: "linear-gradient(180deg, #fff 0%, var(--soma-cream) 100%)",
        boxShadow: "0 10px 30px rgba(24,61,45,0.08)",
      }}
    >
      <div style={{ padding: compact ? "10px 12px 0" : "14px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <p style={{ fontSize: compact ? 12 : 13, fontWeight: 700, letterSpacing: "0.04em", color: "var(--soma-forest)", margin: 0 }}>
            {config.title}
          </p>
          {config.skippable && (
            <button
              type="button"
              onClick={() => { videoRef.current?.pause(); setPlaying(false); setCollapsed(true); emit("video_skipped"); }}
              style={{ fontSize: 12, color: "var(--soma-warm-gray)", textDecoration: "underline" }}
              aria-label={t("auth.skipVideo", "Skip video")}
            >
              {t("auth.skipVideo", "Skip")}
            </button>
          )}
        </div>
        {config.caption && (
          <p style={{ fontSize: 12, color: "#5a6b63", margin: "4px 0 8px" }}>{config.caption}</p>
        )}
      </div>
      <div style={{ padding: compact ? 10 : 14, paddingTop: 8 }}>
        <video
          ref={videoRef}
          src={config.url}
          poster={config.poster}
          controls
          playsInline
          preload="none"
          muted={config.autoplayMuted}
          autoPlay={false}
          onPlay={() => { setPlaying(true); emit("video_play"); }}
          onPause={() => { setPlaying(false); emit("video_pause"); }}
          onEnded={() => { setPlaying(false); emit("video_complete"); }}
          aria-label={config.title}
          style={{ width: "100%", borderRadius: 12, background: "#0c1a14", aspectRatio: "16/9", display: "block" }}
        />
        <p style={{ fontSize: 11, color: "var(--soma-warm-gray)", margin: "8px 2px 0" }} aria-live="polite">
          {playing
            ? t("auth.videoPlaying", "Playing — you can continue registering at any time.")
            : t("auth.videoHint", "Press play to watch. Registration stays available below.")}
        </p>
      </div>
    </section>
  );
}
