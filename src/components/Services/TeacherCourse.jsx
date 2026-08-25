import React from "react";
import styles from "./TeacherCourse.module.css";

const highlights = [
  {
    title: "Foundational Asanas – Yoga Training in Jaipur",
    desc: "Learn yoga postures with proper alignment, adjustments, and modifications taught by certified trainers in Jaipur, Rajasthan, India. Suitable for beginners and advanced practitioners.",
    icon: "lotus.webp"
  },
  {
    title: "Pranayama Techniques – Breathing Practices",
    desc: "Practice traditional pranayama methods to enhance lung capacity, balance energy, and prepare the mind for meditation. Globally recognized by Yoga Alliance certification.",
    icon: "yoga.webp"
  },
  {
    title: "Yoga Philosophy – Ancient Indian Texts",
    desc: "Study Patanjali Yoga Sutra, Bhagavad Gita, Hatha Pradipika, Gherand Samhita, and Upanishads to understand authentic yoga philosophy, ethics, and yogic lifestyle.",
    icon: "book.webp"
  },
  {
    title: "Anatomy & Physiology – Yoga Science",
    desc: "Gain knowledge of musculoskeletal systems, injury prevention, and the impact of yoga on body systems. Learn how yoga supports holistic health and wellness.",
    icon: "anatomy.webp"
  },
  {
    title: "Teaching Methodology – Become a Yoga Teacher",
    desc: "Develop sequencing, communication skills, and confidence to lead safe and effective yoga classes. Build your career as a certified yoga teacher worldwide.",
    icon: "teachings.webp"
  },
  {
    title: "Meditation & Mindfulness – Inner Peace",
    desc: "Explore meditation techniques and mindfulness practices to cultivate focus, clarity, and emotional balance. Essential for personal growth and teaching success.",
    icon: "meditation.webp"
  },
];

export default function TeacherCourse() {
  return (
    <section className={styles.highlights}>
      <h2 className={styles.sectionTitle}>
        Course Highlights – 200 Hour Yoga Teacher Training in Jaipur, India
      </h2>

      <div className={styles.grid}>
        {highlights.map((item, idx) => (
          <article key={idx} className={styles.card}>
            <img
              src={`/images/icons/${item.icon}`}
              alt={`${item.title} icon`}
              className={styles.icon}
            />
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.cardDesc}>{item.desc}</p>
          </article>
        ))}
      </div>

      {/* Decorative Divider */}

      {/* ✅ SEO Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalOccupationalProgram",
          "name": "200 Hour Yoga Teacher Training Course",
          "provider": {
            "@type": "Organization",
            "name": "Pragya Yoga Alliance",
            "url": "https://pragyayoga.in"
          },
          "educationalCredentialAwarded": "Yoga Alliance 200 Hour Certification",
          "timeToComplete": "P200H",
          "startDate": "2026-09-15",
          "occupationalCategory": "Yoga Teacher",
          "programPrerequisites": "No prior yoga experience required",
          "hasCourse": highlights.map(h => ({
            "@type": "Course",
            "name": h.title,
            "description": h.desc
          }))
        })}
      </script>
    </section>
  );
}
