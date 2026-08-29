import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./TeacherTraining.module.css";

const TeacherTraining = () => {
  const navigate = useNavigate();

  const handleRegisterClick = () => {
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
    <section className={styles.section} id="teacher-training">
      <div className={styles.container}>
        <div className={styles.content}>
          <h2 className={styles.title}>200 Hours Yoga Teacher Training Course</h2>

          <p className={styles.desc}>
            Our <strong>200-Hour Yoga Teacher Training Course (YTTC)</strong> at Soma Wellness 
            is designed for those who wish to deepen their practice, gain a thorough understanding 
            of yoga philosophy, and embark on the journey of becoming a certified yoga teacher.
          </p>

          <p className={styles.desc}>
            This comprehensive course is <strong>Certified by Yoga Alliance</strong> — the most 
            recognizable organization of teachers in the world — ensuring that our graduates are 
            recognized globally and equipped with the knowledge and skills to teach yoga safely 
            and effectively.
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              onClick={handleRegisterClick}
              className={styles.btnPrimary}
            >
              Register →
            </button>
          </div>
        </div>

        <div className={styles.imageWrap}>
          <img 
            src="/images/services/YTTC.webp" 
            alt="Yoga Teacher Training Course at Soma Wellness" 
            loading="lazy"
            decoding="async" 
          />
        </div>
      </div>
    </section>
  );
};

export default TeacherTraining;