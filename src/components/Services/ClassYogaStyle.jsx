import React from "react";
import { useNavigate } from "react-router-dom";
import "./ClassYogaStyle.css";

const yogaStyles = [
  {
    title: "Hatha Yoga",
    description:
      "Traditional yoga focusing on basic postures and breathing techniques. Perfect for beginners.",
    image: "/images/hatha.jpg"
  },
  {
    title: "Vinyasa Yoga",
    description:
      "Dynamic style linking breath with movement. Ideal for energetic practice and endurance.",
  },
  {
    title: "Iyengar Yoga",
    description:
      "Emphasizes alignment and precision using props. Great for posture and physical issues.",
  },
  {
    title: "Ashtanga Yoga",
    description:
      "Structured sequence synchronized with breath. Builds strength, flexibility, and focus.",
  },
  {
    title: "Power Yoga",
    description:
      "Vigorous fitness-based approach to Vinyasa. High-energy workout for strength and stamina.",
  },
  {
    title: "Pregnancy Yoga",
    description:
      "Safe postures and breathing for expecting mothers. Supports body during and after pregnancy.",
  },
  {
    title: "Therapy Yoga",
    description:
      "Tailored sessions to alleviate ailments like back pain, arthritis, and stress.",
  },
  {
    title: "Aerial Yoga",
    description:
      "Uses suspended hammocks for poses and inversions. Enhances flexibility and core strength.",
  },
];

const YogaStyles = () => {
  const navigate = useNavigate();

  const handleJoin = () => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/studentdashboard?tab=browseServices");
    } else {
      navigate(`/login?redirectTo=${encodeURIComponent("/studentdashboard?tab=browseServices")}`);
    }
  };

  return (
    <section className="yoga-section">
      <h2 className="section-title">Explore The Styles of Yoga</h2>
      <p className="section-sub">
        At Prasya Yoga Alliance, we offer a wide range of yoga styles tailored
        to suit your preferences and needs.
      </p>
      <div className="styles-grid">
        {yogaStyles.map((style, index) => (
          <div key={index} className="style-card">
            <h3 className="style-title">{style.title}</h3>
            <p className="style-desc">{style.description}</p>
          </div>
        ))}
      </div>
      <div className="cta">
        <button className="btn-primary" onClick={handleJoin}>Join Now</button>
        <button className="btn-secondary" onClick={handleJoin}>Learn More</button>
      </div>
    </section>
  );
};

export default YogaStyles;
