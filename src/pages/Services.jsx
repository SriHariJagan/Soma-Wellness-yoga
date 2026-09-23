import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { EASE } from "../lib/motion";
import { addToCart, showToast, notifyCartUpdate } from "../utils/payment";
import CheckoutGate from "../components/checkout/CheckoutGate.jsx";
import styles from "./Services.module.css";

const fmt = (n) => n?.toLocaleString() || "0";
const perSession = (total, count) => count ? Math.round(total / count) : total;

const API = import.meta.env.VITE_API_URL || "";

const HERO_IMG = "https://images.unsplash.com/photo-1545389336-cf090694435e?q=80&w=2000&auto=format&fit=crop";

/* 36 unique curated photos — one per service, no repeats */
const UNIQUE_POOL = [
  "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1585059895524-72359e06133a?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1591228127791-8e2eaef098d3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600334089648-bd6e2a7a65a8?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1493894473891-10fc1e5dbd22?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524863479829-916d8e77f114?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1532798442725-41013accd3f7?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1522098543979-ffc7f79a56c4?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1599447421416-3414500d18a5?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1573599852326-2d4da0bbe613?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506126279646-a697353d3166?q=80&w=800&auto=format&fit=crop",
];

/* Category-preferred ordering so images stay relevant AND unique */
const CAT_ORDER = {
  group_yoga: [0, 1, 3, 4, 22, 24, 25, 27],
  membership: [20, 1, 21, 5],
  personal_training: [2, 6, 5, 23, 29, 31],
  therapy: [8, 9, 10, 11, 12, 13, 26, 33],
  mama: [14, 15, 16, 32],
  meditation: [17, 18, 0, 19, 28, 35],
  corporate: [30, 7, 12, 26, 33, 19],
  couple: [7, 30],
};

const buildImageMap = (offerings) => {
  const used = new Set();
  const map = {};
  const take = (idx) => {
    if (!used.has(UNIQUE_POOL[idx])) { used.add(UNIQUE_POOL[idx]); return UNIQUE_POOL[idx]; }
    return null;
  };
  // Pass 1: DB images first (already unique by content)
  offerings.forEach((o) => {
    if (o.image) { map[o._id] = o.image; used.add(o.image); }
  });
  // Pass 2: category-preferred unique picks
  offerings.forEach((o) => {
    if (map[o._id]) return;
    const name = `${o.name || ""} ${o.subtitle || ""}`.toLowerCase();
    const isCouple = /couple|partner|for two|duo/.test(name);
    const order = isCouple ? CAT_ORDER.couple : (CAT_ORDER[o.category] || null);
    if (order) {
      for (const idx of order) {
        const img = take(idx);
        if (img) { map[o._id] = img; return; }
      }
    }
    // Pass 3: first globally unused photo
    for (let i = 0; i < UNIQUE_POOL.length; i++) {
      const img = take(i);
      if (img) { map[o._id] = img; return; }
    }
    map[o._id] = UNIQUE_POOL[0];
  });
  return map;
};

const SectionHead = ({ eyebrow, title, titleEm, desc }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.6, ease: EASE }}
    className={styles.sectionHead}
  >
    <p className={styles.eyebrow}>{eyebrow}</p>
    <h2 className={styles.sectionTitle}>{title} <em>{titleEm}</em></h2>
    {desc && <p className={styles.sectionDesc}>{desc}</p>}
  </motion.div>
);

const OfferCard = ({ item, index = 0, image, ctaLabel = "Enquire" }) => {
  const navigate = useNavigate();
  const [buying, setBuying] = useState(false);
  const canBuy = (item.price || 0) > 0 && item._id && item.bookingEnabled;

  const buy = async () => {
    if (!canBuy || buying) return;
    setBuying(true);
    try {
      await addToCart("offering", item._id);
      showToast(`${item.name} added to cart`, "success");
      notifyCartUpdate();
      navigate("/studentdashboard?tab=cart");
    } catch (err) {
      showToast(err.message || "Could not add to cart", "error");
    } finally {
      setBuying(false);
    }
  };

  return (
  <motion.article
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-30px" }}
    transition={{ duration: 0.5, delay: Math.min(index * 0.06, 0.18), ease: EASE }}
    className={styles.card}
  >
    <div className={styles.cardMedia}>
      <img src={image || item.image || UNIQUE_POOL[index % UNIQUE_POOL.length]} alt={item.name} loading="lazy" />
      <div className={styles.cardShade} />
      {item.featured && <span className={styles.badge}>Popular</span>}
      {item.isPopular && !item.featured && <span className={styles.badgeGold}>Loved</span>}
    </div>
    <div className={styles.cardBody}>
      <p className={styles.cardSubtitle}>{item.subtitle}</p>
      <h3 className={styles.cardName}>{item.name}</h3>
      {item.description && <p className={styles.cardDesc}>{item.description}</p>}
      {item.whatIncluded && item.whatIncluded.length > 0 && (
        <ul className={styles.cardList}>
          {item.whatIncluded.slice(0, 3).map((w) => (
            <li key={w}><span className={styles.check}>✓</span>{w}</li>
          ))}
        </ul>
      )}
      <div className={styles.cardFooter}>
        <div>
          <div className={styles.price}>KES {fmt(item.price)}</div>
          <div className={styles.perSession}>
            {item.sessions > 1
              ? `KES ${fmt(perSession(item.price, item.sessions))} / session`
              : item.sessionDuration ? `${item.sessionDuration} min` : ""}
          </div>
        </div>
        <div className={styles.cardActions}>
          {canBuy && (
            <CheckoutGate
              intent={{ name: item.name, price: `KES ${fmt(item.price)}`, sub: item.subtitle || "", type: "offering", itemType: "offering", itemId: item._id }}
              onProceed={buy}
            >
              <button type="button" className={styles.buyBtn} disabled={buying}>
                {buying ? "Adding…" : "Book"}
              </button>
            </CheckoutGate>
          )}
          <Link to="/contact" className={canBuy ? styles.ghostBtn : styles.ctaBtn}>{ctaLabel}</Link>
        </div>
      </div>
    </div>
  </motion.article>
  );
};

const CompareRow = ({ label, individual, couple }) => (
  <div className={styles.compareRow}>
    <span className={styles.compareLabel}>{label}</span>
    <span className={styles.compareInd}>{individual}</span>
    <span className={styles.compareCou}>{couple}</span>
  </div>
);

const Services = () => {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/offerings`)
      .then((r) => r.json())
      .then((data) => setOfferings(data.filter((o) => o.status === "available")))
      .catch(() => setOfferings([]))
      .finally(() => setLoading(false));
  }, []);

  const group = (cat) => offerings.filter((o) => o.category === cat);
  const groupYoga = group("group_yoga");
  const memberships = group("membership");
  const personal = group("personal_training");
  const meditation = group("meditation");
  const therapy = group("therapy");
  const mama = group("mama");
  const corporate = group("corporate");

  const indSingle = personal.find((o) => /one-to-one/i.test(o.name) && o.sessions === 1);
  const indPack5 = personal.find((o) => /5 private/i.test(o.name) || (/one-to-one/i.test(o.name) && o.sessions === 5));
  const indPack10 = personal.find((o) => /10 private/i.test(o.name) || (/one-to-one/i.test(o.name) && o.sessions === 10));
  const couSingle = personal.find((o) => /couple/i.test(o.name) && o.sessions === 1);
  const couPack5 = personal.find((o) => /5 couple/i.test(o.name) || (/couple/i.test(o.name) && o.sessions === 5));
  const couPack10 = personal.find((o) => /10 couple/i.test(o.name) || (/couple/i.test(o.name) && o.sessions === 10));

  const therapySingle = therapy.find((o) => o.sessions === 1);
  const therapyPack5 = therapy.find((o) => o.sessions === 5);
  const therapyPack10 = therapy.find((o) => o.sessions === 10);

  const imageMap = useMemo(() => buildImageMap(offerings), [offerings]);
  const pic = (item) => imageMap[item._id] || item.image || UNIQUE_POOL[0];

  return (
    <main className={styles.page}>
      {/* Compact hero */}
      <section className={styles.hero}>
        <div className={styles.heroBg} aria-hidden="true">
          <img src={HERO_IMG} alt="" />
          <div className={styles.heroVeil} />
        </div>
        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className={styles.heroEyebrow}>Our services</p>
          <h1 className={styles.heroTitle}>Wellness, <em>thoughtfully</em> experienced</h1>
          <p className={styles.heroSub}>
            Group classes, private 1:1, couple sessions, therapy, memberships,
            breathwork and corporate wellness —
            clear pricing, flexible packages.
          </p>
          <div className={styles.heroCtas}>
            <a href="#group" className={styles.heroBtnGhost}>Browse services</a>
            <Link to="/contact" className={styles.heroBtnSolid}>Book a session</Link>
          </div>
          <div className={styles.heroMeta}>
            <span><strong>6</strong> paths of practice</span>
            <span className={styles.dot}>·</span>
            <span><strong>1 · 5 · 10</strong> session options</span>
            <span className={styles.dot}>·</span>
            <span><strong>Individual</strong> or <strong>couple</strong></span>
          </div>
        </motion.div>
      </section>

      <nav className={styles.jumpNav} aria-label="Service sections">
        <div className={styles.jumpInner}>
          <a href="#group">Group</a>
          <a href="#private">Private</a>
          <a href="#therapy">Therapy</a>
          <a href="#mama">Mama</a>
          <a href="#stillness">Stillness</a>
          <a href="#corporate">Corporate</a>
        </div>
      </nav>

      {loading ? (
        <div className={styles.loading}>Loading services…</div>
      ) : (
        <>
          <section id="group" className={styles.section}>
            <div className={styles.container}>
              <SectionHead
                eyebrow="Move together"
                title="Group classes &"
                titleEm="memberships"
                desc="Small guided groups, mornings and evenings. Drop in, take ten, or go unlimited."
              />
              <div className={styles.grid}>
                {groupYoga.map((item, i) => (
                  <OfferCard key={item._id} item={item} index={i} image={pic(item)} />
                ))}
              </div>
              {memberships.length > 0 && (
                <>
                  <p className={styles.subLabel}>
                    Unlimited memberships
                    {" · "}
                    <Link to="/memberships" style={{ color: "var(--soma-primary)", fontWeight: 800, textDecoration: "none" }}>
                      3 · 6 · 12-month terms (Bronze, Silver & Gold) →
                    </Link>
                  </p>
                  <div className={styles.grid}>
                    {memberships.map((item, i) => (
                      <OfferCard key={item._id} item={item} index={i} image={pic(item)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          <section id="private" className={styles.sectionAlt}>
            <div className={styles.container}>
              <SectionHead
                eyebrow="Personal training"
                title="Private — individual"
                titleEm="& couple"
                desc="Your pace, your goals. Solo attention or a shared ritual — 1, 5 or 10 sessions."
              />
              {indSingle && couSingle && (
                <motion.div
                  className={styles.compareBox}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <div className={styles.compareHeader}>
                    <span />
                    <span className={styles.compareColTitle}>Individual</span>
                    <span className={styles.compareColTitleAccent}>Couple</span>
                  </div>
                  <CompareRow label="Duration" individual={`${indSingle.sessionDuration} min`} couple={`${couSingle.sessionDuration} min`} />
                  <CompareRow label="1 session" individual={`KES ${fmt(indSingle.price)}`} couple={`KES ${fmt(couSingle.price)}`} />
                  <CompareRow label="5 sessions" individual={indPack5 ? `KES ${fmt(indPack5.price)}` : "—"} couple={couPack5 ? `KES ${fmt(couPack5.price)}` : "—"} />
                  <CompareRow label="10 sessions" individual={indPack10 ? `KES ${fmt(indPack10.price)}` : "—"} couple={couPack10 ? `KES ${fmt(couPack10.price)}` : "—"} />
                </motion.div>
              )}
              <p className={styles.subLabel}>Individual — one-to-one</p>
              <div className={styles.grid}>
                {[indSingle, indPack5, indPack10].filter(Boolean).map((item, i) => (
                  <OfferCard key={item._id} item={item} index={i} image={pic(item)} />
                ))}
              </div>
              <p className={styles.subLabelAccent}>Couple — shared practice</p>
              <div className={styles.grid}>
                {[couSingle, couPack5, couPack10].filter(Boolean).map((item, i) => (
                  <OfferCard key={item._id} item={item} index={i} image={pic(item)} />
                ))}
              </div>
            </div>
          </section>

          {therapy.length > 0 && (
            <section id="therapy" className={styles.section}>
              <div className={styles.container}>
                <SectionHead
                  eyebrow="Healing"
                  title="Yoga"
                  titleEm="therapy"
                  desc="Assessed, personalised, progressive — for specific concerns."
                />
                {therapySingle && (
                  <div className={styles.priceList}>
                    {[therapySingle, therapyPack5, therapyPack10].filter(Boolean).map((t) => (
                      <div key={t._id} className={styles.priceRow}>
                        <span className={styles.priceName}>{t.sessions || 1} {(t.sessions || 1) > 1 ? "sessions" : "session"}</span>
                        <span className={styles.priceDots} />
                        <span className={styles.priceVal}>KES {fmt(t.price)}</span>
                        <span className={styles.pricePer}>KES {fmt(perSession(t.price, t.sessions || 1))}/session</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.grid}>
                  {therapy.map((item, i) => (
                    <OfferCard key={item._id} item={item} index={i} image={pic(item)} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {mama.length > 0 && (
            <section id="mama" className={styles.sectionAlt}>
              <div className={styles.container}>
                <SectionHead
                  eyebrow="Soma mama"
                  title="Wellness for"
                  titleEm="every stage"
                  desc="Safe sessions for expectant and new mothers."
                />
                <div className={styles.grid}>
                  {mama.map((item, i) => (
                    <OfferCard key={item._id} item={item} index={i} image={pic(item)} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {meditation.length > 0 && (
            <section id="stillness" className={styles.section}>
              <div className={styles.container}>
                <SectionHead
                  eyebrow="Stillness"
                  title="Meditation &"
                  titleEm="breathwork"
                  desc="Guided calm for clarity and sleep. Drop in, all levels."
                />
                <div className={styles.grid}>
                  {meditation.map((item, i) => (
                    <OfferCard key={item._id} item={item} index={i} image={pic(item)} ctaLabel="Drop in" />
                  ))}
                </div>
              </div>
            </section>
          )}

          {corporate.length > 0 && (
            <section id="corporate" className={styles.sectionAlt}>
              <div className={styles.container}>
                <SectionHead
                  eyebrow="Work well"
                  title="Corporate"
                  titleEm="wellness"
                  desc="Yoga, mobility and mindfulness for teams — at your offices or at SOMA. Single sessions or a monthly programme of four."
                />
                <div className={styles.grid}>
                  {corporate.map((item, i) => (
                    <OfferCard key={item._id} item={item} index={i} image={pic(item)} ctaLabel="Enquire" />
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className={styles.ctaSection}>
            <motion.div
              className={styles.ctaBox}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <h3 className={styles.ctaTitle}>Not sure where to begin?</h3>
              <p className={styles.ctaDesc}>Tell us your goals — we will match you to the right class or practitioner.</p>
              <div className={styles.ctaRow}>
                <Link to="/contact" className={styles.ctaBtnLg}>Talk to us</Link>
                <a href="tel:+254702080070" className={styles.ctaGhost}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  +254 702 080 070
                </a>
              </div>
            </motion.div>
          </section>
        </>
      )}
    </main>
  );
};

export default Services;
