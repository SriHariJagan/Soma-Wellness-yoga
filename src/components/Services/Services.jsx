import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Services.module.css";
import { scrollToSection } from "../../hooks/useScrollToSection";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Pragya Yoga Services",
  "description": "Authentic Indian yoga classes, workshops, and community programs offered by Pragya Yoga Alliance in Jaipur, India.",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Yoga Classes", "url": "https://pragyayoga.in/classes" },
    { "@type": "ListItem", "position": 2, "name": "Yoga Workshops", "url": "https://pragyayoga.in/workshops" },
    { "@type": "ListItem", "position": 3, "name": "Yoga Community", "url": "https://pragyayoga.in/community" },
    { "@type": "ListItem", "position": 4, "name": "Styles of Yoga", "url": "https://pragyayoga.in/styles" }
  ],
};

const YOGA_STYLES = [
  { title: "Hatha Yoga", img: "/images/services/Hatha_yoga.webp", alt: "Hatha Yoga class in Jaipur", desc: "Classical foundations of breath, posture, and alignment for all levels.", href: "/styles/hatha" },
  { title: "Power Yoga", img: "/images/services/Power_Yoga.webp", alt: "Power Yoga session in Jaipur", desc: "Dynamic, strength-building sequences that energise body and mind.", href: "/styles/power" },
  { title: "Vinyasa Yoga", img: "/images/services/Vinyasa_Yoga.webp", alt: "Vinyasa Yoga practice in Jaipur", desc: "Flowing movement synchronised with breath for grace and endurance.", href: "/styles/vinyasa" },
  { title: "Iyengar Yoga", img: "/images/services/Iyengar_Yoga.webp", alt: "Iyengar Yoga class in Jaipur", desc: "Precision alignment using props to deepen awareness and stability.", href: "/styles/iyengar" },
  { title: "Therapy Yoga", img: "/images/services/therapy.webp", alt: "Therapy Yoga session in Jaipur", desc: "Gentle, restorative practice tailored for healing and recovery.", href: "/styles/therapy" },
];

const SERVICES = [
  { icon: "🧘", tag: "Most Popular", title: "Yoga Classes", shortDesc: "Authentic Indian yoga practice", desc: "Experience yoga rooted in Bharat's timeless tradition...", benefits: ["Traditional Asanas","Scientific wellness approach","Global recognition"], img: "/images/services/yoga1.webp", alt: "Yoga classes in Jaipur", href: "/classes", cta: "Explore Classes", featured: true },
  { icon: "📚", tag: "Immersive", title: "Workshops", shortDesc: "Deepen your practice", desc: "Immersive workshops blending authentic Indian yoga tradition...", benefits: ["Expert instruction","Certification available","Holistic learning"], img: "/images/services/workshop.webp", alt: "Yoga workshops in Jaipur", href: "/workshops", cta: "View Workshops", featured: false },
  { icon: "🤝", tag: "Connect", title: "Community", shortDesc: "Grow together", desc: "Join a warm, inclusive yoga community...", benefits: ["Peer support","Group events","Shared growth"], img: "/images/services/yoga2.webp", alt: "Yoga community in Jaipur", href: "/community", cta: "Join Community", featured: false },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 48, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

const ServiceCard = ({ icon, tag, title, shortDesc, desc, benefits, img, alt, href, cta, featured, index }) => {
  const navigate = useNavigate();

  const handleCta = (e) => {
    if (title === "Workshops") {
      e.preventDefault();
      const isAuth = !!localStorage.getItem("token");
      navigate(isAuth ? "/studentdashboard?tab=workshops" : "/login?redirectTo=" + encodeURIComponent("/studentdashboard?tab=workshops"));
    } else if (title === "Community") {
      e.preventDefault();
      if (window.location.pathname === "/contact") {
        document.getElementById("join-community")?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        navigate("/contact?section=join-community");
      }
    }
  };

  return (
    <motion.article
      className={`${styles.card} ${featured ? styles.cardFeatured : ""}`}
      variants={cardVariants}
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      itemScope
      itemType="https://schema.org/Service"
    >
      <div className={styles.cardImgWrap}>
        <img src={img} alt={alt} loading={index === 0 ? "eager" : "lazy"} decoding="async" />
        <span className={styles.cardTag}>{tag}</span>
        {featured && <span className={styles.cardBadge}>★ Popular</span>}
        <div className={styles.cardIcon}>{icon}</div>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardShort}>{shortDesc}</p>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardDesc}>{desc}</p>
        <ul className={styles.cardBenefits}>{benefits.map((b) => <li key={b}>{b}</li>)}</ul>
        <Link to={href} className={featured ? styles.btnPrimary : styles.btnOutline} onClick={handleCta}>{cta} <span className={styles.btnArrow}>→</span></Link>
      </div>
    </motion.article>
  );
};

const StylesOfYogaCard = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => setCurrentSlide((prev) => (prev === YOGA_STYLES.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? YOGA_STYLES.length - 1 : prev - 1));

  return (
    <motion.article className={`${styles.card} ${styles.stylesCard}`} variants={cardVariants}>
      <div className={styles.cardBody}>
        <p className={styles.cardShort}>Explore Traditions</p>
        <h3 className={styles.cardTitle}>Styles of Yoga</h3>
        <p className={styles.cardDesc}>Discover the full spectrum of yogic disciplines — from classical foundations to dynamic flows and healing therapies.</p>

        <div className={styles.sliderViewport}>
          <button type="button" className={styles.sliderNavBtn} onClick={prevSlide} aria-label="Previous slide">‹</button>
          <div className={styles.sliderTrack} style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {YOGA_STYLES.map((style) => (
              <a key={style.title} href={style.href} className={styles.styleSubCard}>
                <div className={styles.styleSubCardImg}>
                  <img src={style.img} alt={style.alt} loading="lazy" decoding="async" />
                </div>
                <div className={styles.styleSubCardBody}>
                  <h4 className={styles.styleSubCardTitle}>{style.title}</h4>
                  <p className={styles.styleSubCardDesc}>{style.desc}</p>
                </div>
                <span className={styles.styleSubCardArrow}>→</span>
              </a>
            ))}
          </div>
          <button type="button" className={styles.sliderNavBtn} onClick={nextSlide} aria-label="Next slide">›</button>
        </div>

        <div className={styles.dotsContainer}>
          {YOGA_STYLES.map((_, idx) => (
            <button key={idx} type="button" className={`${styles.dot} ${idx === currentSlide ? styles.dotActive : ""}`} onClick={() => setCurrentSlide(idx)} aria-label={`Go to slide ${idx + 1}`} />
          ))}
        </div>

        <Link to="/styles" className={styles.btnOutline}>View All Styles →</Link>
      </div>
    </motion.article>
  );
};

const Services = () => {
  const navigate = useNavigate();

  const handleViewFullSchedule = (e) => {
    e.preventDefault();
    if (window.location.pathname === '/classes') {
      scrollToSection('offline-schedule');
    } else {
      navigate('/classes', { state: { scrollTo: 'offline-schedule' } });
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <section className={styles.section} id="services">
        <div className={styles.container}>
          <motion.header className={styles.header} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <p className={styles.headerLabel}>Our Offerings</p>
            <h2 className={styles.headerTitle}>Authentic Indian Yoga & Global Wellness</h2>
            <p className={styles.headerSub}>
              Rooted in Bharat's timeless yogic tradition and supported by modern scientific wellness practices,
              Pragya Yoga Alliance in Jaipur brings authentic Indian yoga to the world.
            </p>
          </motion.header>

          <motion.div className={styles.grid} variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
            {SERVICES.map((s, i) => <ServiceCard key={s.title} {...s} index={i} />)}
            <StylesOfYogaCard />
          </motion.div>

          <motion.div className={styles.cta} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
            <Link to="/classes" className={styles.btnPrimary}>Join a Class →</Link>
            <Link to="/classes" className={styles.btnOutline} onClick={handleViewFullSchedule}>View Full Schedule</Link>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default Services;
