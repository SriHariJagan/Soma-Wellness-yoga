import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AboutPhilosophy.css';

const AboutSoma = ({ founderImage }) => {
  const navigate = useNavigate();

  const handleExploreJourney = () => {
    navigate('/?scrollTo=testimonials');
  };

  return (
    <section className="about-section">
      <div className="about-wrap">

        <div className="img-side">
          <div className="img-overlay">
            <div className="lotus-bg">
              <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="100" cy="100" r="90" stroke="#2E7D5B" strokeWidth="0.8"/>
                <circle cx="100" cy="100" r="65" stroke="#2E7D5B" strokeWidth="0.8"/>
                <circle cx="100" cy="100" r="40" stroke="#2E7D5B" strokeWidth="0.8"/>
                <circle cx="100" cy="100" r="18" fill="#2E7D5B" fillOpacity="0.3" stroke="#2E7D5B" strokeWidth="0.8"/>
                <ellipse cx="100" cy="45" rx="12" ry="26" fill="#2E7D5B" fillOpacity="0.25" stroke="#2E7D5B" strokeWidth="0.8"/>
                <ellipse cx="100" cy="155" rx="12" ry="26" fill="#2E7D5B" fillOpacity="0.25" stroke="#2E7D5B" strokeWidth="0.8"/>
                <ellipse cx="45" cy="100" rx="26" ry="12" fill="#2E7D5B" fillOpacity="0.25" stroke="#2E7D5B" strokeWidth="0.8"/>
                <ellipse cx="155" cy="100" rx="26" ry="12" fill="#2E7D5B" fillOpacity="0.25" stroke="#2E7D5B" strokeWidth="0.8"/>
                <ellipse cx="62" cy="62" rx="12" ry="26" transform="rotate(-45 62 62)" fill="#2E7D5B" fillOpacity="0.2" stroke="#2E7D5B" strokeWidth="0.8"/>
                <ellipse cx="138" cy="62" rx="12" ry="26" transform="rotate(45 138 62)" fill="#2E7D5B" fillOpacity="0.2" stroke="#2E7D5B" strokeWidth="0.8"/>
                <ellipse cx="62" cy="138" rx="12" ry="26" transform="rotate(45 62 138)" fill="#2E7D5B" fillOpacity="0.2" stroke="#2E7D5B" strokeWidth="0.8"/>
                <ellipse cx="138" cy="138" rx="12" ry="26" transform="rotate(-45 138 138)" fill="#2E7D5B" fillOpacity="0.2" stroke="#2E7D5B" strokeWidth="0.8"/>
              </svg>
            </div>

            <img src="/images/services/Aboutus.webp" alt="Dr. Kapil Dev Kesari" className="founder-img" width="1600" height="1135" loading="lazy" decoding="async" />
            <div className="founder-label">
              <div className="accent-bar" />
              <p className="founder-name">Dr. Kapil Dev Kesari</p>
              <p className="founder-title">Founder &amp; Director</p>
            </div>
          </div>
        </div>

        <div className="text-side">
          <p className="eyebrow">Our story</p>
          <h2 className="about-title">About Soma Wellness </h2>
          <div className="title-underline" />
          <p className="about-body">
            Soma Wellness was founded with a deep commitment to bringing the transformative power of yoga to individuals seeking holistic wellness.<br />
            Established by Dr. Kapil Dev Kesari, a renowned yoga and wellness expert with years of experience, our journey began with a simple yet profound vision: to make the ancient wisdom of yoga accessible to everyone, fostering a balanced and harmonious lifestyle.<br /><br />
            Dr. Kesari's extensive background in yoga and wellness, including his work with prestigious institutions like the Indian Yoga Association and Dev Sanskriti University, has been the foundation of Soma Wellness.<br />
            Under his guidance, we have developed a comprehensive approach to wellness that integrates traditional yoga practices with modern insights. Our mission is to empower individuals through yoga, pranayama, and meditation, helping them achieve physical, mental, and spiritual well-being.<br /> <br />
            At Soma Wellness, we believe in the transformative potential of yoga to enhance the quality of life.<br />
            We are dedicated to providing a nurturing environment where students can explore their inner selves and cultivate a sense of peace, strength, and clarity.<br />
            Join us in our mission to spread the benefits of yoga for holistic wellness, and be a part of our vibrant community committed to personal growth and collective harmony.
          </p>
          <div className="stats-row">
            <div className="stat">
              <span className="stat-num">20+</span>
              <span className="stat-label">Years of experience</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-num">5000+</span>
              <span className="stat-label">Students trained</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-num">6+</span>
              <span className="stat-label">Expert instructors</span>
            </div>
          </div>
          <button className="cta-btn" onClick={handleExploreJourney}>
            Explore our journey <span className="arrow">&#8594;</span>
          </button>
        </div>

      </div>
    </section>
  );
};

export default AboutSoma;
