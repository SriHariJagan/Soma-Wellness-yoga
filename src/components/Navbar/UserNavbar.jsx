import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import s from './UserNavbar.module.css';

export default function UserNavbar({ user, onLogout }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const studentName = user?.name || "Aryan Verma";
  const studentEmail = user?.email || "student@somawellness.in";
  const activePlan = user?.plan || "6-month plan";
  const initials = studentName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className={s.nb} ref={dropdownRef}>
      <div className={s.nbLeft}>
        <img src="/images/soma/logo.png" alt={t("userNav.brand")} className={s.logoImg} width="36" height="36" style={{ objectFit: "contain" }} />
        <span className={s.logo}>{t("userNav.brand")}</span>
        <div className={s.navLinks}>
          <a href="#home">{t("userNav.home")}</a>
          <a href="#about">{t("userNav.about")}</a>
          <a href="#classes">{t("userNav.classes")}</a>
          <a href="#events">{t("userNav.events")}</a>
        </div>
      </div>

      <div className={s.nbRight}>
        <div className={s.userCluster} onClick={() => setIsOpen(!isOpen)}>
          <div className={s.av}>
            {initials}
            <span className={s.onlineDot}></span>
          </div>
          <div>
            <div className={s.uname}>{studentName}</div>
            <div className={s.uplan}>{activePlan}</div>
          </div>
          <i className={`ti ti-chevron-down ${s.chevron} ${isOpen ? s.chevronActive : ''}`} aria-hidden="true"></i>
        </div>

        {isOpen && (
          <div className={s.dropdown}>
            <div className={s.ddHead}>
              <div className={s.ddAv}>{initials}</div>
              <div>
                <div className={s.ddName}>{studentName}</div>
                <div className={s.ddPlan}>
                  {activePlan} · {t("userNav.active")}
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
                </div>
              </div>
            </div>

            <div className={s.ddItem}>
              <div className={s.ddItemLeft}>
                <i className="ti ti-layout-dashboard" aria-hidden="true"></i>
                <span>{t("userNav.dashboard")}</span>
              </div>
              <span className={s.pill}>{t("userNav.activePlan")}</span>
            </div>

            <div className={s.ddItem}>
              <div className={s.ddItemLeft}>
                <i className="ti ti-user" aria-hidden="true"></i>
                <span>{t("userNav.myProfile")}</span>
              </div>
            </div>

            <div className={s.ddItem}>
              <div className={s.ddItemLeft}>
                <i className="ti ti-calendar-event" aria-hidden="true"></i>
                <span>{t("userNav.myBookings")}</span>
              </div>
            </div>

            <div className={s.ddItem}>
              <div className={s.ddItemLeft}>
                <i className="ti ti-settings" aria-hidden="true"></i>
                <span>{t("userNav.accountSettings")}</span>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }}></div>

            <div className={`${s.ddItem} ${s.logoutBtn}`} onClick={() => { setIsOpen(false); if(onLogout) onLogout(); }}>
              <div className={s.ddItemLeft}>
                <i className="ti ti-logout" aria-hidden="true"></i>
                <strong>{t("userNav.logout")}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
