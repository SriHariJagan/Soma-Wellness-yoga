import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { receptionStaffApi } from '../api/AdminServices';
import { PERMISSION_GROUPS } from '../../config/permissions';
import {
  LuUsers, LuPlus, LuPencil, LuShield, LuKey, LuCheck, LuX,
  LuEye, LuEyeOff, LuRefreshCw, LuCircleAlert, LuInfo, LuSearch,
  LuPhone, LuMail, LuCalendar, LuUserCog, LuTrash2,
} from 'react-icons/lu';
import s from './YogaAdmin.module.css';
import PhoneInput from '../common/PhoneInput.jsx';
import { validatePhone, normalizePhone } from '../../lib/phone.js';

const PERMISSIONS = PERMISSION_GROUPS;
const ALL_KEYS = Object.values(PERMISSIONS).flatMap((g) => g.permissions.map((p) => p.key));
const EMPTY = { name: '', email: '', phone: '', password: '' };

export default function ReceptionStaffManagement({ onFeedback }) {
  const { t } = useTranslation();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // sheet: null | { mode: 'create' } | { mode: 'edit', user }
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [perms, setPerms] = useState([]);
  const [permSearch, setPermSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(null);
  const [actingId, setActingId] = useState(null);

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

  // Lock background scroll while any popup is open
  useEffect(() => {
    if (!sheet && !showTempPassword) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [sheet, showTempPassword]);

  const openCreate = () => {
    setForm(EMPTY);
    setPerms([]);
    setPermSearch('');
    setSheet({ mode: 'create' });
  };

  const openEdit = (user) => {
    setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '', password: '' });
    setPerms([...(user.permissions || [])]);
    setPermSearch('');
    setSheet({ mode: 'edit', user });
  };

  const closeSheet = () => { if (!saving) setSheet(null); };

  const togglePerm = (key) => {
    setPerms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  };
  const toggleGroup = (keys) => {
    setPerms((prev) => {
      const allSelected = keys.every((k) => prev.includes(k));
      if (allSelected) return prev.filter((k) => !keys.includes(k));
      return [...new Set([...prev, ...keys])];
    });
  };

  const visibleGroups = useMemo(() => {
    const q = permSearch.trim().toLowerCase();
    if (!q) return Object.entries(PERMISSIONS);
    return Object.entries(PERMISSIONS)
      .map(([key, group]) => {
        const items = group.permissions.filter(
          (p) => p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || group.label.toLowerCase().includes(q),
        );
        return [key, { ...group, permissions: items }];
      })
      .filter(([, group]) => group.permissions.length > 0);
  }, [permSearch]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || (sheet?.mode === 'create' && !form.email.trim())) {
      onFeedback?.('Name and email are required', 'error');
      return;
    }
    if (form.phone) {
      const err = validatePhone(form.phone);
      if (err) { onFeedback?.(err, 'error'); return; }
    }
    setSaving(true);
    try {
      if (sheet.mode === 'create') {
        const result = await receptionStaffApi.create({
          name: form.name.trim(), email: form.email.trim(),
          phone: form.phone ? normalizePhone(form.phone) : '', password: form.password || undefined,
          permissions: perms,
        });
        const createdEmail = form.email.trim();
        // Close the create popup immediately on success + reset form
        setSheet(null);
        setForm({ name: '', email: '', phone: '', password: '' });
        setPerms([]);
        setPermSearch('');
        onFeedback?.('Reception account created successfully', 'success');
        if (result.temporaryPassword) {
          setShowTempPassword({ email: createdEmail, password: result.temporaryPassword });
        }
      } else {
        const editId = sheet.user._id;
        await receptionStaffApi.update(editId, { name: form.name.trim(), phone: form.phone ? normalizePhone(form.phone) : '' });
        await receptionStaffApi.updatePermissions(editId, perms);
        setSheet(null);
        onFeedback?.('Reception staff updated', 'success');
      }
    } catch (err) {
      onFeedback?.(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
    // Refresh list in background without overwriting the success feedback
    try { await loadStaff(); } catch {}
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    setActingId(user._id);
    try {
      await receptionStaffApi.setStatus(user._id, newStatus);
      onFeedback?.(`Account ${newStatus === 'banned' ? 'deactivated' : 'activated'}`, 'success');
      await loadStaff();
    } catch (err) {
      onFeedback?.(err.message || 'Failed to change status', 'error');
    }
    setActingId(null);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete reception account for ${user.name} (${user.email})? This cannot be undone.`)) return;
    setActingId(user._id);
    try {
      await receptionStaffApi.remove(user._id);
      onFeedback?.('Reception account deleted', 'success');
      await loadStaff();
    } catch (err) {
      onFeedback?.(err.message || 'Failed to delete account', 'error');
    }
    setActingId(null);
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Reset password for ${user.name}? A new temporary password will be shown once.`)) return;
    setActingId(user._id);
    try {
      const result = await receptionStaffApi.resetPassword(user._id);
      setShowTempPassword({ email: user.email, password: result.temporaryPassword });
      onFeedback?.('Password reset. Share the temporary password securely.', 'success');
    } catch (err) {
      onFeedback?.(err.message || 'Failed to reset password', 'error');
    }
    setActingId(null);
  };

  const isEdit = sheet?.mode === 'edit';

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
          <button className={s.btnPrimary} onClick={openCreate}>
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
          <button className={s.btnPrimary} onClick={openCreate}>
            <LuPlus size={16} /> Create First Account
          </button>
        </div>
      ) : (
        <div className={s.receptionGrid}>
          {staff.map((u, idx) => {
            const active = u.status === 'active';
            const permCount = (u.permissions || []).length;
            return (
              <div key={u._id} className={`${s.receptionCard} ${!active ? s.receptionCardInactive : ''}`}>
                <div className={s.receptionCardLeft}>
                  <div className={`${s.receptionAvatar} ${s[`av${idx % 6}`]}`}>
                    {(u.name || '?')[0].toUpperCase()}
                  </div>
                </div>
                <div className={s.receptionCardCenter}>
                  <div className={s.receptionNameRow}>
                    <span className={s.receptionName}>{u.name}</span>
                    <span className={`${s.badge} ${active ? s.badgeGreen : s.badgeRed}`}>
                      {active ? 'Active' : 'Inactive'}
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
                      {permCount} of {ALL_KEYS.length} permissions
                    </span>
                    <span className={s.receptionDateTag}>
                      <LuCalendar size={12} />
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  {/* Clear labeled actions — no guessing */}
                  <div className={s.receptionActions}>
                    <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => openEdit(u)}>
                      <LuPencil size={13} /> Edit & Access
                    </button>
                    <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => handleResetPassword(u)} disabled={actingId === u._id}>
                      <LuKey size={13} /> Reset Password
                    </button>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnSm} ${active ? s.btnDanger : s.btnPrimary}`}
                      disabled={actingId === u._id}
                      onClick={() => handleToggleStatus(u)}
                    >
                      {active ? <><LuEyeOff size={13} /> Deactivate</> : <><LuEye size={13} /> Activate</>}
                    </button>
                    <button
                      type="button"
                      className={`${s.btn} ${s.btnSm} ${s.btnDanger}`}
                      disabled={actingId === u._id}
                      onClick={() => handleDelete(u)}
                      title="Delete this reception account permanently"
                    >
                      <LuTrash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div className={s.receptionFooter}>
            <LuUserCog size={14} />
            <strong>{staff.length}</strong> reception staff member{staff.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* ── Fullscreen staff sheet (create + edit) ── */}
      {sheet && createPortal(
        <div className={s.sheetBackdrop} onClick={closeSheet}>
          <div className={s.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit reception staff' : 'Create reception staff'}>
            <div className={s.sheetHeader}>
              <div className={s.sheetTitleWrap}>
                <span className={s.sheetAvatar}>{(form.name || '?')[0].toUpperCase()}</span>
                <div>
                  <h3>{isEdit ? `Edit — ${sheet.user.name}` : 'New Reception Account'}</h3>
                  <p>{isEdit ? sheet.user.email : 'Details + access in one place. Nothing saves until you confirm.'}</p>
                </div>
              </div>
              <button className={s.modalClose} onClick={closeSheet} aria-label="Close"><LuX size={18} /></button>
            </div>

            <form onSubmit={handleSave} className={s.sheetBody}>
              <div className={s.sheetGrid}>
                {/* Account details */}
                <section className={s.sheetSection}>
                  <h4><span className={s.stepNum}>1</span> Account details</h4>
                  {/* Live preview */}
                  <div className={s.previewCard}>
                    <span className={s.previewAvatar}>{(form.name || '?')[0].toUpperCase()}</span>
                    <div className={s.previewInfo}>
                      <strong>{form.name || 'New member'}</strong>
                      <span>{form.email || 'email@somawellness.co.ke'}</span>
                    </div>
                    <span
                      className={s.ring}
                      style={{ '--p': Math.round((perms.length / ALL_KEYS.length) * 100) }}
                      title={`${perms.length} of ${ALL_KEYS.length} permissions`}
                    >
                      <em>{perms.length}</em>
                    </span>
                  </div>
                  <label className={s.fieldLabel}>
                    Full Name *
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Priya Sharma" required />
                  </label>
                  <label className={s.fieldLabel}>
                    Email *
                    <input
                      type="email" value={form.email} placeholder="e.g. priya@somawellness.co.ke"
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required disabled={isEdit} title={isEdit ? 'Email cannot be changed after creation' : undefined}
                    />
                  </label>
                  {isEdit && <p className={s.fieldHint}>Email is locked after creation — contact an admin to change it.</p>}
                  <PhoneInput value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} label="Phone" id="staff-phone" />
                  {!isEdit && (
                    <label className={s.fieldLabel}>
                      Password
                      <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} placeholder="Leave blank for auto-generated" />
                    </label>
                  )}
                  {isEdit && (
                    <div className={s.sheetNote}>
                      <LuInfo size={14} />
                      <span>To change this person's password, use <strong>Reset Password</strong> on their card — a one-time password is shown once.</span>
                    </div>
                  )}
                </section>

                {/* Access permissions */}
                <section className={s.sheetSection}>
                  <h4><span className={s.stepNum}>2</span> Dashboard access
                    <span className={s.permSummary}>{perms.length} of {ALL_KEYS.length} on</span>
                  </h4>
                  <p className={s.fieldHint}>Only checked screens appear in their dashboard. Start with View rights; add Create/Edit as they grow.</p>
                  <div className={s.permToolbar}>
                    <div className={s.permSearch}>
                      <LuSearch size={14} />
                      <input value={permSearch} onChange={(e) => setPermSearch(e.target.value)} placeholder="Search permissions…" />
                      {permSearch && <button type="button" onClick={() => setPermSearch('')} aria-label="Clear search"><LuX size={13} /></button>}
                    </div>
                    <div className={s.permBulk}>
                      <button type="button" className={s.linkBtn} onClick={() => setPerms([...ALL_KEYS])}>Select all</button>
                      <span aria-hidden="true">·</span>
                      <button type="button" className={s.linkBtn} onClick={() => setPerms([])}>Clear</button>
                    </div>
                  </div>
                  <div className={s.permGrid}>
                    {visibleGroups.length === 0 && (
                      <p className={s.fieldHint}>No permissions match “{permSearch}”.</p>
                    )}
                    {visibleGroups.map(([groupKey, group]) => {
                      const keys = group.permissions.map((p) => p.key);
                      const selected = keys.filter((k) => perms.includes(k)).length;
                      const allSelected = selected === keys.length && keys.length > 0;
                      return (
                        <div key={groupKey} className={s.permCard}>
                          <label className={s.permCardHead}>
                            <input type="checkbox" checked={allSelected} onChange={() => toggleGroup(keys)} />
                            <strong>{group.label}</strong>
                            <span className={s.permCount}>{selected}/{keys.length}</span>
                          </label>
                          <div className={s.permCardItems}>
                            {group.permissions.map((p) => (
                              <label key={p.key} className={`${s.permRow} ${perms.includes(p.key) ? s.permRowOn : ''}`} title={p.key}>
                                <input type="checkbox" checked={perms.includes(p.key)} onChange={() => togglePerm(p.key)} />
                                <span>{p.label}</span>
                                <LuCheck size={13} className={s.permTick} />
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className={s.sheetFooter}>
                <span className={s.sheetFooterHint}>
                  {isEdit ? 'Saves details + access together.' : 'Account activates immediately with the access above.'}
                </span>
                <div className={s.modalActions}>
                  <button type="button" className={s.btnGhost} onClick={closeSheet} disabled={saving}>Cancel</button>
                  <button type="submit" className={s.btnPrimary} disabled={saving}>
                    {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? <><LuCheck size={14} /> Save Changes</> : <><LuPlus size={14} /> Create Account</>)}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showTempPassword && createPortal(
        <div className={s.sheetBackdrop} onClick={() => setShowTempPassword(null)}>
          <div className={s.sheetCompact} onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label="Account credentials">
            <div className={s.sheetCompactHead}>
              <span className={s.sheetCompactIcon} style={{ background: 'rgba(46,125,91,0.1)', color: '#1a4d35' }}><LuKey size={20} /></span>
              <div>
                <div className={s.sheetCompactTitle}>Account Ready</div>
                <div className={s.sheetCompactSub}>Created for <strong>{showTempPassword.email}</strong></div>
              </div>
            </div>
            <div className={s.sheetCompactBody}>
              <div className={s.tempPasswordBox}>
                <span>Temporary Password:</span>
                <code>{showTempPassword.password}</code>
              </div>
              <p className={s.warningText}>
                <LuInfo size={14} />
                Share this password securely. It will not be shown again.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <button className={s.btnPrimary} onClick={() => setShowTempPassword(null)}>Done</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
