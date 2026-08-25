import React from "react";

const SomaLogo = ({ variant = "dark", size = 40, withText = true, stacked = false }) => {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: withText ? 12 : 0, flexDirection: stacked ? "column" : "row", textAlign: stacked ? "center" : "left" }}>
      <img
        src="/images/soma/logo.png"
        alt="Soma Wellness"
        width={size}
        height={size}
        style={{ flexShrink: 0, objectFit: "contain" }}
      />

      {withText && (
        <span style={{ display: "inline-flex", flexDirection: "column", gap: stacked ? 2 : 1, lineHeight: 1 }}>
          <span style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 600,
            fontSize: size > 36 ? 22 : 18,
            letterSpacing: "0.14em",
            color: variant === "light" ? "#FFF7E6" : "#183D2D",
            lineHeight: 1,
          }}>SOMA</span>
          <span style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontWeight: 500,
            fontSize: size > 36 ? 8.5 : 7.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: variant === "light" ? "rgba(255,247,230,0.6)" : "rgba(24,61,45,0.55)",
            marginTop: 1,
          }}>Wellness</span>
        </span>
      )}
    </span>
  );
};

export default SomaLogo;
