import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaYoutube } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { AnimatePresence, motion } from "framer-motion";
import { getMembershipStatus } from "../api/StudentServices";
import styles from "./Navbar.module.css";
import SomaLogo from "../soma/SomaLogo";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { useTranslation } from "react-i18next";

const navLinksConfig = [
  { key: "navigation.join", path: "/classes", num: "01" },
  { key: "navigation.private", path: "/private", num: "02" },
  { key: "navigation.lifeStages", path: "/life-stages", num: "03" },
  { key: "navigation.restore", path: "/restore", num: "04" },
  { key: "navigation.academy", path: "/yttc", num: "05" },
  { key: "navigation.founding", path: "/founding", num: "06" },
];

const socialLinks = [
  { href: "https://www.facebook.com/somawellness", label: "Facebook", icon: <FaFacebookF /> },
  { href: "https://www.instagram.com/somawellness/", label: "Instagram", icon: <FaInstagram /> },
  { href: "https://www.youtube.com/c/KapilKesari", label: "YouTube", icon: <FaYoutube /> },
  { href: "https://twitter.com/SomaWellness", label: "Twitter/X", icon: <FaXTwitter /> },
];

const sidebarVariants = {
  closed: { x: "100%", transition: { type: "spring", damping: 30, stiffness: 260 } },
  open: {
    x: 0,
    transition: { type: "spring", damping: 28, stiffness: 240, when: "beforeChildren", staggerChildren: 0.07, delayChildren: 0.08 },
  },
};
const drawerLinkVariants = {
  closed: { opacity: 0, x: 28 },
  open: { opacity: 1, x: 0, transition: { type: "spring", damping: 22, stiffness: 280 } },
};
const dropdownVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.15 } },
};

const Navbar = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const navLinks = navLinksConfig.map((c) => ({ ...c, label: t(c.key) }));
  const location = useLocation();
  const navigate = useNavigate();
  const dropRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [membershipStatus, setMembershipStatus] = useState(null);

  useEffect(() => {
    if (user && user.role !== "admin") {
      getMembershipStatus().then((res) => setMembershipStatus(res)).catch(() => {});
    }
  }, [user]);

  const isPlanActive = membershipStatus
    ? membershipStatus.planActive || membershipStatus.isPaused
    : user ? user.planActive || (user.planMonths || 0) > 0 : false;
  const isPaused = membershipStatus?.isPaused ?? false;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    setDropOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const initials = user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "YS";

  const handleLogoutClick = async () => {
    setDropOpen(false);
    try {
      await onLogout?.();
    } catch {}
    navigate("/login", { replace: true });
  };

  const solidNavPages = ["/about", "/classes", "/private", "/life-stages", "/restore", "/yttc", "/faq", "/events", "/contact", "/order-tracking", "/checkout", "/books", "/bulk-orders", "/login", "/newuser", "/payment"];
  const isHome = location.pathname === "/";
  const solidNav = solidNavPages.includes(location.pathname) || location.pathname.startsWith("/books/");
  const dashboardPath = user?.role === "admin" ? "/yogaadmin" : "/studentdashboard";
  const dropdownItems = [
    { label: t("navigation.dashboard"), path: dashboardPath, icon: <DashIcon /> },
    { label: t("navigation.profile"), path: "/profile", icon: <UserIcon /> },
  ];

  return (
    <>
      <header className={`${styles.root} ${scrolled ? styles.scrolled : ""} ${solidNav ? styles.solid : ""}`}>
        <nav className={styles.navbar}>
          <div className={styles.navInner}>
            <Link className={styles.logo} to="/" aria-label="Soma Wellness — Home">
              <SomaLogo size={56} variant={isHome && !scrolled && !solidNav ? "dark" : "dark"} />
            </Link>

            <div className={styles.navLinks}>
              {navLinks.map(({ label, path }) => (
                <Link
                  key={path}
                  className={`${styles.navLink} ${location.pathname === path ? styles.active : ""}`}
                  to={path}
                >
                  {label}
                </Link>
              ))}
            </div>

            <div className={styles.navActions} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div className={styles.langSwitcherWrap}>
                <LanguageSwitcher compact />
              </div>
              <div className={styles.userSection}>
              {user ? (
                <div className={styles.userCluster} ref={dropRef}>
                  <button className={styles.clusterBtn} onClick={() => setDropOpen(!dropOpen)} aria-expanded={dropOpen} aria-haspopup="true">
                    <div className={styles.avatar}>{initials}</div>
                    <div className={styles.clusterText}>
                      <span className={styles.clusterName}>{user.name}</span>
                      <span className={styles.clusterPlan}>
                        {user.role === "admin" ? t("navbar.admin") : user.planMonths ? `${user.planMonths}-month plan` : t("navbar.member")}
                      </span>
                    </div>
                    <ChevronIcon className={`${styles.chevron} ${dropOpen ? styles.chevronOpen : ""}`} />
                  </button>
                  <AnimatePresence>
                    {dropOpen && (
                      <motion.div className={styles.dropdown} variants={dropdownVariants} initial="hidden" animate="visible" exit="exit">
                        <div className={styles.ddHeader}>
                          <div className={styles.ddAvatar}>{initials}</div>
                          <div>
                            <p className={styles.ddName}>{user.name}</p>
                            <p className={styles.ddPlan}>
                              {user.role === "admin" ? t("navbar.adminAccess") : user.planMonths ? `${user.planMonths}-month` : t("navbar.member")}
                              {user.role !== "admin" && (
                                <>
                                  {" · "}
                                  <span className={isPaused ? styles.ddPaused : isPlanActive ? styles.ddActive : styles.ddExpired}>
                                    {isPaused ? t("navbar.statusPaused") : isPlanActive ? t("navbar.statusActive") : t("navbar.statusAvailable")}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        {dropdownItems.map((item, index) => (
                          <button key={index} className={styles.ddItem} onClick={() => navigate(item.path)}>
                            {item.icon} {item.label}
                          </button>
                        ))}
                        <div className={styles.ddDivider} />
                        <button className={`${styles.ddItem} ${styles.ddDanger}`} onClick={handleLogoutClick}>
                          <LogoutIcon /> {t("navigation.signOut")}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className={styles.guestBtns}>
                  <Link className={styles.btnGhost} to="/login">{t("navigation.signIn")}</Link>
                  <Link className={`${styles.btnOrange} ${isHome && !scrolled ? styles.bookBtnGold : ""}`} to="/classes">{t("navigation.book")}</Link>
                </div>
              )}
              </div>
            </div>

            <button className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>
              <span className={`${styles.bar} ${menuOpen ? styles.barOpen1 : ""}`} />
              <span className={`${styles.bar} ${menuOpen ? styles.barOpen2 : ""}`} />
              <span className={`${styles.bar} ${menuOpen ? styles.barOpen3 : ""}`} />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} />
            <motion.div className={styles.drawer} variants={sidebarVariants} initial="closed" animate="open" exit="closed">
              <div className={styles.drawerHeader}>
                <SomaLogo size={48} />
                <button className={styles.drawerClose} onClick={() => setMenuOpen(false)} aria-label="Close menu"><CloseIcon /></button>
              </div>
              <div className={styles.drawerBody}>
                <motion.div className={styles.drawerLinks} initial="hidden" animate="open" exit="closed" variants={{ open: { transition: { staggerChildren: 0.06 } } }}>
                  <motion.div variants={drawerLinkVariants}>
                    <Link className={`${styles.drawerLink} ${location.pathname === "/" ? styles.drawerActive : ""}`} to="/" onClick={() => setMenuOpen(false)}>
                      <span>{t("navigation.home")}</span><span>— {t("navbar.startHere")}</span>
                    </Link>
                  </motion.div>
                  {navLinks.map(({ label, path, num }) => (
                    <motion.div key={path} variants={drawerLinkVariants}>
                      <Link className={`${styles.drawerLink} ${location.pathname === path ? styles.drawerActive : ""}`} to={path} onClick={() => setMenuOpen(false)}>
                        <span>{label}</span><span>{num}</span>
                      </Link>
                    </motion.div>
                  ))}
                  {user ? (
                    <>
                      <motion.div variants={drawerLinkVariants}>
                        <Link className={styles.drawerLink} to={dashboardPath} onClick={() => setMenuOpen(false)}><span>{t("navigation.dashboard")}</span><span>→</span></Link>
                      </motion.div>
                      <motion.div variants={drawerLinkVariants}>
                        <button className={styles.drawerLink} style={{ width: "100%", textAlign: "left", border: "none", background: "none" }} onClick={() => { setMenuOpen(false); handleLogoutClick(); }}>
                          <span>{t("navigation.signOut")}</span><span>—</span>
                        </button>
                      </motion.div>
                    </>
                  ) : (
                    <>
                      <motion.div variants={drawerLinkVariants}>
                        <Link className={styles.drawerLink} to="/login" onClick={() => setMenuOpen(false)}><span>{t("navigation.signIn")}</span><span>→</span></Link>
                      </motion.div>
                      <motion.div variants={drawerLinkVariants}>
                        <Link className={styles.drawerLink} to="/newuser" onClick={() => setMenuOpen(false)}><span>{t("navigation.beginJourney")}</span><span>✦</span></Link>
                      </motion.div>
                    </>
                  )}
                </motion.div>

                <div style={{ padding: "12px 0", display: "flex", justifyContent: "center" }}>
                  <LanguageSwitcher />
                </div>

                <div className={styles.drawerMeta}>
                  <div>
                    <p className={styles.drawerMetaLabel}>{t("footer.visit")}</p>
                    <p className={styles.drawerContact} style={{ marginTop: 8 }}>
                      {t("navbar.address")}<br />{t("navbar.studioType")}<br />
                      <a href="tel:+254700000000">+254 700 000 000</a> · <a href="mailto:hello@somawellness.co.ke">hello@somawellness.co.ke</a>
                    </p>
                  </div>
                  <div className={styles.drawerSocial}>
                    {socialLinks.map(({ href, label, icon }) => (
                      <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label}>{icon}</a>
                    ))}
                  </div>
                  <Link to="/classes" onClick={() => setMenuOpen(false)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "16px 24px", borderRadius: 9999, background: "#183D2D", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 8 }}>
                    {t("navigation.bookSession")} →
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;

const ChevronIcon = ({ className }) => (
  <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const DashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
);
const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
);
