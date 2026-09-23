// ============================================================
// server/config/publicCatalog.js
// Single source of truth: ONLY these services/offerings may exist
// anywhere in the app. Boot seed and seed-offerings enforce a
// whitelist — anything else is deleted from the DB.
// ============================================================

const OFFERING_BY_SERVICE_CATEGORY = {
  Group: "group_yoga",
  Membership: "membership",
  Personal: "personal_training",
  "Personal Training": "personal_training",
  Meditation: "meditation",
  Corporate: "corporate",
  Therapy: "therapy",
  Mama: "mama",
  Academy: "academy",
  Specialty: "group_yoga",
  General: "group_yoga",
};

export function offeringCategoryFor(serviceCategory) {
  return OFFERING_BY_SERVICE_CATEGORY[serviceCategory] || "group_yoga";
}

const item = (data) => ({
  status: "available",
  visibility: "public",
  bookingEnabled: true,
  active: true,
  mode: "center",
  featured: false,
  isPopular: false,
  tags: [],
  ...data,
});

// ── The complete public catalog (17 items) ──────────────────
export const PUBLIC_CATALOG = [
  // Group Yoga
  item({
    name: "Single Class",
    subtitle: "One group yoga class — 60 min",
    description:
      "Experience a single group yoga class at SOMA Wellness. Perfect for trying us out or for occasional practitioners.",
    category: "group_yoga",
    serviceCategory: "Group",
    serviceType: "Drop-in",
    price: 2000,
    pricingModel: "per_session",
    sessions: 1,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "single",
    whatIncluded: [
      "One group yoga class",
      "Suitable for all experience levels",
      "Mindful wellness experience",
    ],
    benefits: [
      "Flexible scheduling",
      "Small group setting",
      "Expert instruction",
    ],
    tags: ["single", "drop-in", "group"],
    isPopular: true,
    bookingEnabled: false,
    displayOrder: 1,
  }),
  item({
    name: "SOMA JUA – 10-Class Pass",
    subtitle: "10 group yoga classes",
    description:
      "A package of 10 group yoga classes. Ideal for regular practitioners who want flexibility without a monthly commitment.",
    category: "group_yoga",
    serviceCategory: "Group",
    serviceType: "Pass",
    price: 11500,
    pricingModel: "flat",
    sessions: 10,
    sessionDuration: 60,
    validityDuration: 3,
    validityUnit: "months",
    whatIncluded: [
      "10 group yoga classes",
      "Access to all group class times",
      "Beginner-friendly environment",
    ],
    benefits: [
      "Save compared to single classes",
      "Flexible scheduling",
      "Valid for 3 months",
    ],
    tags: ["pass", "10-class", "group"],
    bookingEnabled: false,
    displayOrder: 2,
  }),

  // Private Yoga
  item({
    name: "One-to-One Yoga",
    subtitle: "60 minutes",
    description:
      "Personalized one-on-one yoga session tailored to your goals, level, and needs.",
    category: "personal_training",
    serviceCategory: "Personal",
    serviceType: "One-to-One",
    price: 4500,
    pricingModel: "per_session",
    sessions: 1,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "single",
    whatIncluded: [
      "60-minute private session",
      "Personalized sequence",
      "Props and adjustments",
    ],
    benefits: [
      "Personalized instruction",
      "Pace that suits you",
      "Focus on your goals",
      "Confidential setting",
    ],
    tags: ["private", "one-on-one"],
    isPopular: true,
    displayOrder: 10,
  }),
  item({
    name: "Couple Yoga",
    subtitle: "60 minutes",
    description:
      "A private yoga session designed for two. Build connection and practice together with a dedicated instructor.",
    category: "personal_training",
    serviceCategory: "Personal",
    serviceType: "Duet",
    price: 6500,
    pricingModel: "per_session",
    sessions: 1,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "single",
    whatIncluded: [
      "60-minute private session for two",
      "Synchronized sequences",
      "Partner poses and adjustments",
    ],
    benefits: [
      "Shared experience",
      "Build connection",
      "Synchronized practice",
    ],
    tags: ["private", "couple"],
    displayOrder: 11,
  }),
  item({
    name: "5 Private Sessions",
    subtitle: "5 × 60 minutes",
    description:
      "A package of five private one-on-one sessions. Build a consistent practice with personalized guidance.",
    category: "personal_training",
    serviceCategory: "Personal",
    serviceType: "Package",
    price: 21000,
    pricingModel: "flat",
    sessions: 5,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "sessions",
    whatIncluded: [
      "5 × 60-minute private sessions",
      "Personalized progression plan",
      "Props and adjustments",
    ],
    benefits: [
      "Structured progression",
      "Consistent practice",
      "Better value than single",
    ],
    tags: ["private", "pack", "5-sessions"],
    displayOrder: 12,
  }),
  item({
    name: "5 Couple Yoga Sessions",
    subtitle: "5 × 60 minutes",
    description:
      "Five private couple yoga sessions. Deepen your practice together with a dedicated instructor.",
    category: "personal_training",
    serviceCategory: "Personal",
    serviceType: "Package",
    price: 30500,
    pricingModel: "flat",
    sessions: 5,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "sessions",
    whatIncluded: [
      "5 × 60-minute sessions for two",
      "Synchronized sequences",
      "Partner poses",
    ],
    benefits: ["Shared journey", "Deeper connection", "Structured practice"],
    tags: ["private", "couple", "pack", "5-sessions"],
    displayOrder: 13,
  }),
  item({
    name: "10 Private Sessions",
    subtitle: "10 × 60 minutes",
    description:
      "Ten private one-on-one sessions for dedicated practitioners seeking significant progress.",
    category: "personal_training",
    serviceCategory: "Personal",
    serviceType: "Package",
    price: 40000,
    pricingModel: "flat",
    sessions: 10,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "sessions",
    whatIncluded: [
      "10 × 60-minute private sessions",
      "Personalized progression plan",
      "Props and adjustments",
    ],
    benefits: [
      "Maximum personal attention",
      "Significant progress",
      "Best per-session value",
    ],
    tags: ["private", "pack", "10-sessions"],
    displayOrder: 14,
  }),
  item({
    name: "10 Couple Yoga Sessions",
    subtitle: "10 × 60 minutes",
    description:
      "Ten private couple yoga sessions. A transformative journey for two.",
    category: "personal_training",
    serviceCategory: "Personal",
    serviceType: "Package",
    price: 58000,
    pricingModel: "flat",
    sessions: 10,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "sessions",
    whatIncluded: [
      "10 × 60-minute sessions for two",
      "Synchronized sequences",
      "Partner poses",
    ],
    benefits: ["Transformative journey", "Deeper bond", "Best couple value"],
    tags: ["private", "couple", "pack", "10-sessions"],
    displayOrder: 15,
  }),

  // Corporate Wellness
  item({
    name: "SOMA Work Well – Single",
    subtitle: "60-min onsite yoga or mobility, up to ~20 participants",
    description:
      "Bring wellness to your workplace. A single 60-minute onsite yoga or mobility session for your team.",
    category: "corporate",
    serviceCategory: "Corporate",
    serviceType: "Corporate",
    mode: "hybrid",
    price: 13500,
    pricingModel: "per_session",
    sessions: 1,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "single",
    whatIncluded: [
      "60-minute onsite session",
      "Yoga or mobility format",
      "Up to ~20 participants",
    ],
    benefits: ["Team wellness", "No studio needed", "Flexible scheduling"],
    tags: ["corporate", "onsite", "single"],
    contactEmail: "hello@somawellness.co.ke",
    displayOrder: 20,
  }),
  item({
    name: "SOMA Work Well – Monthly",
    subtitle: "Four onsite sessions per month, same group",
    description:
      "Four onsite wellness sessions per month for your team. Regular workplace wellness programming with the same group.",
    category: "corporate",
    serviceCategory: "Corporate",
    serviceType: "Corporate",
    mode: "hybrid",
    price: 45000,
    pricingModel: "flat",
    sessions: 4,
    sessionDuration: 60,
    validityDuration: 1,
    validityUnit: "months",
    whatIncluded: [
      "4 onsite sessions per month",
      "Yoga or mobility format",
      "Up to ~20 participants per session",
    ],
    benefits: ["Regular wellness", "Team building", "Employee retention"],
    tags: ["corporate", "onsite", "monthly"],
    contactEmail: "hello@somawellness.co.ke",
    displayOrder: 21,
  }),

  // Yoga Therapy
  item({
    name: "Individual Session",
    subtitle: "Yoga therapy — 60 minutes",
    description:
      "Therapeutic yoga session addressing specific health concerns. Personalized healing through yoga.",
    category: "therapy",
    serviceCategory: "Therapy",
    serviceType: "Therapy",
    price: 5500,
    pricingModel: "per_session",
    sessions: 1,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "single",
    whatIncluded: [
      "Therapeutic assessment",
      "Personalized yoga sequence",
      "Home practice plan",
    ],
    benefits: ["Healing focused", "Personalized approach", "Expert guidance"],
    tags: ["therapy", "individual"],
    isPopular: true,
    displayOrder: 30,
  }),
  item({
    name: "5 Sessions",
    subtitle: "Yoga therapy — 5 sessions",
    description:
      "A five-session yoga therapy program. Structured healing with progressive therapeutic sequences.",
    category: "therapy",
    serviceCategory: "Therapy",
    serviceType: "Package",
    price: 25000,
    pricingModel: "flat",
    sessions: 5,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "sessions",
    whatIncluded: [
      "5 therapeutic sessions",
      "Progressive treatment plan",
      "Home practice guidance",
    ],
    benefits: ["Structured healing", "Progressive improvement", "Better value"],
    tags: ["therapy", "pack", "5-sessions"],
    displayOrder: 31,
  }),
  item({
    name: "10 Sessions",
    subtitle: "Yoga therapy — 10 sessions",
    description:
      "Ten-session yoga therapy program for comprehensive healing and transformation.",
    category: "therapy",
    serviceCategory: "Therapy",
    serviceType: "Package",
    price: 45000,
    pricingModel: "flat",
    sessions: 10,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "sessions",
    whatIncluded: [
      "10 therapeutic sessions",
      "Comprehensive treatment plan",
      "Home practice guidance",
    ],
    benefits: [
      "Deep transformation",
      "Long-term healing",
      "Best therapy value",
    ],
    tags: ["therapy", "pack", "10-sessions"],
    displayOrder: 32,
  }),

  // SOMA MAMA
  item({
    name: "Prenatal Yoga & Wellness",
    subtitle: "Individual session",
    description:
      "Safe, nurturing yoga for expectant mothers. Gentle movement, breathwork, and relaxation.",
    category: "mama",
    serviceCategory: "Mama",
    serviceType: "Pregnancy",
    price: 5500,
    pricingModel: "per_session",
    sessions: 1,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "single",
    whatIncluded: [
      "Prenatal yoga session",
      "Safe modifications",
      "Breathwork for labor",
    ],
    benefits: ["Safe for pregnancy", "Reduce discomfort", "Prepare for birth"],
    tags: ["prenatal", "mama"],
    isPopular: true,
    displayOrder: 40,
  }),
  item({
    name: "Prenatal – 5 Sessions",
    subtitle: "5 prenatal sessions",
    description:
      "Five prenatal yoga sessions. Consistent support throughout your pregnancy journey.",
    category: "mama",
    serviceCategory: "Mama",
    serviceType: "Package",
    price: 25000,
    pricingModel: "flat",
    sessions: 5,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "sessions",
    whatIncluded: [
      "5 prenatal yoga sessions",
      "Safe modifications",
      "Breathwork for labor",
    ],
    benefits: ["Consistent support", "Progressive practice", "Better value"],
    tags: ["prenatal", "mama", "pack", "5-sessions"],
    displayOrder: 41,
  }),
  item({
    name: "Prenatal – 10 Sessions",
    subtitle: "10 prenatal sessions",
    description:
      "Ten prenatal yoga sessions for comprehensive support throughout your pregnancy.",
    category: "mama",
    serviceCategory: "Mama",
    serviceType: "Package",
    price: 45000,
    pricingModel: "flat",
    sessions: 10,
    sessionDuration: 60,
    validityDuration: 0,
    validityUnit: "sessions",
    whatIncluded: [
      "10 prenatal yoga sessions",
      "Safe modifications",
      "Breathwork for labor",
    ],
    benefits: ["Full pregnancy support", "Deep preparation", "Best value"],
    tags: ["prenatal", "mama", "pack", "10-sessions"],
    displayOrder: 42,
  }),

  // SOMA Academy
  item({
    name: "SOMA 200 Yoga Teacher Training",
    subtitle: "200-hour yoga teacher training",
    description:
      "Our comprehensive 200-hour yoga teacher training. Transform your practice and become a certified yoga instructor.",
    category: "academy",
    serviceCategory: "Academy",
    serviceType: "Course",
    mode: "hybrid",
    price: 130000,
    pricingModel: "flat",
    sessions: 0,
    sessionDuration: 60,
    validityDuration: 6,
    validityUnit: "months",
    whatIncluded: [
      "200 hours of training",
      "Yoga philosophy",
      "Anatomy & physiology",
      "Teaching methodology",
      "Practicum",
      "Certification",
    ],
    benefits: [
      "RYT-200 eligible",
      "Expert faculty",
      "Comprehensive curriculum",
    ],
    tags: ["academy", "yttc", "teacher-training"],
    featured: true,
    isPopular: true,
    bookingEnabled: false,
    displayOrder: 50,
  }),
];

export const PUBLIC_SERVICE_NAMES = PUBLIC_CATALOG.map((x) => x.name);

// Everything that has ever been in the catalog but is NOT in the
// whitelist above — deleted on seed and on every boot.
export const RETIRED_SERVICE_NAMES = [
  // Old official SOMA_SERVICES set
  "SOMA Discovery",
  "SOMA AMANI",
  "SOMA UZIMA",
  "SOMA FAMILY",
  "5-Class Pass",
  "10-Class Pass",
  "SOMA — 5-Class Pass",
  "SOMA JUA — 10-Class Pass",
  "Therapy Assessment",
  "Single Private Session",
  "5-Session Package",
  "10-Session Package",
  "Two People Together",
  "Small Group (3–5)",
  "Home / Hotel Session",
  "SOMA MAMA — 4 Sessions",
  "SOMA MAMA — 8 Sessions",
  "SOMA MAMA+ — 4 Sessions",
  "SOMA MAMA+ — 8 Sessions",
  "SOMA YOUNG — 4 Sessions",
  "SOMA YOUNG — 8 Sessions",
  "SOMA AGE WELL — 4 Sessions",
  "SOMA AGE WELL — 8 Sessions",
  "Single Pregnancy Class",
  "Private Pregnancy Session",
  "School Holiday Camp — 3 Days",
  "School Holiday Camp — 5 Days",
  "Relaxation Massage",
  "Aromatherapy Massage",
  "Deep Tissue / Sports Massage",
  "Head & Shoulders / Feet Treatment",
  "Body Scrub",
  "Meditation / Breathwork / Yoga Nidra",
  "STILLNESS",
  "THE ACACIA",
  "FOR TWO",
  "SOMA RESET",
  "Yoga Foundations",
  "SOMA 100 — Foundation Teacher Course",
  "SOMA 200 — Yoga Teacher Training",
  "Corporate Single Session",
  "Corporate Monthly — 4 Sessions",
  "Corporate Monthly — 8 Sessions",
  "Corporate Wellness Day",
  "Corporate Annual Contract",
  "SOMA DAILY — Monthly",
  "SOMA DAILY — Annual",
  // Prior publicCatalog (membership / meditation / renamed corporate)
  "SOMA JUA",
  "SOMA AMANI — Monthly Pass",
  "SOMA AMANI — Six-Month Pass",
  "SOMA AMANI — Annual Pass",
  "SOMA 360",
  "SOMA FAMILY",
  "One-to-One Yoga, 60 min",
  "Couple Yoga, 60 min",
  "SOMA Work Well — Session",
  "SOMA Work Well — Monthly",
  "Individual Yoga Therapy",
  "Yoga Therapy — 5 Sessions",
  "Yoga Therapy — 10 Sessions",
  "Prenatal Yoga & Wellness — 5 Sessions",
  "Prenatal Yoga & Wellness — 10 Sessions",
  "Meditation Drop-In",
  "Pranayama & Meditation",
  "Yoga Nidra",
  "4-Session Meditation Program",
  "Private Meditation Session",
  "SOMA 200",
  // Very old legacy names
  "Offline Group Yoga",
  "Online Group Yoga",
  "Personal Yoga (Center)",
  "Personal Yoga (Home)",
  "Kids Yoga",
  "Pregnancy Yoga (Center)",
  "Pregnancy Yoga (Home)",
  "Yoga for Stress",
  "Corporate Yoga",
  "Advanced Yoga (Center)",
  "Therapy Yoga (Center)",
  "Therapy Yoga (Home)",
  "Abhyanga (Ayurvedic Massage)",
  "Shirodhara (Forehead Oil-Pulling Therapy)",
  "Yoga at Home",
];

export const RETIRED_OFFERING_NAMES = [
  "SOMA AMANI — The Peace Experience",
  "SOMA UZIMA — The Complete Wellness Journey",
  "SOMA NURU — Glow From Within",
  "SOMA NGUVU — Strength & Recovery",
  "SOMA UTULIVU — The Deep Calm Ritual",
  "SOMA RESET — The Mindful Body Reset",
  "SOMA 200",
  "SOMA Work Well — Single Session",
  "SOMA Work Well — Monthly (8 Sessions)",
  "SOMA Work Well — Wellness Day",
  "SOMA Work Well — Annual Contract",
  "SOMA Work Well — Session",
  "SOMA Work Well — Monthly",
];

// ── Shape helpers ───────────────────────────────────────────
export function toOfferingDoc(entry) {
  const { serviceCategory, serviceType, active, mode, contactEmail, ...rest } =
    entry;
  return {
    ...rest,
    currency: "KES",
    originalPrice: null,
    pricingModel: rest.pricingModel || "flat",
  };
}

export function toServiceDoc(entry) {
  const validityUnit =
    !entry.validityDuration ||
    entry.validityUnit === "single" ||
    entry.validityUnit === "sessions"
      ? "weeks"
      : entry.validityUnit;
  return {
    name: entry.name,
    subtitle: entry.subtitle || "",
    description: entry.description,
    category: entry.serviceCategory || "General",
    type: entry.serviceType || "",
    mode: entry.mode || "center",
    price: entry.price,
    pricingModel:
      entry.pricingModel === "monthly"
        ? "monthly"
        : entry.pricingModel === "per_session"
          ? "per_session"
          : entry.pricingModel === "contact"
            ? "contact"
            : "flat",
    totalSessions: entry.sessions || 0,
    sessionDuration: entry.sessionDuration || 60,
    validityDuration: entry.validityDuration || 0,
    validityUnit,
    scheduleDays: [],
    scheduleTime: "Flexible",
    contactEmail: entry.contactEmail || "",
    active: entry.active !== false,
    isPopular: !!entry.isPopular,
    featured: !!entry.featured,
    visibility: entry.visibility || "public",
    displayOrder: entry.displayOrder || 0,
    tags: entry.tags || [],
  };
}

export function offeringCategoryFromService(svc) {
  if (!svc) return "group_yoga";
  if (svc.offeringCategory) return svc.offeringCategory;
  return offeringCategoryFor(svc.category);
}
