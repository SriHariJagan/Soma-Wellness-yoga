import React from "react";

const SomaLogo = ({ variant = "dark", size = 40, withText = true, stacked = false, showTagline = true, splitWordmark = false }) => {
  const dark = variant !== "light";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: withText ? 12 : 0, flexDirection: stacked ? "column" : "row", textAlign: stacked ? "center" : "left" }}>
      <img
        src="/images/soma/logo.png"
        alt="SomaWellness"
        width={size}
        height={size}
        style={{ flexShrink: 0, objectFit: "contain" }}
      />

      {withText && stacked && (
        <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1.15, marginTop: 2 }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 600,
            fontSize: 19,
            letterSpacing: "0.06em",
            color: dark ? "#1E2B26" : "#FFF7E6",
            lineHeight: 1.1,
          }}>Soma</span>
          <span style={{
            fontFamily: "'Manrope', system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            textIndent: "0.32em",
            color: dark ? "rgba(30,43,38,0.62)" : "rgba(255,247,230,0.65)",
            marginTop: 1,
          }}>Wellness</span>
        </span>
      )}

      {withText && !stacked && splitWordmark && (
        <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1.15 }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 600,
            fontSize: size > 36 ? 22 : 19,
            letterSpacing: "0.06em",
            color: dark ? "#1E2B26" : "#FFF7E6",
            lineHeight: 1.1,
          }}>Soma</span>
          <span style={{
            fontFamily: "'Manrope', system-ui, sans-serif",
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            textIndent: "0.32em",
            color: dark ? "rgba(30,43,38,0.62)" : "rgba(255,247,230,0.65)",
            marginTop: 1,
          }}>Wellness</span>
        </span>
      )}

      {withText && !stacked && !splitWordmark && (
        <span style={{ display: "inline-flex", flexDirection: "column", gap: 2, lineHeight: 1 }}>
          <span style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 600,
            fontSize: size > 36 ? 24 : 20,
            letterSpacing: "0.02em",
            color: dark ? "#1E2B26" : "#FFF7E6",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}>Soma<span style={{ fontWeight: 400, fontStyle: "italic" }}>Wellness</span></span>
          {showTagline && (
            <span style={{
              fontFamily: "'Manrope', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: size > 36 ? 8 : 7,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: dark ? "rgba(30,43,38,0.55)" : "rgba(255,247,230,0.6)",
              marginTop: 1,
            }}>Holistic Wellbeing</span>
          )}
        </span>
      )}
    </span>
  );
};

export default SomaLogo;
