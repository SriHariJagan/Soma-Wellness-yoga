import { useEffect } from "react";

const SITE = {
  name: "Soma Wellness",
  url: "https://somawellness.co.ke/",
  image: "https://somawellness.co.ke/images/soma/og-image.webp",
  locale: "en_KE",
};

const ROUTE_META = {
  "/": {
    title: "Soma Wellness — Premium International Wellness | Movement · Restoration · Mindfulness",
    description: "Soma Wellness is a premium international wellness brand offering mindful movement, restoration, breathwork, massage and holistic wellbeing for individuals and organizations.",
  },
  "/about": {
    title: "About Soma Wellness — Premium International Wellness Brand",
    description: "Soma Wellness brings together movement, restoration, mindfulness and holistic wellbeing in one calm, considered philosophy for body and mind.",
  },
  "/classes": {
    title: "Join Soma Wellness — Wellness Memberships JUA AMANI UZIMA FAMILY",
    description: "Join Soma Wellness: Group classes 2,000 KES; SOMA JUA – 10-Class Pass 11,500; Private Yoga 4,500; Couple Yoga 6,500; 5 Private Sessions 21,000; 5 Couple Yoga Sessions 30,500; 10 Private Sessions 40,000; 10 Couple Yoga Sessions 58,000; SOMA Work Well – Single 13,500; SOMA Work Well – Monthly 45,000; Yoga Therapy Individual 5,500; 5 Sessions 25,000; 10 Sessions 45,000; SOMA MAMA Prenatal 5,500; 5 Sessions 25,000; 10 Sessions 45,000; SOMA 200 Yoga Teacher Training 130,000. Corporate and prenatal options available.",
  },
  "/memberships": {
    title: "SOMA Wellness Circle — Annual Privilege Membership KES 36,500 | Soma Wellness",
    description: "Join the SOMA Wellness Circle: 1 year of wellness for KES 36,500 (just KES 100/day). 5% off regular-priced services, monthly reads, premium content, priority booking. Spring Valley, Nairobi.",
  },
  "/private": {
    title: "Private Wellness Programs — One-to-One | Soma Wellness",
    description: "Private wellness programs in Nairobi from 5,500 KES/session. Assessment 6,500 (75 min). 5/10 packs, couples & home visits.",
  },
  "/life-stages": {
    title: "Life Stages — Mama, Young, Age Well | Soma Wellness",
    description: "SOMA MAMA pregnancy, MAMA+ postnatal, YOUNG 5-17, AGE WELL seniors — blocks of 4/8 from 7,000 KES. Spring Valley, Nairobi.",
  },
  "/restore": {
    title: "Restore — Massage, Mindfulness & Signature Journeys | Soma Wellness",
    description: "Restore at Soma Wellness: massage from 5,500, mindfulness 1,800, Stillness 11K, Acacia 18.5K, For Two 22.5K. Six-Week Reset 32K.",
  },
  "/yttc": {
    title: "Soma Wellness Academy — Practitioner Training | Nairobi",
    description: "Soma Wellness Academy Nairobi: Foundations 30K, 100h 85K, 200h 165K (early 145K). Corporate wellness from 18K. Spring Valley.",
  },
  "/faq": {
    title: "FAQ — Soma Wellness Guide",
    description: "Clear guide to Soma Wellness: memberships, private programs, mindfulness, pregnancy, children, seniors, massage, corporate & booking in Spring Valley.",
  },
  "/events": {
    title: "Events — Wellness Experiences & Workshops | Soma Wellness",
    description: "Upcoming wellness events, workshops and gatherings at Soma Wellness, Spring Valley, Nairobi.",
  },
  "/services": {
    title: "Services — Group Yoga, Private Sessions, Therapy | Soma Wellness",
    description: "Explore Soma Wellness services: group yoga, private sessions, restorative therapy, corporate wellness and teacher training in Spring Valley, Nairobi.",
  },
  "/spa-rituals": {
    title: "Spa & Rituals — Massage, Meditation & Signature Journeys | Soma Wellness",
    description: "Restore at Soma Wellness: Single Session 2,000; 10-Class Pass 11,500; Private One-to-One 4,500; Couple Yoga 6,500; 5 Private Sessions 21,000; 5 Couple Yoga Sessions 30,500; 10 Private Sessions 40,000; 10 Couple Yoga Sessions 58,000; Yoga Therapy Individual 5,500; 5 Sessions 25,000; 10 Sessions 45,000; Prenatal Yoga 5,500; 5 Sessions 25,000; 10 Sessions 45,000; SOMA 200 Yoga Teacher Training 130,000. Enquire only. Offers at your offices.",
  },
  "/courses": {
    title: "Courses — 200-Hour Yoga Teacher Training | Soma Wellness Academy",
    description: "Yoga Alliance certified 200-Hour Teacher Training at Soma Wellness Academy. Online & offline modes, flexible schedule, global certification.",
  },
  "/blogs": {
    title: "Journal — Wellness Insights & Reflections | Soma Wellness",
    description: "Thoughts on practice, breath, rest, and the art of living well — from the Soma Wellness teachers and community.",
  },
  "/blogs/:id": {
    title: "Journal Article | Soma Wellness",
    description: "Read this story from the Soma Wellness journal — practice, breath, rest and living well.",
  },
  "/contact": {
    title: "Contact Soma Wellness — Spring Valley, Nairobi",
    description: "Contact Soma Wellness in Spring Valley. Book private programs, restoration, massage or memberships. +254 702 080 070.",
  },
  "/login": { title: "Sign In — Soma Wellness", description: "Sign in to your Soma Wellness account." },
  "/newuser": { title: "Begin Your Wellness Journey — Join Soma Wellness", description: "Create your Soma Wellness account." },
  "/forgot-password": { title: "Reset Password — Soma Wellness", description: "Reset your password." },
  "/reset-password": { title: "Set New Password — Soma Wellness", description: "Set a new password." },
  "/payment": { title: "Secure Payment — Soma Wellness", description: "Secure payment via card & M-Pesa." },
};

const PATH_TO_SEO_KEY = {
  "/": "home",
  "/about": "about",
  "/classes": "join",
  "/memberships": "memberships",
  "/private": "private",
  "/life-stages": "lifeStages",
  "/restore": "restore",
  "/yttc": "yttc",
  "/faq": "faq",
  "/contact": "contact",
  "/services": "services",
  "/spa-rituals": "spaRituals",
  "/courses": "courses",
  "/blogs": "blogs",
};

export const getLocalizedMeta = (path, t) => {
  const normalized = path.startsWith("/blogs/") ? "/blogs/:id" : path;
  const key = PATH_TO_SEO_KEY[normalized];
  if (key && t) {
    const title = t(`seo.${key}Title`, { defaultValue: ROUTE_META[normalized]?.title });
    const description = t(`seo.${key}Desc`, { defaultValue: ROUTE_META[normalized]?.description });
    if (title !== `seo.${key}Title`) return { title, description };
  }
  return ROUTE_META[normalized] || ROUTE_META["/"];
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
