import React from "react";
import styles from "./CourseFeatures.module.css";

const features = [
  {
    title: "For All Levels",
    desc: "Beginners and advanced practitioners can join our Yoga Alliance certified training in Jaipur, India.",
    icon: "yoga-mat.webp"
  },
  {
    title: "200+ Hours of Training",
    desc: "Comprehensive program with theory, practice, and live yoga classes recognized worldwide.",
    icon: "clock.webp"
  },
  {
    title: "Flexible Exams",
    desc: "Complete at your own pace and take exams when you feel ready.",
    icon: "exam.webp"
  },
  {
    title: "Recorded Live Classes",
    desc: "Never miss a session — all live classes are recorded for later viewing.",
    icon: "recording.webp"
  },
  {
    title: "1 Year Access",
    desc: "Course materials remain available for one year for continuous learning.",
    icon: "calendar.webp"
  },
  {
    title: "Global Online Classroom",
    desc: "Access from home through our online platform, connecting students worldwide.",
    icon: "earth.webp"
  }
];

export default function CourseFeatures() {
  return (
    <section className={styles.features}>
  <h2 className={styles.sectionTitle}>
    Key Features – 200 Hour Yoga Teacher Training in Jaipur, India
  </h2>
  <div className={styles.grid}>
    {features.map((item, idx) => (
      <article key={idx} className={styles.card}>
        <img src={`/images/icons/${item.icon}`} alt={`${item.title} icon`} className={styles.icon}/>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <p className={styles.cardDesc}>{item.desc}</p>
      </article>
    ))}
  </div>

  {/* ✅ FAQ Schema for Rich Results */}
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is the Yoga Teacher Training valid worldwide?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, Soma Wellness is Yoga Alliance certified, allowing you to teach globally."
          }
        },
        {
          "@type": "Question",
          "name": "Do I need prior yoga experience?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No, the 200 Hour Yoga TTC is designed for both beginners and advanced practitioners."
          }
        },
        {
          "@type": "Question",
          "name": "Can I access classes later?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, all live classes are recorded and available for one year."
          }
        }
      ]
    })}
  </script>
</section>

  );
}
