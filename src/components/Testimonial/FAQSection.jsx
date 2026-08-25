import React, { useState } from "react";
import styles from "./FAQSection.module.css";

const faqs = [
  {
    question: "Who is this course suitable for?",
    answer: "Our 200 Hour Yoga Teacher Training in Jaipur, India is suitable for beginners, intermediate, and advanced practitioners. No prior experience is required."
  },
  {
    question: "What will I learn during the 200-hour course?",
    answer: "You will study yoga asanas, pranayama, meditation, anatomy, philosophy, and teaching methodology, graduating with Yoga Alliance certification."
  },
  {
    question: "What happens if I miss a class?",
    answer: "All live classes are recorded and available for one year, so you can catch up anytime."
  },
  {
    question: "Do I need prior experience in yoga?",
    answer: "No, the course is designed for all levels. Beginners are guided step by step, while advanced practitioners deepen their practice."
  },
  {
    question: "Will I be certified after completing the course?",
    answer: "Yes, you will receive a globally recognized Yoga Alliance 200 Hour certificate, enabling you to teach worldwide."
  },
  {
    question: "Are there exams at the end of the course?",
    answer: "Yes, exams are conducted at the end of the training, but you can take them at your own pace."
  },
  {
    question: "Can I join if I’m not flexible or have limitations?",
    answer: "Absolutely. Yoga is for everyone. Modifications and props are provided to support all body types and abilities."
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className={styles.faq}>
      <h2 className={styles.sectionTitle}>
        Frequently Asked Questions – Yoga Teacher Training
      </h2>
      <div className={styles.grid}>
        {faqs.map((faq, idx) => (
          <div key={idx} className={styles.card}>
            <button className={styles.question} onClick={() => toggleFAQ(idx)}>
              {faq.question}
              <span className={styles.icon}>{openIndex === idx ? "−" : "+"}</span>
            </button>
            {openIndex === idx && <p className={styles.answer}>{faq.answer}</p>}
          </div>
        ))}
      </div>

      {/* ✅ SEO Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
              "@type": "Answer",
              "text": faq.answer
            }
          }))
        })}
      </script>
    </section>
  );
}
