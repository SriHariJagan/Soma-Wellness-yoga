import React from 'react';
import s from './YogaAdmin.module.css';
import { LuLogOut } from 'react-icons/lu';

export default function LogoutModal({ onCancel, onConfirm }) {
  return (
    <div className={s.modalOverlay} onClick={onCancel}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()}>
        <div className={s.modalIcon}><LuLogOut /></div>
        <h3 className={s.modalTitle}>Sign out of Ashram OS?</h3>
        <p className={s.modalText}>You will be returned to the login screen. Any unsaved changes will be lost.</p>
        <div className={s.modalActions}>
          <button type="button" className={s.btnCancel} onClick={onCancel}>Stay in session</button>
          <button type="button" className={s.btnConfirmLogout} onClick={onConfirm}>Yes, sign out</button>
        </div>
      </div>
    </div>
  );
}