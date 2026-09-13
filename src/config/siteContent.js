// ─────────────────────────────────────────────────────────
// siteContent.js — SomaWellness — Centralised content
// Spring Valley, Nairobi, Kenya — Movement · Restoration · Mindfulness · Wellbeing
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// Central contact + social config — UPDATE REAL VALUES HERE ONLY.
// Placeholders below; every page (Contact, Footer, Navbar, schema)
// reads from here so future edits need one change.
// ─────────────────────────────────────────────────────────
export const CONTACT_INFO = {
  address: "Spring Valley, Nairobi, Kenya — Integrated Wellness Center",
  phoneDisplay: "+254 700 000 000",
  phoneHref: "+254700000000",
  email: "hello@somawellness.co.ke",
  hours: "Mon – Sat · 6:00 AM – 8:00 PM",
  mapsQuery: "Spring Valley, Nairobi, Kenya",
};

export const SOCIAL_LINKS = [
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/somawellness/" },
  { key: "facebook", label: "Facebook", href: "https://www.facebook.com/somawellness" },
  { key: "youtube", label: "YouTube", href: "https://www.youtube.com/c/KapilKesari" },
  { key: "twitter", label: "Twitter/X", href: "https://twitter.com/SomaWellness" },
];

export const SOMA_NAV = [
  { label: "Join", path: "/classes" },
  { label: "One-to-One", path: "/private" },
  { label: "Life Stages", path: "/life-stages" },
  { label: "Restore", path: "/restore" },
  { label: "Learn & Partner", path: "/yttc" },
  { label: "Founding Members", path: "/founding" },
];

export const HERO_FLOATING_CARDS = [
  { icon: "medal", title: "Spring Valley, Nairobi", subtitle: "Integrated Wellness Center" },
  { icon: "om", title: "300 Members, One Home", subtitle: "Movement · Restoration · Mindfulness" },
  { icon: "lotus", title: "Rebalance · Renew · Restore", subtitle: "Body · Breath · Mind" },
];

export const SOMA_METHOD = [
  { num: "01", word: "Breathe", desc: "Pranayama and mindful breath to soften the nervous system and restore calm." },
  { num: "02", word: "Move", desc: "Intelligent movement — strength with grace, flexibility with awareness." },
  { num: "03", word: "Rest", desc: "Deep restoration. Guided deep rest, mindfulness and stillness to integrate and restore." },
  { num: "04", word: "Reconnect", desc: "To self, to community, to life. Wellness that extends beyond the mat." },
];

export const SOMA_EXPERIENCES = [
  { id: "01", title: "Join", subtitle: "Memberships · Passes · Daily", desc: "Practise regularly with JUA, AMANI, UZIMA or FAMILY — from 12,000 KES/month. 300 members, never crowded.", image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1200&auto=format&fit=crop", href: "/classes" },
  { id: "02", title: "Private", subtitle: "One-to-One · Therapy", desc: "Personal movement and restorative therapy — 5,500 KES/session, assessment 6,500. Same rates, true personal attention.", image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1200&auto=format&fit=crop", href: "/private" },
  { id: "03", title: "Restore", subtitle: "Massage · Meditation · Rituals", desc: "Signature experiences from 1,800 — massage, meditation, Stillness & Acacia journeys for deep renewal.", image: "https://images.unsplash.com/photo-1600334089648-bd6e2a7a65a8?q=80&w=1200&auto=format&fit=crop", href: "/restore" },
  { id: "04", title: "Life Stages", subtitle: "Mama · Young · Age Well", desc: "Pregnancy, postnatal, children 5-17, seniors — blocks from 7,000. Grouped by age, held with care.", image: "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?q=80&w=1200&auto=format&fit=crop", href: "/life-stages" },
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
  { name: "Monthly programme — 4 sessions", desc: "4 sessions a month at your offices", price: "65,000" },
  { name: "Monthly programme — 8 sessions", desc: "8 sessions a month at your offices", price: "120,000" },
  { name: "Wellness day", desc: "Half or full day, at SOMA or at your offices", price: "from 150,000" },
  { name: "Annual contract", desc: "Weekly sessions, a workshop each quarter, member rates for your staff", price: "from 600,000" },
];

export const SOMA_TESTIMONIALS = [
  { quote: "SOMA doesn’t feel like a studio. It feels like coming home to my body. The light, the teachers, the way every detail is considered — it’s rare.", name: "Amina K.", role: "AMANI member · Nairobi", avatar: "AK" },
  { quote: "I came for flexibility, I stayed for stillness. The breathwork sessions have changed how I move through my days.", name: "James M.", role: "UZIMA member · Spring Valley", avatar: "JM" },
  { quote: "The most intentional space I’ve practiced in. No performative wellness, just honest practice with incredible teachers.", name: "Sara N.", role: "Teacher Training Graduate", avatar: "SN" },
];

// ── Testimonial media (video / image) — matched by index to testimonials ──
// To add a real testimonial: paste a YouTube link and/or drop a JPG/PNG into
// public/images/testimonials/ and set image: "/images/testimonials/name.jpg".
// Empty strings = text-only card (current behaviour). Example:
// { youtubeUrl: "https://www.youtube.com/watch?v=XXXX", image: "" },
export const TESTIMONIAL_MEDIA = [
  { youtubeUrl: "", image: "" },
  { youtubeUrl: "", image: "" },
  { youtubeUrl: "", image: "" },
];

export const getYouTubeId = (url = "") => {
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : "";
};

export const SOMA_JOURNAL = [
  { category: "Practice", title: "The art of conscious rest", excerpt: "Why rest is not the absence of doing, but a skill to cultivate.", image: "https://images.unsplash.com/photo-1600618528240-fb9fc964b853?q=80&w=800&auto=format&fit=crop" },
  { category: "Breath", title: "Listening to the inhale", excerpt: "A simple three-part practice to return to your breath.", image: "https://images.unsplash.com/photo-1559757175-0eb30cd8c063?q=80&w=800&auto=format&fit=crop" },
  { category: "Ritual", title: "Morning light, morning body", excerpt: "Designing a morning ritual that actually holds you.", image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800&auto=format&fit=crop" },
];

// FAQ — 25 questions about SomaWellness experiences, programs and visiting
// Sections: A. About (1-5) | B. Private & Personalized Care (6-11) | C. Mindfulness & Life Stages (12-17) | D. Academy & Organizations (18-19) | E. Visiting & Practical (20-25)
export const FAQ_ITEMS = [
  // A. About SomaWellness
  { q: "What is SomaWellness?", a: "SomaWellness is a premium international wellness brand created to support physical health, mental wellbeing, restoration and a more balanced way of living. We bring together mindful movement, restorative therapy, mindfulness, breathwork, massage and conscious lifestyle practices in a calm, welcoming environment. Our approach addresses body, breath and mind as an integrated whole." },
  { q: "Where are you located?", a: "SomaWellness is based in Spring Valley, Nairobi, Kenya. Our centre is designed as a peaceful wellness space — calm and considered, while remaining conveniently accessible within Nairobi. Full Address: Spring Valley, Nairobi, Kenya." },
  { q: "What experiences are available at SomaWellness?", a: "SomaWellness offers: Group Wellness Sessions, Private One-to-One Programs, Restorative Therapy, Mindfulness, Breathwork, Stress Management & Relaxation, Massage Therapies, Pregnancy & Postnatal Programs, Children's Programs, Senior-Friendly Programs, Corporate Wellness & Workplace Programs, Individual Wellness Consultations, Signature Journeys & Retreat-Style Experiences, Practitioner Training and Integrated Wellness Packages. Experiences may be introduced in phases." },
  { q: "Is SomaWellness only for experienced practitioners?", a: "No. SomaWellness is for anyone interested in their overall wellbeing — whether you come for mindfulness, stress management, restoration, massage, breathwork, lifestyle support, or general physical and mental wellness. No prior experience is required; every experience can be adapted to your level." },
  { q: "What makes SomaWellness different from a regular gym, studio or spa?", a: "SomaWellness is an integrated wellness destination rather than a gym, studio or spa alone. We bring together movement, breath, mindfulness, restoration, education and lifestyle under one holistic philosophy — helping you cultivate a healthier relationship with your body, breath, mind and everyday life." },
  // B. Private & Personalized Care
  { q: "Do I need yoga experience to join?", a: "Not at all. Beginners are welcome. Our practitioners guide each participant according to individual ability, mobility, age and experience. You do not need to be flexible or fit before starting — yoga gradually develops strength, awareness and balance." },
  { q: "What is Yoga Therapy?", a: "Yoga therapy is the individualized application of yoga practices — movement, breath and relaxation — according to your needs, limitations and wellbeing goals. A program may include adapted movement, breathing practices, relaxation techniques and lifestyle guidance. It is intended to complement appropriate medical care, not replace medical diagnosis or treatment." },
  { q: "What is the difference between Yoga and Yoga Therapy?", a: "A group yoga session follows a structured practice suitable for everyone attending. Yoga therapy is individualized — we discuss your health history, lifestyle, physical needs and wellbeing goals, then design a practice specifically for you, delivered one-to-one." },
  { q: "Do I need a therapy assessment before starting Yoga Therapy?", a: "Yes. Therapy starts with a 75-minute assessment (KES 6,500) to understand how you move, what hurts, and your goals — so we can recommend the most appropriate program." },
  { q: "Can people with medical conditions join SomaWellness?", a: "In many cases, yes, but it depends on the individual and the condition. Please inform our team about any medical condition, recent surgery, pregnancy, injury, chronic pain, cardiovascular condition, significant mobility limitation, medication or ongoing treatment before beginning a program. Where necessary, we may recommend clearance from your healthcare professional." },
  { q: "Is Private Yoga available?", a: "Yes. We offer personalized one-to-one private yoga sessions for beginners, busy professionals, older adults, people with specific wellbeing goals, and those who prefer privacy and personal guidance. Sessions for two, or small private groups, may also be arranged." },
  // C. Mindfulness, Life Stages & Restorative Therapies
  { q: "Do you offer mindfulness and breathing sessions?", a: "Yes. Mindfulness and conscious breathing are central to SomaWellness: guided mindfulness, meditation, breath awareness, relaxation and stress-management practices that develop calm, awareness, emotional balance and mental clarity." },
  { q: "Do you offer Prenatal Yoga and Postnatal Yoga?", a: "Yes. We offer specialized prenatal yoga and postnatal yoga programs with carefully adapted practices. Prenatal yoga focuses on gentle movement, breathing, relaxation and overall wellbeing during pregnancy; postnatal yoga supports gradual recovery, mobility, relaxation and reconnection with the body after childbirth. Medical clearance may be requested depending on stage and circumstances." },
  { q: "Is Children's Yoga available?", a: "Yes. Our children's yoga programs introduce movement and mindfulness in an age-appropriate, engaging way: simple movement, breathing exercises, balance and coordination, relaxation, concentration and body awareness. Special children's batches, workshops and family activities may be announced periodically." },
  { q: "Do you have programs for seniors?", a: "Yes. Our programs adapt to different ages and mobility levels: gentle movement, chair-supported options, assisted stretching, balance practices, breathing exercises, relaxation and mindfulness. The emphasis is on comfort, safety, mobility and functional independence." },
  { q: "Do you provide massage and restorative therapies?", a: "Yes. Selected massage, relaxation and restorative therapies are part of our holistic approach. Clients may book therapies individually or combine them with movement, mindfulness and signature rituals. Our treatment menu explains duration, benefits and pricing for each therapy." },
  { q: "Can I combine sessions, massage and mindfulness in one package?", a: "Yes — this is a core SomaWellness concept. Choose integrated journeys and packages combining movement sessions, mindfulness, massage, breathwork and relaxation for goals such as deep relaxation, stress management, recovery, rejuvenation, mind-body balance, personal wellbeing, couples experiences and corporate wellness. Our team will recommend the most appropriate package for your goals and time." },
  // D. Academy, Organizations & Community Programs
  { q: "Do you offer corporate wellness programs?", a: "Yes. SomaWellness provides corporate and workplace wellness for companies, organizations, institutions and professional teams: desk-friendly movement, workplace sessions, stress-management, mindfulness, breathwork, posture and ergonomic awareness, employee workshops, wellness days, executive programs and customized annual packages — at our centre, at your premises, or another suitable setting." },
  { q: "Do you offer Yoga Teacher Training and workshops?", a: "Yes. Education is central to SomaWellness: SOMA 200 Yoga Teacher Training, short courses, restorative workshops, mindfulness workshops, breathwork programs and masterclasses with experienced practitioners. Upcoming programs are announced via our website and social channels." },
  // E. Visiting, Booking & Practical Information
  { q: "What should I wear for a session?", a: "Wear comfortable, breathable clothing that allows unrestricted movement. No specialized clothing is needed. Avoid heavy meals immediately before a session — allow approximately 2–3 hours after a substantial meal unless your healthcare professional has advised otherwise." },
  { q: "Do I need to bring my own yoga mat or props?", a: "No. SomaWellness provides mats, blocks, belts, bolsters, blankets, chairs and other supportive props. You are also welcome to bring your own mat if you prefer." },
  { q: "How long is a typical session?", a: "Session duration depends on the experience: group sessions ~60 minutes, private sessions ~60 minutes, restorative therapy ~60 minutes or as recommended, mindfulness / breathwork ~30–60 minutes, massage and restorative therapies per treatment, integrated packages per combination. Exact duration is confirmed at booking." },
  { q: "How do I know which program is right for me?", a: "You do not need to decide alone — tell our team what you are looking for (fitness, flexibility, stress relief, relaxation, mobility, mindfulness, personalized guidance, massage, rejuvenation, or overall wellbeing) and we will recommend a suitable session, therapy or package. For specific concerns, an assessment may be recommended." },
  { q: "How can I book a session?", a: "Sessions can be booked via phone / WhatsApp, email, our website, or reception at SomaWellness, Spring Valley, Nairobi. Advance booking is particularly recommended for private sessions, restorative therapy, massage, consultations and signature packages." },
  { q: "Can I visit before becoming a member?", a: "Yes. Prospective clients are welcome to contact our team and experience the centre, sessions and therapies before selecting a membership or package. An assessment or introductory session may be recommended depending on the program." },
];

// ── Per-page FAQ mapping (bottom of each page) ────────────────
export const PAGE_FAQS = {
  // About — A. About SomaWellness (1-5)
  about: [
    "What is SomaWellness?",
    "Where are you located?",
    "What experiences are available at SomaWellness?",
    "Is SomaWellness only for experienced practitioners?",
    "What makes SomaWellness different from a regular gym, studio or spa?",
  ],
  // Join — memberships, practical visit
  join: [
    "Can I visit before becoming a member?",
    "How do I know which program is right for me?",
    "What experiences are available at SomaWellness?",
    "How long is a typical session?",
    "How can I book a session?",
    "Can people with medical conditions join SomaWellness?",
  ],
  // One-to-One — B. Private & Personalized Care (6-11)
  private: [
    "Do I need yoga experience to join?",
    "What is Yoga Therapy?",
    "What is the difference between Yoga and Yoga Therapy?",
    "Do I need a therapy assessment before starting Yoga Therapy?",
    "Can people with medical conditions join SomaWellness?",
    "Is Private Yoga available?",
    "How long is a typical session?",
    "How can I book a session?",
  ],
  // Life Stages — C. specialized + medical
  lifeStages: [
    "Do you offer Prenatal Yoga and Postnatal Yoga?",
    "Is Children's Yoga available?",
    "Do you have programs for seniors?",
    "Can people with medical conditions join SomaWellness?",
    "Do I need a therapy assessment before starting Yoga Therapy?",
    "How long is a typical session?",
    "How can I book a session?",
  ],
  // Restore — C. mindfulness/massage + integration
  restore: [
    "Do you offer mindfulness and breathing sessions?",
    "Do you provide massage and restorative therapies?",
    "Can I combine sessions, massage and mindfulness in one package?",
    "Can people with medical conditions join SomaWellness?",
    "How long is a typical session?",
    "How can I book a session?",
  ],
  // Academy & Organizations — D. Corporate & Education
  yttc: [
    "Do you offer corporate wellness programs?",
    "Do you offer Yoga Teacher Training and workshops?",
    "What makes SomaWellness different from a regular gym, studio or spa?",
    "How can I book a session?",
    "How long is a typical session?",
  ],
  // Contact — E. Practical
  contact: [
    "Where are you located?",
    "What should I wear for a session?",
    "Do I need to bring my own yoga mat or props?",
    "How long is a typical session?",
    "How can I book a session?",
    "Can I visit before becoming a member?",
  ],
};
