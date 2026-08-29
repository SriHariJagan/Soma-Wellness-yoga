import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./NextBatch.module.css";

export default function NextBatch() {
  const navigate = useNavigate();

  const handleBookSlot = () => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");

    if (token && user) {
      navigate("/studentdashboard?tab=yttc");
    } else {
      navigate(
        `/login?redirectTo=${encodeURIComponent("/studentdashboard?tab=yttc")}`
      );
    }
  };

  return (
    <section className={styles.nextBatch}>
      <div className={styles.container}>
        {/* Left Side: Batch Info */}
        <div className={styles.details}>
          <h2 className={styles.sectionTitle}>
            Next Batch Details – Yoga Teacher Training in Jaipur, India
          </h2>
          <ul className={styles.list}>
            <li><strong>Start Date:</strong> September 15, 2026</li>
            <li><strong>Duration:</strong> 45 Days</li>
            <li><strong>Class Timing:</strong> According to the batch</li>
            <li><strong>Mode:</strong> Online & Offline</li>
            <li><strong>Orientation:</strong> September 10, 2026</li>
          </ul>
          <button
            type="button"
            className={styles.cta}
            onClick={handleBookSlot}
          >
            Book Your Slot
          </button>
        </div>

        {/* Right Side: Promo */}
        <div className={styles.promo}>
          <h3 className={styles.promoTitle}>
            Join Our Internationally Accredited 200 Hour Yoga TTC
          </h3>
          <p className={styles.promoDesc}>
            Basic to Advanced Level • Online & Offline •
            September 15 – October 30, 2026
          </p>
          <img src="/images/services/studio.webp" alt="Yoga student practicing asana" className={styles.image} width="1280" height="452" loading="lazy" decoding="async" />
        </div>
      </div>

      {/* SEO Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Course",
          "name": "200 Hour Yoga Teacher Training – Next Batch",
          "provider": {
            "@type": "Organization",
            "name": "Soma Wellness",
            "url": "https://somawellness.in"
          },
          "startDate": "2026-09-15",
          "endDate": "2026-10-30",
          "educationalCredentialAwarded": "Yoga Alliance 200 Hour Certification",
          "courseMode": "Online & Offline",
          "description": "Join the 200 Hour Yoga Teacher Training in Jaipur, India starting September 15, 2026. 45-day immersive batch with orientation on September 10, 2026, flexible timings, and Yoga Alliance certification."
        })}
      </script>
    </section>
  );
}
