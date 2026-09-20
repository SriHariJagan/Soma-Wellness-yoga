import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';
import s from '../YogaAdmin.module.css';

/* Lock background scroll (with scrollbar compensation) while open */
export function useSheetLock(open) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const w = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (w > 0) document.body.style.paddingRight = `${w}px`;
    const onKey = (e) => { if (e.key === 'Escape') document.body.dispatchEvent(new CustomEvent('sheet-escape')); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
      window.removeEventListener('keydown', onKey);
    };
  }, [open ]);
}

/* Fullscreen sheet — header top, body, sticky footer. Portaled. */
export function Sheet({ title, subtitle, avatar, onClose, children, footer }) {
  useSheetLock(true);
  useEffect(() => {
    const close = () => onClose?.();
    document.body.addEventListener('sheet-escape', close);
    return () => document.body.removeEventListener('sheet-escape', close);
  }, [onClose]);
  return createPortal(
    <div className={s.sheetBackdrop} onClick={onClose}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <div className={s.sheetHeader}>
          <div className={s.sheetTitleWrap}>
            {avatar && <span className={s.sheetAvatar}>{avatar}</span>}
            <div>
              <h3>{title}</h3>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          <button type="button" className={s.modalClose} onClick={onClose} aria-label="Close"><LuX size={18} /></button>
        </div>
        <div className={s.sheetBody}>{children}</div>
        {footer && <div className={s.sheetFooter}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* Compact confirmation sheet. Portaled. */
export function ConfirmSheet({ icon, tone = 'danger', title, message, confirmLabel = 'Confirm', busy, onConfirm, onClose }) {
  useSheetLock(true);
  const tones = {
    danger: { background: 'rgba(220,38,38,0.1)', color: '#DC2626' },
    warn: { background: 'rgba(217,119,6,0.12)', color: '#D97706' },
    info: { background: 'rgba(46,125,91,0.1)', color: '#1a4d35' },
  };
  const t = tones[tone] || tones.danger;
  return createPortal(
    <div className={s.sheetBackdrop} onClick={onClose}>
      <div className={s.sheetCompact} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label={title}>
        <div className={s.sheetCompactHead}>
          <span className={s.sheetCompactIcon} style={t}>{icon}</span>
          <div>
            <div className={s.sheetCompactTitle}>{title}</div>
            <div className={s.sheetCompactSub}>{message}</div>
          </div>
        </div>
        <div className={s.sheetCompactBody}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className={s.btnGhost} onClick={onClose}>Cancel</button>
            <button
              type="button"
              className={`${s.btn} ${tone === 'danger' ? s.btnDanger : s.btnPrimary}`}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? 'Working…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
