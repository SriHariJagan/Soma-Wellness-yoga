import { useEffect } from "react";

const SITE = {
  name: "SomaWellness",
  url: "https://somawellness.co.ke/",
  image: "https://somawellness.co.ke/images/soma/og-image.webp",
  locale: "en_KE",
};

const ROUTE_META = {
  "/": {
    title: "SomaWellness — Premium International Wellness | Movement · Restoration · Mindfulness",
    description: "SomaWellness is a premium international wellness brand offering mindful movement, restoration, breathwork, massage and holistic wellbeing for individuals and organizations.",
  },
  "/about": {
    title: "About SomaWellness — Premium International Wellness Brand",
    description: "SomaWellness brings together movement, restoration, mindfulness and holistic wellbeing in one calm, considered philosophy for body and mind.",
  },
  "/classes": {
    title: "Join SomaWellness — Wellness Memberships JUA AMANI UZIMA FAMILY",
    description: "Join SomaWellness: JUA 12K, AMANI 18.5K, UZIMA 28.5K, FAMILY 35K KES/month. Discovery 3K, passes, pay-ahead savings & SOMA DAILY included.",
  },
  "/private": {
    title: "Private Wellness Programs — One-to-One | SomaWellness",
    description: "Private wellness programs in Nairobi from 5,500 KES/session. Assessment 6,500 (75 min). 5/10 packs, couples & home visits.",
  },
  "/life-stages": {
    title: "Life Stages — Mama, Young, Age Well | SomaWellness",
    description: "SOMA MAMA pregnancy, MAMA+ postnatal, YOUNG 5-17, AGE WELL seniors — blocks of 4/8 from 7,000 KES. Spring Valley, Nairobi.",
  },
  "/restore": {
    title: "Restore — Massage, Mindfulness & Signature Journeys | SomaWellness",
    description: "Restore at SomaWellness: massage from 5,500, mindfulness 1,800, Stillness 11K, Acacia 18.5K, For Two 22.5K. Six-Week Reset 32K.",
  },
  "/yttc": {
    title: "SomaWellness Academy — Practitioner Training | Nairobi",
    description: "SomaWellness Academy Nairobi: Foundations 30K, 100h 85K, 200h 165K (early 145K). Corporate wellness from 18K. Spring Valley.",
  },
  "/faq": {
    title: "FAQ — SomaWellness Guide",
    description: "Clear guide to SomaWellness: memberships, private programs, mindfulness, pregnancy, children, seniors, massage, corporate & booking in Spring Valley.",
  },
  "/events": {
    title: "Gatherings — Wellness Experiences & Rituals | SomaWellness",
    description: "Signature experiences and wellness rituals at SomaWellness.",
  },
  "/contact": {
    title: "Contact SomaWellness — Spring Valley, Nairobi",
    description: "Contact SomaWellness in Spring Valley. Book private programs, restoration, massage or memberships. +254 700 000 000.",
  },
  "/login": { title: "Sign In — SomaWellness", description: "Sign in to your SomaWellness account." },
  "/newuser": { title: "Begin Your Wellness Journey — Join SomaWellness", description: "Create your SomaWellness account." },
  "/forgot-password": { title: "Reset Password — SomaWellness", description: "Reset your password." },
  "/reset-password": { title: "Set New Password — SomaWellness", description: "Set a new password." },
  "/payment": { title: "Secure Payment — SomaWellness", description: "Secure payment via card & M-Pesa." },
};

const PATH_TO_SEO_KEY = {
  "/": "home",
  "/about": "about",
  "/classes": "join",
  "/private": "private",
  "/life-stages": "lifeStages",
  "/restore": "restore",
  "/yttc": "yttc",
  "/faq": "faq",
  "/contact": "contact",
};

export const getLocalizedMeta = (path, t) => {
  const key = PATH_TO_SEO_KEY[path];
  if (key && t) {
    const title = t(`seo.${key}Title`, { defaultValue: ROUTE_META[path]?.title });
    const description = t(`seo.${key}Desc`, { defaultValue: ROUTE_META[path]?.description });
    if (title !== `seo.${key}Title`) return { title, description };
  }
  return ROUTE_META[path] || ROUTE_META["/"];
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
  // hreflang for bilingual SEO
  const setHreflang = (lang, href) => {
    let el = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
    if (!el) { el = document.createElement("link"); el.setAttribute("rel", "alternate"); el.setAttribute("hreflang", lang); document.head.appendChild(el); }
    el.setAttribute("href", href);
  };
  const base = SITE.url.replace(/\/$/, "");
  const path = window.location.pathname;
  setHreflang("en", base + path);
  setHreflang("sw", base + path + (path.includes("?") ? "&" : "?") + "lang=sw");
  setHreflang("x-default", base + path);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
  canonical.setAttribute("href", SITE.url + window.location.pathname.replace(/^\//, ""));
  // update html lang if i18n present
  try {
    const lng = document.documentElement.lang || "en";
    setProp("og:locale", lng === "sw" ? "sw_KE" : "en_KE");
  } catch {}
};

const usePageMeta = (meta) => {
  useEffect(() => { applyMeta(meta); }, [meta?.title, meta?.description]);
};

export { SITE, ROUTE_META, applyMeta, usePageMeta, PATH_TO_SEO_KEY };
