import React from 'react';
import { Link } from 'react-router-dom';
import s from './YogaAdmin.module.css';
import {
  LuChevronsLeft, LuChevronsRight, LuPlus, LuLogOut, LuArrowLeft,
} from 'react-icons/lu';

const SECTIONS = [
  { label: 'Core Operations', range: [0, 5] },
  { label: 'Studio Management', range: [5, 10] },
  { label: 'Communications', range: [10, 17] },
  { label: 'Growth & Content', range: [17, 20] },
  { label: 'Book Store', range: [20, 24] },
];

export default function Sidebar({
  activeTab, setActiveTab, navItems, user, onSignOut,
  collapsed, onToggleCollapse, mobileOpen, onCloseMobile, onQuickCreate,
}) {
  const handleNav = (id) => { setActiveTab(id); onCloseMobile?.(); };

  return (
    <aside className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : ''} ${mobileOpen ? s.sidebarOpen : ''}`}>

      {/* ── Header ── */}
      <div className={s.sbHeader}>
        <div className={s.sbLogo}>
          <span className={s.sbLogoIcon}>🪷</span>
          {!collapsed && (
            <div className={s.sbLogoText}>
              <span className={s.sbLogoTitle}>AshramOS</span>
              <span className={s.sbLogoSub}>Pragya Yoga Studio</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className={s.sbCollapseBtn}
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <LuChevronsRight size={16} /> : <LuChevronsLeft size={16} />}
        </button>
      </div>

      {/* ── Profile ── */}
      <button type="button" className={s.sbProfile}>
        <div className={s.sbAvatar}>{user.avatar}</div>
        {!collapsed && (
          <div className={s.sbProfileMeta}>
            <div className={s.sbName}>{user.name}</div>
            <div className={s.sbRole}>{user.role}</div>
          </div>
        )}
      </button>

      {/* ── Quick Create ── */}
      <button type="button" className={s.sbQuickCreate} onClick={onQuickCreate}>
        <LuPlus size={18} />
        {!collapsed && <span>Quick Create</span>}
      </button>

      {/* ── Navigation ── */}
      <nav className={s.sbNav}>
        {SECTIONS.map((sec) => (
          <div key={sec.label} className={s.sbNavBlock}>
            {!collapsed && <div className={s.sbSectionLabel}>{sec.label}</div>}
            {navItems.slice(sec.range[0], sec.range[1]).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNav(tab.id)}
                  className={`${s.sbNavItem} ${isActive ? s.sbNavActive : ''}`}
                  title={tab.label}
                >
                  <span className={s.sbNavIcon}>{tab.icon}</span>
                  {!collapsed && <span className={s.sbNavText}>{tab.label}</span>}
                  {tab.badge != null && !collapsed && (
                    <span className={s.sbNavBadge}>{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className={s.sbFooter}>
        <Link to="/" className={s.sbFooterLink} title="Back to Website">
          <LuArrowLeft size={16} />
          {!collapsed && <span>Back to Website</span>}
        </Link>
        <button type="button" className={s.sbFooterBtn} onClick={onSignOut} title="Sign Out">
          <LuLogOut size={16} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
