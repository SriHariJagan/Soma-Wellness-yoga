import React, { useState } from "react";
import "./Newsletter.css";

const Newsletter = () => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = e.target.newsletterEmail.value;

    if (email) {
      setMessage("✨ You're subscribed! Welcome aboard.");
      e.target.reset();
    } else {
      setMessage("⚠️ Please enter a valid email.");
    }
  };

  return (
    <section className="newsletter" id="join-community">
      <div className="newsletter-container">
        <h2 className="newsletter-title">Join Our Community</h2>
        <p className="newsletter-subtitle">
          Get exclusive updates, insights, and offers directly to your inbox.
        </p>

        <form className="newsletter-form" onSubmit={handleSubmit}>
          <input
            type="email"
            id="newsletterEmail"
            name="newsletterEmail"
            placeholder="Your email address"
            required
          />
          <button type="submit" className="newsletter-btn">
            Subscribe
          </button>
        </form>

        <p className="newsletter-message">{message}</p>
      </div>
    </section>
  );
};

export default Newsletter;
