import React, { useState, useEffect, useCallback } from 'react';
import ReceptionModal from '../Modal.jsx';
import { useAuth } from '../../../context/AuthContext';
import { receptionApi } from '../../api/AdminServices';
import {
  LuGraduationCap, LuRefreshCw, LuSearch, LuX, LuEye,
  LuShoppingBag, LuBadgeCheck, LuClock, LuTag, LuSparkles, LuTicket,
} from 'react-icons/lu';
import s from '../../Admin/YogaAdmin.module.css';

const EMPTY_SALE = { studentId: '', method: 'Cash' };

const KIND_META = {
  course: { label: 'Courses', singular: 'Course', icon: <LuGraduationCap size={14} /> },
  service: { label: 'Services', singular: 'Service', icon: <LuSparkles size={14} /> },
  plan: { label: 'Plans', singular: 'Plan', icon: <LuTicket size={14} /> },
};

// Catalog state uses plural keys; the active kind is singular.
const KIND_PLURAL = { course: 'courses', service: 'services', plan: 'plans' };

function formatKES(n) {
  return `KES ${Number(n || 0).toLocaleString('en-KE')}`;
}

function itemTitle(kind, it) {
  return kind === 'course' ? (it.title || 'â€”') : (it.name || 'â€”');
}

function itemSubtitle(kind, it) {
  if (kind === 'course') return it.duration || it.mode || '';
  if (kind === 'service') return [it.category, it.mode].filter(Boolean).join(' Â· ');
  return it.durationMonths ? `${it.durationMonths} month${it.durationMonths !== 1 ? 's' : ''}` : '';
}

export default function CoursesTab() {
  const { hasAnyPermission } = useAuth();
  const [catalog, setCatalog] = useState({ courses: [], services: [], plans: [] });
  const [paymentMethods, setPaymentMethods] = useState(['Cash', 'M-Pesa', 'Card', 'Bank transfer']);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [kind, setKind] = useState('course');
  const [detail, setDetail] = useState(null);
  // Sell flow
  const [selling, setSelling] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsFailed, setStudentsFailed] = useState(false);
  const [sale, setSale] = useState(EMPTY_SALE);
  const [manualId, setManualId] = useState('');
  const [sellingNow, setSellingNow] = useState(false);
  const [sold, setSold] = useState(null);

  const canView = hasAnyPermission('courses.view');
  const canSell = hasAnyPermission('courses.booking', 'bookings.create');
  const canListStudents = hasAnyPermission('customers.view', 'users.view');

  const loadCatalog = useCallback(async () => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await receptionApi.catalog();
      setCatalog({
        courses: Array.isArray(data?.courses) ? data.courses : [],
        services: Array.isArray(data?.services) ? data.services : [],
        plans: Array.isArray(data?.plans) ? data.plans : [],
      });
      if (Array.isArray(data?.paymentMethods) && data.paymentMethods.length > 0) {
        setPaymentMethods(data.paymentMethods);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load catalog.' });
    }
    setLoading(false);
  }, [canView]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const items = catalog[KIND_PLURAL[kind]] || [];
  const q = searchInput.trim().toLowerCase();
  const visible = q
    ? items.filter((it) =>
        (itemTitle(kind, it) || '').toLowerCase().includes(q) ||
        ((kind === 'course' ? it.description : it.category) || '').toLowerCase().includes(q))
    : items;

  const openSell = async (item) => {
    setSelling(item);
    setSale(EMPTY_SALE);
    setManualId('');
    setSold(null);
    setStudentsFailed(false);
    if (canListStudents) {
      try {
        const list = await receptionApi.students.list({});
        setStudents(Array.isArray(list) ? list : []);
      } catch {
        setStudentsFailed(true);
      }
    } else {
      setStudentsFailed(true);
    }
  };

  const handleSell = async (e) => {
    e.preventDefault();
    const studentId = sale.studentId || manualId.trim();
    if (!selling || !studentId) {
      setFeedback({ type: 'error', message: 'Select the customer to sell to.' });
      return;
    }
    setSellingNow(true);
    try {
      const res = await receptionApi.purchases.create(studentId, {
        kind,
        itemId: selling._id,
        method: sale.method,
      });
      setSold({
        item: itemTitle(kind, selling),
        student: res?.student?.name || 'customer',
        amount: res?.payment?.amount ?? selling.price,
        method: sale.method,
      });
      setFeedback({ type: 'success', message: `"${itemTitle(kind, selling)}" sold to ${res?.student?.name || 'customer'} â€” ${formatKES(res?.payment?.amount ?? selling.price)}.` });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record sale.' });
    }
    setSellingNow(false);
  };

  if (!canView) {
    return (
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <h2 className={s.sectionTitle}><LuGraduationCap size={20} /> Courses & Services</h2>
        </div>
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>ðŸ”’</div>
          <h3 className={s.emptyTitle}>No access</h3>
          <p className={s.emptyDesc}>You don't have permission to view the catalog. Contact an admin to grant courses.view access.</p>
        </div>
      </div>
    );
  }

  const meta = KIND_META[kind];

  return (
    <div className={s.recPage}>
      {/* â”€â”€ Header â”€â”€ */}
      <div className={s.sectionHeader}>
        <h2 className={s.sectionTitle}>
          <LuGraduationCap size={20} /> Courses & Services
          <span className={s.chipCount} style={{ fontSize: 12 }}>
            Â· {catalog.courses.length} courses Â· {catalog.services.length} services
          </span>
        </h2>
        <div className={s.toolbar}>
          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={loadCatalog} disabled={loading} title="Refresh">
            <LuRefreshCw size={14} className={loading ? s.spin : ''} /> Refresh
          </button>
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

      {/* â”€â”€ One main card â”€â”€ */}
      <div className={`${s.card} ${s.cardNoPad}`}>
        <div style={{ padding: '18px 20px 0' }}>
          <div className={s.filterBar} style={{ marginBottom: 14 }}>
            <div className={s.tabGroup}>
              {Object.entries(KIND_META).map(([key, m]) => (
                <button
                  key={key}
                  type="button"
                  className={`${s.tabBtn} ${kind === key ? s.tabActive : ''}`}
                  onClick={() => setKind(key)}
                >
                  {m.icon} {m.label} ({(catalog[KIND_PLURAL[key]] || []).length})
                </button>
              ))}
            </div>
            <div className={s.searchWrapper} style={{ maxWidth: 320 }}>
              <span className={s.searchIcon}><LuSearch size={16} /></span>
              <input
                className={s.searchInput}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search ${meta.label.toLowerCase()}â€¦`}
                aria-label="Search catalog"
              />
              {searchInput && (
                <button type="button" className={s.searchClear} onClick={() => setSearchInput('')} aria-label="Clear search">
                  <LuX size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 22 }}>
            {[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelRow}`} style={{ height: 64 }} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>ðŸŽ“</div>
            <h3 className={s.emptyTitle}>No {meta.label.toLowerCase()} found</h3>
            <p className={s.emptyDesc}>{q ? 'Try a different search term.' : `No ${meta.label.toLowerCase()} are on sale right now.`}</p>
          </div>
        ) : (
          <>
            <div className={s.recTableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>{meta.singular}</th>
                    <th>Details</th>
                    <th style={{ textAlign: 'right' }}>Price</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((it) => (
                    <tr key={it._id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{itemTitle(kind, it)}</div>
                        {(kind === 'course' ? it.description : null) && (
                          <div style={{ fontSize: 11.5, color: 'var(--text-3)', maxWidth: 420, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {it.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
                          <LuClock size={12} /> {itemSubtitle(kind, it) || 'â€”'}
                        </div>
                        {kind === 'course' && it.earlyPrice ? (
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', marginTop: 2 }}>
                            Early {formatKES(it.earlyPrice)}
                          </div>
                        ) : null}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, whiteSpace: 'nowrap' }}>{formatKES(it.price)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => setDetail(it)} title="View full details">
                            <LuEye size={14} /> Details
                          </button>
                          {canSell && (
                            <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnPrimary}`} onClick={() => openSell(it)} title={`Sell this ${meta.singular.toLowerCase()} to a customer`}>
                              <LuShoppingBag size={14} /> Sell
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
              {visible.length} {visible.length !== 1 ? meta.label.toLowerCase() : meta.singular.toLowerCase()} on sale{q ? ` matching "${searchInput.trim()}"` : ''}
            </div>
          </>
        )}
      </div>

      {!canSell && (
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 12 }}>
          You can explain items but not sell them. Contact an admin to grant courses.booking access.
        </p>
      )}

      {/* â”€â”€ Details modal (explain the item) â”€â”€ */}
      {detail && (
        <ReceptionModal
          title={itemTitle(kind, detail) || KIND_META[kind].singular}
          subtitle={itemSubtitle(kind, detail)}
          icon={<LuTag size={20} />}
          onClose={() => setDetail(null)}
        >
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {itemSubtitle(kind, detail) && <span className={s.chip}><LuClock size={12} /> {itemSubtitle(kind, detail)}</span>}
                {detail.mode && <span className={s.chip}>{detail.mode}</span>}
                {detail.hours ? <span className={s.chip}>{detail.hours} hours</span> : null}
                {detail.category && <span className={s.chip}>{detail.category}</span>}
              </div>
              {detail.description && <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{detail.description}</p>}
              {kind === 'plan' && Array.isArray(detail.benefits) && detail.benefits.length > 0 && (
                <ul className={s.list}>
                  {detail.benefits.map((b, i) => <li key={i} className={s.listItem}><span>{b}</span></li>)}
                </ul>
              )}
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 800 }}>
                  <LuTag size={16} /> {formatKES(detail.price)}
                </div>
                {detail.earlyPrice ? (
                  <div style={{ fontSize: 13, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>
                    Early enrolment: {formatKES(detail.earlyPrice)}
                  </div>
                ) : null}
              </div>
              <div className={s.modalActions}>
                {canSell && (
                  <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => { const it = detail; setDetail(null); openSell(it); }}>
                    <LuShoppingBag size={15} /> Sell this {KIND_META[kind].singular.toLowerCase()}
                  </button>
                )}
                <button type="button" className={s.btn} onClick={() => setDetail(null)}>Close</button>
              </div>
        </ReceptionModal>
      )}

      {/* â”€â”€ Sell modal (pick the customer) â”€â”€ */}
      {selling && (
        <ReceptionModal
          title={`Sell: ${itemTitle(kind, selling)}`}
          subtitle="Counter sale - payment is recorded instantly"
          icon={<LuShoppingBag size={20} />}
          onClose={() => { setSelling(null); setSold(null); }}
        >
            {sold ? (
              <div className={s.modalBody}>
                <div className={`${s.feedbackInline} ${s.bannerSuccess}`}>
                  <LuBadgeCheck size={16} />
                  <span><strong>{sold.student}</strong> is now enrolled in <strong>{sold.item}</strong> â€” {formatKES(sold.amount)} via {sold.method}.</span>
                </div>
                <div className={s.modalActions}>
                  <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => { setSelling(null); setSold(null); }}>Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSell} className={s.modalBody}>
                {!studentsFailed && students.length > 0 ? (
                  <label className={s.fieldLabel}>
                    Customer *
                    <select value={sale.studentId} onChange={(e) => setSale({ ...sale, studentId: e.target.value })} required>
                      <option value="">Select a customerâ€¦</option>
                      {students.map((st) => (
                        <option key={st._id} value={String(st._id)}>{st.name} Â· {st.email}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className={s.fieldLabel}>
                    Customer ID *
                    <input
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      required={!sale.studentId}
                      placeholder="Paste student _id (copy from Customers â†’ View)"
                    />
                  </label>
                )}
                <label className={s.fieldLabel}>
                  Payment method
                  <select value={sale.method} onChange={(e) => setSale({ ...sale, method: e.target.value })}>
                    {paymentMethods.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line-2)', borderRadius: 12, padding: '12px 16px', fontSize: 14 }}>
                  <div><strong>{itemTitle(kind, selling)}</strong> Â· {itemSubtitle(kind, selling)}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{formatKES(selling.price)}</div>
                </div>
                <div className={s.modalActions}>
                  <button type="button" className={s.btn} onClick={() => { setSelling(null); setSold(null); }}>Cancel</button>
                  <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={sellingNow || (!sale.studentId && !manualId.trim())}>
                    {sellingNow ? 'Processingâ€¦' : <><LuBadgeCheck size={15} /> Confirm sale Â· {formatKES(selling.price)}</>}
                  </button>
                </div>
              </form>
            )}
        </ReceptionModal>
      )}
    </div>
  );
}
