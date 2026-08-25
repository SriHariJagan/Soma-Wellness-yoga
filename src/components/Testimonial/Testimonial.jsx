import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LuUsersRound, LuStar, LuHistory, LuCircleCheckBig } from 'react-icons/lu';
import styles from './Testimonial.module.css';

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Pragya Yoga Alliance",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "reviewCount": "500",
    "bestRating": "5",
    "worstRating": "1",
  },
};

const ytThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
const ytEmbed = (id) => `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;

const REVIEWS = [
  { id: 1, category: "Transformative Story", videoTitle: "Kreety's Yoga Journey", quote: "Pragya Yoga has completely transformed my life. Dr. Kapil's expert guidance and the warmth of the community made every session deeply special and enriching.", name: "Kreety Dang", role: "Hatha Yoga · Jaipur", videoId: "UNn2uSFeGCE", isShort: true, stars: 5 },
  { id: 2, category: "Transformative Story", videoTitle: "Aariana's Path to Wellness", quote: "The yoga classes here go far beyond physical practice. I found mental clarity and inner peace I had been searching for years. Truly life-changing.", name: "Aariana", role: "Vinyasa Flow · Delhi", videoId: "IZdubp4t0P0", isShort: true, stars: 5 },
  { id: 3, category: "Voice of Wellness", videoTitle: "Komal's Recovery Story", quote: "My wellness journey started here. The therapy yoga sessions helped me recover from chronic back pain completely. I am pain-free and stronger than ever.", name: "Komal Panwar", role: "Therapy Yoga · Jaipur", videoId: "C98XQgUVbLM", isShort: true, stars: 5 },
  { id: 4, category: "Transformative Story", videoTitle: "Vikas's Strength Journey", quote: "Joining Pragya Yoga was the best investment in my health. The instructors are world-class and the structured curriculum is outstanding in every way.", name: "Vikas Sharma", role: "Ashtanga Yoga · Mumbai", videoId: "QQUvaPoazM0", isShort: true, stars: 5 },
  { id: 5, category: "Wellness Journey", videoTitle: "A Holistic Yoga Experience", quote: "An incredible wellness journey at Pragya Yoga Alliance. The holistic approach changed my perspective on health completely. Every class is a transformative experience.", name: "Pragya Yoga Student", role: "Yoga Student · India", videoId: "0Ku1eMLaoL4", isShort: false, stars: 5 },
].map(r => ({ ...r, thumbSrc: ytThumb(r.videoId), avatarSrc: ytThumb(r.videoId), videoSrc: ytEmbed(r.videoId) }));

const TRUST_STATS = [
  { num: "500+", label: "Lives Transformed", icon: LuUsersRound },
  { num: "4.9★", label: "Average Rating", icon: LuStar },
  { num: "18+", label: "Years of Teaching", icon: LuHistory },
  { num: "100%", label: "Would Recommend", icon: LuCircleCheckBig },
];

const VideoModal = ({ review, onClose }) => {
  if (!review) return null;
  return (
    <motion.div className={styles.modal} onClick={onClose} role="dialog" aria-modal="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className={`${styles.modalInner} ${review.isShort ? styles.modalInnerShort : ''}`} onClick={(e) => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <iframe className={review.isShort ? styles.modalVideoShort : styles.modalVideo} src={review.videoSrc} title={`${review.videoTitle} — ${review.name}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
        <div className={styles.modalInfo}>
          <p className={styles.modalName}>{review.videoTitle}</p>
          <p className={styles.modalRole}>{review.name} · {review.role} · Pragya Yoga Alliance</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const cardReveal = {
  hidden: { opacity: 0, y: 36, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const gridContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

const ReviewCard = ({ review, onPlay, isActive }) => {
  const { category, videoTitle, quote, name, role, thumbSrc, stars } = review;
  return (
    <motion.article className={`${styles.card} ${isActive ? styles.cardActive : ''}`} onClick={() => onPlay(review)} role="listitem" aria-label={`Watch: ${videoTitle} by ${name}`} variants={cardReveal} whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}>
      <div className={styles.cardThumb}>
        <img className={styles.cardThumbImg} src={thumbSrc} alt={`${name} — ${category}`} loading="lazy" />
        <div className={styles.cardOverlay} />
        <span className={styles.cardBadge}>{category}</span>
        <div className={styles.cardPlay}>
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </div>
        <div className={styles.cardThumbFooter}>
          <div className={styles.cardThumbTitle}>{videoTitle}</div>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardStars} aria-label={`${stars} out of 5`}>
          {Array.from({ length: stars }).map((_, i) => (<span key={i} className={styles.cardStar}>★</span>))}
        </div>
        <blockquote className={styles.cardQuote}>"{quote}"</blockquote>
        <footer className={styles.cardAuthor}>
          <div className={styles.cardAuthorAvatar}>
            <img src={thumbSrc} alt={name} />
          </div>
          <div>
            <p className={styles.cardAuthorName}>{name}</p>
            <p className={styles.cardAuthorSub}>{role}</p>
          </div>
        </footer>
      </div>
    </motion.article>
  );
};

const Testimonials = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [activeDot, setActiveDot] = useState(0);
  const openModal = useCallback((r) => setActiveModal(r), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <section className={styles.section} id="testimonials" aria-labelledby="testimonials-heading">
        <motion.header className={styles.header} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <p className={styles.headerLabel}>Student Voices</p>
          <h2 id="testimonials-heading" className={styles.headerTitle}>Real <em>Stories,</em> Real Transformations</h2>
          <p className={styles.headerSub}>Hear directly from our students. Over <strong>500 lives transformed</strong> through expert-guided <strong>yoga classes in Jaipur</strong> — watch their journeys and discover the power of <strong>holistic yoga practice at Pragya Yoga Alliance</strong>.</p>
        </motion.header>

        <motion.div className={styles.grid} role="list" variants={gridContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
          {REVIEWS.map((r, i) => (
            <ReviewCard key={r.id} review={r} onPlay={openModal} isActive={activeDot === i} />
          ))}
        </motion.div>

        <nav className={styles.nav} aria-label="Testimonials navigation">
          <button className={styles.navBtn} onClick={() => setActiveDot(d => Math.max(0, d - 1))} aria-label="Previous">‹</button>
          <div className={styles.navDots}>
            {REVIEWS.map((_, i) => (
              <button key={i} className={`${styles.navDot} ${activeDot === i ? styles.active : ''}`} onClick={() => setActiveDot(i)} aria-label={`Review ${i + 1}`} />
            ))}
          </div>
          <button className={styles.navBtn} onClick={() => setActiveDot(d => Math.min(REVIEWS.length - 1, d + 1))} aria-label="Next">›</button>
        </nav>

        <div className={styles.trust}>
          {TRUST_STATS.map(({ num, label, icon: Icon }) => (
            <div key={label} className={styles.trustItem}>
              <span className={styles.trustIcon}><Icon size={24} strokeWidth={1.5} color="#2E7D5B" /></span>
              <span className={styles.trustNum}>{num}</span>
              <span className={styles.trustLabel}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <AnimatePresence>
        {activeModal && <VideoModal review={activeModal} onClose={closeModal} />}
      </AnimatePresence>
    </>
  );
};

export default Testimonials;
