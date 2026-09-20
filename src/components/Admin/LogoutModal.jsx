import React from 'react';
import { LuLogOut } from 'react-icons/lu';
import { ConfirmSheet } from './ui/Sheets.jsx';

export default function LogoutModal({ onCancel, onConfirm }) {
  return (
    <ConfirmSheet
      icon={<LuLogOut size={20} />}
      tone="warn"
      title="Sign out of SomaWellness?"
      message="You will be returned to the login screen. Any unsaved changes will be lost."
      confirmLabel="Yes, sign out"
      onConfirm={onConfirm}
      onClose={onCancel}
    />
  );
}
