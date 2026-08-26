// ─────────────────────────────────────────────────────────
// siteContent.js — SOMA WELLNESS NAIROBI — Centralised content
// Spring Valley, Nairobi, Kenya — Yoga · Therapy · Meditation · Wellness
// ─────────────────────────────────────────────────────────

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

// FAQ — Nairobi structured — 25 questions from SOMA Wellness Nairobi FAQ (Pages 1-10)
// Sections: A. About SOMA (1-5) | B. Yoga, Therapy & Personalized Care (6-11) | C. Meditation & Wellness Therapies (12-17) | D. Corporate & Education (18-19) | E. Visiting & Practical (20-25)
export const FAQ_ITEMS = [
  // A. About SOMA Wellness
  { q: "What is SOMA Wellness?", a: "SOMA Wellness is a holistic yoga and wellness centre in Spring Valley, Nairobi created to support physical health, mental well-being, relaxation and a more balanced way of living. We bring together Yoga, Yoga Therapy, Meditation, Breathwork, Massage, Wellness Therapies and mindful lifestyle practices in a calm and welcoming environment. Our approach is not limited to fitness — we focus on the body, breath and mind as an integrated whole." },
  { q: "Where are you located?", a: "SOMA Wellness is based in Spring Valley, Nairobi, Kenya. Our centre has been conceptualized as a peaceful wellness space away from the feeling of a conventional gym or clinic, while remaining conveniently accessible within Nairobi. Full Address: Spring Valley, Nairobi, Kenya." },
  { q: "What services are available at SOMA Wellness?", a: "SOMA offers: Group Yoga Classes, Personal / One-to-One Yoga, Yoga Therapy, Meditation, Pranayama & Breathwork, Stress Management & Relaxation, Massage Therapies, Steam / Wellness Rituals, Prenatal & Postnatal Yoga, Children's Yoga, Senior-Friendly Yoga, Corporate Yoga & Workplace Wellness, Individual Wellness Consultations, Special Workshops & Retreat-style Programs, Yoga Teacher Training and Educational Programs, and Integrated Wellness Packages. Services may be introduced in phases as the centre develops." },
  { q: "Is SOMA Wellness only for people who practise Yoga?", a: "No. Although Yoga is at the heart of our philosophy, SOMA Wellness is for anyone interested in overall well-being. You can come for meditation, stress management, relaxation, massage, steam and wellness rituals, therapeutic yoga, breathwork, lifestyle support, or general physical and mental wellness — individually or combined through an integrated wellness program. No prior Yoga experience is required." },
  { q: "What makes SOMA Wellness different from a regular gym, Yoga studio or spa?", a: "SOMA has been conceived as an integrated wellness destination rather than a gym, studio or spa alone. We bring together movement, breath, mindfulness, therapy, relaxation, education and lifestyle under one holistic philosophy. You may come to practise Yoga, but our larger purpose is to help you cultivate a healthier relationship with your body, breath, mind and everyday life." },
  // B. Yoga, Yoga Therapy & Personalized Care
  { q: "Do I need previous Yoga experience to join?", a: "Not at all. Beginners are welcome. Our instructors guide participants according to individual ability, flexibility, age and experience. You do not need to be flexible before starting — Yoga helps you gradually develop flexibility, strength, awareness and balance." },
  { q: "What is Yoga Therapy?", a: "Yoga Therapy is the individualized application of Yoga practices according to a person's needs, limitations and health goals. A program may include modified postures, supported or therapeutic movements, breathing practices, relaxation techniques, meditation and lifestyle guidance. It may be useful as a supportive wellness approach for stiffness, postural problems, stress, reduced mobility or recurring musculoskeletal discomfort. It is intended to complement appropriate medical care, not replace medical diagnosis or treatment." },
  { q: "How is Yoga Therapy different from a regular Yoga class?", a: "A regular Yoga class follows a structured practice suitable for a group. Yoga Therapy is more individualized — we discuss your health history, lifestyle, physical limitations and wellness goals, then plan a suitable practice specifically for you. Depending on your needs, Yoga Therapy may be offered as an individual session or through a specialized therapeutic program." },
  { q: "Do I need a consultation before starting Yoga Therapy?", a: "For personalized Yoga Therapy, an initial assessment or consultation is recommended. This helps us understand your health concerns, medical history, lifestyle, previous injuries, current physical limitations, stress levels and personal goals, so we can recommend the most appropriate program." },
  { q: "Can people with medical conditions join SOMA Wellness?", a: "In many cases, yes, but it depends on the individual and the condition. Please inform our wellness team about any medical condition, recent surgery, pregnancy, injury, chronic pain, cardiovascular condition, significant mobility limitation, medication or ongoing treatment before beginning a program. Where necessary, we may recommend obtaining clearance from your healthcare professional before participating." },
  { q: "Are private Yoga sessions available?", a: "Yes. SOMA offers personalized one-to-one Yoga sessions for beginners, busy professionals, older adults, people with specific wellness goals, individuals recovering mobility, clients requiring Yoga Therapy, and those who prefer privacy and personalized instruction. Couple or small private-group sessions may also be arranged." },
  // C. Meditation, Specialized Programs & Wellness Therapies
  { q: "Do you offer meditation and breathing classes?", a: "Yes. Meditation and conscious breathing are central to SOMA: Guided Meditation, Mindfulness, Pranayama, Breath Awareness, Relaxation, Yogic breathing practices and Stress-management practices. Sessions help develop calmness, awareness, emotional balance and mental clarity." },
  { q: "Do you offer prenatal and postnatal Yoga?", a: "Yes. SOMA plans specialized Prenatal and Postnatal Yoga programs with appropriately modified practices. Prenatal Yoga focuses on gentle movement, breathing, relaxation and overall well-being during pregnancy; Postnatal Yoga supports gradual recovery, mobility, relaxation and reconnection with the body following childbirth. Medical clearance may be requested depending on stage and health circumstances." },
  { q: "Is Yoga available for children?", a: "Yes. Our children's Yoga programs introduce Yoga in an age-appropriate and engaging manner: simple postures, breathing exercises, balance and coordination, relaxation, concentration, body awareness and mindfulness. Special children's batches, workshops and family wellness activities may be announced periodically." },
  { q: "Do you have programs for senior citizens?", a: "Yes. Yoga is adapted for different ages and mobility levels: Gentle Yoga, Chair-supported Yoga, Assisted stretching, Balance practices, Breathing exercises, Relaxation and Meditation. The emphasis is on comfort, safety, mobility and maintaining functional independence, rather than difficult postures." },
  { q: "Do you provide massage and wellness therapies?", a: "Yes. SOMA incorporates selected massage, relaxation and wellness therapies as part of its holistic approach. Depending on availability, clients may book therapies individually or combine them with Yoga, meditation, steam or other wellness rituals. Our detailed therapy menu and wellness packages explain duration, benefits and pricing for each service." },
  { q: "Can I combine Yoga, massage, meditation and other therapies in one package?", a: "Yes — this is a core SOMA concept. Choose integrated wellness journeys and packages combining Yoga, Meditation, Massage, Steam, Breathwork and Relaxation for goals such as Deep Relaxation, Stress Management, Body Recovery, Rejuvenation, Mind-Body Balance, Personal Wellness, Couple Wellness and Corporate Wellness. Our team will recommend the most appropriate package for your goals and time." },
  // D. Corporate, Education & Community Programs
  { q: "Do you offer corporate wellness programs?", a: "Yes. SOMA provides Corporate Yoga and Workplace Wellness for companies, organizations, institutions and professional teams: Desk Yoga, Workplace Yoga, Stress-management sessions, Meditation, Breathwork, Posture and ergonomic awareness, Employee wellness workshops, Wellness days, Executive wellness programs and Customized corporate wellness packages. Sessions can be arranged at SOMA Wellness, at the organization's premises, or in another suitable setting." },
  { q: "Do you conduct Yoga Teacher Training and workshops?", a: "Yes. Education is an important part of SOMA: Yoga Teacher Training Courses, Short-term Yoga courses, Yoga Therapy workshops, Meditation workshops, Pranayama programs, Wellness education sessions, Professional development programs and Special masterclasses with experienced teachers. Upcoming programs will be announced via our website and social media." },
  // E. Visiting, Booking & Practical Information
  { q: "What should I wear for a Yoga session?", a: "Wear comfortable, breathable clothing that allows unrestricted movement. No specialized Yoga clothing is needed. Avoid very heavy meals immediately before class — keep approximately 2–3 hours between a substantial meal and practice unless your healthcare professional has advised otherwise." },
  { q: "Do I need to bring my own Yoga mat or props?", a: "SOMA aims to provide essential Yoga equipment: Yoga mats, blocks, belts, bolsters, blankets, chairs and other supportive props. You are also welcome to bring your personal Yoga mat if you prefer." },
  { q: "How long is a typical session?", a: "Session duration depends on the service: Group Yoga ~60 minutes, Private Yoga ~60 minutes, Yoga Therapy ~60 minutes or as recommended, Meditation / Breathwork ~30–60 minutes, Massage / Wellness Therapies per treatment, Integrated Wellness Packages per combination. Exact duration will be confirmed while booking." },
  { q: "How do I know which program is right for me?", a: "You do not need to decide alone — tell our team what you are looking for (fitness, flexibility, stress relief, relaxation, pain-management support, better mobility, meditation, personalized Yoga, massage, rejuvenation, or overall wellness) and we can recommend an appropriate class, therapy or wellness package. For more specific concerns, a consultation may be recommended." },
  { q: "How can I book a session?", a: "Sessions can be booked via Phone / WhatsApp, Email, Website, or Reception at SOMA Wellness, Spring Valley, Nairobi. Advance booking is particularly recommended for private sessions, Yoga Therapy, massage, consultations and wellness packages. [Number / Email / Website to be inserted]." },
  { q: "Can I visit the centre before taking a membership?", a: "Yes. Prospective clients are welcome to contact our team and learn about the centre, available classes and wellness services before selecting a membership or package. A consultation or introductory session may also be recommended depending on the program you are interested in." },
];

// ── Per-page FAQ mapping (bottom of each page) ────────────────
export const PAGE_FAQS = {
  // About — A. About SOMA (1-5)
  about: [
    "What is SOMA Wellness?",
    "Where are you located?",
    "What services are available at SOMA Wellness?",
    "Is SOMA Wellness only for people who practise Yoga?",
    "What makes SOMA Wellness different from a regular gym, Yoga studio or spa?",
  ],
  // Join — memberships, practical visit
  join: [
    "Can I visit the centre before taking a membership?",
    "How do I know which program is right for me?",
    "What services are available at SOMA Wellness?",
    "How long is a typical session?",
    "How can I book a session?",
    "Can people with medical conditions join SOMA Wellness?",
  ],
  // One-to-One — B. Yoga, Therapy & Personalized Care (6-11)
  private: [
    "Do I need previous Yoga experience to join?",
    "What is Yoga Therapy?",
    "How is Yoga Therapy different from a regular Yoga class?",
    "Do I need a consultation before starting Yoga Therapy?",
    "Can people with medical conditions join SOMA Wellness?",
    "Are private Yoga sessions available?",
    "How long is a typical session?",
    "How can I book a session?",
  ],
  // Life Stages — C. specialized (13-15) + medical
  lifeStages: [
    "Do you offer prenatal and postnatal Yoga?",
    "Is Yoga available for children?",
    "Do you have programs for senior citizens?",
    "Can people with medical conditions join SOMA Wellness?",
    "Do I need a consultation before starting Yoga Therapy?",
    "How long is a typical session?",
    "How can I book a session?",
  ],
  // Restore — C. meditation/massage + integration
  restore: [
    "Do you offer meditation and breathing classes?",
    "Do you provide massage and wellness therapies?",
    "Can I combine Yoga, massage, meditation and other therapies in one package?",
    "Can people with medical conditions join SOMA Wellness?",
    "How long is a typical session?",
    "How can I book a session?",
  ],
  // Learn & Partner — D. Corporate & Education
  yttc: [
    "Do you offer corporate wellness programs?",
    "Do you conduct Yoga Teacher Training and workshops?",
    "What makes SOMA Wellness different from a regular gym, Yoga studio or spa?",
    "How can I book a session?",
    "How long is a typical session?",
  ],
  // Contact — E. Practical
  contact: [
    "Where are you located?",
    "What should I wear for a Yoga session?",
    "Do I need to bring my own Yoga mat or props?",
    "How long is a typical session?",
    "How can I book a session?",
    "Can I visit the centre before taking a membership?",
  ],
};
