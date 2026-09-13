import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { receptionStaffApi } from '../api/AdminServices';
import { PERMISSION_GROUPS } from '../../config/permissions';
import {
  LuUsers, LuPlus, LuPencil, LuShield, LuKey, LuCheck, LuX,
  LuEye, LuEyeOff, LuRefreshCw, LuCircleAlert, LuInfo,
  LuPhone, LuMail, LuCalendar, LuUserCog,
} from 'react-icons/lu';
import s from './YogaAdmin.module.css';

const PERMISSIONS = PERMISSION_GROUPS;

export default function ReceptionStaffManagement({ onFeedback }) {
  const { t } = useTranslation();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [createPerms, setCreatePerms] = useState([]);
  const [permForm, setPermForm] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await receptionStaffApi.list();
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[ReceptionStaff] loadStaff error:', err);
      setError(err.message || 'Failed to load reception staff');
      onFeedback?.(err.message || 'Failed to load reception staff', 'error');
    }
    setLoading(false);
  }, [onFeedback]);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      onFeedback?.('Name and email are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await receptionStaffApi.create({ ...form, permissions: createPerms });
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', password: '' });
      setCreatePerms([]);
      onFeedback?.('Reception account created successfully', 'success');
      if (result.temporaryPassword) {
        setShowTempPassword({ email: form.email, password: result.temporaryPassword });
      }
      await loadStaff();
    } catch (err) {
      onFeedback?.(err.message || 'Failed to create reception account', 'error');
    }
    setSaving(false);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await receptionStaffApi.update(editing._id, {
        name: editing.name,
        phone: editing.phone,
      });
      setEditing(null);
      onFeedback?.('Reception staff updated', 'success');
      await loadStaff();
    } catch (err) {
      onFeedback?.(err.message || 'Failed to update', 'error');
    }
    setSaving(false);
  };

  const handleSavePermissions = async () => {
    setSaving(true);
    try {
      await receptionStaffApi.updatePermissions(permissionsUser._id, permForm);
      setPermissionsUser(null);
      onFeedback?.('Permissions updated', 'success');
      await loadStaff();
    } catch (err) {
      onFeedback?.(err.message || 'Failed to update permissions', 'error');
    }
    setSaving(false);
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    try {
      await receptionStaffApi.setStatus(user._id, newStatus);
      onFeedback?.(`Account ${newStatus === 'banned' ? 'deactivated' : 'activated'}`, 'success');
      await loadStaff();
    } catch (err) {
      onFeedback?.(err.message || 'Failed to change status', 'error');
    }
  };

  const handleResetPassword = async (user) => {
    try {
      const result = await receptionStaffApi.resetPassword(user._id);
      setShowTempPassword({ email: user.email, password: result.temporaryPassword });
      onFeedback?.('Password reset. Share the temporary password securely.', 'success');
    } catch (err) {
      onFeedback?.(err.message || 'Failed to reset password', 'error');
    }
  };

  const openPermissions = (user) => {
    setPermissionsUser(user);
    setPermForm([...(user.permissions || [])]);
  };

  const togglePerm = (key) => {
    setPermForm((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleGroup = (keys) => {
    setPermForm((prev) => {
      const allSelected = keys.every((k) => prev.includes(k));
      if (allSelected) return prev.filter((k) => !keys.includes(k));
      return [...new Set([...prev, ...keys])];
    });
  };

  const toggleCreatePerm = (key) => {
    setCreatePerms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleCreateGroup = (keys) => {
    setCreatePerms((prev) => {
      const allSelected = keys.every((k) => prev.includes(k));
      if (allSelected) return prev.filter((k) => !keys.includes(k));
      return [...new Set([...prev, ...keys])];
    });
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>
          <LuUsers size={20} /> Reception Staff
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={s.btnGhost} onClick={loadStaff} disabled={loading} title="Refresh">
            <LuRefreshCw size={15} className={loading ? s.spin : ''} />
          </button>
          <button className={s.btnPrimary} onClick={() => setShowCreate(true)}>
            <LuPlus size={16} /> Add Reception
          </button>
        </div>
      </div>

      {error && (
        <div className={s.errorBanner}>
          <LuCircleAlert size={16} />
          <span>{error}</span>
          <button onClick={loadStaff} className={s.errorRetry}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className={s.tabFallback}>
          <div className={s.spinner} />
          <span>Loading reception staff...</span>
        </div>
      ) : staff.length === 0 && !error ? (
        <div className={s.emptyState}>
          <div className={s.emptyIconWrap}>
            <LuUsers size={40} />
          </div>
          <h3 className={s.emptyTitle}>No reception staff accounts yet</h3>
          <p className={s.emptyDesc}>
            Create a reception staff account to grant limited dashboard access to front-desk team members.
          </p>
          <button className={s.btnPrimary} onClick={() => setShowCreate(true)}>
            <LuPlus size={16} /> Create First Account
          </button>
        </div>
      ) : (
        <div className={s.receptionGrid}>
          {staff.map((u, idx) => (
            <div key={u._id} className={`${s.receptionCard} ${u.status !== 'active' ? s.receptionCardInactive : ''}`}>
              <div className={s.receptionCardLeft}>
                <div className={`${s.receptionAvatar} ${s[`av${idx % 6}`]}`}>
                  {(u.name || '?')[0].toUpperCase()}
                </div>
              </div>
              <div className={s.receptionCardCenter}>
                <div className={s.receptionNameRow}>
                  <span className={s.receptionName}>{u.name}</span>
                  <span className={`${s.badge} ${u.status === 'active' ? s.badgeGreen : s.badgeRed}`}>
                    {u.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className={s.receptionMeta}>
                  <span className={s.receptionMetaItem}>
                    <LuMail size={13} /> {u.email}
                  </span>
                  {u.phone && (
                    <span className={s.receptionMetaItem}>
                      <LuPhone size={13} /> {u.phone}
                    </span>
                  )}
                </div>
                <div className={s.receptionTags}>
                  <span className={s.permCountPill}>
                    <LuShield size={12} />
                    {(u.permissions || []).length} permissions
                  </span>
                  <span className={s.receptionDateTag}>
                    <LuCalendar size={12} />
                    {new Date(u.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
              <div className={s.receptionCardRight}>
                <button className={s.receptionActionBtn} title="Edit" onClick={() => setEditing(u)}>
                  <LuPencil size={14} />
                </button>
                <button className={s.receptionActionBtn} title="Permissions" onClick={() => openPermissions(u)}>
                  <LuShield size={14} />
                </button>
                <button className={s.receptionActionBtn} title="Reset Password" onClick={() => handleResetPassword(u)}>
                  <LuKey size={14} />
                </button>
                <button
                  className={`${s.receptionActionBtn} ${u.status === 'active' ? s.receptionActionDanger : s.receptionActionSuccess}`}
                  title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                  onClick={() => handleToggleStatus(u)}
                >
                  {u.status === 'active' ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                </button>
              </div>
            </div>
          ))}
          <div className={s.receptionFooter}>
            <LuUserCog size={14} />
            <strong>{staff.length}</strong> reception staff member{staff.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {showCreate && (
        <div className={s.modalBackdrop} onClick={() => setShowCreate(false)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Create Reception Staff</h3>
              <button className={s.modalClose} onClick={() => setShowCreate(false)}><LuX size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className={s.modalBody}>
              <label className={s.fieldLabel}>
                Full Name *
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  required
                />
              </label>
              <label className={s.fieldLabel}>
                Email *
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="e.g. priya@somawellness.co.ke"
                  required
                />
              </label>
              <label className={s.fieldLabel}>
                Phone
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. +254 700 000 000"
                />
              </label>
              <label className={s.fieldLabel}>
                Password (leave blank for auto-generated)
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={8}
                  placeholder="Min 8 characters"
                />
              </label>
              <div className={s.fieldLabel}>
                <span>Initial permissions ({createPerms.length} selected) — screens appear based on these</span>
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 8, marginTop: 6 }}>
                  {Object.entries(PERMISSIONS).map(([groupKey, group]) => {
                    const keys = group.permissions.map((p) => p.key);
                    const allSelected = keys.every((k) => createPerms.includes(k));
                    return (
                      <div key={groupKey} style={{ marginBottom: 8 }}>
                        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontWeight: 700, fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleCreateGroup(keys)}
                          />
                          {group.label}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, marginLeft: 18 }}>
                          {group.permissions.map((p) => (
                            <label key={p.key} style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 12 }}>
                              <input
                                type="checkbox"
                                checked={createPerms.includes(p.key)}
                                onChange={() => toggleCreatePerm(p.key)}
                              />
                              {p.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className={s.modalActions}>
                <button type="button" className={s.btnGhost} onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className={s.btnPrimary} disabled={saving}>
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <div className={s.modalBackdrop} onClick={() => setEditing(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Edit Reception Staff</h3>
              <button className={s.modalClose} onClick={() => setEditing(null)}><LuX size={18} /></button>
            </div>
            <form onSubmit={handleUpdate} className={s.modalBody}>
              <label className={s.fieldLabel}>
                Full Name
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  required
                />
              </label>
              <label className={s.fieldLabel}>
                Phone
                <input
                  value={editing.phone || ''}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </label>
              <div className={s.modalActions}>
                <button type="button" className={s.btnGhost} onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button type="submit" className={s.btnPrimary} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {permissionsUser && (
        <div className={s.modalBackdrop} onClick={() => setPermissionsUser(null)}>
          <div className={`${s.modal} ${s.modalWide}`} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Permissions — {permissionsUser.name}</h3>
              <button className={s.modalClose} onClick={() => setPermissionsUser(null)}><LuX size={18} /></button>
            </div>
            <div className={s.modalBody}>
              {Object.entries(PERMISSIONS).map(([groupKey, group]) => {
                const keys = group.permissions.map((p) => p.key);
                const allSelected = keys.every((k) => permForm.includes(k));
                const someSelected = keys.some((k) => permForm.includes(k));
                return (
                  <div key={groupKey} className={s.permGroup}>
                    <div className={s.permGroupHeader}>
                      <label className={s.permGroupLabel}>
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                          onChange={() => toggleGroup(keys)}
                        />
                        <strong>{group.label}</strong>
                      </label>
                    </div>
                    <div className={s.permItems}>
                      {group.permissions.map((p) => (
                        <label key={p.key} className={s.permItem}>
                          <input
                            type="checkbox"
                            checked={permForm.includes(p.key)}
                            onChange={() => togglePerm(p.key)}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className={s.modalActions}>
                <button className={s.btnGhost} onClick={() => setPermissionsUser(null)}>Cancel</button>
                <button className={s.btnPrimary} onClick={handleSavePermissions} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTempPassword && (
        <div className={s.modalBackdrop} onClick={() => setShowTempPassword(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h3>Account Created</h3>
              <button className={s.modalClose} onClick={() => setShowTempPassword(null)}><LuX size={18} /></button>
            </div>
            <div className={s.modalBody}>
              <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                Account created for <strong style={{ color: 'var(--text-1)' }}>{showTempPassword.email}</strong>
              </p>
              <div className={s.tempPasswordBox}>
                <span>Temporary Password:</span>
                <code>{showTempPassword.password}</code>
              </div>
              <p className={s.warningText}>
                <LuInfo size={14} />
                Share this password securely. It will not be shown again.
              </p>
              <div className={s.modalActions}>
                <button className={s.btnPrimary} onClick={() => setShowTempPassword(null)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
