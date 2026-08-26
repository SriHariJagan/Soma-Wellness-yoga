import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from "./components/Navbar/Navbar";
import Footer from './components/Footer/Footer';
import ScrollProgress from './components/common/ScrollProgress';
import BackToTop from './components/common/BackToTop';

import PageTransition from './components/common/PageTransition';
import Home from './pages/Home';
import { ROUTE_META, applyMeta } from './lib/seo';
import { getLandingPage } from './data/landingPages';
import SomaLoader from "./components/soma/SomaLoader";

// ── Route-level code splitting: only Home loads eagerly. Everything else is
//    fetched on demand so the initial bundle stays small. ──
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
const Books = lazy(() => import('./pages/Books'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const BookCheckout = lazy(() => import('./pages/BookCheckout'));
const BulkOrders = lazy(() => import('./pages/BulkOrders'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AdminTestPages = lazy(() => import('./pages/AdminTestPages'));
const FoundingMembers = lazy(() => import('./pages/FoundingMembers'));

const RouteFallback = () => <SomaLoader compact />;

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on boot
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser && savedUser !== "undefined") {
      try {
        const parsed = JSON.parse(savedUser);
        // Only restore if role exists — prevents bad sessions from persisting
        if (parsed && parsed.role) {
          setUser(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved session:", e);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (token, userPayload) => {
    // Persist to state — role must exist for protected routes to work
    setUser(userPayload);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  if (loading) {
    return <SomaLoader />;
  }

  const isAdmin   = user?.role === "admin";
  const isStudent = user?.role === "student";
  const isDashboard = isAdmin || isStudent;

  return (
    <BrowserRouter>
      <AppShell
        user={user}
        isAdmin={isAdmin}
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
const AppShell = ({ user, isAdmin, isStudent, isDashboard, onLogout, onLoginSuccess }) => {
  const location = useLocation();

  // ── SEO: apply per-route title + meta description on navigation ──
  useEffect(() => {
    const landing = getLandingPage(location.pathname);
    const meta = landing
      ? { title: landing.title, description: landing.description }
      : ROUTE_META[location.pathname] || ROUTE_META["/"];
    applyMeta(meta);
  }, [location.pathname]);

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
  const dashboardRoutes = ["/yogaadmin", "/studentdashboard"];
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
            {/* Legacy books routes — hidden from navigation (no books section as requested), kept for data compat but redirect to home */}
            <Route path="/books" element={<Navigate to="/" replace />} />
            <Route path="/books/:slug" element={<Navigate to="/" replace />} />
            <Route path="/bulk-orders" element={<Navigate to="/" replace />} />
            <Route path="/order-tracking" element={<OrderTracking />} />
            <Route path="/personal-yoga-classes-malviya-nagar" element={<LandingPage slug="personal-yoga-classes-malviya-nagar" />} />
            <Route path="/kids-yoga-malviya-nagar" element={<LandingPage slug="kids-yoga-malviya-nagar" />} />
            <Route path="/prenatal-yoga-malviya-nagar" element={<LandingPage slug="prenatal-yoga-malviya-nagar" />} />
            <Route path="/yoga-for-stress-malviya-nagar" element={<LandingPage slug="yoga-for-stress-malviya-nagar" />} />
            <Route path="/corporate-yoga-malviya-nagar" element={<LandingPage slug="corporate-yoga-malviya-nagar" />} />
            <Route path="/corporate-yoga-durgapura" element={<LandingPage slug="corporate-yoga-durgapura" />} />
            <Route path="/therapeutic-yoga-malviya-nagar" element={<LandingPage slug="therapeutic-yoga-malviya-nagar" />} />
            <Route path="/therapeutic-yoga-durgapura" element={<LandingPage slug="therapeutic-yoga-durgapura" />} />
            <Route path="/online-yoga-classes-in-india" element={<LandingPage slug="online-yoga-classes-in-india" />} />
            <Route path="/best-yoga-classes-jaipur" element={<LandingPage slug="best-yoga-classes-jaipur" />} />
            <Route path="/personal-yoga-classes-durgapura" element={<LandingPage slug="personal-yoga-classes-durgapura" />} />
            <Route path="/personal-yoga-classes-jagatpura" element={<LandingPage slug="personal-yoga-classes-jagatpura" />} />
            <Route path="/kids-yoga-durgapura" element={<LandingPage slug="kids-yoga-durgapura" />} />
            <Route path="/kids-yoga-jagatpura" element={<LandingPage slug="kids-yoga-jagatpura" />} />
            <Route path="/prenatal-yoga-durgapura" element={<LandingPage slug="prenatal-yoga-durgapura" />} />
            <Route path="/prenatal-yoga-jagatpura" element={<LandingPage slug="prenatal-yoga-jagatpura" />} />
            <Route path="/yoga-for-stress-durgapura" element={<LandingPage slug="yoga-for-stress-durgapura" />} />
            <Route path="/yoga-for-stress-jagatpura" element={<LandingPage slug="yoga-for-stress-jagatpura" />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/newuser"          element={<NewUser />} />
            <Route path="/forgot-password"  element={<ForgotPassword />} />
            <Route path="/reset-password"   element={<ResetPassword />} />
            <Route path="/profile"          element={<Profile />} />

            {/* ── Login: redirect if already logged in ── */}
            <Route
              path="/login"
              element={
                isAdmin   ? <Navigate to="/yogaadmin"        replace /> :
                isStudent ? <Navigate to="/studentdashboard" replace /> :
                            <Login onLoginSuccess={onLoginSuccess} />
              }
            />

            {/* ── Protected: Student ── */}
            <Route
              path="/studentdashboard"
              element={
                isStudent ? <StudentDashboard onLogout={onLogout} /> :
                isAdmin   ? <Navigate to="/yogaadmin" replace /> :
                            <Navigate to="/login"     replace />
              }
            />

            {/* ── Protected: Admin ── */}
            <Route
              path="/yogaadmin"
              element={
                isAdmin   ? <YogaAdmin onLogout={onLogout} /> :
                isStudent ? <Navigate to="/studentdashboard" replace /> :
                            <Navigate to="/login"             replace />
              }
            />

            {/* ── Admin Test Pages (Public Access) ── */}
            <Route
              path="/admin/test-pages"
              element={<AdminTestPages />}
            />

            {/* ── Protected: Book checkout ── */}
            <Route
              path="/checkout"
              element={
                isStudent ? <BookCheckout /> :
                isAdmin   ? <Navigate to="/yogaadmin" replace /> :
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
    </>
  );
};

export default App;
