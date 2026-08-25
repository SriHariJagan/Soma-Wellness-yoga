import React from 'react';
import './Studio.css';

const StudioSection = () => {
  return (
    <section className="studio-section">
      <div className="studio-content">
        <p className="sec-label">Studio Environment</p>
        <h2 className="sec-title">An overview of our studio facilities</h2>
        <div className="divider">
          <span className="divider-line" />
          <span className="divider-dot" />
          <span className="divider-line" />
        </div>
        <p className="sec-text">
          We pride ourselves on creating a tranquil and welcoming environment that sets the stage
          for a truly transformative yoga experience. Our studio is thoughtfully designed with
          spacious practice areas, natural lighting, and serene décor that fosters a sense of peace
          and relaxation.
        </p>
        <p className="sec-text">
          We offer state-of-the-art facilities, including high-quality yoga mats and props, to
          support your practice. What sets us apart is our commitment to building a community where
          everyone feels supported and inspired, whether you are a beginner or an experienced
          practitioner.
        </p>
      </div>

      <div className="studio-image">
        <img src="/images/services/studio.webp" alt="Yoga Studio Environment" width="1280" height="452" loading="lazy" decoding="async" />
      </div>
    </section>
  );
};

export default StudioSection;
