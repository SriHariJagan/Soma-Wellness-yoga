import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { EASE } from "../lib/motion";
import { addToCart, showToast, notifyCartUpdate } from "../utils/payment";
import CheckoutGate from "../components/checkout/CheckoutGate.jsx";
import styles from "./Courses.module.css";

const API = import.meta.env.VITE_API_URL || "";
const HERO_IMG = "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=2000&auto=format&fit=crop";
const INTRO_IMG = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop";
const ACADEMY_IMG = "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1200&auto=format&fit=crop";

const HIGHLIGHTS = [
  { icon: "✦", title: "Foundational Asanas", desc: "Postures with proper alignment, adjustments and modifications — for beginners and advanced practitioners." },
  { icon: "◯", title: "Pranayama Techniques", desc: "Traditional breathing methods to build lung capacity, balance energy and prepare the mind." },
  { icon: "❋", title: "Yoga Philosophy", desc: "Patanjali Yoga Sutra, Bhagavad Gita, Hatha Pradipika and Upanishads — ethics and yogic lifestyle." },
  { icon: "⬡", title: "Anatomy & Physiology", desc: "Musculoskeletal systems, injury prevention, and how yoga supports holistic health." },
  { icon: "◇", title: "Teaching Methodology", desc: "Sequencing, communication and confidence to lead safe, effective classes." },
  { icon: "☾", title: "Meditation & Mindfulness", desc: "Focus, clarity and emotional balance — for personal growth and teaching." },
];

const FEATURES = [
  { icon: "◆", title: "For All Levels", desc: "Beginners and advanced practitioners welcome in this Yoga Alliance certified training." },
  { icon: "◷", title: "200+ Hours", desc: "Theory, practice and live classes recognised worldwide." },
  { icon: "✎", title: "Flexible Exams", desc: "Complete at your own pace; examine when ready." },
  { icon: "◎", title: "Recorded Classes", desc: "All live sessions recorded for later viewing." },
  { icon: "▦", title: "1 Year Access", desc: "Materials available for a full year." },
  { icon: "⊕", title: "Global Classroom", desc: "Join online from anywhere in the world." },
];

const WHY_US = [
  { title: "Authentic Lineage", desc: "Rooted in Patanjali Yoga Sutra, Bhagavad Gita and Hatha Yoga Pradipika — taught with care in Spring Valley." },
  { title: "Yoga Alliance Certification", desc: "Graduate with a globally recognised 200-hour certificate." },
  { title: "Flexible Learning", desc: "Online or in-person, recorded classes, one-year access." },
  { title: "Community & Support", desc: "Small cohorts, personal attention, lifelong connections." },
  { title: "Direct Mentorship", desc: "Monthly one-to-one Q&A with senior SomaWellness teachers." },
  { title: "Practice for Life", desc: "Leave with a home practice, teaching toolkit and clear next steps." },
];

const FAQS = [
  { q: "Is the training valid worldwide?", a: "Yes — Yoga Alliance certified, recognised globally." },
  { q: "Do I need prior yoga experience?", a: "No. The course suits beginners and advanced practitioners alike." },
  { q: "Can I access classes later?", a: "Yes — recordings remain available for one year." },
  { q: "How do I join a batch?", a: "Pick an active batch below and book your slot, or contact us and we will guide you." },
];

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

const Courses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/offerings`);
        if (!res.ok) throw new Error("courses load failed");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.offerings || [];
        if (alive) setCourses(list.filter((o) => o.category === "academy" && o.status === "available"));
      } catch {
        if (alive) setCourses([]);
      } finally {
        if (alive) setLoadingCourses(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const goRegister = () => {
    if (courses.length > 0) buyCourse(courses[0]);
    else navigate("/contact");
  };

  const [buyingId, setBuyingId] = useState(null);
  const buyCourse = async (course) => {
    if (!course?._id || buyingId) return;
    setBuyingId(course._id);
    try {
      await addToCart("offering", course._id);
      showToast(`${course.name} added to cart`, "success");
      notifyCartUpdate();
      navigate("/studentdashboard?tab=cart");
    } catch (err) {
      showToast(err.message || "Could not add to cart", "error");
    } finally {
      setBuyingId(null);
    }
  };

  const buyIntent = (course) => ({
    name: course.name,
    price: `KES ${Number(course.price || 0).toLocaleString()}`,
    sub: course.subtitle || "",
    type: "offering",
    itemType: "offering",
    itemId: course._id,
  });

  return (
    <main className={styles.page}>
      {/* Hero — Services style */}
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
          <p className={styles.heroEyebrow}>Yoga Alliance Certified · 200 Hours</p>
          <h1 className={styles.heroTitle}>200-Hour Yoga Teacher <em>Training</em></h1>
          <p className={styles.heroSub}>
            Deepen your practice, master yoga philosophy, and become a certified teacher —
            recognised globally, taught in Spring Valley, Nairobi.
          </p>
          <div className={styles.heroCtas}>
            <CheckoutGate
              intent={courses[0] ? buyIntent(courses[0]) : { name: "200-Hour Yoga Teacher Training", price: "", sub: "", type: "offering", itemType: "offering", itemId: courses[0]?._id }}
              onProceed={goRegister}
            >
              <button type="button" className={styles.heroBtnSolid}>Register now</button>
            </CheckoutGate>
            <a href="#batches" className={styles.heroBtnGhost}>View training</a>
          </div>
        </motion.div>
      </section>

      <nav className={styles.jumpNav} aria-label="Course sections">
        <div className={styles.jumpInner}>
          <a href="#overview">Overview</a>
          <a href="#highlights">Highlights</a>
          <a href="#features">Features</a>
          <a href="#batches">Training</a>
          <a href="#why">Why us</a>
          <a href="#faq">FAQ</a>
        </div>
      </nav>

      {/* Overview split */}
      <section id="overview" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.splitGrid}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <p className={styles.eyebrowLeft}>The course</p>
              <h2 className={styles.h2}>Deepen practice. Learn to teach.</h2>
              <p className={styles.body}>
                Our <strong>200-Hour Yoga Teacher Training Course (YTTC)</strong> is designed for
                those who wish to deepen their practice, gain a thorough understanding of yoga
                philosophy, and embark on becoming a certified yoga teacher.
              </p>
              <p className={styles.body}>
                <strong>Certified by Yoga Alliance</strong> — graduates are recognised globally
                and equipped to teach safely and effectively.
              </p>
              <button type="button" onClick={() => document.getElementById("batches")?.scrollIntoView({ behavior: "smooth" })} className={styles.btnDark}>View training ↓</button>
            </motion.div>
            <motion.div
              className={styles.splitMedia}
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <img src={INTRO_IMG} alt="Teacher training practice" loading="lazy" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section id="highlights" className={styles.sectionAlt}>
        <div className={styles.container}>
          <SectionHead eyebrow="Curriculum" title="Course" titleEm="highlights" desc="Six pillars — movement, breath, philosophy, science, teaching and stillness." />
          <div className={styles.grid}>
            {HIGHLIGHTS.map((h, i) => (
              <motion.article
                key={h.title}
                className={styles.card}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.2), ease: EASE }}
              >
                <span className={styles.icon}>{h.icon}</span>
                <h3 className={styles.cardTitle}>{h.title}</h3>
                <p className={styles.cardDesc}>{h.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.section}>
        <div className={styles.container}>
          <SectionHead eyebrow="Experience" title="Key" titleEm="features" desc="Flexible, recorded, and open to every level — from anywhere." />
          <div className={styles.grid}>
            {FEATURES.map((f, i) => (
              <motion.article
                key={f.title}
                className={styles.card}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.2), ease: EASE }}
              >
                <span className={styles.icon}>{f.icon}</span>
                <h3 className={styles.cardTitle}>{f.title}</h3>
                <p className={styles.cardDesc}>{f.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Teacher training — live from admin (academy offerings) */}
      <section id="batches" className={styles.sectionAlt}>
        <div className={styles.container}>
          <SectionHead eyebrow="Enrolment" title="Teacher" titleEm="training" desc="Academy courses managed in the admin panel — anything published there reflects here automatically." />
          {loadingCourses ? (
            <div className={styles.loading}>Loading courses…</div>
          ) : courses.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>New cohorts announced soon</p>
              <p className={styles.emptyDesc}>No academy courses published right now. Contact us and we will reserve your place in the next cohort.</p>
              <Link to="/contact" className={styles.btnDark}>Notify me →</Link>
            </div>
          ) : (
            <div className={styles.courseStack}>
              {courses.map((c, i) => (
                <motion.article
                  key={c._id || i}
                  className={styles.courseFeature}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <div className={styles.courseMedia}>
                    <img src={c.image || ACADEMY_IMG} alt={c.name} loading="lazy" />
                    {c.featured && <span className={styles.batchStatus}>Featured</span>}
                  </div>
                  <div className={styles.courseBody}>
                    <p className={styles.courseSub}>{c.subtitle}</p>
                    <h3 className={styles.courseName}>{c.name}</h3>
                    {c.description && <p className={styles.cardDesc}>{c.description}</p>}
                    {c.whatIncluded && c.whatIncluded.length > 0 && (
                      <ul className={styles.courseList}>
                        {c.whatIncluded.slice(0, 6).map((w) => (
                          <li key={w}><span className={styles.tick}>✓</span>{w}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className={styles.courseSide}>
                    <p className={styles.sideLabel}>Full course</p>
                    <p className={styles.coursePrice}>KES {Number(c.price || 0).toLocaleString()}</p>
                    {c.validityDuration > 0 && (
                      <p className={styles.courseMeta}>{c.validityDuration} {c.validityUnit} · {c.sessionDuration ? `${c.sessionDuration}-min sessions` : "guided sessions"}</p>
                    )}
                    <CheckoutGate intent={buyIntent(c)} onProceed={() => buyCourse(c)}>
                      <button type="button" className={styles.ctaBtn} disabled={buyingId === c._id}>
                        {buyingId === c._id ? "Adding…" : "Enrol now →"}
                      </button>
                    </CheckoutGate>
                    <Link to="/contact" className={styles.sideLink}>Ask a question</Link>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why us */}
      <section id="why" className={styles.section}>
        <div className={styles.container}>
          <SectionHead eyebrow="SomaWellness" title="Why" titleEm="choose us" desc="Authentic tradition, modern teaching, personal mentorship." />
          <div className={styles.grid}>
            {WHY_US.map((w, i) => (
              <motion.article
                key={w.title}
                className={styles.card}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.2), ease: EASE }}
              >
                <h3 className={styles.cardTitle}>{w.title}</h3>
                <p className={styles.cardDesc}>{w.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={styles.sectionAlt}>
        <div className={styles.narrow}>
          <SectionHead eyebrow="Guidance" title="Questions," titleEm="answered" />
          <div className={styles.faq}>
            {FAQS.map((f, i) => (
              <div key={f.q} className={styles.faqItem + (openFaq === i ? " " + styles.faqOpen : "")}>
                <button type="button" className={styles.faqQ} onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                  {f.q}<span aria-hidden="true">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <p className={styles.faqA}>{f.a}</p>}
              </div>
            ))}
          </div>
          <div className={styles.ctaRow}>
            <CheckoutGate
              intent={courses[0] ? buyIntent(courses[0]) : { name: "200-Hour Yoga Teacher Training", price: "", sub: "", type: "offering", itemType: "offering", itemId: courses[0]?._id }}
              onProceed={goRegister}
            >
              <button type="button" className={styles.btnDark}>Register now →</button>
            </CheckoutGate>
            <Link to="/contact" className={styles.btnLight}>Talk to us</Link>
          </div>
        </div>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOccupationalProgram",
            name: "200 Hour Yoga Teacher Training Course — SomaWellness",
            provider: { "@type": "Organization", name: "SomaWellness" },
            educationalCredentialAwarded: "Yoga Alliance 200 Hour Certification",
            timeToComplete: "P200H",
            occupationalCategory: "Yoga Teacher",
          })}
        </script>
      </section>
    </main>
  );
};

export default Courses;
