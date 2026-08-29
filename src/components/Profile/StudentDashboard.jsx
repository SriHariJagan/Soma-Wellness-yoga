import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./StudentDashboard.module.css";
import { getStudentProfile, getActiveMembership, getCartCount } from "../api/StudentServices.js";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher.jsx";

const ProfilePage = lazy(() => import("./ProfilePage"));
const ActivePlanPage = lazy(() => import("./ActivePlanPage"));
const BrowsePlansPage = lazy(() => import("./BrowsePlansPage"));
const AttendancePage = lazy(() => import("./AttendancePage"));
const PaymentsPage = lazy(() => import("./PaymentsPage"));
const ClassesPage = lazy(() => import("./ClassesPage"));
const DownloadsPage = lazy(() => import("./DownloadsPage"));
const ConsultationPage = lazy(() => import("./ConsultationPage"));
const WorkshopsPage = lazy(() => import("./WorkshopsPage"));
const EventsPage = lazy(() => import("./EventsPage"));

const NotificationsPage = lazy(() => import("./NotificationsPage"));
const CartPage = lazy(() => import("./CartPage"));
const ActiveServicesPage = lazy(() => import("./ActiveServicesPage"));
const AvailableServicesPage = lazy(() => import("./AvailableServicesPage"));
const FreeTrialPage = lazy(() => import("./FreeTrialPage"));
const BlogsPage = lazy(() => import("./BlogsPage"));
const MyBlogsPage = lazy(() => import("./MyBlogsPage"));
const BlogEditor = lazy(() => import("./BlogEditor"));
const BlogDetail = lazy(() => import("./BlogDetail"));
const YTTCPage = lazy(() => import("./YTTCPage"));
const OrderHistoryPage = lazy(() => import("./OrderHistoryPage"));

const NAV_KEYS = [
  { id: "soma",          key: "dashboard.soma",           icon: "ti-heart"          },
  { id: "profile",       key: "dashboard.profile",        icon: "ti-user"           },
  { id: "cart",          key: "dashboard.myCart",         icon: "ti-shopping-cart"  },
  { id: "orders",        key: "dashboard.orderHistory",   icon: "ti-receipt-2"      },
  { id: "browsePlans",   key: "dashboard.browsePlans",    icon: "ti-currency-rupee" },
  { id: "plan",          key: "dashboard.activePlan",     icon: "ti-shield-check"   },
  { id: "services",      key: "dashboard.activeServices", icon: "ti-package"        },
  { id: "browseServices",key: "dashboard.browseServices", icon: "ti-layout-grid" },
  { id: "yttc",          key: "dashboard.yttc",           icon: "ti-certificate" },
  { id: "attendance",    key: "dashboard.attendance",     icon: "ti-calendar-check" },
  { id: "payments",      key: "dashboard.payments",       icon: "ti-receipt"        },
  { id: "classes",       key: "dashboard.classes",        icon: "ti-yoga"           },
  { id: "downloads",     key: "dashboard.downloads",      icon: "ti-download"       },
  { id: "consultations", key: "dashboard.consultations",  icon: "ti-stethoscope"    },
  { id: "workshops",     key: "dashboard.workshops",      icon: "ti-award"          },
  { id: "events",        key: "dashboard.events",         icon: "ti-calendar-event" },

  { id: "notifications", key: "dashboard.notifications",  icon: "ti-bell"           },
  { id: "trial",         key: "dashboard.freeTrial",      icon: "ti-gift"           },
  { id: "blogs",         key: "dashboard.blogs",          icon: "ti-article"        },
  { id: "myBlogs",       key: "dashboard.myBlogs",        icon: "ti-pencil"         },
];

const SomaDashboard = lazy(() => import("./SomaDashboard"));
const PAGE_MAP = {
  soma:          SomaDashboard,
  profile:       ProfilePage,
  cart:          CartPage,
  orders:        OrderHistoryPage,
  browsePlans:   BrowsePlansPage,
  plan:          ActivePlanPage,
  services:      ActiveServicesPage,
  browseServices:AvailableServicesPage,
  yttc: YTTCPage,
  attendance:    AttendancePage,
  payments:      PaymentsPage,
  classes:       ClassesPage,
  downloads:     DownloadsPage,
  consultations: ConsultationPage,
  workshops:     WorkshopsPage,
  events:        EventsPage,

  notifications: NotificationsPage,
  trial:         FreeTrialPage,
  blogs:         BlogsPage,
  myBlogs:       MyBlogsPage,
  blogEditor:    BlogEditor,
  blogDetail:    BlogDetail,
};

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -10, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
};

export default function StudentDashboard({ onLogout }) {
  const { t } = useTranslation();
  const NAV = NAV_KEYS.map((n) => ({ ...n, label: t(n.key) }));
  const [student, setStudent]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState("");
  const [activePage, setActivePage]   = useState("profile");
  const [activeParams, setActiveParams] = useState({});
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeMembership, setActiveMembership] = useState(null);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [navigate]);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab && NAV.some((n) => n.id === tab)) {
      handleNav(tab);
    }
  }, []);

  /* Listen for cart-update events from Add to Cart / Remove */
  useEffect(() => {
    const handler = (e) => {
      if (e.detail && e.detail.count !== undefined) setCartCount(e.detail.count);
    };
    window.addEventListener("cart-update", handler);
    return () => window.removeEventListener("cart-update", handler);
  }, []);

  /* Listen for toast events from child pages */
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) showToast(e.detail.message, e.detail.type);
    };
    window.addEventListener("app-toast", handler);
    return () => window.removeEventListener("app-toast", handler);
  }, [showToast]);

  async function loadProfile() {
      try {
        // ─── 1. SECURITY TIER GUARD ───
        const savedUser = JSON.parse(localStorage.getItem("user"));

        if (!savedUser) {
          setFetchError("Please log in to access your dashboard.");
          setLoading(false);
          return;
        }

        // 🎯 FIX FOR ADMINS: If an admin hits this route, redirect to the Admin Portal.
        if (savedUser.role === "admin") {
          navigate("/yogaadmin", { replace: true });
          return;
        }

        // ─── 2. ATTEMPT SERVICE FETCH ───
        try {
          const [data, membership, cartCountData] = await Promise.all([
            getStudentProfile(),
            getActiveMembership(),
            getCartCount().catch(() => ({ count: 0 })),
          ]);
          setStudent(data);
          setUnreadNotifs(data.unreadNotifications ?? 0);
          setCartCount(cartCountData?.count ?? 0);
          setActiveMembership(membership);
        } catch (apiErr) {
          // Fall back to the cached login session so the screen never crashes.
          console.warn("Profile fetch failed, using cached session:", apiErr.message);
          setStudent(savedUser);
          setUnreadNotifs(savedUser.unreadNotifications ?? 0);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
        setFetchError(`Failed to load profile details: ${err.message}`);
      } finally {
        setLoading(false);
      }
  }

  // Re-fetch the aggregated dashboard after any mutating action so every
  // widget reflects the new MongoDB state.
  async function reloadStudent() {
    try {
      const [data, membership, cartCountData] = await Promise.all([
        getStudentProfile(),
        getActiveMembership(),
        getCartCount().catch(() => ({ count: 0 })),
      ]);
      setStudent(data);
      setUnreadNotifs(data.unreadNotifications ?? 0);
      setCartCount(cartCountData?.count ?? 0);
      setActiveMembership(membership);
      return data;
    } catch (err) {
      console.warn("reloadStudent failed:", err.message);
    }
  }

  if (loading) {
    return (
      <div className={styles.bootScreen}>
        <div className={styles.bootCard}>
          <span className={styles.bootSpinner} aria-hidden="true" />
          <p>{t("dashboard.loadingProfile")}</p>
        </div>
      </div>
    );
  }

  if (fetchError || !student) {
    return (
      <div className={styles.bootScreen}>
        <div className={styles.bootCard}>
          <span className={styles.bootIcon} aria-hidden="true"><i className="ti ti-lock" /></span>
          <p>{fetchError || t("dashboard.accessDenied")}</p>
          <button onClick={handleLogout} className={styles.bootBtn}>{t("dashboard.backToLogin")}</button>
        </div>
      </div>
    );
  }

  // Safely extract names for initials calculation without crashing
  const studentName = student.name || student.email?.split("@")[0] || "User";
  const initials = studentName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const ActivePage = PAGE_MAP[activePage] ?? ProfilePage;

  function handleNav(id, params = {}) {
    setActivePage(id);
    setActiveParams(params);
    if (id === "notifications") setUnreadNotifs(0);
  }

  function handleStudentUpdate(updatedStudent) {
    setStudent(updatedStudent);
    localStorage.setItem("user", JSON.stringify(updatedStudent)); // Keep storage synced
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (typeof onLogout === "function") {
      onLogout();
    }
    navigate("/");
  }

  return (
    <div className={`${styles.shell} ${isCollapsed ? styles.shellCollapsed : ""}`}>

      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>

        <div className={styles.toggleHeader}>
          <span className={styles.brandMark} aria-hidden="true"><i className="ti ti-lotus" /></span>
          {!isCollapsed && <span className={styles.brandTitle}>Workspace</span>}
          <button
            type="button"
            className={styles.toggleCollapseBtn}
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <i className={`ti ${isCollapsed ? "ti-layout-sidebar-right-expand" : "ti-layout-sidebar-left-collapse"}`} />
          </button>
        </div>

        <button type="button" className={styles.sbProfile} onClick={() => handleNav("profile")}>
          <div className={styles.avatar}>
            {initials}
            <span className={styles.avatarDot} aria-hidden="true" />
          </div>
          <div className={styles.profileMeta}>
            <div className={styles.sbName}>{studentName}</div>
            <div className={styles.sbPlan}>
              {activeMembership && activeMembership.isActive
                ? <><span className={styles.sbPlanHighlight}>{activeMembership.planMonths}-mo</span> {t("dashboard.plan")} · <span style={{color:'#16A34A',fontWeight:600,fontSize:11}}>{t("dashboard.statusActive")}</span></>
                : activeMembership && activeMembership.isPaused
                  ? <><span className={styles.sbPlanHighlight}>{activeMembership.planMonths}-mo</span> {t("dashboard.plan")} · <span style={{color:'#D97706',fontWeight:600,fontSize:11}}>{t("dashboard.statusPaused")}</span></>
                  : activeMembership
                    ? <span className={styles.sbPlanMuted}>{t("dashboard.statusExpired")}</span>
                    : <span className={styles.sbPlanMuted}>{t("dashboard.noActivePlan")}</span>
              }
            </div>
          </div>
        </button>

        <nav className={styles.nav} aria-label={t("dashboard.navAria")}>
          {NAV.map(({ id, label, icon }) => {
            const isActive = activePage === id;
            return (
              <button
                key={id}
                type="button"
                className={`${styles.navItem} ${isActive ? styles.navActive : ""}`}
                onClick={() => handleNav(id)}
                aria-current={isActive ? "page" : undefined}
                title={isCollapsed ? label : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="studentNavPill"
                    className={styles.navPill}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    aria-hidden="true"
                  />
                )}
                <i className={`ti ${icon}`} aria-hidden="true" />
                <span className={styles.navLabel}>{label}</span>
                {id === "notifications" && unreadNotifs > 0 && !isCollapsed && (
                  <span className={styles.notifBadge} role="status">{unreadNotifs}</span>
                )}
                {id === "cart" && cartCount > 0 && !isCollapsed && (
                  <span className={styles.notifBadge} style={{ background: "#F97316", color: "#fff" }} role="status">{cartCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className={styles.sbFooter}>
          <div style={{ display:'flex', justifyContent:'center' }}><LanguageSwitcher compact /></div>
          <button type="button" className={styles.enrollBtn} onClick={() => handleNav("classes")}>
            <i className="ti ti-plus" aria-hidden="true" />
            <span className={styles.navLabel}>{t("dashboard.enrollBook")}</span>
          </button>
          <button type="button" className={styles.navItem} onClick={() => navigate("/")} title={isCollapsed ? t("navigation.backToWebsite") : undefined}>
            <i className="ti ti-arrow-left" aria-hidden="true" />
            <span className={styles.navLabel}>{t("navigation.backToWebsite")}</span>
          </button>
          <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
            <i className="ti ti-logout" aria-hidden="true" />
            <span className={styles.navLabel}>{t("dashboard.signOut")}</span>
          </button>
        </div>
      </aside>

      {/* Global toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -30, x: "-50%" }}
            style={{
              position: "fixed", top: 20, left: "50%", zIndex: 99999,
              padding: "10px 22px", borderRadius: 10,
              background: toast.type === "success"
                ? "linear-gradient(135deg, #059669, #10B981)"
                : toast.type === "error"
                  ? "linear-gradient(135deg, #DC2626, #EF4444)"
                  : "linear-gradient(135deg, #D97706, #F59E0B)",
              color: "#fff", fontSize: 13, fontWeight: 600,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: "'Inter', sans-serif", whiteSpace: "nowrap",
            }}
          >
            <i className={`ti ${toast.type === "success" ? "ti-circle-check" : toast.type === "error" ? "ti-alert-circle" : "ti-info-circle"}`} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <main className={styles.main}>
        <div className={styles.mainInner}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <Suspense fallback={
                <div className={styles.bootScreen} role="status" aria-label="Loading page">
                  <div className={styles.bootCard}>
                    <span className={styles.bootSpinner} aria-hidden="true" />
                    <p>Loading…</p>
                  </div>
                </div>
              }>
                <ActivePage
                  student={student}
                  onUpdateSuccess={handleStudentUpdate}
                  reload={reloadStudent}
                  onNavigate={handleNav}
                  blogId={activeParams.blogId}
                  workshopId={activeParams.workshopId}
                />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
