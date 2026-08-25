import { useEffect } from "react";

const SITE = {
  name: "Soma Wellness Nairobi",
  url: "https://somawellness.co.ke/",
  image: "https://somawellness.co.ke/images/soma/og-image.webp",
  locale: "en_KE",
};

const ROUTE_META = {
  "/": {
    title: "Soma Wellness Nairobi — Spring Valley | Yoga · Therapy · Meditation",
    description: "Integrated wellness in Spring Valley, Nairobi. Yoga, therapy, meditation, breathwork, massage & mindful living. Rebalance · Renew · Restore · Reconnect.",
  },
  "/about": {
    title: "About Soma Wellness Nairobi — Integrated Wellness Center",
    description: "SOMA Wellness Nairobi in Spring Valley — not a gym or spa, but a calm integrated home for body, breath and mind. Our holistic philosophy.",
  },
  "/classes": {
    title: "Join SOMA — Memberships JUA AMANI UZIMA FAMILY | Nairobi",
    description: "Join SOMA Nairobi: JUA 12K, AMANI 18.5K, UZIMA 28.5K, FAMILY 35K KES/month. Discovery 3K, passes, pay-ahead savings & SOMA DAILY included.",
  },
  "/private": {
    title: "Private Yoga & Yoga Therapy — One-to-One | Soma Nairobi",
    description: "Private yoga and therapy in Nairobi from 5,500 KES/session. Assessment 6,500 (75 min). 5/10 packs, couples & home visits.",
  },
  "/life-stages": {
    title: "Life Stages — Mama, Young, Age Well | Soma Nairobi",
    description: "SOMA MAMA pregnancy, MAMA+ postnatal, YOUNG 5-17, AGE WELL seniors — blocks of 4/8 from 7,000 KES. Spring Valley, Nairobi.",
  },
  "/restore": {
    title: "Restore — Massage, Meditation & Signature Journeys | Soma Nairobi",
    description: "Restore at SOMA: massage from 5,500, meditation 1,800, Stillness 11K, Acacia 18.5K, For Two 22.5K. Six-Week Reset 32K.",
  },
  "/yttc": {
    title: "SOMA Academy — 25h, 100h, 200h Teacher Training | Nairobi",
    description: "SOMA Academy Nairobi: Foundations 30K, 100h 85K, 200h 165K (early 145K). Corporate wellness from 18K. Spring Valley.",
  },
  "/faq": {
    title: "FAQ — Soma Wellness Nairobi Guide",
    description: "Clear guide to SOMA Wellness Nairobi: memberships, therapy, meditation, prenatal, children, seniors, massage, corporate & booking in Spring Valley.",
  },
  "/events": {
    title: "Experiences — Restore & Wellness Rituals | Soma Nairobi",
    description: "Signature experiences and wellness rituals at SOMA Nairobi. Redirect to Restore.",
  },
  "/contact": {
    title: "Contact Soma Wellness Nairobi — Spring Valley",
    description: "Contact SOMA Wellness Nairobi in Spring Valley. Book private, therapy, massage or memberships. +254 700 000 000.",
  },
  "/books": {
    title: "Soma Wellness Nairobi — Home",
    description: "Soma Wellness Nairobi — holistic wellness in Spring Valley.",
  },
  "/bulk-orders": { title: "Soma Wellness Nairobi", description: "Soma Wellness Nairobi" },
  "/order-tracking": { title: "Track Your Order — Soma Wellness", description: "Track your order." },
  "/login": { title: "Sign In — Soma Wellness Nairobi", description: "Sign in to your SOMA Nairobi account." },
  "/newuser": { title: "Begin Your Journey — Join Soma Nairobi", description: "Create your SOMA Nairobi account." },
  "/forgot-password": { title: "Reset Password — Soma Nairobi", description: "Reset your password." },
  "/reset-password": { title: "Set New Password — Soma Nairobi", description: "Set a new password." },
  "/payment": { title: "Secure Payment — Soma Nairobi", description: "Secure payment via card & M-Pesa." },
  "/checkout": { title: "Checkout — Soma Nairobi", description: "Secure checkout." },
};

const applyMeta = ({ title, description }) => {
  document.title = title;
  const setMeta = (name, content) => {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
    el.setAttribute("content", content);
  };
  const setProp = (property, content) => {
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) { el = document.createElement("meta"); el.setAttribute("property", property); document.head.appendChild(el); }
    el.setAttribute("content", content);
  };
  setMeta("description", description);
  setProp("og:title", title);
  setProp("og:description", description);
  setProp("og:url", SITE.url + window.location.pathname.replace(/^\//, ""));
  setProp("twitter:title", title);
  setProp("twitter:description", description);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
  canonical.setAttribute("href", SITE.url + window.location.pathname.replace(/^\//, ""));
};

const usePageMeta = (meta) => {
  useEffect(() => { applyMeta(meta); }, [meta?.title, meta?.description]);
};

export { SITE, ROUTE_META, applyMeta, usePageMeta };
