import React from "react";
import "./Achievements.css";

const Achievements = () => {
  return (
    <section className="achievements-section">
      <div className="achievements-container">
        <div className="achievement">
          <i className="icon yoga-icon"></i>
          <p><strong>150,000+</strong> Lives Transformed Through Yoga</p>
        </div>
        <div className="achievement">
          <i className="icon spark-icon"></i>
          <p><strong>10 Years</strong> of Excellence in Yoga and Wellness</p>
        </div>
        <div className="achievement">
          <i className="icon trophy-icon"></i>
          <p><strong>75+</strong> National and International Awards</p>
        </div>
        <div className="achievement">
          <i className="icon globe-icon"></i>
          <p><strong>3,500+</strong> Workshops Conducted Globally</p>
        </div>
      </div>
    </section>
  );
};

export default Achievements;
