import React, { useState, useRef, useEffect } from 'react';
import s from './YogaAdmin.module.css';
import {
  LuSearch, LuBell, LuActivity, LuPlus, LuMenu, LuChevronDown,
} from 'react-icons/lu';

function useOutside(ref, onClose) {
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [ref, onClose]);
}

export default function Topbar({ onMobileMenu, onQuickCreate, notifications = [], activity = [], user }) {
  const [openNotif, setOpenNotif] = useState(false);
  const [openActivity, setOpenActivity] = useState(false);
  const notifRef = useRef(null);
  const actRef = useRef(null);
  useOutside(notifRef, () => setOpenNotif(false));
  useOutside(actRef, () => setOpenActivity(false));

  return (
    <header className={s.topbar}>
      <button type="button" className={s.mobileMenuBtn} onClick={onMobileMenu} aria-label="Menu"><LuMenu /></button>

      <div className={s.topSearch} onClick={(e) => e.currentTarget.querySelector('input')?.focus()}>
        <LuSearch size={16} />
        <input placeholder="Search students, leads, invoices…" />
        <span className={s.kbd}>⌘K</span>
      </div>

      <div className={s.topSpacer} />

      <div className={s.topActions}>
        <button type="button" className={s.topCreate} onClick={onQuickCreate}>
          <LuPlus size={16} /><span>Create</span>
        </button>

        {/* Activity feed */}
        <div className={s.popWrap} ref={actRef}>
          <button type="button" className={s.iconBtn} onClick={() => { setOpenActivity(v => !v); setOpenNotif(false); }} aria-label="Activity">
            <LuActivity />
          </button>
          {openActivity && (
            <div className={s.popover}>
              <div className={s.popHead}>Activity Feed<span className={s.kbd}>Live</span></div>
              {activity.length === 0 && <div className={s.popItem}><div className={s.popTitle} style={{ color: 'var(--text-3)' }}>No recent activity</div></div>}
              {activity.map((a, i) => (
                <div key={i} className={s.popItem}>
                  <span className={s.popDot} style={{ background: a.color || 'var(--c-primary)' }} />
                  <div><div className={s.popTitle}>{a.title}</div><div className={s.popMeta}>{a.meta}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className={s.popWrap} ref={notifRef}>
          <button type="button" className={s.iconBtn} onClick={() => { setOpenNotif(v => !v); setOpenActivity(false); }} aria-label="Notifications">
            <LuBell />
            {notifications.length > 0 && <span className={s.iconDot} />}
          </button>
          {openNotif && (
            <div className={s.popover}>
              <div className={s.popHead}>Notifications<span className={s.kbd}>{notifications.length}</span></div>
              {notifications.length === 0 && <div className={s.popItem}><div className={s.popTitle} style={{ color: 'var(--text-3)' }}>You're all caught up ✨</div></div>}
              {notifications.map((nz, i) => (
                <div key={i} className={s.popItem}>
                  <span className={s.popDot} style={{ background: nz.color || 'var(--c-primary)' }} />
                  <div><div className={s.popTitle}>{nz.title}</div><div className={s.popMeta}>{nz.meta}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <button type="button" className={s.topProfile}>
          <span className={s.topProfileAvatar}>{user.avatar}</span>
          <span className={s.topProfileMeta} style={{ textAlign: 'left' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{user.name}</span>
          </span>
          {/* <LuChevronDown size={14} style={{ color: 'var(--text-3)' }} /> */}
        </button>
      </div>
    </header>
  );
}
