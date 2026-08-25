import React from "react";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { MEMBERSHIPS, MEMBERSHIP_PAY_AHEAD, FOUNDING_RATES, SOMA_DAILY } from "../config/siteContent";
import { Link } from "react-router-dom";
import SomaCTA from "../components/soma/SomaCTA";

const Classes = () => {
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="Join — Memberships, Passes & Soma Daily"
        title="Practise regularly.<br /><em>Come home to yourself.</em>"
        subtitle="Spring Valley, Nairobi · Yoga · Therapy · Meditation · Wellness Rituals. Discovery 7 days 3,000 KES · Single class 2,500 · All prices VAT included."
        image="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=900&auto=format&fit=crop"
      />
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "32px clamp(20px,4vw,40px) 64px" }}>
        {/* Try us first */}
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "var(--soma-forest)", color: "#fff", borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7 }}>Try us first</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginTop: 8 }}>SOMA DISCOVERY</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>7 days unlimited yoga + wellness orientation. New clients only.</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 12 }}>3,000 <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.7 }}>KES</span></div>
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Single class · 2,500</div>
          </div>
          <div style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--soma-forest)" }}>Memberships — pick your level</div>
            <div style={{ fontSize: 13, color: "#5a6b63", marginTop: 6 }}>Each level includes everything in the one before it, plus more. All include member rates on everything else.</div>
            <div style={{ fontSize: 11, color: "var(--soma-warm-gray)", marginTop: 8 }}>Registration 3,000 waived on 3+ months. Guest pass 1,500 · Mat hire 200 · Towel 300.</div>
          </div>
        </div>

        {/* Membership grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
          {MEMBERSHIPS.map((m) => (
            <div key={m.name} style={{ background: m.accent ? "var(--soma-forest)" : "#fff", color: m.accent ? "#fff" : "var(--soma-charcoal)", border: `1px solid ${m.accent ? "var(--soma-forest)" : "var(--soma-line-light)"}`, borderRadius: 18, padding: 18, position: "relative", boxShadow: m.accent ? "0 16px 32px rgba(24,61,45,0.18)" : "none" }}>
              {m.badge && <span style={{ position: "absolute", top: 12, right: 12, background: "var(--soma-gold)", color: "var(--soma-forest)", fontSize: 9, fontWeight: 800, letterSpacing: "0.10em", padding: "6px 8px", borderRadius: 9999 }}>{m.badge}</span>}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: m.accent ? "#fff" : "var(--soma-forest)" }}>{m.name}</div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: m.accent ? "rgba(255,247,230,0.7)" : "#5a6b63" }}>{m.sub}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}><span style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: m.accent ? "#fff" : "var(--soma-forest)" }}>{m.price}</span><em style={{ fontSize: 11, fontStyle: "normal", color: m.accent ? "rgba(255,247,230,0.7)" : "#5a6b63" }}>{m.per}</em></div>
              <ul style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, fontSize: 12, lineHeight: 1.5, color: m.accent ? "rgba(255,247,230,0.85)" : "#5a6b63" }}>
                {m.features.map((f) => <li key={f}>— {f}</li>)}
              </ul>
              <Link to="/contact" style={{ display: "inline-flex", justifyContent: "center", marginTop: 14, background: m.accent ? "#fff" : "var(--soma-forest)", color: m.accent ? "var(--soma-forest)" : "#fff", padding: "10px 14px", borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", width: "100%", textAlign: "center" }}>Choose {m.name.split(" ")[1]} →</Link>
            </div>
          ))}
        </div>

        {/* Pay ahead */}
        <div style={{ marginTop: 24, background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--soma-line-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--soma-forest)" }}>Pay ahead and save</div>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6b63" }}>Monthly — no discount · 3 months 10% · 6 months 15% · 12 months 25%</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "140px repeat(4,1fr)", gap: 0, fontSize: 12 }}>
            <div style={{ background: "var(--soma-ivory)", padding: "12px 16px", fontWeight: 700, color: "var(--soma-forest)", borderBottom: "1px solid var(--soma-line-light)" }}> </div>
            {["JUA","AMANI","UZIMA","FAMILY"].map((h) => (
              <div key={h} style={{ background: "var(--soma-forest)", color: "#fff", padding: "12px", textAlign: "center", fontWeight: 700, fontSize: 11, letterSpacing: "0.08em", borderBottom: "1px solid var(--soma-forest)" }}>{h}</div>
            ))}
            {MEMBERSHIP_PAY_AHEAD.map((r, i) => (
              <React.Fragment key={i}>
                <div style={{ padding: "12px 16px", fontWeight: 600, color: "var(--soma-charcoal)", background: i%2?"#fff":"var(--soma-cream)", borderTop: "1px solid var(--soma-line-light)" }}>{r.label}</div>
                <div style={{ padding: 12, textAlign: "center", color: "var(--soma-forest)", fontWeight: 600, background: i%2?"#fff":"var(--soma-cream)", borderTop: "1px solid var(--soma-line-light)" }}>{r.jua}</div>
                <div style={{ padding: 12, textAlign: "center", color: "var(--soma-forest)", fontWeight: 600, background: i%2?"#fff":"var(--soma-cream)", borderTop: "1px solid var(--soma-line-light)" }}>{r.amani}</div>
                <div style={{ padding: 12, textAlign: "center", color: "var(--soma-forest)", fontWeight: 600, background: i%2?"#fff":"var(--soma-cream)", borderTop: "1px solid var(--soma-line-light)" }}>{r.uzima}</div>
                <div style={{ padding: 12, textAlign: "center", color: "var(--soma-forest)", fontWeight: 600, background: i%2?"#fff":"var(--soma-cream)", borderTop: "1px solid var(--soma-line-light)" }}>{r.family}</div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Passes */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { n: "5 classes", p: "2,200 a class", w: "6 weeks", c: "11,000" },
              { n: "10 classes", p: "2,100 a class", w: "3 months", c: "21,000" },
            ].map((x) => (
              <div key={x.n} style={{ background: "var(--soma-cream)", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6b63" }}>{x.n}</div>
                <div style={{ fontSize: 12, color: "#5a6b63", marginTop: 2 }}>{x.p} · {x.w}</div>
                <div style={{ fontWeight: 700, color: "var(--soma-forest)", marginTop: 6 }}>{x.c}</div>
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--soma-warm-gray)", textAlign: "center", marginTop: 4 }}>Not ready for a membership · 5 or 10 class pass</div>
          </div>
          <div style={{ background: "var(--soma-forest)", color: "#fff", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.7 }}>{SOMA_DAILY.title} · {SOMA_DAILY.sub}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>Take Soma home</div>
            <ul style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.9, marginTop: 4 }}>{SOMA_DAILY.bullets.map((b) => <li key={b}>• {b}</li>)}</ul>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <div><span style={{ fontWeight: 700, fontSize: 16 }}>{SOMA_DAILY.monthly}</span><span style={{ fontSize: 11, opacity: 0.7 }}> a month</span></div>
              <div><span style={{ fontWeight: 700, fontSize: 16 }}>{SOMA_DAILY.yearly}</span><span style={{ fontSize: 11, opacity: 0.7 }}> a year · {SOMA_DAILY.note}</span></div>
            </div>
            <div style={{ fontSize: 10, opacity: 0.65, marginTop: 6, lineHeight: 1.5 }}>{SOMA_DAILY.included}</div>
          </div>
        </div>

        {/* Founding */}
        <div style={{ marginTop: 20, background: "linear-gradient(135deg, #FFF7E6 0%, #F5EFE0 100%)", border: "1px solid rgba(244,180,0,0.22)", borderRadius: 16, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--soma-forest)" }}>Founding Members — first 100 or first 90 days</div>
              <div style={{ fontSize: 12, color: "#5a6b63" }}>Rate held 12 months from joining, registration waived. Pay-ahead savings apply on top.</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, background: "var(--soma-gold)", color: "var(--soma-forest)", padding: "8px 12px", borderRadius: 9999 }}>Save up to 19%</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginTop: 14 }}>
            {FOUNDING_RATES.map((r) => (
              <div key={r.tier} style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--soma-forest)" }}>{r.tier}</div>
                <div style={{ fontSize: 12, color: "#5a6b63", marginTop: 4 }}><span style={{ textDecoration: "line-through", opacity: 0.6 }}>{r.normal}</span> → <span style={{ color: "var(--soma-primary)", fontWeight: 700 }}>{r.founding}</span></div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--soma-gold)", marginTop: 4 }}>Save {r.save}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: "var(--soma-warm-gray)", lineHeight: 1.6, textAlign: "center" }}>
          Spring Valley, Nairobi · All prices in KES, VAT included · August 2026 · Prices subject to management approval. Good to know: book ahead for private/therapy/massage · packages start from first use · unused sessions don’t carry over · 12h cancellation (half fee), no-show full fee · medical clearance may be required.
        </div>
      </section>
      <SomaCTA />
    </div>
  );
};
export default Classes;
