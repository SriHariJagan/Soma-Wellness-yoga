import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  CHAT_VIEW,
  QUICK_ACTIONS,
  ABOUT_COPY,
  buildWaUrl,
} from '../../config/chatbotConfig.js';
import {
  fetchChatbotCourses,
  fetchChatbotPlans,
  fetchChatbotServices,
  fetchChatbotConfig,
  getCachedWaNumber,
  submitChatbotEnquiry,
  trackChatbotEvent,
  shapeCourseForChat,
  shapePlanForChat,
  shapeServiceForChat,
  getCourseWaUrl,
  getProgramWaUrl,
  getPackageWaUrl,
  getGenericWaUrl,
} from '../../lib/chatbotApi.js';
import ChatbotEnquiryForm from './ChatbotEnquiryForm.jsx';

const BOT_GREETING = 'Hi 👋 Welcome to Soma Wellness.\n\nI\'m here to help you discover our wellness programs, courses and services.\n\nWhat would you like to explore?';

// ── Premium icons — filled + stroke, 18px, distinct per action ──
const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.2 3.2h9.6c1.25 0 2.25 1 2.25 2.25v13.1c0 .62-.5 1.12-1.12 1.12H6.8A2.8 2.8 0 0 1 4 16.9V5.95C4 4.42 5.05 3.2 6.2 3.2Z" fill="white" fillOpacity="0.96" stroke="white" strokeWidth="1.1" strokeLinejoin="round"/><path d="M7.2 7.2h8M7.2 10.2h8M7.2 13.2h5.2" stroke="#183D2D" strokeWidth="1.15" strokeLinecap="round" opacity="0.18"/><path d="M6.7 3.2v13.7" stroke="white" strokeWidth="1.15" strokeLinecap="round" opacity="0.9"/></svg>
);
const IconSparkles = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.2l1.55 3.9L17.6 8.7l-4.05 1.6L12 14.2l-1.55-3.9L6.4 8.7l4.05-1.6L12 3.2Z" fill="white" fillOpacity="0.96" stroke="white" strokeWidth="1.05" strokeLinejoin="round"/><path d="M18.6 12.6l.9 1.95L21.5 15.5l-2 1-1 1.95-.9-1.95-2-1 2-1 .9-1.9Z" fill="white" fillOpacity="0.9"/><path d="M5.4 13.6l.85 1.75L8 16.3l-1.75 1-1 1.75-.85-1.75L2.5 16.3l1.9-1 .85-1.7Z" fill="white" fillOpacity="0.88"/></svg>
);
const IconWallet = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5.2" width="18" height="13.6" rx="2.3" fill="white" fillOpacity="0.96" stroke="white" strokeWidth="1.05"/><path d="M3 8.8h18" stroke="#183D2D" strokeWidth="1.05" opacity="0.14"/><circle cx="15.7" cy="13.8" r="2.15" fill="#183D2D" fillOpacity="0.12" stroke="#183D2D" strokeWidth="1.05"/><circle cx="15.7" cy="13.8" r="0.75" fill="white" fillOpacity="0.92"/></svg>
);
const IconLeaf = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11.2 19.8A6.8 6.8 0 0 1 10 6.6C15.1 5.55 16.9 4.9 18.8 2.6c.95 1.85 1.55 4.1.85 7.25A6.8 6.8 0 0 1 11.2 19.8Z" fill="white" fillOpacity="0.96" stroke="white" strokeWidth="1.05" strokeLinejoin="round"/><path d="M11.2 19.8V10.2" stroke="white" strokeWidth="1.15" strokeLinecap="round"/><path d="M11.2 12.2c-1.1-.7-2-1.15-2.7-1.4" stroke="white" strokeWidth="0.95" strokeLinecap="round" opacity="0.95"/></svg>
);
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.2" y="5" width="17.6" height="13.2" rx="2.2" fill="white" fillOpacity="0.96" stroke="white" strokeWidth="1.05"/><path d="M4.2 6.2l7.15 5.05a1.2 1.2 0 0 0 1.3 0L19.8 6.2" stroke="#183D2D" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" opacity="0.18"/><circle cx="17.2" cy="14.6" r="1.35" fill="#F4B400" stroke="white" strokeWidth="0.7"/><path d="M5.5 15.2l3.2-3.1M18.5 15.2l-3.1-3" stroke="#183D2D" strokeWidth="0.9" strokeLinecap="round" opacity="0.12"/></svg>
);
const IconWA = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {/* authentic WhatsApp bubble */}
    <path d="M12.04 2.2c-5.46 0-9.9 4.2-9.9 9.4 0 1.86.58 3.6 1.6 5.05L2.05 21.8l5.36-1.4a9.78 9.78 0 0 0 4.63 1.17c5.46 0 9.9-4.2 9.9-9.4 0-5.2-4.44-10-9.9-10Z" fill="white" fillOpacity="0.98" stroke="white" strokeWidth="0.9" strokeLinejoin="round"/>
    {/* handset */}
    <path d="M16.95 14.55c-.3-.15-1.73-.85-2-1-.27-.14-.46-.15-.65.15l-.85 1c-.12.14-.24.16-.45.05-.2-.1-.84-.31-1.6-.98-.59-.52-1-1.16-1.11-1.36-.11-.2-.01-.3.08-.4l.72-.83c.08-.1.1-.2.05-.32l-.85-2.05c-.08-.2-.17-.17-.35-.17h-.5c-.18 0-.46.07-.7.33-.24.27-.93.9-.93 2.2 0 1.3.95 2.55 1.08 2.73.13.18 1.87 2.86 4.53 4.01 2.66 1.15 2.66.77 3.14.72.48-.05 1.53-.63 1.75-1.23.22-.6.22-1.12.15-1.23-.06-.11-.24-.18-.5-.33Z" fill="#128C7E"/>
    <path d="M16.2 13.9l.36.18c.08.04.13.02.15-.06l.22-.9c.02-.08-.02-.13-.1-.17l-.35-.17c-.08-.04-.14 0-.16.08l-.22.9c-.02.08 0 .1.1.14Z" fill="#25D366"/>
  </svg>
);
const ICON_MAP = { book: IconBook, sparkles: IconSparkles, wallet: IconWallet, leaf: IconLeaf, mail: IconMail, whatsapp: IconWA };

function QuickActionBtn({ action, onClick }) {
  const Icon = ICON_MAP[action.icon] || IconLeaf;
  return (
    <button type="button" className={`soma-cb-qa-btn soma-cb-qa-btn--${action.id}`} onClick={() => onClick(action)} aria-label={action.label}>
      <span className="soma-cb-qa-ic" aria-hidden="true"><Icon /></span>
      <span className="soma-cb-qa-label">{action.label}</span>
      <span className="soma-cb-qa-arrow" aria-hidden="true">↗</span>
    </button>
  );
}

// ── Card components ────────────────────────────────────────────
function CourseCard({ course, onView, onEnquire, onWhatsApp }) {
  return (
    <div className="soma-cb-card">
      {course.image && (
        <div className="soma-cb-card-img-wrap" aria-hidden="true">
          <img src={course.image} alt="" loading="lazy" className="soma-cb-card-img" />
        </div>
      )}
      <div className="soma-cb-card-top">
        <span className="soma-cb-card-eyebrow">{course.mode} · {course.duration || 'Flexible'}</span>
        <h4 className="soma-cb-card-title">{course.title}</h4>
        {course.description && <p className="soma-cb-card-desc">{course.description.slice(0, 120)}{course.description.length > 120 ? '…' : ''}</p>}
        <div className="soma-cb-card-meta">
          {course.hours && <span className="soma-cb-chip">{course.hours} hrs</span>}
          {course.price != null && course.price > 0 && <span className="soma-cb-chip soma-cb-chip--price">{course.price.toLocaleString()} KES</span>}
          {course.category && <span className="soma-cb-chip soma-cb-chip--muted">{course.category}</span>}
        </div>
      </div>
      <div className="soma-cb-card-actions">
        <button type="button" className="soma-cb-card-btn soma-cb-card-btn--primary" onClick={() => onView(course)}>View Details</button>
        <button type="button" className="soma-cb-card-btn" onClick={() => onEnquire(course)}>Enquire Now</button>
        <button type="button" className="soma-cb-card-btn soma-cb-card-btn--wa" onClick={() => onWhatsApp(course)} aria-label={`Chat on WhatsApp about ${course.title}`}>
          <IconWA /> WhatsApp
        </button>
      </div>
    </div>
  );
}

function ProgramCard({ program, onView, onEnquire, onWhatsApp }) {
  return (
    <div className="soma-cb-card">
      {program.image && (
        <div className="soma-cb-card-img-wrap" aria-hidden="true">
          <img src={program.image} alt="" loading="lazy" className="soma-cb-card-img" />
        </div>
      )}
      <div className="soma-cb-card-top">
        <span className="soma-cb-card-eyebrow">{program.category} · {program.type || program.mode}</span>
        <h4 className="soma-cb-card-title">{program.name}</h4>
        {program.description && <p className="soma-cb-card-desc">{program.description.slice(0, 120)}{program.description.length > 120 ? '…' : ''}</p>}
        <div className="soma-cb-card-meta">
          <span className="soma-cb-chip">{program.sessionDuration} min</span>
          {program.price != null && program.price > 0 ? (
            <span className="soma-cb-chip soma-cb-chip--price">{program.price.toLocaleString()} KES</span>
          ) : (
            <span className="soma-cb-chip">On enquiry</span>
          )}
        </div>
      </div>
      <div className="soma-cb-card-actions">
        <button type="button" className="soma-cb-card-btn soma-cb-card-btn--primary" onClick={() => onView(program)}>View Details</button>
        <button type="button" className="soma-cb-card-btn" onClick={() => onEnquire(program)}>Enquire Now</button>
        <button type="button" className="soma-cb-card-btn soma-cb-card-btn--wa" onClick={() => onWhatsApp(program)}>
          <IconWA /> WhatsApp
        </button>
      </div>
    </div>
  );
}

function PackageCard({ pkg, onView, onEnquire, onWhatsApp }) {
  return (
    <div className="soma-cb-card">
      <div className="soma-cb-card-top">
        {pkg.badge && <span className="soma-cb-badge">{pkg.badge}</span>}
        <span className="soma-cb-card-eyebrow">{pkg.tier ? `Tier ${pkg.tier}` : pkg.somaCategory} · {pkg.durationMonths} mo</span>
        <h4 className="soma-cb-card-title">{pkg.name}</h4>
        {pkg.description && <p className="soma-cb-card-desc">{pkg.description.slice(0, 110)}{pkg.description.length > 110 ? '…' : ''}</p>}
        {pkg.benefits?.length > 0 && (
          <ul className="soma-cb-card-bullets">
            {pkg.benefits.slice(0, 3).map((b) => (
              <li key={b}><span className="soma-cb-bullet-dot" aria-hidden="true" />{b}</li>
            ))}
          </ul>
        )}
        <div className="soma-cb-card-meta">
          {pkg.price != null && <span className="soma-cb-chip soma-cb-chip--price">{pkg.price.toLocaleString()} KES</span>}
          <span className="soma-cb-chip soma-cb-chip--muted">VAT incl.</span>
        </div>
      </div>
      <div className="soma-cb-card-actions">
        <button type="button" className="soma-cb-card-btn soma-cb-card-btn--primary" onClick={() => onView(pkg)}>View Package</button>
        <button type="button" className="soma-cb-card-btn" onClick={() => onEnquire(pkg)}>Enquire</button>
        <button type="button" className="soma-cb-card-btn soma-cb-card-btn--wa" onClick={() => onWhatsApp(pkg)}>
          <IconWA /> WhatsApp
        </button>
      </div>
    </div>
  );
}

// ── Main Window ────────────────────────────────────────────────
const ChatbotWindow = ({ isOpen, onClose, onMinimize }) => {
  const location = useLocation();
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  // ── State machine ────────────────────────────────────────────
  const [view, setView] = useState(CHAT_VIEW.MAIN_MENU);
  // eslint-disable-next-line no-unused-vars
  const [stack, setStack] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [enquiryCtx, setEnquiryCtx] = useState({ type: 'general', item: '', itemId: '' });
  const [history, setHistory] = useState(() => [
    { id: 'greet', role: 'bot', text: BOT_GREETING },
  ]);

  // Data caches
  const [courses, setCourses] = useState(null);
  const [plans, setPlans] = useState(null);
  const [services, setServices] = useState(null);
  const [loading, setLoading] = useState({ courses: false, plans: false, services: false });
  const [error, setError] = useState({ courses: '', plans: '', services: '' });
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquiryError, setEnquiryError] = useState('');
  const [lastEnquiry, setLastEnquiry] = useState(null);

  // Fetch config (WA number) once
  useEffect(() => { fetchChatbotConfig().catch(() => {}); }, []);

  // Scroll to bottom on history/view change
  useEffect(() => {
    if (!bodyRef.current) return;
    const el = bodyRef.current;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    el.scrollTo({ top: el.scrollHeight, behavior: prefersReduced ? 'auto' : 'smooth' });
  }, [history, view, selectedCourse, selectedProgram, selectedPackage, loading, error]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen, view]);

  // Escape to close/minimize
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const pushHistory = useCallback((role, text) => {
    setHistory((h) => [...h, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, role, text }]);
  }, []);

  const navigateTo = useCallback((nextView, opts = {}) => {
    setStack((s) => [...s, view]);
    setView(nextView);
    if (opts.userLabel) pushHistory('user', opts.userLabel);
    if (opts.botText) pushHistory('bot', opts.botText);
  }, [view, pushHistory]);

  const goBack = useCallback(() => {
    setStack((s) => {
      if (s.length === 0) {
        setView(CHAT_VIEW.MAIN_MENU);
        return s;
      }
      const prev = s[s.length - 1];
      setView(prev);
      return s.slice(0, -1);
    });
    setSelectedCourse(null);
    setSelectedProgram(null);
    setSelectedPackage(null);
  }, []);

  const resetToMenu = useCallback(() => {
    setStack([]);
    setView(CHAT_VIEW.MAIN_MENU);
    setSelectedCourse(null);
    setSelectedProgram(null);
    setSelectedPackage(null);
    pushHistory('bot', 'What else would you like to explore?');
  }, [pushHistory]);

  // ── Data loaders (lazy, cached) ──────────────────────────────
  const loadCourses = useCallback(async () => {
    if (courses || loading.courses || error.courses) return;
    setLoading((l) => ({ ...l, courses: true }));
    setError((e) => ({ ...e, courses: '' }));
    try {
      const raw = await fetchChatbotCourses();
      const shaped = (Array.isArray(raw) ? raw : []).map(shapeCourseForChat);
      setCourses(shaped);
      trackChatbotEvent('chatbot_course_view', { count: shaped.length });
    } catch (err) {
      setError((e) => ({ ...e, courses: err.message || 'Unable to load courses.' }));
    } finally {
      setLoading((l) => ({ ...l, courses: false }));
    }
  }, [courses, loading.courses, error.courses]);

  const loadPlans = useCallback(async () => {
    if (plans || loading.plans || error.plans) return;
    setLoading((l) => ({ ...l, plans: true }));
    setError((e) => ({ ...e, plans: '' }));
    try {
      const raw = await fetchChatbotPlans();
      const shaped = (Array.isArray(raw) ? raw : []).map(shapePlanForChat).filter((p) => p.price !== null || p.isSoma);
      shaped.sort((a, b) => {
        const order = { JUA: 1, AMANI: 2, UZIMA: 3, FAMILY: 4 };
        const ao = order[a.tier] || 99;
        const bo = order[b.tier] || 99;
        return ao - bo;
      });
      setPlans(shaped);
      trackChatbotEvent('chatbot_package_view', { count: shaped.length });
    } catch (err) {
      setError((e) => ({ ...e, plans: err.message || 'Unable to load packages.' }));
    } finally {
      setLoading((l) => ({ ...l, plans: false }));
    }
  }, [plans, loading.plans, error.plans]);

  const loadServices = useCallback(async () => {
    if (services || loading.services || error.services) return;
    setLoading((l) => ({ ...l, services: true }));
    setError((e) => ({ ...e, services: '' }));
    try {
      const raw = await fetchChatbotServices();
      const shaped = (Array.isArray(raw) ? raw : []).map(shapeServiceForChat);
      setServices(shaped);
      trackChatbotEvent('chatbot_program_view', { count: shaped.length });
    } catch (err) {
      setError((e) => ({ ...e, services: err.message || 'Unable to load programs.' }));
    } finally {
      setLoading((l) => ({ ...l, services: false }));
    }
  }, [services, loading.services, error.services]);

  // Auto-load when entering views
  useEffect(() => {
    if (view === CHAT_VIEW.COURSES) loadCourses();
    if (view === CHAT_VIEW.PACKAGES) loadPlans();
    if (view === CHAT_VIEW.PROGRAMS) loadServices();
  }, [view, loadCourses, loadPlans, loadServices]);

  // ── Handlers for quick actions ───────────────────────────────
  const handleQuickAction = useCallback((action) => {
    if (action.view === 'WHATSAPP') {
      trackChatbotEvent('chatbot_whatsapp_click', { source: 'main_menu', page: location.pathname });
      window.open(getGenericWaUrl(), '_blank', 'noopener,noreferrer');
      pushHistory('user', action.label);
      return;
    }
    if (action.view === CHAT_VIEW.ENQUIRY) {
      setEnquiryCtx({ type: 'general', item: '', itemId: '' });
      trackChatbotEvent('chatbot_enquiry_started', { source: view });
    }
    navigateTo(action.view, { userLabel: action.label, botText: action.view === CHAT_VIEW.ABOUT ? undefined : undefined });
  }, [navigateTo, pushHistory, view, location.pathname]);

  const handleEnquirySubmit = useCallback(async (payload) => {
    setEnquiryLoading(true);
    setEnquiryError('');
    try {
      await submitChatbotEnquiry(payload);
      trackChatbotEvent('chatbot_enquiry_submitted', { type: payload.interestedType, item: payload.interestedItem });
      setLastEnquiry(payload);
      setView(CHAT_VIEW.SUCCESS);
      setStack((s) => [...s, CHAT_VIEW.ENQUIRY]);
      pushHistory('user', `Enquiry: ${payload.interestedItem || payload.interestedType}`);
      pushHistory('bot', 'Thank you! 🌿\n\nWe\'ve received your enquiry.\n\nOur Soma Wellness team will get in touch with you shortly.');
    } catch (err) {
      const msg = err.details?.[0]?.message || err.message || 'Something went wrong while submitting your enquiry. Please try again or contact us on WhatsApp.';
      setEnquiryError(msg);
    } finally {
      setEnquiryLoading(false);
    }
  }, [pushHistory]);

  const openWaForCourse = useCallback((course) => {
    trackChatbotEvent('chatbot_course_whatsapp_click', { course: course.title });
    trackChatbotEvent('chatbot_whatsapp_click', { source: 'course', item: course.title });
    window.open(getCourseWaUrl(course.title), '_blank', 'noopener,noreferrer');
  }, []);
  const openWaForProgram = useCallback((program) => {
    trackChatbotEvent('chatbot_whatsapp_click', { source: 'program', item: program.name });
    window.open(getProgramWaUrl(program.name), '_blank', 'noopener,noreferrer');
  }, []);
  const openWaForPackage = useCallback((pkg) => {
    trackChatbotEvent('chatbot_whatsapp_click', { source: 'package', item: pkg.name });
    window.open(getPackageWaUrl(pkg.name), '_blank', 'noopener,noreferrer');
  }, []);

  const showBack = view !== CHAT_VIEW.MAIN_MENU && view !== CHAT_VIEW.WELCOME;

  // ── Render helpers ───────────────────────────────────────────
  const renderMainMenu = () => (
    <div className="soma-cb-section">
      <div className="soma-cb-qa-grid" role="group" aria-label="Quick actions">
        {QUICK_ACTIONS.map((a) => (
          <QuickActionBtn key={a.id} action={a} onClick={handleQuickAction} />
        ))}
      </div>
      <p className="soma-cb-hint">Choose an option above or ask us on WhatsApp — we’re here to help.</p>
    </div>
  );

  const renderErrorState = (msg, onRetry, onWa) => (
    <div className="soma-cb-error" role="alert">
      <p>Sorry, we&apos;re unable to load this information right now. Please try again or contact us on WhatsApp.</p>
      {msg && <p className="soma-cb-error-detail">{msg}</p>}
      <div className="soma-cb-error-actions">
        <button type="button" className="soma-cb-btn-primary soma-cb-btn-primary--sm" onClick={onRetry}>Try Again</button>
        <button type="button" className="soma-cb-btn-ghost soma-cb-btn-ghost--sm" onClick={onWa}><IconWA /> Chat on WhatsApp</button>
      </div>
    </div>
  );

  const renderCourses = () => {
    if (loading.courses) return <div className="soma-cb-loading" role="status" aria-live="polite"><span className="soma-cb-spinner" aria-hidden="true" /> Loading courses…</div>;
    if (error.courses) return renderErrorState(error.courses, loadCourses, () => window.open(getGenericWaUrl(), '_blank', 'noopener,noreferrer'));
    if (!courses || courses.length === 0) {
      return <div className="soma-cb-empty"><p>No courses are available at the moment.</p><button type="button" className="soma-cb-btn-ghost" onClick={() => window.open(getGenericWaUrl(), '_blank', 'noopener,noreferrer')}><IconWA /> Chat on WhatsApp</button></div>;
    }
    return (
      <div className="soma-cb-section">
        <p className="soma-cb-bot-text">Here are some courses you may be interested in.</p>
        <div className="soma-cb-cards">
          {courses.slice(0, 8).map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              onView={(course) => {
                setSelectedCourse(course);
                navigateTo(CHAT_VIEW.COURSE_DETAILS, { userLabel: `View: ${course.title}` });
              }}
              onEnquire={(course) => {
                setEnquiryCtx({ type: 'course', item: course.title, itemId: String(course.id) });
                navigateTo(CHAT_VIEW.ENQUIRY, { userLabel: `Enquire: ${course.title}` });
                trackChatbotEvent('chatbot_enquiry_started', { source: 'course', item: course.title });
              }}
              onWhatsApp={openWaForCourse}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderCourseDetails = () => {
    if (!selectedCourse) return renderCourses();
    const c = selectedCourse;
    return (
      <div className="soma-cb-section">
        <div className="soma-cb-detail">
          <span className="soma-cb-card-eyebrow">{c.mode} · {c.duration || 'Flexible'}</span>
          <h3 className="soma-cb-detail-title">{c.title}</h3>
          {c.description && <p className="soma-cb-detail-desc">{c.description}</p>}
          <dl className="soma-cb-detail-meta">
            <div><dt>Duration</dt><dd>{c.duration || '—'}</dd></div>
            <div><dt>Format</dt><dd>{c.mode}</dd></div>
            {c.price != null && <div><dt>Price</dt><dd>{c.price.toLocaleString()} KES</dd></div>}
            {c.hours && <div><dt>Hours</dt><dd>{c.hours}</dd></div>}
          </dl>
          <div className="soma-cb-detail-actions">
            <Link to={c.href} className="soma-cb-btn-primary soma-cb-btn-primary--sm" onClick={() => trackChatbotEvent('chatbot_course_view', { course: c.title })}>
              View Full Course
            </Link>
            <button
              type="button"
              className="soma-cb-btn-ghost soma-cb-btn-ghost--sm"
              onClick={() => {
                setEnquiryCtx({ type: 'course', item: c.title, itemId: String(c.id) });
                navigateTo(CHAT_VIEW.ENQUIRY, { userLabel: `Enquire: ${c.title}` });
              }}
            >
              Enquire About This Course
            </button>
            <button type="button" className="soma-cb-btn-ghost soma-cb-btn-ghost--sm soma-cb-btn-ghost--wa" onClick={() => openWaForCourse(c)}>
              <IconWA /> Chat on WhatsApp
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPrograms = () => {
    if (loading.services) return <div className="soma-cb-loading" role="status"><span className="soma-cb-spinner" aria-hidden="true" /> Loading programs…</div>;
    if (error.services) return renderErrorState(error.services, loadServices, () => window.open(getGenericWaUrl(), '_blank', 'noopener,noreferrer'));
    if (!services || services.length === 0) {
      return <div className="soma-cb-empty"><p>No programs are available at the moment.</p><button type="button" className="soma-cb-btn-ghost" onClick={() => window.open(getGenericWaUrl(), '_blank', 'noopener,noreferrer')}><IconWA /> Chat on WhatsApp</button></div>;
    }
    return (
      <div className="soma-cb-section">
        <p className="soma-cb-bot-text">Here are some programs you may be interested in.</p>
        <div className="soma-cb-cards">
          {services.slice(0, 8).map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              onView={(prog) => {
                setSelectedProgram(prog);
                navigateTo(CHAT_VIEW.PROGRAM_DETAILS, { userLabel: `View: ${prog.name}` });
              }}
              onEnquire={(prog) => {
                setEnquiryCtx({ type: 'program', item: prog.name, itemId: String(prog.id) });
                navigateTo(CHAT_VIEW.ENQUIRY, { userLabel: `Enquire: ${prog.name}` });
                trackChatbotEvent('chatbot_enquiry_started', { source: 'program', item: prog.name });
              }}
              onWhatsApp={openWaForProgram}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderProgramDetails = () => {
    if (!selectedProgram) return renderPrograms();
    const p = selectedProgram;
    return (
      <div className="soma-cb-section">
        <div className="soma-cb-detail">
          <span className="soma-cb-card-eyebrow">{p.category} · {p.mode}</span>
          <h3 className="soma-cb-detail-title">{p.name}</h3>
          {p.description && <p className="soma-cb-detail-desc">{p.description}</p>}
          <dl className="soma-cb-detail-meta">
            <div><dt>Duration</dt><dd>{p.sessionDuration} min</dd></div>
            <div><dt>Format</dt><dd>{p.mode}</dd></div>
            <div><dt>Price</dt><dd>{p.price != null && p.price > 0 ? `${p.price.toLocaleString()} KES` : 'On enquiry'}</dd></div>
            <div><dt>Category</dt><dd>{p.category}</dd></div>
          </dl>
          <div className="soma-cb-detail-actions">
            <Link to={p.route} className="soma-cb-btn-primary soma-cb-btn-primary--sm">View Full Program</Link>
            <button
              type="button"
              className="soma-cb-btn-ghost soma-cb-btn-ghost--sm"
              onClick={() => {
                setEnquiryCtx({ type: 'program', item: p.name, itemId: String(p.id) });
                navigateTo(CHAT_VIEW.ENQUIRY, { userLabel: `Enquire: ${p.name}` });
              }}
            >
              Enquire About This Program
            </button>
            <button type="button" className="soma-cb-btn-ghost soma-cb-btn-ghost--sm" onClick={() => openWaForProgram(p)}><IconWA /> Chat on WhatsApp</button>
          </div>
        </div>
      </div>
    );
  };

  const renderPackages = () => {
    if (loading.plans) return <div className="soma-cb-loading" role="status"><span className="soma-cb-spinner" aria-hidden="true" /> Loading packages…</div>;
    if (error.plans) return renderErrorState(error.plans, loadPlans, () => window.open(getGenericWaUrl(), '_blank', 'noopener,noreferrer'));
    if (!plans || plans.length === 0) {
      return <div className="soma-cb-empty"><p>No packages are available at the moment.</p><button type="button" className="soma-cb-btn-ghost" onClick={() => window.open(getGenericWaUrl(), '_blank', 'noopener,noreferrer')}><IconWA /> Chat on WhatsApp</button></div>;
    }
    return (
      <div className="soma-cb-section">
        <p className="soma-cb-bot-text">Here are our membership packages — all prices VAT inclusive.</p>
        <div className="soma-cb-cards">
          {plans.slice(0, 8).map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              onView={(pl) => {
                setSelectedPackage(pl);
                navigateTo(CHAT_VIEW.PACKAGE_DETAILS, { userLabel: `View: ${pl.name}` });
              }}
              onEnquire={(pl) => {
                setEnquiryCtx({ type: 'package', item: pl.name, itemId: String(pl.id) });
                navigateTo(CHAT_VIEW.ENQUIRY, { userLabel: `Enquire: ${pl.name}` });
                trackChatbotEvent('chatbot_enquiry_started', { source: 'package', item: pl.name });
              }}
              onWhatsApp={openWaForPackage}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderPackageDetails = () => {
    if (!selectedPackage) return renderPackages();
    const pkg = selectedPackage;
    return (
      <div className="soma-cb-section">
        <div className="soma-cb-detail">
          {pkg.badge && <span className="soma-cb-badge soma-cb-badge--inline">{pkg.badge}</span>}
          <span className="soma-cb-card-eyebrow">{pkg.tier ? `Tier ${pkg.tier}` : pkg.somaCategory}</span>
          <h3 className="soma-cb-detail-title">{pkg.name}</h3>
          {pkg.description && <p className="soma-cb-detail-desc">{pkg.description}</p>}
          {pkg.benefits?.length > 0 && (
            <ul className="soma-cb-detail-bullets">
              {pkg.benefits.map((b) => (
                <li key={b}><span className="soma-cb-bullet-dot" aria-hidden="true" />{b}</li>
              ))}
            </ul>
          )}
          <dl className="soma-cb-detail-meta">
            <div><dt>Price</dt><dd>{pkg.price != null ? `${pkg.price.toLocaleString()} KES` : '—'}</dd></div>
            <div><dt>Duration</dt><dd>{pkg.durationMonths} month{pkg.durationMonths > 1 ? 's' : ''}</dd></div>
            {pkg.tier && <div><dt>Tier</dt><dd>{pkg.tier}</dd></div>}
          </dl>
          {pkg.termPricing && (
            <div className="soma-cb-term-pricing">
              <span className="soma-cb-term-label">Pay ahead &amp; save:</span>
              <div className="soma-cb-term-grid">
                {Object.entries(pkg.termPricing).map(([mo, price]) => (
                  <span key={mo} className="soma-cb-term-pill">{mo} mo · {Number(price).toLocaleString()} KES</span>
                ))}
              </div>
            </div>
          )}
          <div className="soma-cb-detail-actions">
            <Link to="/classes" className="soma-cb-btn-primary soma-cb-btn-primary--sm">View Package</Link>
            <button
              type="button"
              className="soma-cb-btn-ghost soma-cb-btn-ghost--sm"
              onClick={() => {
                setEnquiryCtx({ type: 'package', item: pkg.name, itemId: String(pkg.id) });
                navigateTo(CHAT_VIEW.ENQUIRY, { userLabel: `Enquire: ${pkg.name}` });
              }}
            >
              Enquire
            </button>
            <button type="button" className="soma-cb-btn-ghost soma-cb-btn-ghost--sm" onClick={() => openWaForPackage(pkg)}><IconWA /> Chat on WhatsApp</button>
          </div>
        </div>
      </div>
    );
  };

  const renderAbout = () => (
    <div className="soma-cb-section">
      <div className="soma-cb-detail">
        <span className="soma-cb-card-eyebrow">Spring Valley · Nairobi</span>
        <h3 className="soma-cb-detail-title">{ABOUT_COPY.title}</h3>
        <p className="soma-cb-detail-desc">{ABOUT_COPY.intro}</p>
        <ul className="soma-cb-detail-bullets">
          {ABOUT_COPY.points.map((p) => (
            <li key={p}><span className="soma-cb-bullet-dot" aria-hidden="true" />{p}</li>
          ))}
        </ul>
        <div className="soma-cb-detail-actions">
          {ABOUT_COPY.ctas.map((c) => (
            <Link key={c.to} to={c.to} className={c.to === '/about' ? 'soma-cb-btn-primary soma-cb-btn-primary--sm' : 'soma-cb-btn-ghost soma-cb-btn-ghost--sm'}>
              {c.label}
            </Link>
          ))}
          <button type="button" className="soma-cb-btn-ghost soma-cb-btn-ghost--sm" onClick={() => window.open(getGenericWaUrl(), '_blank', 'noopener,noreferrer')}>
            <IconWA /> Chat on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );

  const renderEnquiry = () => (
    <div className="soma-cb-section">
      <p className="soma-cb-bot-text">We’d love to hear from you. Share a few details and our team will get back to you shortly.</p>
      <ChatbotEnquiryForm
        initialInterestedType={enquiryCtx.type}
        initialInterestedItem={enquiryCtx.item}
        initialInterestedItemId={enquiryCtx.itemId}
        onSubmit={handleEnquirySubmit}
        onCancel={goBack}
        loading={enquiryLoading}
        serverError={enquiryError}
      />
      {enquiryError && enquiryError.toLowerCase().includes('try again') && (
        <div className="soma-cb-wa-fallback">
          <button type="button" className="soma-cb-btn-ghost soma-cb-btn-ghost--sm" onClick={() => window.open(getGenericWaUrl(), '_blank', 'noopener,noreferrer')}>
            <IconWA /> Continue on WhatsApp
          </button>
        </div>
      )}
    </div>
  );

  const renderSuccess = () => {
    const item = lastEnquiry?.interestedItem || enquiryCtx.item || '';
    const name = lastEnquiry?.name || '';
    return (
      <div className="soma-cb-section soma-cb-success" role="status" aria-live="polite">
        <div className="soma-cb-success-icon" aria-hidden="true">🌿</div>
        <h3 className="soma-cb-success-title">Thank you! 🌿</h3>
        <p className="soma-cb-success-body">We&apos;ve received your enquiry.<br />Our Soma Wellness team will get in touch with you shortly.</p>
        <div className="soma-cb-success-actions">
          <button
            type="button"
            className="soma-cb-btn-primary"
            onClick={() => {
              const msg = name
                ? `Hi Soma Wellness 👋\n\nI just submitted an enquiry${item ? ` about ${item}` : ''} via your website chat (this is ${name}).\n\nCould you please share next steps?`
                : `Hi Soma Wellness 👋\n\nI just submitted an enquiry${item ? ` about ${item}` : ''} via your website chat.\n\nCould you please share next steps?`;
              const wa = buildWaUrl(getCachedWaNumber(), msg);
              trackChatbotEvent('chatbot_whatsapp_click', { source: 'enquiry_success', item });
              window.open(wa, '_blank', 'noopener,noreferrer');
            }}
          >
            <IconWA /> Chat on WhatsApp
          </button>
          <button type="button" className="soma-cb-btn-ghost" onClick={resetToMenu}>Continue Exploring</button>
        </div>
      </div>
    );
  };

  const renderBody = () => {
    switch (view) {
      case CHAT_VIEW.COURSES: return renderCourses();
      case CHAT_VIEW.COURSE_DETAILS: return renderCourseDetails();
      case CHAT_VIEW.PROGRAMS: return renderPrograms();
      case CHAT_VIEW.PROGRAM_DETAILS: return renderProgramDetails();
      case CHAT_VIEW.PACKAGES: return renderPackages();
      case CHAT_VIEW.PACKAGE_DETAILS: return renderPackageDetails();
      case CHAT_VIEW.ABOUT: return renderAbout();
      case CHAT_VIEW.ENQUIRY: return renderEnquiry();
      case CHAT_VIEW.SUCCESS: return renderSuccess();
      case CHAT_VIEW.MAIN_MENU:
      default: return renderMainMenu();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="soma-cb-window"
      role="dialog"
      aria-modal="true"
      aria-label="Soma Wellness assistant"
      aria-describedby="soma-cb-desc"
    >
      {/* Header */}
      <div className="soma-cb-header">
        <div className="soma-cb-header-left">
          <div className="soma-cb-avatar" aria-hidden="true">
            <span className="soma-cb-avatar-ring" />
            <span className="soma-cb-avatar-letter">S</span>
          </div>
          <div className="soma-cb-header-text">
            <span className="soma-cb-header-title">Soma Wellness</span>
            <span className="soma-cb-header-sub">Your wellness journey starts here.</span>
          </div>
        </div>
        <div className="soma-cb-header-actions">
          <span className="soma-cb-online" aria-label="We are online">
            <span className="soma-cb-online-dot" aria-hidden="true" />
            Online
          </span>
          <button type="button" className="soma-cb-icon-btn" onClick={onMinimize} aria-label="Minimize chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button type="button" className="soma-cb-icon-btn soma-cb-icon-btn--close" onClick={onClose} aria-label="Close chat">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </div>

      {/* Back bar */}
      {showBack && (
        <div className="soma-cb-backbar">
          <button type="button" className="soma-cb-back-btn" onClick={goBack} aria-label="Go back">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </button>
          <button type="button" className="soma-cb-menu-btn" onClick={resetToMenu}>Main menu</button>
        </div>
      )}

      {/* Body */}
      <div ref={bodyRef} className="soma-cb-body" tabIndex={0} aria-label="Conversation">
        <p id="soma-cb-desc" className="soma-cb-sr-only">Soma Wellness concierge — explore courses, programs, packages and enquire or continue on WhatsApp.</p>

        {/* History bubbles */}
        <div className="soma-cb-history" role="log" aria-live="polite" aria-relevant="additions">
          {history.map((m) => (
            <div key={m.id} className={`soma-cb-bubble-row ${m.role === 'user' ? 'soma-cb-bubble-row--user' : ''}`}>
              <div className={`soma-cb-bubble ${m.role === 'user' ? 'soma-cb-bubble--user' : 'soma-cb-bubble--bot'}`}>
                {m.text.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    {i < m.text.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Current view content */}
        <div className="soma-cb-view" aria-live="polite">
          {renderBody()}
        </div>

        {/* Hidden input for focus management */}
        <input ref={inputRef} aria-hidden="true" tabIndex={-1} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }} />
      </div>

      {/* Footer quick nav when not in enquiry/success */}
      {view !== CHAT_VIEW.ENQUIRY && view !== CHAT_VIEW.SUCCESS && view !== CHAT_VIEW.MAIN_MENU && (
        <div className="soma-cb-footer">
          <div className="soma-cb-footer-qa">
            <button type="button" className="soma-cb-footer-pill" onClick={resetToMenu}>Explore more</button>
            <button type="button" className="soma-cb-footer-pill soma-cb-footer-pill--wa" onClick={() => window.open(getGenericWaUrl(), '_blank', 'noopener,noreferrer')}>
              <IconWA /> WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWindow;
