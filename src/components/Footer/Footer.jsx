import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaYoutube, FaMapMarkerAlt, FaPhoneAlt } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import "./Footer.css";

const socials = [
  { href: "https://www.facebook.com/pragyayoga.in", label: "Facebook", icon: <FaFacebookF /> },
  { href: "https://www.instagram.com/pragyayogaofficial/", label: "Instagram", icon: <FaInstagram /> },
  { href: "https://www.youtube.com/c/KapilKesari", label: "YouTube", icon: <FaYoutube /> },
  { href: "https://twitter.com/PragyayogaIn", label: "Twitter/X", icon: <FaXTwitter /> },
];

const Footer = () => {
  const [subscribed, setSubscribed] = React.useState(false);

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
      <div className="footer-glow" />
      <div className="footer-pattern" aria-hidden="true">
        <svg width="100%" height="100%" viewBox="0 0 1440 400" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <circle cx="200" cy="100" r="180" stroke="rgba(46,125,91,0.04)" strokeWidth="1" fill="none" />
          <circle cx="1200" cy="300" r="220" stroke="rgba(244,180,0,0.04)" strokeWidth="1" fill="none" />
          <circle cx="700" cy="50" r="120" stroke="rgba(46,125,91,0.03)" strokeWidth="1" fill="none" />
          <path d="M0 350 Q 360 280 720 350 T 1440 350" stroke="rgba(46,125,91,0.05)" strokeWidth="1" fill="none" />
        </svg>
      </div>
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-about">
            <div className="footer-logo-wrap">
              <img src="/images/soma/logo.png" alt="Soma Wellness" className="footer-logo-img" />
            </div>
            <p className="footer-tagline">
              Return to your <em>center</em>
            </p>
            <p>
              Soma Wellness is a premium space to return to your center — through breath, movement, rest and community. Warm, calm, and deeply human.
            </p>
            <div className="footer-social">
              {socials.map((s) => (
                <motion.a key={s.label} href={s.href} target="_blank" rel="noreferrer" aria-label={s.label} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}>
                  {s.icon}
                </motion.a>
              ))}
            </div>
          </div>

          <div className="footer-links">
            <h3>Explore</h3>
            <ul>
              <li><Link to="/classes">Join</Link></li>
              <li><Link to="/private">Private</Link></li>
              <li><Link to="/life-stages">Life Stages</Link></li>
              <li><Link to="/restore">Restore</Link></li>
              <li><Link to="/yttc">Academy</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          <div className="footer-contact">
            <h3>Visit</h3>
            <div className="footer-contact-item">
              <div className="footer-contact-icon"><FaMapMarkerAlt /></div>
              <span>Spring Valley, Nairobi, Kenya — Integrated Wellness Center · Yoga · Therapy · Meditation</span>
            </div>
            <div className="footer-contact-item">
              <div className="footer-contact-icon"><MdEmail /></div>
              <span>hello@somawellness.co.ke</span>
            </div>
            <div className="footer-contact-item">
              <div className="footer-contact-icon"><FaPhoneAlt /></div>
              <a href="tel:+254700000000" className="footer-phone-link">+254 700 000 000</a>
            </div>
            <div className="footer-hours">
              <span className="footer-hours-dot" />
              <span>Mon–Sat · 6am–8pm · Sunday closed</span>
            </div>
          </div>

          <div className="footer-newsletter">
            <h3>Stay close</h3>
            <p>Soft notes on practice, breath and conscious living. No spam, just intention.</p>
            <form className="footer-form" onSubmit={handleSubscribe}>
              <input type="email" placeholder="Your email" required />
              <motion.button type="submit" whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} disabled={subscribed}>
                {subscribed ? 'Joined' : 'Join'}
              </motion.button>
            </form>
            <p className="footer-privacy">By joining you agree to our privacy note.</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p>© 2026 <strong>Soma Wellness Nairobi</strong> · Spring Valley · Rebalance · Renew · Restore · Reconnect</p>
          <div className="footer-legal">
            <a href="#">Privacy</a>
            <span className="footer-sep">·</span>
            <a href="#">Terms</a>
            <span className="footer-sep">·</span>
            <span>Nairobi, Kenya</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
