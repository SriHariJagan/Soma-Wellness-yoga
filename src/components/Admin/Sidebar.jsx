import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import s from './YogaAdmin.module.css';
import {
  LuChevronsLeft, LuChevronsRight, LuPlus, LuLogOut, LuArrowLeft,
} from 'react-icons/lu';

export default function Sidebar({
  activeTab, setActiveTab, navItems, user, onSignOut,
  collapsed, onToggleCollapse, mobileOpen, onCloseMobile, onQuickCreate,
}) {
  const { t } = useTranslation();
  const handleNav = (id) => { setActiveTab(id); onCloseMobile?.(); };

  const SECTIONS = [
    { label: t('adminSidebar.coreOps'), range: [0, 5] },
    { label: t('adminSidebar.studioManagement'), range: [5, 10] },
    { label: t('adminSidebar.communications'), range: [10, 17] },
    { label: t('adminSidebar.growthContent'), range: [17, 20] },
    { label: t('adminSidebar.bookStore'), range: [20, 24] },
  ];

  return (
    <aside className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : ''} ${mobileOpen ? s.sidebarOpen : ''}`}>

      <div className={s.sbHeader}>
        <div className={s.sbLogo}>
          <span className={s.sbLogoIcon}>🪷</span>
          {!collapsed && (
            <div className={s.sbLogoText}>
              <span className={s.sbLogoTitle}>{t('adminSidebar.brand')}</span>
              <span className={s.sbLogoSub}>{t('adminSidebar.brandSub')}</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className={s.sbCollapseBtn}
          onClick={onToggleCollapse}
          title={collapsed ? t('adminSidebar.expand') : t('adminSidebar.collapse')}
        >
          {collapsed ? <LuChevronsRight size={16} /> : <LuChevronsLeft size={16} />}
        </button>
      </div>

      <button type="button" className={s.sbProfile}>
        <div className={s.sbAvatar}>{user.avatar}</div>
        {!collapsed && (
          <div className={s.sbProfileMeta}>
            <div className={s.sbName}>{user.name}</div>
            <div className={s.sbRole}>{user.role}</div>
          </div>
        )}
      </button>

      <button type="button" className={s.sbQuickCreate} onClick={onQuickCreate}>
        <LuPlus size={18} />
        {!collapsed && <span>{t('adminSidebar.quickCreate')}</span>}
      </button>

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

      <div className={s.sbFooter}>
        <Link to="/" className={s.sbFooterLink} title={t('adminSidebar.backToWebsite')}>
          <LuArrowLeft size={16} />
          {!collapsed && <span>{t('adminSidebar.backToWebsite')}</span>}
        </Link>
        <button type="button" className={s.sbFooterBtn} onClick={onSignOut} title={t('adminSidebar.signOut')}>
          <LuLogOut size={16} />
          {!collapsed && <span>{t('adminSidebar.signOut')}</span>}
        </button>
      </div>
    </aside>
  );
}
