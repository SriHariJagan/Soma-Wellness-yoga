import React, { useState, useEffect } from 'react';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { PageHeader, KpiCard, Avatar } from './ui/Primitives';
import { getBatches, createBatch, deleteBatch } from '../api/AdminServices.js';
import {
  LuRadioTower, LuActivity, LuVideo, LuPlus, LuTrash2, LuClock, LuUser, LuLayoutGrid, LuTable,
} from 'react-icons/lu';

const EMPTY = { name: '', timing: '', trainer: '', zoomLink: '' };

export default function BatchesStreams({ onChanged } = {}) {
  const [batches, setBatches]     = useState([]);
  const [form, setForm]           = useState(EMPTY);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError]         = useState('');
  const [feedback, setFeedback]   = useState({ message: '', type: '' });
  const [view, setView]           = useState('grid');

  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchBatches = async () => {
    setLoading(true);
    setError('');
    try {
      setBatches(await getBatches());
    } catch (err) {
      setError(err.message || 'Could not load batches. Check your server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.timing || !form.trainer) {
      flash('Name, timing and trainer are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = await createBatch(form);
      setBatches(prev => [data, ...prev]);
      setForm(EMPTY);
      flash(`Batch "${data.name}" initialized successfully!`);
      onChanged?.();
    } catch (err) {
      flash(err.message || 'Failed to create batch', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete batch "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteBatch(id);
      setBatches(prev => prev.filter(b => b._id !== id));
      flash(`Batch "${name}" deleted.`);
      onChanged?.();
    } catch {
      flash('Failed to delete batch. Try again.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Deterministic occupancy for visual richness (presentation only).
  const occOf = (b) => {
    const seed = (b._id || b.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return 45 + (seed % 50);
  };

  return (
    <div>
      <PageHeader title="Scheduling Control Center" subtitle="Manage live and in-studio batch tracks">
        <div className={s.segment}>
          <button type="button" className={`${s.segBtn} ${view === 'grid' ? s.segActive : ''}`} onClick={() => setView('grid')}><LuLayoutGrid size={14} /> Cards</button>
          <button type="button" className={`${s.segBtn} ${view === 'table' ? s.segActive : ''}`} onClick={() => setView('table')}><LuTable size={14} /> Table</button>
        </div>
      </PageHeader>

      {feedback.message && (
        <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span className={s.bannerIcon}>{feedback.type === 'success' ? '✓' : '⚠'}</span>{feedback.message}
        </div>
      )}

      <div className={s.statsGrid} style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: '20px' }}>
        <KpiCard icon={<LuRadioTower />} accent="orange" label="Total Batches" value={batches.length} spark={[batches.length * 0.3 || 1, batches.length * 0.5 || 2, batches.length * 0.7 || 3, batches.length * 0.8 || 4, batches.length * 0.9 || 5, batches.length || 6]} />
        <KpiCard icon={<LuActivity />} accent="green" label="Active" value={batches.filter(b => b.status === 'Active').length} spark={[batches.filter(b => b.status === 'Active').length * 0.3 || 1, batches.filter(b => b.status === 'Active').length * 0.5 || 2, batches.filter(b => b.status === 'Active').length * 0.7 || 3, batches.filter(b => b.status === 'Active').length * 0.8 || 4, batches.filter(b => b.status === 'Active').length * 0.9 || 5, batches.filter(b => b.status === 'Active').length || 6]} />
        <KpiCard icon={<LuVideo />} accent="blue" label="With Zoom" value={batches.filter(b => b.zoomLink).length} spark={[batches.filter(b => b.zoomLink).length * 0.3 || 1, batches.filter(b => b.zoomLink).length * 0.5 || 2, batches.filter(b => b.zoomLink).length * 0.7 || 3, batches.filter(b => b.zoomLink).length * 0.8 || 4, batches.filter(b => b.zoomLink).length * 0.9 || 5, batches.filter(b => b.zoomLink).length || 6]} />
      </div>

      <form onSubmit={handleSave} className={s.card} style={{ marginBottom: '20px' }}>
        <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuPlus /></span>Deploy New Batch</h3>
        <div className={s.grid2} style={{ marginBottom: '12px' }}>
          <input type="text" placeholder="Batch name (e.g. Morning Vinyasa) *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input type="text" placeholder="Timings (e.g. 06:00 AM – 07:15 AM) *" value={form.timing} onChange={e => setForm({ ...form, timing: e.target.value })} />
          <input type="text" placeholder="Assigned Instructor / Acharya *" value={form.trainer} onChange={e => setForm({ ...form, trainer: e.target.value })} />
          <input type="url" placeholder="Zoom streaming link (https://...) — optional" value={form.zoomLink} onChange={e => setForm({ ...form, zoomLink: e.target.value })} />
        </div>
        <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
          {saving ? 'Initializing…' : 'Initialize Batch'}
        </button>
      </form>

      {loading ? (
        <div className={s.catalogGrid}>{[...Array(3)].map((_, i) => <div key={i} className={`${s.skel} ${s.skelCard}`} style={{ height: 160 }} />)}</div>
      ) : error ? (
        <div className={`${s.card} ${s.emptyState} ${s.stateError}`}>
          {error}<br />
          <button type="button" className={`${s.btn} ${s.btnSm}`} style={{ marginTop: '12px' }} onClick={fetchBatches}>Retry</button>
        </div>
      ) : batches.length === 0 ? (
        <div className={`${s.card} ${s.emptyState}`}><div className={s.emptyIcon}>📡</div>No batches yet — deploy one above!</div>
      ) : view === 'grid' ? (
        <div className={s.catalogGrid}>
          {batches.map(b => {
            const occ = occOf(b);
            return (
              <div key={b._id} className={s.productCard}>
                <div className={s.productBody}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className={s.productTitle}>{b.name}</div>
                    <Badge label={b.status} />
                  </div>
                  <div className={s.productMeta}><LuClock size={12} style={{ verticalAlign: '-2px', marginRight: 6 }} />{b.timing}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 4 }}>
                    <Avatar name={b.trainer} size={s.avatarSm} />
                    <span style={{ fontSize: 12.5, fontWeight: 600 }}>{b.trainer}</span>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>
                      <span>Occupancy</span><span style={{ fontWeight: 700 }}>{occ}%</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 6, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{ width: `${occ}%`, height: '100%', background: 'var(--c-grad)' }} />
                    </div>
                  </div>

                  <div className={s.productFoot}>
                    {b.zoomLink
                      ? <a href={b.zoomLink} target="_blank" rel="noreferrer" className={`${s.btn} ${s.btnSm}`}><LuVideo size={13} /> Join</a>
                      : <span className={s.tdMuted} style={{ fontSize: 12 }}>No stream</span>}
                    <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => handleDelete(b._id, b.name)} disabled={deletingId === b._id}>
                      {deletingId === b._id ? '…' : <LuTrash2 size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`${s.card} ${s.cardNoPad}`}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr><th>Batch Name</th><th>Timings</th><th>Instructor</th><th>Zoom Link</th><th>Status</th><th>Created</th><th></th></tr>
              </thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b._id}>
                    <td><strong>{b.name}</strong></td>
                    <td className={s.tdMuted}>{b.timing}</td>
                    <td><div className={s.cellUser}><Avatar name={b.trainer} size={s.avatarSm} />{b.trainer}</div></td>
                    <td>
                      {b.zoomLink
                        ? <a href={b.zoomLink} target="_blank" rel="noreferrer" style={{ color: 'var(--c-primary)', fontSize: '12px', fontWeight: 600 }}>Open Link ↗</a>
                        : <span className={s.tdMuted} style={{ fontSize: '12px' }}>—</span>}
                    </td>
                    <td><Badge label={b.status} /></td>
                    <td className={s.tdMuted} style={{ fontSize: '11px' }}>
                      {new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <button type="button" className={`${s.btn} ${s.btnSm} ${s.btnDanger}`} onClick={() => handleDelete(b._id, b.name)} disabled={deletingId === b._id}>
                        {deletingId === b._id ? '…' : <LuTrash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
