import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from "./components/Navbar/Navbar";
import Footer from './components/Footer/Footer';
import ScrollProgress from './components/common/ScrollProgress';
import BackToTop from './components/common/BackToTop';

import PageTransition from './components/common/PageTransition';
import Home from './pages/Home';
import { ROUTE_META, applyMeta, getLocalizedMeta } from './lib/seo';
import SomaLoader from "./components/soma/SomaLoader";
import { useTranslation } from "react-i18next";
import { useAuth } from './context/AuthContext.jsx';

// ── Route-level code splitting: only Home loads eagerly. Everything else is
//    fetched on demand so the initial bundle stays small. ──
const ChatbotWidget = lazy(() => import('./components/chatbot/ChatbotWidget.jsx'));
const About = lazy(() => import('./pages/About'));
const Classes = lazy(() => import('./pages/Classes'));
const YTTC = lazy(() => import('./pages/YTTC'));
const Events = lazy(() => import('./pages/Events'));
const Contact = lazy(() => import('./pages/Contact'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Private = lazy(() => import('./pages/Private'));
const LifeStages = lazy(() => import('./pages/LifeStages'));
const Restore = lazy(() => import('./pages/Restore'));
const Login = lazy(() => import('./pages/Login'));
const NewUser = lazy(() => import('./pages/New'));
const ForgotPassword = lazy(() => import('./components/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/Auth/ResetPassword'));
const Profile = lazy(() => import('./components/Profile/Profile'));
const StudentDashboard = lazy(() => import('./components/Profile/StudentDashboard'));
const YogaAdmin = lazy(() => import('./components/Admin/YogaAdmin'));
const PaymentPage = lazy(() => import('./components/Payment/PaymentPage'));
const FoundingMembers = lazy(() => import('./pages/FoundingMembers'));
const SocialSuccess = lazy(() => import('./pages/SocialSuccess'));
const ReceptionDashboard = lazy(() => import('./components/Reception/ReceptionDashboard'));

const RouteFallback = () => <SomaLoader compact />;

const App = () => {
  const { user, loading, login, logout } = useAuth();
  const [syncedUser, setSyncedUser] = useState(user);

  // keep synced with context and also listen to OTP login events
  useEffect(() => { setSyncedUser(user); }, [user]);

  useEffect(() => {
    const onStorage = () => {
      try {
        const raw = localStorage.getItem('user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.role) setSyncedUser(parsed);
        } else {
          setSyncedUser(null);
        }
      } catch {}
    };
    const onAuthLogin = (e) => {
      if (e.detail?.user) setSyncedUser(e.detail.user);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-login', onAuthLogin);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth-login', onAuthLogin);
    };
  }, []);

  const handleLoginSuccess = (token, userPayload) => {
    login(token, userPayload);
    setSyncedUser(userPayload);
  };

  const handleLogout = async () => {
    await logout();
    setSyncedUser(null);
  };

  if (loading) {
    return <SomaLoader />;
  }

  const effectiveUser = syncedUser || user;
  const isManager = effectiveUser?.role === "manager";
  const isAdmin   = effectiveUser?.role === "admin" || isManager;
  const isReception = effectiveUser?.role === "reception";
  const isStudent = effectiveUser?.role === "student";
  const isDashboard = isAdmin || isStudent || isReception;

  return (
    <BrowserRouter>
      <AppShell
        user={effectiveUser}
        isAdmin={isAdmin}
        isManager={isManager}
        isReception={isReception}
        isStudent={isStudent}
        isDashboard={isDashboard}
        onLogout={handleLogout}
        onLoginSuccess={handleLoginSuccess}
      />
    </BrowserRouter>
  );
};

/* ── Routed shell (lives inside BrowserRouter so it can read the location) ──
 * Adds the global premium scroll experience — progress bar, back-to-top, and
 * graceful page transitions — without touching any routing logic or content. */
const AppShell = ({ user, isAdmin, isManager, isReception, isStudent, isDashboard, onLogout, onLoginSuccess }) => {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // ── SEO: apply per-route title + meta description on navigation (localized) ──
  useEffect(() => {
    const meta = getLocalizedMeta(location.pathname, t);
    applyMeta(meta);
  }, [location.pathname, i18n.language, t]);

  // Reset scroll position on every navigation (instant — avoids fighting the
  // page-transition animation). Skip when a scrollTo is present so that
  // page-level hooks can smooth-scroll to a specific section.
  const scrollToTarget = location.state?.scrollTo || new URLSearchParams(location.search).get('scrollTo');
  useEffect(() => {
    if (scrollToTarget) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, scrollToTarget]);

  // Hide the public chrome (navbar, footer, etc.) only on the actual dashboard
  // routes — not merely because a student/admin is logged in. This lets logged-in
  // users still navigate the public site; the Navbar adapts to show their account.
  const dashboardRoutes = ["/yogaadmin", "/studentdashboard", "/reception", "/login", "/forgot-password", "/payment"];
  const onDashboardRoute = dashboardRoutes.includes(location.pathname);

  return (
    <>
      {!onDashboardRoute && <ScrollProgress />}
      {!onDashboardRoute && <Navbar user={user} onLogout={onLogout} />}

      <AnimatePresence mode="wait" initial={false}>
        <PageTransition key={location.pathname}>
          <Suspense fallback={<RouteFallback />}>
            <Routes location={location}>
            {/* ── Public routes ── */}
            <Route path="/"        element={<Home />} />
            <Route path="/about"   element={<About />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/private" element={<Private />} />
            <Route path="/life-stages" element={<LifeStages />} />
            <Route path="/restore" element={<Restore />} />
            <Route path="/yttc"    element={<YTTC />} />
            <Route path="/founding" element={<FoundingMembers />} />
            <Route path="/faq"     element={<FAQ />} />
            <Route path="/events"  element={<Events />} />
            <Route path="/contact" element={<Contact />} />
            {/* Legacy books routes — redirect to home */}
            <Route path="/books" element={<Navigate to="/" replace />} />
            <Route path="/books/:slug" element={<Navigate to="/" replace />} />
            <Route path="/bulk-orders" element={<Navigate to="/" replace />} />
            <Route path="/order-tracking" element={<Navigate to="/" replace />} />
            <Route path="/checkout" element={<Navigate to="/" replace />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/newuser"          element={<NewUser />} />
            <Route path="/forgot-password"  element={<ForgotPassword />} />
            <Route path="/reset-password"   element={<ResetPassword />} />
            <Route path="/profile"          element={<Profile />} />

            {/* ── OAuth callback ── */}
            <Route path="/social/success" element={<SocialSuccess />} />

            {/* ── Login: redirect if already logged in ── */}
            <Route
              path="/login"
              element={
                isAdmin      ? <Navigate to="/yogaadmin"        replace /> :
                isReception  ? <Navigate to="/reception"        replace /> :
                isStudent    ? <Navigate to="/studentdashboard" replace /> :
                               <Login onLoginSuccess={onLoginSuccess} />
              }
            />

            {/* ── Protected: Student ── */}
            <Route
              path="/studentdashboard"
              element={
                isStudent ? <StudentDashboard onLogout={onLogout} /> :
                isAdmin   ? <Navigate to="/yogaadmin" replace /> :
                isReception ? <Navigate to="/reception" replace /> :
                            <Navigate to="/login"     replace />
              }
            />

            {/* ── Protected: Admin & Center Manager ── */}
            <Route
              path="/yogaadmin"
              element={
                isAdmin   ? <YogaAdmin onLogout={onLogout} isManager={isManager} /> :
                isReception ? <Navigate to="/reception" replace /> :
                isStudent ? <Navigate to="/studentdashboard" replace /> :
                            <Navigate to="/login"             replace />
              }
            />

            {/* ── Protected: Reception Staff ── */}
            <Route
              path="/reception"
              element={
                isReception ? <ReceptionDashboard onLogout={onLogout} /> :
                isAdmin     ? <Navigate to="/yogaadmin" replace /> :
                isStudent   ? <Navigate to="/studentdashboard" replace /> :
                              <Navigate to="/login" replace />
              }
            />

            {/* ── Catch-all ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </PageTransition>
      </AnimatePresence>

      {!onDashboardRoute && <Footer />}
      {!onDashboardRoute && <BackToTop />}
      {!onDashboardRoute && (
        <Suspense fallback={null}>
          <ChatbotWidget />
        </Suspense>
      )}
    </>
  );
};

export default App;
