import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { receptionApi } from '../api/AdminServices';
import { LuFlower2,
  LuLayoutDashboard, LuUsers, LuCalendarCheck, LuMail, LuBookOpen,
  LuLogOut, LuChevronsLeft, LuChevronsRight, LuArrowLeft,
  LuMenu, LuCalendarDays, LuGraduationCap,
} from 'react-icons/lu';
import s from '../Admin/YogaAdmin.module.css';
import LanguageSwitcher from '../common/LanguageSwitcher.jsx';

const TabFallback = () => (
  <div className={s.tabFallback}>
    <div className={s.spinner} />
    <span>Loading...</span>
  </div>
);

const NAV_CONFIG = [
  { id: 'overview',      label: 'Overview',           icon: <LuLayoutDashboard size={18} />, requiredPerms: [],                                        section: 'Main' },
  { id: 'customers',     label: 'Customers',          icon: <LuUsers size={18} />,           requiredPerms: ['customers.view', 'users.view'],         section: 'Front Desk' },
  { id: 'courses',       label: 'Courses & Services', icon: <LuGraduationCap size={18} />,   requiredPerms: ['courses.view'],                         section: 'Front Desk' },
  { id: 'classes',       label: 'Classes',            icon: <LuBookOpen size={18} />,        requiredPerms: ['classes.view', 'courses.view'],        section: 'Operations' },
  { id: 'class-invites', label: 'Class Invites',      icon: <LuMail size={18} />,            requiredPerms: ['bookings.view', 'sections.view'],      section: 'Operations' },
  { id: 'attendance',    label: 'Attendance',         icon: <LuCalendarCheck size={18} />,   requiredPerms: ['attendance.view', 'classes.attendance'], section: 'Operations' },
  { id: 'events',        label: 'Events',             icon: <LuCalendarDays size={18} />,    requiredPerms: ['courses.view'],                         section: 'Operations' },
];

export default function ReceptionDashboard({ onLogout = () => {} }) {
  const { user, hasAnyPermission, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState('');
  const [activityLog, setActivityLog] = useState([]);
  // Incremented when Overview asks CustomersTab to open its create modal.
  const [customerCreateSignal, setCustomerCreateSignal] = useState(0);

  const navItems = NAV_CONFIG.filter((item) => {
    if (item.requiredPerms.length === 0) return true;
    return hasAnyPermission(...item.requiredPerms);
  });

  // Refresh authoritative permissions from the server on mount so admin
  // changes apply without forcing a logout/login.
  useEffect(() => {
    refreshProfile?.().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the active tab is no longer permitted (e.g. admin revoked access),
  // fall back to the first permitted tab.
  useEffect(() => {
    if (!navItems.some((t) => t.id === activeTab)) {
      setActiveTab(navItems[0]?.id || 'overview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.permissions?.join(','), activeTab]);

  const loadOverview = useCallback(async () => {
    setOverviewError('');
    try {
      const [ov, log] = await Promise.all([
        receptionApi.overview().catch((err) => {
          // 403 = reception has none of the overview permissions — show a
          // helpful message instead of a blank dashboard.
          setOverviewError(err?.message || 'Overview unavailable');
          return null;
        }),
        receptionApi.activityLog().catch(() => []),
      ]);
      if (ov) setOverview(ov);
      if (log) setActivityLog(log);
    } catch {}
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  // Called by tabs (e.g. Overview quick actions) to jump to another tab,
  // optionally triggering an action such as opening the create modal.
  const handleNavigate = useCallback((tab, action) => {
    setActiveTab(tab);
    setMobileOpen(false);
    if (tab === 'customers' && action === 'create') {
      setCustomerCreateSignal((n) => n + 1);
    }
  }, []);

  const receptionUser = {
    name: user?.name || 'Reception',
    role: 'Reception Staff',
    avatar: (user?.name || 'R').charAt(0).toUpperCase(),
  };

  const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
  const CustomersTab = lazy(() => import('./tabs/CustomersTab'));
  const ClassesTab = lazy(() => import('./tabs/ClassesTab'));
  const AttendanceTab = lazy(() => import('./tabs/AttendanceTab'));
  const ClassInvitesTab = lazy(() => import('./tabs/ClassInvitesTab'));
  const CoursesTab = lazy(() => import('./tabs/CoursesTab'));
  const EventsTab = lazy(() => import('./tabs/EventsTab'));

  return (
    <div className={`${s.shell} ${collapsed ? s.shellCollapsed : ''}`}>
      {mobileOpen && <div className={s.backdrop} onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : ''} ${mobileOpen ? s.sidebarOpen : ''}`}>
        <div className={s.sbHeader}>
          <div className={s.sbLogo}>
            <span className={s.sbLogoIcon}><LuFlower2 size={20} /></span>
            {!collapsed && (
              <div className={s.sbLogoText}>
                <span className={s.sbLogoTitle}>SomaWellness</span>
                <span className={s.sbLogoSub}>Reception</span>
              </div>
            )}
          </div>
          <button type="button" className={s.sbCollapseBtn} onClick={() => setCollapsed(v => !v)}>
            {collapsed ? <LuChevronsRight size={16} /> : <LuChevronsLeft size={16} />}
          </button>
        </div>

        <div className={s.sbProfile}>
          <div className={s.sbAvatar}>{receptionUser.avatar}</div>
          {!collapsed && (
            <div className={s.sbProfileMeta}>
              <div className={s.sbName}>{receptionUser.name}</div>
              <div className={s.sbRole}>{receptionUser.role}</div>
            </div>
          )}
        </div>

        <nav className={s.sbNav}>
          {(() => {
            // Group permitted items by section, preserving NAV_CONFIG order.
            const groups = [];
            for (const tab of navItems) {
              const last = groups[groups.length - 1];
              if (last && last.section === tab.section) last.items.push(tab);
              else groups.push({ section: tab.section, items: [tab] });
            }
            return groups.map((g) => (
              <div key={g.section} className={s.sbNavBlock}>
                {!collapsed && <div className={s.sbSectionLabel}>{g.section}</div>}
                {g.items.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`${s.sbNavItem} ${isActive ? s.sbNavActive : ''}`}
                      title={tab.label}
                    >
                      <span className={s.sbNavIcon}>{tab.icon}</span>
                      {!collapsed && <span className={s.sbNavText}>{tab.label}</span>}
                    </button>
                  );
                })}
              </div>
            ));
          })()}
        </nav>

        <div className={s.sbFooter}>
          {!collapsed && <div style={{ display:'flex', justifyContent:'center' }}><LanguageSwitcher compact /></div>}
          <Link to="/" className={s.sbFooterLink} title="Back to Website">
            <LuArrowLeft size={16} />
            {!collapsed && <span>Back to Website</span>}
          </Link>
          <button type="button" className={s.sbFooterBtn} onClick={onLogout} title="Sign Out">
            <LuLogOut size={16} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className={s.contentArea}>
        {/* Floating menu button — mobile only (desktop hides .mobileMenuBtn via CSS) */}
        <button
          type="button"
          className={s.mobileMenuBtn}
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          style={{ position: 'fixed', bottom: 18, left: 18, zIndex: 60, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
        >
          <LuMenu size={19} />
        </button>

        <main className={s.main}>
          {navItems.length <= 1 && overviewError && (
            <div className={s.feedback} role="alert" style={{ marginBottom: 12 }}>
              {overviewError}. Contact an admin to grant Overview access
              (customers.view, bookings.view or attendance.view).
            </div>
          )}
          <Suspense fallback={<TabFallback />}>
            {activeTab === 'overview' && <OverviewTab overview={overview} activityLog={activityLog} overviewError={overviewError} onNavigate={handleNavigate} />}
            {activeTab === 'customers' && <CustomersTab createSignal={customerCreateSignal} />}
            {activeTab === 'classes' && <ClassesTab />}
            {activeTab === 'attendance' && <AttendanceTab />}
            {activeTab === 'class-invites' && <ClassInvitesTab />}
            {activeTab === 'courses' && <CoursesTab />}
            {activeTab === 'events' && <EventsTab />}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
