import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReceptionModal from '../Modal.jsx';
import { useAuth } from '../../../context/AuthContext';
import { receptionApi } from '../../api/AdminServices';
import {
  LuSearch, LuPlus, LuX, LuPencil, LuEye, LuRefreshCw,
  LuPhone, LuMail, LuMapPin, LuCalendarDays, LuUsers, LuUserPlus,
  LuShoppingBag, LuReceipt, LuBadgeCheck,
} from 'react-icons/lu';
import s from '../../Admin/YogaAdmin.module.css';

const EMPTY_FORM = { name: '', email: '', phone: '', city: '', password: '' };
const EMPTY_PURCHASE = { kind: 'course', itemId: '', method: 'Cash' };

function initials(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function isNewThisMonth(createdAt) {
  if (!createdAt) return false;
  const d = new Date(createdAt);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function formatDate(createdAt) {
  if (!createdAt) return 'â€”';
  return new Date(createdAt).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatKES(n) {
  const v = Number(n || 0);
  return `KES ${v.toLocaleString('en-KE')}`;
}

export default function CustomersTab({ createSignal = 0 }) {
  const { hasAnyPermission } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [createdCreds, setCreatedCreds] = useState(null);
  // Purchase flow
  const [enrolling, setEnrolling] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [purchase, setPurchase] = useState(EMPTY_PURCHASE);
  const [purchasing, setPurchasing] = useState(false);
  // Purchase history
  const [historyStudent, setHistoryStudent] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const canView = hasAnyPermission('customers.view', 'users.view');
  const canCreate = hasAnyPermission('customers.create', 'users.create');
  const canEdit = hasAnyPermission('customers.edit', 'users.edit');
  const canSell = hasAnyPermission('courses.booking', 'bookings.create');

  // Debounce search so typing doesn't hammer the API.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const data = await receptionApi.students.list({ search });
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load customers' });
    }
    setLoading(false);
  }, [search]);

  useEffect(() => { if (canView) loadStudents(); else setLoading(false); }, [loadStudents, canView]);

  // Opened via Overview â†’ "New Student" quick action.
  useEffect(() => {
    if (createSignal > 0 && canCreate) setShowCreate(true);
  }, [createSignal, canCreate]);

  const counts = useMemo(() => ({
    all: students.length,
    fresh: students.filter((st) => isNewThisMonth(st.createdAt)).length,
    active: students.filter((st) => st.status === 'active').length,
  }), [students]);

  const visible = useMemo(() => {
    if (filter === 'new') return students.filter((st) => isNewThisMonth(st.createdAt));
    if (filter === 'active') return students.filter((st) => st.status === 'active');
    return students;
  }, [students, filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setFeedback({ type: 'error', message: 'Name and email are required.' });
      return;
    }
    if (!form.password || form.password.length < 8) {
      setFeedback({ type: 'error', message: 'Set a login password of at least 8 characters so the customer can sign in.' });
      return;
    }
    setSaving(true);
    try {
      await receptionApi.students.create({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        password: form.password,
      });
      setShowCreate(false);
      setCreatedCreds({ name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password });
      setForm(EMPTY_FORM);
      setFeedback({ type: 'success', message: `Customer "${form.name.trim()}" registered successfully.` });
      await loadStudents();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create customer.' });
    }
    setSaving(false);
  };

  const openEdit = (st) => {
    setViewing(null);
    setEditing(st);
    setEditForm({ name: st.name || '', email: st.email || '', phone: st.phone || '', city: st.city || '' });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      // Email is immutable in the reception flow â€” only profile fields are sent.
      await receptionApi.students.update(editing._id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        city: editForm.city.trim(),
      });
      setEditing(null);
      setFeedback({ type: 'success', message: 'Customer updated successfully.' });
      await loadStudents();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update customer.' });
    }
    setSaving(false);
  };

  // â”€â”€ Purchase flow â”€â”€
  const openEnroll = async (st) => {
    setEnrolling(st);
    setPurchase(EMPTY_PURCHASE);
    setCatalogLoading(true);
    try {
      setCatalog(await receptionApi.catalog());
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load catalog.' });
      setEnrolling(null);
    }
    setCatalogLoading(false);
  };

  const catalogItems = useMemo(() => {
    if (!catalog) return [];
    if (purchase.kind === 'course') return catalog.courses || [];
    if (purchase.kind === 'plan') return catalog.plans || [];
    return catalog.services || [];
  }, [catalog, purchase.kind]);

  const selectedItem = useMemo(
    () => catalogItems.find((it) => String(it._id) === purchase.itemId) || null,
    [catalogItems, purchase.itemId]
  );

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (!enrolling || !purchase.itemId) {
      setFeedback({ type: 'error', message: 'Select an item to sell.' });
      return;
    }
    setPurchasing(true);
    try {
      const res = await receptionApi.purchases.create(enrolling._id, {
        kind: purchase.kind,
        itemId: purchase.itemId,
        method: purchase.method,
      });
      setEnrolling(null);
      setFeedback({
        type: 'success',
        message: `${res?.fulfillment ? 'Enrolled' : 'Sold'} "${selectedItem?.title || selectedItem?.name || 'item'}" to ${enrolling.name} â€” ${formatKES(res?.payment?.amount)}.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record purchase.' });
    }
    setPurchasing(false);
  };

  const openHistory = async (st) => {
    setHistoryStudent(st);
    setHistory(null);
    setHistoryLoading(true);
    try {
      setHistory(await receptionApi.purchases.list(st._id));
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load purchase history.' });
      setHistoryStudent(null);
    }
    setHistoryLoading(false);
  };

  if (!canView) {
    return (
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}><LuUsers size={20} /> Customers</h2>
        </div>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>ðŸ”’</div>
          <h3 className={s.emptyTitle}>No access</h3>
          <p className={s.emptyDesc}>You don't have permission to view customers. Contact an admin to grant customers.view access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={s.recPage}>
      {/* â”€â”€ Header â”€â”€ */}
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>
          <LuUsers size={20} /> Customers
          <span className={s.chipCount} style={{ fontSize: 12 }}>Â· {counts.all} total</span>
        </h2>
        <div className={s.toolbar}>
          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={loadStudents} disabled={loading} title="Refresh list">
            <LuRefreshCw size={14} className={loading ? s.spin : ''} /> Refresh
          </button>
          {canCreate && (
            <button type="button" className={s.topCreate} onClick={() => setShowCreate(true)}>
              <LuPlus size={16} /> Add Customer
            </button>
          )}
        </div>
      </div>

      {/* â”€â”€ Summary strip â”€â”€ */}
      <div className={s.recSummary}>
        <div className={s.recSummaryCell}>
          <div className={s.statLabel}>Total Customers</div>
          <div className={s.recSummaryValue}>{counts.all}</div>
        </div>
        <div className={s.recSummaryCell}>
          <div className={s.statLabel}>New This Month</div>
          <div className={s.recSummaryValue}>{counts.fresh}</div>
        </div>
        <div className={s.recSummaryCell}>
          <div className={s.statLabel}>Active</div>
          <div className={s.recSummaryValue}>{counts.active}</div>
        </div>
      </div>

      {/* â”€â”€ Feedback â”€â”€ */}
      {feedback && (
        <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span>{feedback.type === 'success' ? 'âœ“' : 'âš '}</span>
          <span>{feedback.message}</span>
          <button type="button" className={s.btnGhost} onClick={() => setFeedback(null)} aria-label="Dismiss">
            <LuX size={14} />
          </button>
        </div>
      )}

      {/* â”€â”€ Search + filters â”€â”€ */}
      <div className={s.filterBar} style={{ marginBottom: 16 }}>
        <div className={s.searchWrapper} style={{ maxWidth: 420 }}>
          <span className={s.searchIcon}><LuSearch size={16} /></span>
          <input
            className={s.searchInput}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email or cityâ€¦"
            aria-label="Search customers"
          />
          {searchInput && (
            <button type="button" className={s.searchClear} onClick={() => setSearchInput('')} aria-label="Clear search">
              <LuX size={14} />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            ['all', 'All', counts.all],
            ['new', 'New this month', counts.fresh],
            ['active', 'Active', counts.active],
          ].map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              className={`${s.chip} ${filter === key ? s.chipActive : ''}`}
              onClick={() => setFilter(key)}
            >
              {label} <span className={s.chipCount}>{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* â”€â”€ List â”€â”€ */}
      <div className={`${s.card} ${s.cardNoPad}`}>
        {loading ? (
          <div style={{ padding: 22 }}>
            {[...Array(5)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>ðŸ‘¤</div>
            <h3 className={s.emptyTitle}>
              {search || filter !== 'all' ? 'No matches found' : 'No customers yet'}
            </h3>
            <p className={s.emptyDesc}>
              {search || filter !== 'all'
                ? 'Try a different search term or filter.'
                : 'Add your first customer to get started.'}
            </p>
            {canCreate && !search && filter === 'all' && (
              <button type="button" className={s.topCreate} onClick={() => setShowCreate(true)}>
                <LuPlus size={16} /> Add Customer
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={s.recTableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((st, idx) => (
                    <tr key={st._id}>
                      <td>
                        <div className={s.cellUser}>
                          <div className={`${s.receptionStudentAvatar} ${s[`av${idx % 6}`]}`}>
                            {initials(st.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{st.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{st.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{st.phone || 'â€”'}</td>
                      <td>{st.city || 'â€”'}</td>
                      <td>
                        <span className={`${s.badge} ${st.status === 'active' ? s.badgeGreen : s.badgeRed}`}>
                          {st.status === 'active' ? 'Active' : (st.status || 'Unknown')}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{formatDate(st.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => setViewing(st)} title="View details">
                            <LuEye size={14} />
                          </button>
                          {canSell && (
                            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => openEnroll(st)} title="Sell course / plan">
                              <LuShoppingBag size={14} /> Enroll
                            </button>
                          )}
                          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => openHistory(st)} title="Purchase history">
                            <LuReceipt size={14} />
                          </button>
                          {canEdit && (
                            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => openEdit(st)} title="Edit customer">
                              <LuPencil size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={s.tableFooter}>
              Showing {visible.length} of {students.length} customer{students.length !== 1 ? 's' : ''}
              {search ? ` matching "${search}"` : ''}
            </div>
          </>
        )}
      </div>

      {!canCreate && (
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 12 }}>
          You don't have permission to add customers. Contact an admin to grant customers.create access.
        </p>
      )}

      {/* â”€â”€ View details modal â”€â”€ */}
      {viewing && (
        <ReceptionModal
          title={viewing.name}
          subtitle={viewing.email}
          icon={<span className={`${s.receptionStudentAvatar} ${s.av0}`} style={{ width: 42, height: 42 }}>{initials(viewing.name)}</span>}
          onClose={() => setViewing(null)}
          footer={(
            <>
              {canSell && (
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => { setViewing(null); openEnroll(viewing); }}>
                  <LuShoppingBag size={15} /> Sell / Enroll
                </button>
              )}
              {canEdit && (
                <button type="button" className={s.btn} onClick={() => openEdit(viewing)}>
                  <LuPencil size={15} /> Edit
                </button>
              )}
            </>
          )}
        >
          <span className={`${s.badge} ${viewing.status === 'active' ? s.badgeGreen : s.badgeRed}`} style={{ alignSelf: 'flex-start' }}>
                {viewing.status === 'active' ? 'Active' : (viewing.status || 'Unknown')}
              </span>
              <div>
                <div className={s.sectionLabel}>Email</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <LuMail size={15} /> {viewing.email}
                </div>
              </div>
              <div>
                <div className={s.sectionLabel}>Phone</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <LuPhone size={15} /> {viewing.phone || 'â€”'}
                </div>
              </div>
              <div className={s.grid2}>
                <div>
                  <div className={s.sectionLabel}>City</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <LuMapPin size={15} /> {viewing.city || 'â€”'}
                  </div>
                </div>
                <div>
                  <div className={s.sectionLabel}>Joined</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                    <LuCalendarDays size={15} /> {formatDate(viewing.createdAt)}
                  </div>
                </div>
              </div>
              {(viewing.style || viewing.level) && (
                <div className={s.grid2}>
                  <div>
                    <div className={s.sectionLabel}>Style</div>
                    <div style={{ fontSize: 14 }}>{viewing.style || 'â€”'}</div>
                  </div>
                  <div>
                    <div className={s.sectionLabel}>Level</div>
                    <div style={{ fontSize: 14 }}>{viewing.level || 'â€”'}</div>
                  </div>
                </div>
              )}
        </ReceptionModal>
      )}

      {/* â”€â”€ Add modal (password required so the customer can sign in) â”€â”€ */}
      {showCreate && (
        <ReceptionModal
          title="Add Customer"
          subtitle="Register a new customer with sign-in credentials"
          icon={<LuUserPlus size={20} />}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          footer={(
            <>
              <button type="button" className={s.btn} onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                {saving ? 'Adding…' : <><LuPlus size={15} /> Add Customer</>}
              </button>
            </>
          )}
        >
              <div className={s.grid2}>
                <label className={s.fieldLabel}>
                  Full Name *
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Amina Odhiambo" />
                </label>
                <label className={s.fieldLabel}>
                  Email *
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="name@example.com" />
                </label>
              </div>
              <div className={s.grid2}>
                <label className={s.fieldLabel}>
                  Phone
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+254 700 000 000" />
                </label>
                <label className={s.fieldLabel}>
                  City
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Nairobi" />
                </label>
              </div>
              <label className={s.fieldLabel}>
                Login password * (share with the customer so they can sign in)
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                />
              </label>
        </ReceptionModal>
      )}

      {/* â”€â”€ Credentials confirmation (share with the customer) â”€â”€ */}
      {createdCreds && (
        <ReceptionModal
          title="Customer Registered"
          subtitle="Share these sign-in details with the customer"
          icon={<LuBadgeCheck size={20} />}
          tone="success"
          size="sm"
          onClose={() => setCreatedCreds(null)}
          footer={(
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setCreatedCreds(null)}>Done</button>
          )}
        >
              <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
                <strong style={{ color: 'var(--text-1)' }}>{createdCreds.name}</strong> can now sign in with:
              </p>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 16px', fontSize: 14 }}>
                <div><strong>Email:</strong> {createdCreds.email}</div>
                <div><strong>Password:</strong> <code>{createdCreds.password}</code></div>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0 }}>
                Share these details with the customer. You can now sell them a course from the Enroll button.
              </p>
        </ReceptionModal>
      )}

      {/* â”€â”€ Enroll / sell modal â”€â”€ */}
      {enrolling && (
        <ReceptionModal
          title={`Sell to ${enrolling.name}`}
          subtitle="Counter sale — payment is recorded and the item activates instantly"
          icon={<LuShoppingBag size={20} />}
          onClose={() => setEnrolling(null)}
          onSubmit={handlePurchase}
          footer={(
            <>
              <button type="button" className={s.btn} onClick={() => setEnrolling(null)}>Cancel</button>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={purchasing || !purchase.itemId}>
                {purchasing ? 'Processing…' : <><LuBadgeCheck size={15} /> Confirm sale{selectedItem ? ` · ${formatKES(selectedItem.price)}` : ''}</>}
              </button>
            </>
          )}
        >
              {catalogLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ height: 44 }} />)}
                </div>
              ) : (
                <>
                  <div className={s.grid2}>
                    <label className={s.fieldLabel}>
                      Item type
                      <select value={purchase.kind} onChange={(e) => setPurchase({ ...EMPTY_PURCHASE, kind: e.target.value, method: purchase.method })}>
                        <option value="course">Course</option>
                        <option value="plan">Membership plan</option>
                        <option value="service">Service</option>
                      </select>
                    </label>
                    <label className={s.fieldLabel}>
                      Payment method
                      <select value={purchase.method} onChange={(e) => setPurchase({ ...purchase, method: e.target.value })}>
                        {(catalog?.paymentMethods || ['Cash', 'M-Pesa', 'Card', 'Bank transfer']).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className={s.fieldLabel}>
                    {purchase.kind === 'course' ? 'Course' : purchase.kind === 'plan' ? 'Plan' : 'Service'} *
                    <select value={purchase.itemId} onChange={(e) => setPurchase({ ...purchase, itemId: e.target.value })} required>
                      <option value="">Selectâ€¦</option>
                      {catalogItems.map((it) => (
                        <option key={it._id} value={String(it._id)}>
                          {it.title || it.name} â€” {formatKES(it.price)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedItem && (
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 16px', fontSize: 14 }}>
                      <div><strong>{selectedItem.title || selectedItem.name}</strong></div>
                      <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
                        Price: {formatKES(selectedItem.price)} Â· Paying by {purchase.method}
                      </div>
                    </div>
                  )}
                </>
              )}
        </ReceptionModal>
      )}

      {/* â”€â”€ Purchase history modal â”€â”€ */}
      {historyStudent && (
        <ReceptionModal
          title={`Purchases — ${historyStudent.name}`}
          subtitle="Enrollments and payment history"
          icon={<LuReceipt size={20} />}
          size="lg"
          onClose={() => { setHistoryStudent(null); setHistory(null); }}
          footer={(
            <>
              {canSell && history && (
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => { const st = historyStudent; setHistoryStudent(null); setHistory(null); openEnroll(st); }}>
                  <LuShoppingBag size={15} /> New sale
                </button>
              )}
            </>
          )}
        >
              {historyLoading || !history ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ height: 44 }} />)}
                </div>
              ) : (
                <>
                  {(history.courses?.length > 0 || history.memberships?.length > 0 || history.services?.length > 0) && (
                    <div>
                      <div className={s.sectionLabel}>Active enrollments</div>
                      <ul className={s.list}>
                        {(history.courses || []).map((c) => (
                          <li key={c._id} className={s.listItem}>
                            <span>ðŸ“˜ {c.title}</span>
                            <span className={s.listMeta}>{formatKES(c.price)}</span>
                          </li>
                        ))}
                        {(history.memberships || []).filter((m) => m.status === 'active').map((m) => (
                          <li key={m._id} className={s.listItem}>
                            <span>ðŸŽŸï¸ {m.planType}</span>
                            <span className={s.listMeta}>until {formatDate(m.expiryDate)}</span>
                          </li>
                        ))}
                        {(history.services || []).filter((sv) => sv.status === 'active').map((sv) => (
                          <li key={sv._id} className={s.listItem}>
                            <span>âœ¨ {sv.serviceName}</span>
                            <span className={s.listMeta}>{formatKES(sv.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <div className={s.sectionLabel}>Payment history ({history.payments?.length || 0})</div>
                    {(history.payments || []).length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>No payments recorded yet.</p>
                    ) : (
                      <ul className={s.list}>
                        {history.payments.map((p) => (
                          <li key={p._id} className={s.listItem}>
                            <span>{p.label}</span>
                            <span className={s.listMeta}>
                              {formatKES(p.amount)} Â· {p.paymentStatus}
                              {p.capturedAt ? ` Â· ${formatDate(p.capturedAt)}` : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
        </ReceptionModal>
      )}

      {/* â”€â”€ Edit modal â”€â”€ */}
      {editing && (
        <ReceptionModal
          title="Edit Customer"
          subtitle={editing.email}
          icon={<LuPencil size={20} />}
          onClose={() => setEditing(null)}
          onSubmit={handleEdit}
          footer={(
            <>
              <button type="button" className={s.btn} onClick={() => setEditing(null)}>Cancel</button>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          )}
        >
              <div className={s.grid2}>
                <label className={s.fieldLabel}>
                  Full Name *
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
                </label>
                <label className={s.fieldLabel}>
                  Email (read-only)
                  <input type="email" value={editForm.email} disabled title="Email cannot be changed from reception" />
                </label>
              </div>
              <div className={s.grid2}>
                <label className={s.fieldLabel}>
                  Phone
                  <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                </label>
                <label className={s.fieldLabel}>
                  City
                  <input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                </label>
              </div>
        </ReceptionModal>
      )}
    </div>
  );
}
