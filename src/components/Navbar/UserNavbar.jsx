import React, { useState, useEffect, useRef } from 'react';
import s from './UserNavbar.module.css';

export default function UserNavbar({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fallback defaults if the user object payload is not fully populated yet
  const studentName = user?.name || "Aryan Verma";
  const studentEmail = user?.email || "aryan@pragyayoga.com";
  const activePlan = user?.plan || "6-month plan";
  
  // Extract initials cleanly for profile avatars
  const initials = studentName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  // Close the dropdown cleanly if clicking completely outside the navbar box area
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
      {/* LEFT SECTION: BRAND IDENTITY & GLOBAL LINKS */}
      <div className={s.nbLeft}>
        <img src="/images/soma/logo.png" alt="Soma Wellness" className={s.logoImg} width="36" height="36" style={{ objectFit: "contain" }} />
        <span className={s.logo}>Pragya Yoga</span>
        <div className={s.navLinks}>
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#classes">Classes</a>
          <a href="#events">Events</a>
        </div>
      </div>

      {/* RIGHT SECTION: PROFILE CONTAINER MATRIX & TOGGLE MENU PORTAL */}
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

        {/* CLICK TRIGGERED DROPDOWN SYSTEM */}
        {isOpen && (
          <div className={s.dropdown}>
            <div className={s.ddHead}>
              <div className={s.ddAv}>{initials}</div>
              <div>
                <div className={s.ddName}>{studentName}</div>
                <div className={s.ddPlan}>
                  {activePlan} · Active 
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
                </div>
              </div>
            </div>

            {/* INTERACTIVE NAVIGATION LINKS */}
            <div className={s.ddItem}>
              <div className={s.ddItemLeft}>
                <i className="ti ti-layout-dashboard" aria-hidden="true"></i>
                <span>Dashboard</span>
              </div>
              <span className={s.pill}>Active plan</span>
            </div>

            <div className={s.ddItem}>
              <div className={s.ddItemLeft}>
                <i className="ti ti-user" aria-hidden="true"></i>
                <span>My Profile</span>
              </div>
            </div>

            <div className={s.ddItem}>
              <div className={s.ddItemLeft}>
                <i className="ti ti-calendar-event" aria-hidden="true"></i>
                <span>My Bookings</span>
              </div>
            </div>

            <div className={s.ddItem}>
              <div className={s.ddItemLeft}>
                <i className="ti ti-settings" aria-hidden="true"></i>
                <span>Account Settings</span>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }}></div>

            {/* 🚪 LOGOUT ACTION CONTROLLER TRIGGER */}
            <div className={`${s.ddItem} ${s.logoutBtn}`} onClick={() => { setIsOpen(false); if(onLogout) onLogout(); }}>
              <div className={s.ddItemLeft}>
                <i className="ti ti-logout" aria-hidden="true"></i>
                <strong>Logout</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}