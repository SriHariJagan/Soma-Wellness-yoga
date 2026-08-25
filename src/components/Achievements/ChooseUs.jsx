import React from "react";
import styles from "./ChooseUs.module.css";

export default function ChooseUs() {
  return (
    <section className={styles.whyChooseUs}>
      <h2 className={styles.sectionTitle}>
        Why Choose Pragya Yoga – 200 Hour Yoga Teacher Training
      </h2>
      <p className={styles.intro}>
        Our internationally accredited Yoga Teacher Training Course (TTC) in Jaipur, Rajasthan, 
        combines authentic Indian tradition with modern teaching methods. Recognized by Yoga Alliance, 
        this program prepares you to teach yoga worldwide while deepening your personal practice.
      </p>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Authentic Indian Yoga</h3>
          <p>Learn from experienced teachers in Jaipur, the cultural heart of Rajasthan, 
             with a curriculum rooted in Patanjali Yoga Sutra, Bhagavad Gita, and Hatha Yoga Pradipika.</p>
        </article>
        <article className={styles.card}>
          <h3>Yoga Alliance Certification</h3>
          <p>Graduate with a globally recognized 200 Hour Yoga Alliance certificate, 
             enabling you to teach yoga professionally across India and abroad.</p>
        </article>
        <article className={styles.card}>
          <h3>Flexible Learning</h3>
          <p>Choose online or offline modes, access recorded classes, and enjoy one year of course material availability.</p>
        </article>
        <article className={styles.card}>
          <h3>Community & Support</h3>
          <p>Join a supportive yoga community with students from Bharat and around the world, 
             fostering connection and lifelong friendships.</p>
        </article>
          <article className={styles.card}>
    <h3>Direct Guidance from Dr. Kapil Dev Ji</h3>
    <p>Receive monthly one‑to‑one question & answer sessions and live assistance directly from 
       <strong>Dr. Kapil Dev Kesari</strong>, Founder & Director of Pragya Yoga Alliance. 
       Personalized mentorship ensures authentic learning and professional growth.</p>
  </article>
      </div>

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
          "occupationalCategory": "Yoga Teacher",
          "programPrerequisites": "No prior yoga experience required",
          "hasCourse": [
            {
              "@type": "Course",
              "name": "Authentic Indian Yoga",
              "description": "Curriculum rooted in Patanjali Yoga Sutra, Bhagavad Gita, and Hatha Yoga Pradipika."
            },
            {
              "@type": "Course",
              "name": "Yoga Alliance Certification",
              "description": "Globally recognized 200 Hour Yoga Alliance certificate."
            },
            {
              "@type": "Course",
              "name": "Flexible Learning",
              "description": "Online & offline modes, recorded classes, one year access."
            },
            {
              "@type": "Course",
              "name": "Community & Support",
              "description": "Join a supportive yoga community in Jaipur, India."
            }
          ]
        })}
      </script>
    </section>
  );
}
