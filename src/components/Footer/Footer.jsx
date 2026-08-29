import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaYoutube, FaMapMarkerAlt, FaPhoneAlt } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import "./Footer.css";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";

const socials = [
  { href: "https://www.facebook.com/somawellness", label: "Facebook", icon: <FaFacebookF /> },
  { href: "https://www.instagram.com/somawellness/", label: "Instagram", icon: <FaInstagram /> },
  { href: "https://www.youtube.com/c/KapilKesari", label: "YouTube", icon: <FaYoutube /> },
  { href: "https://twitter.com/SomaWellness", label: "Twitter/X", icon: <FaXTwitter /> },
];

const Footer = () => {
  const { t } = useTranslation();
  const [subscribed, setSubscribed] = React.useState(false);
  const reduced = usePrefersReducedMotion();

  const handleSubscribe = (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    if (email) {
      setSubscribed(true);
      e.target.reset();
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="footer">
      <div className="footer-bg" />
      <motion.div className="footer-glow" animate={reduced ? {} : { scale: [1, 1.06, 1], opacity: [0.9, 1, 0.9] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <div className="footer-pattern" aria-hidden="true">
        <svg width="100%" height="100%" viewBox="0 0 1440 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <circle cx="200" cy="100" r="180" stroke="rgba(46,125,91,0.04)" strokeWidth="1" fill="none" />
          <circle cx="1200" cy="300" r="220" stroke="rgba(244,180,0,0.04)" strokeWidth="1" fill="none" />
          <circle cx="700" cy="50" r="120" stroke="rgba(46,125,91,0.03)" strokeWidth="1" fill="none" />
          <path d="M0 350 Q 360 280 720 350 T 1440 350" stroke="rgba(46,125,91,0.05)" strokeWidth="1" fill="none" />
        </svg>
      </div>

      {/* watermark SOMA — subtle */}
      <div className="footer-watermark" aria-hidden="true">SOMA</div>

      <div className="footer-container">
        <motion.div
          className="footer-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.09, delayChildren: reduced ? 0 : 0.12 } } }}
        >
          <motion.div className="footer-about" variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}>
            <motion.div className="footer-logo-wrap" initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}>
              <img src="/images/soma/logo.png" alt="Soma Wellness" className="footer-logo-img" />
            </motion.div>
            <p className="footer-tagline" dangerouslySetInnerHTML={{ __html: t("footer.tagline") }} />
            <p>{t("footer.description")}</p>
            <div className="footer-social">
              {socials.map((s, i) => (
                <motion.a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4, ease: EASE }}
                  whileHover={reduced ? {} : { y: -4, scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                >
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </motion.div>

          <motion.div className="footer-links" variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }}>
            <h3>{t("footer.explore")}</h3>
            <ul>
              {[
                { to: "/classes", label: t("navigation.join") },
                { to: "/private", label: t("navigation.private") },
                { to: "/life-stages", label: t("navigation.lifeStages") },
                { to: "/restore", label: t("navigation.restore") },
                { to: "/yttc", label: t("navigation.academy") },
                { to: "/faq", label: t("navigation.faq") },
                { to: "/contact", label: t("navigation.contact") },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div className="footer-contact" variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }}>
            <h3>{t("footer.visit")}</h3>
            <div className="footer-contact-item">
              <div className="footer-contact-icon"><FaMapMarkerAlt /></div>
              <span>{t("footer.address")}</span>
            </div>
            <div className="footer-contact-item">
              <div className="footer-contact-icon"><MdEmail /></div>
              <span>hello@somawellness.co.ke</span>
            </div>
            <div className="footer-contact-item">
              <div className="footer-contact-icon"><FaPhoneAlt /></div>
              <a href="tel:+254700000000" className="footer-phone-link">+254 700 000 000</a>
            </div>
            <motion.div className="footer-hours" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: EASE }} style={{ transformOrigin: "left" }}>
              <span className="footer-hours-dot" />
              <span>{t("footer.hours")}</span>
            </motion.div>
          </motion.div>

          <motion.div className="footer-newsletter" variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}>
            <h3>{t("footer.stayClose")}</h3>
            <p>{t("footer.stayCloseDesc")}</p>
            <form className="footer-form" onSubmit={handleSubscribe}>
              <input type="email" placeholder={t("footer.yourEmail")} required aria-label={t("footer.yourEmail")} />
              <motion.button type="submit" whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.97 }} disabled={subscribed}>
                {subscribed ? t("footer.joined") : t("footer.join")}
                {!subscribed && <span className="footer-btn-shine" aria-hidden="true" />}
              </motion.button>
            </form>
            <p className="footer-privacy">{t("footer.privacyNote")}</p>
            <div style={{ marginTop: 12 }}><LanguageSwitcher compact /></div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="footer-bottom"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="footer-bottom-inner">
          <p dangerouslySetInnerHTML={{ __html: t("footer.copyright", { year: 2026 }) }} />
          <div className="footer-legal">
            <a href="#">{t("footer.privacy")}</a>
            <span className="footer-sep">·</span>
            <a href="#">{t("footer.terms")}</a>
            <span className="footer-sep">·</span>
            <span>{t("footer.nairobiKenya")}</span>
          </div>
        </div>
      </motion.div>
    </footer>
  );
};

export default Footer;
