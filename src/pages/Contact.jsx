import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaMapMarkerAlt, FaPhoneAlt, FaClock, FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import "./Contact.css";

const STUDIO = {
  address: "Spring Valley, Nairobi, Kenya — Integrated Wellness Center",
  phone: "+254 700 000 000",
  phoneHref: "+254700000000",
  email: "hello@somawellness.co.ke",
  hours: "Mon – Sat · 6:00 AM – 8:00 PM",
};

const mapsQuery = "Spring Valley, Nairobi, Kenya";
const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed&z=16&hl=en`;
const mapsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery)}`;

const socials = [
  { href: "https://www.instagram.com/somawellness/", label: "Instagram", icon: <FaInstagram /> },
  { href: "https://www.facebook.com/pragyayoga.in", label: "Facebook", icon: <FaFacebookF /> },
  { href: "https://www.youtube.com/c/KapilKesari", label: "YouTube", icon: <FaYoutube /> },
  { href: "https://twitter.com/PragyayogaIn", label: "Twitter/X", icon: <FaXTwitter /> },
];

const infoCards = [
  { icon: <FaMapMarkerAlt />, title: "Visit the studio", lines: [STUDIO.address], action: { label: "Get directions", href: mapsLink, external: true } },
  { icon: <FaPhoneAlt />, title: "Call us", lines: [STUDIO.phone], action: { label: "Call now", href: `tel:${STUDIO.phoneHref}` } },
  { icon: <MdEmail />, title: "Email us", lines: [STUDIO.email], action: { label: "Send email", href: `mailto:${STUDIO.email}` } },
  { icon: <FaClock />, title: "Studio hours", lines: [STUDIO.hours, "Sunday · Closed"] },
];

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("section") === "join-community") {
      document.getElementById("join-community")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, interestType: "Contact Form", notes: form.message }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSent(true);
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (err) {
      setError("Something went wrong. Please try again or email us directly at hello@somawellness.co.ke.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="contact-page" style={{ background: "var(--soma-cream)" }}>
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HealthAndBeautyBusiness",
          name: "Soma Wellness Nairobi",
          image: "https://somawellness.co.ke/images/soma/og-image.webp",
          url: "https://somawellness.co.ke",
          telephone: "+254700000000",
          email: "hello@somawellness.co.ke",
          address: { "@type": "PostalAddress", streetAddress: "Spring Valley", addressLocality: "Nairobi", addressCountry: "KE" },
          openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], opens: "06:00", closes: "20:00" }],
          geo: { "@type": "GeoCoordinates", latitude: -1.2667, longitude: 36.8 },
        })}
      </script>

      <SomaPageHeader
        eyebrow="Visit us — Spring Valley, Nairobi"
        title="Let’s begin <em>together.</em>"
        subtitle="Questions about memberships, private therapy, life-stage programmes or SOMA DAILY? We respond within one working day, with care."
        image="https://images.unsplash.com/photo-1499951360447-b19be2c0e1a8?q=80&w=900&auto=format&fit=crop"
      />

      <section className="contact-info-section">
        <motion.div
          className="contact-info-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } } }}
        >
          {infoCards.map((card) => (
            <motion.div
              key={card.title}
              className="contact-card"
              variants={{ hidden: { opacity: 0, y: 18, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
              whileHover={{ y: -5, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="contact-card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              {card.lines.map((line) => <p key={line}>{line}</p>)}
              {card.action && <a className="contact-card-link" href={card.action.href} {...(card.action.external ? { target: "_blank", rel: "noreferrer" } : {})}>{card.action.label} <span>→</span></a>}
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="contact-main">
        <motion.div
          className="contact-main-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.div className="contact-form-card" variants={{ hidden: { opacity: 0, y: 20, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-primary)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 8px rgba(244,180,0,0.28)", flexShrink: 0 }} aria-hidden="true" /> Send a message
            </span>
            <h2 style={{ marginTop: 10, fontSize: 26, letterSpacing: "-0.02em" }}>We’ll get back with care</h2>
            <p className="contact-form-sub">Fill in the form below — no obligation, just conversation. We reply within one working day.</p>

            {sent && <div className="contact-form-note" role="status">Thank you — your message has been sent. We’ll be in touch soon.</div>}
            {error && <div className="contact-form-error" role="alert">{error}</div>}

            <form className="contact-form" onSubmit={handleSubmit} id="join-community">
              <div className="contact-field-row">
                <label className="contact-field"><span>Name</span><input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required /></label>
                <label className="contact-field"><span>Phone</span><input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+254 ..." /></label>
              </div>
              <label className="contact-field"><span>Email</span><input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required /></label>
              <label className="contact-field"><span>Message</span><textarea name="message" value={form.message} onChange={handleChange} rows={5} placeholder="How can we help you?" required /></label>
              <motion.button type="submit" className="contact-submit" whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.97 }} disabled={loading}>
                {loading ? "Sending..." : "Send message →"}
              </motion.button>
            </form>

            <div className="contact-quick">
              <a className="contact-quick-btn" href={`tel:${STUDIO.phoneHref}`}><FaPhoneAlt /> Call +254 700 000 000</a>
              <div className="contact-quick-social">
                {socials.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label}>{s.icon}</a>)}
              </div>
            </div>
          </motion.div>

          <motion.div className="contact-map-card" variants={{ hidden: { opacity: 0, y: 20, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } }}>
            <div className="contact-map-head">
              <span style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}><FaMapMarkerAlt /></span>
              <div>
                <h3>Soma Wellness Studio</h3>
                <p>{STUDIO.address} · {STUDIO.hours}</p>
                <a href={mapsLink} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: "var(--soma-primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4, display: "inline-block" }}>Get directions →</a>
              </div>
            </div>
            <iframe className="contact-map" title="Soma Wellness location map" src={mapEmbed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            <div style={{ padding: 12, background: "var(--soma-ivory)", borderTop: "1px solid var(--soma-line-light)", display: "flex", gap: 8, alignItems: "center", fontSize: 11, color: "var(--soma-warm-gray)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2E7D5B", boxShadow: "0 0 0 5px rgba(46,125,91,0.12)", flexShrink: 0 }} aria-hidden="true" /> Open Mon–Sat 6AM–8PM · Sunday closed · Spring Valley
            </div>
          </motion.div>
        </motion.div>

        {/* NEW — Visit gallery where thin */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
        >
          {[
            { img: "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?q=80&w=600&auto=format&fit=crop", label: "Light & wood" },
            { img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&auto=format&fit=crop", label: "Calm space" },
            { img: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=600&auto=format&fit=crop", label: "Spring Valley" },
          ].map((g, i) => (
            <motion.div key={g.label} initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }} whileHover={{ y: -4, scale: 1.02 }} style={{ borderRadius: 16, overflow: "hidden", position: "relative", height: 160, background: "#e8e2d4", border: "1px solid rgba(255,255,255,0.62)", boxShadow: "0 8px 24px rgba(24,61,45,0.06)" }}>
              <img src={g.img} alt={g.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 42%, rgba(24,61,45,0.18) 100%)", pointerEvents: "none" }} aria-hidden="true" />
              <div style={{ position: "absolute", left: 10, bottom: 10, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", padding: "6px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--soma-forest)", boxShadow: "0 4px 14px rgba(0,0,0,0.10)" }}>{g.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </main>
  );
};

export default Contact;
