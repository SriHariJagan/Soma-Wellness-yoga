import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LuX } from 'react-icons/lu';
import s from '../Admin/YogaAdmin.module.css';

/**
 * Shared professional dialog for all reception screens.
 *
 * - Portaled to document.body so the dim layer always covers the FULL
 *   viewport (page-level blur filters would otherwise trap position:fixed).
 * - Blocks the screen: backdrop click or Escape closes, background page
 *   scroll is locked while open.
 * - Pass `onSubmit` to render the body as a <form> so footer submit
 *   buttons work natively.
 */
export default function ReceptionModal({
  title,
  subtitle,
  icon,
  tone,
  size = 'md',
  onClose,
  onSubmit,
  children,
  footer,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const sizeClass = s[`recModal--${size}`] || '';
  const toneClass = tone ? (s[`recModal--${tone}`] || '') : '';
  const BodyTag = onSubmit ? 'form' : 'div';

  return createPortal(
    <div
      className={s.recModalBackdrop}
      onClick={() => onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Dialog'}
    >
      <div className={`${s.recModal} ${sizeClass} ${toneClass}`} onClick={(e) => e.stopPropagation()}>
        <div className={s.recModalAccent} aria-hidden="true" />
        <div className={s.recModalHeader}>
          {icon && (
            <div className={`${s.recModalIcon} ${tone === 'success' ? s['recModalIcon--success'] : ''}`}>
              {icon}
            </div>
          )}
          <div className={s.recModalTitleWrap}>
            <h3 className={s.recModalTitle}>{title}</h3>
            {subtitle && <p className={s.recModalSub}>{subtitle}</p>}
          </div>
          <button type="button" className={s.recModalClose} onClick={() => onClose?.()} aria-label="Close dialog">
            <LuX size={16} />
          </button>
        </div>
        <BodyTag {...(onSubmit ? { onSubmit } : {})} className={s.recModalBody}>
          {children}
          {footer && <div className={s.recModalFooter}>{footer}</div>}
        </BodyTag>
      </div>
    </div>,
    document.body,
  );
}
