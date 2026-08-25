// ─────────────────────────────────────────────────────────
// siteContent.js — SOMA WELLNESS NAIROBI — Centralised content
// Spring Valley, Nairobi, Kenya — Yoga · Therapy · Meditation · Wellness
// ─────────────────────────────────────────────────────────

export const SOMA_NAV = [
  { label: "Join", path: "/classes" },
  { label: "Private", path: "/private" },
  { label: "Life Stages", path: "/life-stages" },
  { label: "Restore", path: "/restore" },
  { label: "Academy", path: "/yttc" },
  { label: "FAQ", path: "/faq" },
];

export const HERO_FLOATING_CARDS = [
  { icon: "medal", title: "Spring Valley, Nairobi", subtitle: "Integrated Wellness Center" },
  { icon: "om", title: "300 Members, One Home", subtitle: "Yoga · Therapy · Meditation" },
  { icon: "lotus", title: "Rebalance · Renew · Restore", subtitle: "Body · Breath · Mind" },
];

export const SOMA_METHOD = [
  { num: "01", word: "Breathe", desc: "Pranayama and mindful breath to soften the nervous system and restore calm." },
  { num: "02", word: "Move", desc: "Intelligent movement — strength with grace, flexibility with awareness." },
  { num: "03", word: "Rest", desc: "Deep restoration. Yoga Nidra, meditation and stillness to integrate and heal." },
  { num: "04", word: "Reconnect", desc: "To self, to community, to life. Wellness that extends beyond the mat." },
];

export const SOMA_EXPERIENCES = [
  { id: "01", title: "Join", subtitle: "Memberships · Passes · Daily", desc: "Practise regularly with JUA, AMANI, UZIMA or FAMILY — from 12,000 KES/month. 300 members, never crowded.", image: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1200&auto=format&fit=crop", href: "/classes" },
  { id: "02", title: "Private", subtitle: "One-to-One · Therapy", desc: "Personal yoga and yoga therapy — 5,500 KES/session, assessment 6,500. Same rates, true personal attention.", image: "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=1200&auto=format&fit=crop", href: "/private" },
  { id: "03", title: "Restore", subtitle: "Massage · Meditation · Rituals", desc: "Signature experiences from 1,800 — massage, meditation, Stillness & Acacia journeys for deep renewal.", image: "https://images.unsplash.com/photo-1600334089648-bd6e2a7a65a8?q=80&w=1200&auto=format&fit=crop", href: "/restore" },
  { id: "04", title: "Life Stages", subtitle: "Mama · Young · Age Well", desc: "Pregnancy, postnatal, children 5-17, seniors — blocks from 7,000. Grouped by age, held with care.", image: "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?q=80&w=1200&auto=format&fit=crop", href: "/life-stages" },
];

// Nairobi membership tiers (KES, VAT included)
export const MEMBERSHIPS = [
  { name: "SOMA JUA", sub: "Move · Energise · Shine", price: "12,000", per: "a month", features: ["8 group yoga classes a month", "Member rates on everything else"], accent: false },
  { name: "SOMA AMANI", sub: "Move into balance", price: "18,500", per: "a month", features: ["Unlimited group yoga", "Meditation and breathwork", "SOMA DAILY included", "Member rates on everything else"], accent: false },
  { name: "SOMA UZIMA", sub: "Yoga and recovery, complete", price: "28,500", per: "a month", badge: "BEST VALUE", features: ["Unlimited yoga and meditation", "SOMA DAILY included", "2 sixty-minute massages", "1 private yoga or therapy session", "Priority booking · 2 guest passes", "15% off everything else"], accent: true },
  { name: "SOMA FAMILY", sub: "One household, one plan", price: "35,000", per: "a month", features: ["2 adults, unlimited yoga", "1 children's or teen programme", "Meditation and breathwork", "SOMA DAILY included", "10% off everything else"], accent: false },
];

export const MEMBERSHIP_PAY_AHEAD = [
  { label: "Monthly —", jua: "12,000", amani: "18,500", uzima: "28,500", family: "35,000", note: "" },
  { label: "3 months 10%", jua: "32,000", amani: "49,500", uzima: "76,500", family: "94,500", note: "save 10%" },
  { label: "6 months 15%", jua: "61,000", amani: "94,000", uzima: "145,000", family: "178,500", note: "save 15%" },
  { label: "12 months 25%", jua: "108,000", amani: "166,500", uzima: "256,500", family: "315,000", note: "save 25%" },
];

export const FOUNDING_RATES = [
  { tier: "SOMA JUA", founding: "10,000", normal: "12,000", save: "17%" },
  { tier: "SOMA AMANI", founding: "15,000", normal: "18,500", save: "19%" },
  { tier: "SOMA UZIMA", founding: "24,000", normal: "28,500", save: "16%" },
  { tier: "SOMA FAMILY", founding: "28,500", normal: "35,000", save: "19%" },
];

export const SOMA_DAILY = {
  title: "SOMA DAILY",
  sub: "Practice beyond the mat",
  monthly: "1,500",
  yearly: "15,000",
  note: "Two months free",
  bullets: [
    "A weekly podcast episode from our teachers",
    "A short reflection or thought each morning",
    "A new guided audio practice every month — breath, rest, meditation",
    "Seasonal reading and practice notes",
    "All of it in one place, whenever you want it",
  ],
  included: "Included at no extra cost with SOMA AMANI, SOMA UZIMA and SOMA FAMILY. Available on its own to anyone, anywhere — you do not need to live in Nairobi or ever visit the centre.",
};

export const PRIVATE_RATES = [
  { service: "Therapy assessment — needed before any therapy programme", len: "75 min", price: "6,500" },
  { service: "Single session — private yoga or therapy", len: "60 min", price: "5,500" },
  { service: "5 sessions", len: "5 × 60 min", price: "25,000" },
  { service: "10 sessions", len: "10 × 60 min", price: "46,000" },
  { service: "Two people together", len: "60 min", price: "8,000" },
  { service: "Small group, 3 to 5 people", len: "60 min", price: "9,500" },
  { service: "At your home or hotel", len: "60 min", price: "from 9,500" },
];

export const LIFE_STAGES = [
  { name: "SOMA MAMA", for: "Pregnancy", four: "12,000", eight: "22,000" },
  { name: "SOMA MAMA+", for: "After birth", four: "11,500", eight: "21,000" },
  { name: "SOMA YOUNG", for: "Children and teenagers, 5 to 17", four: "7,000", eight: "12,000" },
  { name: "SOMA AGE WELL", for: "Seniors", four: "7,000", eight: "12,000" },
];

export const RESTORE_TREATMENTS = [
  { name: "Relaxation massage", len: "60 min", price: "5,500" },
  { name: "Aromatherapy massage", len: "60 min", price: "6,000" },
  { name: "Deep tissue or sports massage", len: "60 min", price: "6,500" },
  { name: "Short treatment — head and shoulders, or feet", len: "30 min", price: "3,000" },
  { name: "Body scrub", len: "45 min", price: "4,000" },
  { name: "Meditation, breathwork or Yoga Nidra class", len: "45 min", price: "1,800" },
];

export const SIGNATURE_EXPERIENCES = [
  { name: "STILLNESS", sub: "The deep calm ritual", desc: "Restorative yoga, guided meditation, a 60-minute relaxation massage and herbal tea", len: "2 hrs", price: "11,000" },
  { name: "THE ACACIA", sub: "Our premium journey", desc: "Private yoga, meditation, a 60-minute massage, a body treatment, refreshments and unhurried rest", len: "2.5 hrs", price: "18,500" },
  { name: "FOR TWO", sub: "A journey for two", desc: "Couple yoga or guided stretching, massage for two, herbal tea and quiet time together", len: "2 hrs", price: "22,500", per: "per couple" },
];

export const ACADEMY = [
  { name: "Yoga Foundations", len: "25 hours", price: "30,000" },
  { name: "SOMA 100 — Foundation Teacher Course", len: "100 hours", price: "85,000" },
  { name: "SOMA 200 — Yoga Teacher Training", len: "200 hours", price: "165,000", note: "Early enrolment 145,000. Instalments available." },
];

export const CORPORATE = [
  { name: "Single session", desc: "60 minutes of yoga and mobility at your offices, up to 20 people", price: "18,000" },
  { name: "Monthly programme", desc: "4 or 8 sessions a month at your offices", price: "65,000 / 120,000" },
  { name: "Wellness day", desc: "Half or full day, at SOMA or at your offices", price: "from 150,000" },
  { name: "Annual contract", desc: "Weekly sessions, a workshop each quarter, member rates for your staff", price: "from 600,000" },
];

export const SOMA_TESTIMONIALS = [
  { quote: "SOMA doesn’t feel like a studio. It feels like coming home to my body. The light, the teachers, the way every detail is considered — it’s rare.", name: "Amina K.", role: "AMANI member · Nairobi", avatar: "AK" },
  { quote: "I came for flexibility, I stayed for stillness. The breathwork sessions have changed how I move through my days.", name: "James M.", role: "UZIMA member · Spring Valley", avatar: "JM" },
  { quote: "The most intentional space I’ve practiced in. No performative wellness, just honest practice with incredible teachers.", name: "Sara N.", role: "Teacher Training Graduate", avatar: "SN" },
];

export const SOMA_JOURNAL = [
  { category: "Practice", title: "The art of conscious rest", excerpt: "Why rest is not the absence of doing, but a skill to cultivate.", image: "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?q=80&w=800&auto=format&fit=crop" },
  { category: "Breath", title: "Listening to the inhale", excerpt: "A simple three-part practice to return to your breath.", image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?q=80&w=800&auto=format&fit=crop" },
  { category: "Ritual", title: "Morning light, morning body", excerpt: "Designing a morning ritual that actually holds you.", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop" },
];

// FAQ — Nairobi structured
export const FAQ_ITEMS = [
  { q: "What is SOMA Wellness?", a: "SOMA Wellness is a holistic yoga and wellness centre in Spring Valley, Nairobi — an integrated destination for physical health, mental well-being, relaxation and balanced living. We bring together Yoga, Yoga Therapy, Meditation, Breathwork, Massage, Wellness Therapies and mindful lifestyle practices in a calm, welcoming environment. Our approach treats body, breath and mind as one whole — not just fitness." },
  { q: "Where are you located?", a: "Spring Valley, Nairobi, Kenya — a peaceful wellness space that feels away from a conventional gym or clinic, yet conveniently accessible within Nairobi. Full address: Spring Valley, Nairobi, Kenya." },
  { q: "What services do you offer?", a: "Group & Private Yoga, Yoga Therapy, Meditation & Breathwork, Stress Management, Massage & Steam/Wellness Rituals, Prenatal & Postnatal, Children's & Senior Yoga, Corporate Wellness, Consultations, Workshops & Retreats, Teacher Training and Integrated Wellness Packages. Services roll out in phases as the centre grows." },
  { q: "Do I need yoga experience?", a: "Not at all. Beginners are welcome. Our teachers guide you by ability, flexibility, age and experience. You don’t need to be flexible to start — yoga helps you build flexibility, strength and awareness gradually." },
  { q: "What is Yoga Therapy?", a: "An individualized application of yoga — modified postures, supported movement, breathing, relaxation, meditation and lifestyle guidance tailored to your needs, limitations and goals. Useful for stiffness, postural issues, stress, reduced mobility or musculoskeletal discomfort. It complements medical care, not replaces it." },
  { q: "Are private sessions available?", a: "Yes. One-to-one private yoga and therapy for beginners, busy professionals, older adults, those recovering mobility, therapy clients or anyone preferring privacy and personal guidance. Couple / small private groups also available." },
  { q: "Do you offer prenatal and postnatal yoga?", a: "Yes — specialized Prenatal and Postnatal programmes with modified practices. Prenatal focuses on gentle movement, breathing and relaxation; Postnatal supports gradual recovery and reconnection. Medical clearance may be requested." },
  { q: "Do you have programmes for children and seniors?", a: "Yes. Children: playful, age-appropriate postures, breathing, balance, concentration and mindfulness (5-17). Seniors: gentle, chair-supported yoga, assisted stretching, balance, breathing and meditation — emphasis on safety, comfort and independence." },
  { q: "Can I combine yoga, massage and meditation in one package?", a: "Absolutely — that’s the SOMA idea. Choose integrated journeys: Deep Relaxation, Stress Management, Rejuvenation, Body Recovery, Mind-Body Balance, Personal/Couple/Corporate Wellness. Our team will recommend the right combination for your goals and time." },
  { q: "How do I book?", a: "Phone, email, website or reception at Spring Valley. Advance booking recommended for private, therapy, massage, consultations and signature experiences. General groups ~60 min; meditation 30-60 min; therapies per treatment; packages per combination." },
  { q: "What should I wear / bring?", a: "Comfortable, breathable clothing that allows movement. Avoid heavy meals 2-3 hours before. We provide mats, blocks, belts, bolsters, blankets, chairs and props — or bring your own mat if you prefer." },
];
