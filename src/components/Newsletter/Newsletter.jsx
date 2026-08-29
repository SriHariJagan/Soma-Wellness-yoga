import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import "./Newsletter.css";

const Newsletter = () => {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const email = e.target.newsletterEmail.value;

    if (email) {
      setMessage(t("newsletter.success"));
      e.target.reset();
    } else {
      setMessage(t("newsletter.invalidEmail"));
    }
  };

  return (
    <section className="newsletter" id="join-community">
      <div className="newsletter-container">
        <h2 className="newsletter-title">{t("newsletter.title")}</h2>
        <p className="newsletter-subtitle">
          {t("newsletter.desc")}
        </p>

        <form className="newsletter-form" onSubmit={handleSubmit}>
          <input
            type="email"
            id="newsletterEmail"
            name="newsletterEmail"
            placeholder={t("newsletter.placeholder")}
            required
          />
          <button type="submit" className="newsletter-btn">
            {t("newsletter.subscribe")}
          </button>
        </form>

        <p className="newsletter-message">{message}</p>
      </div>
    </section>
  );
};

export default Newsletter;
