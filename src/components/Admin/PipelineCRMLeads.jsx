import React, { useState, useEffect } from 'react';
import s from './YogaAdmin.module.css';
import { PageHeader, KpiCard, Avatar } from './ui/Primitives';
import { getLeads, createLead, updateLeadStage, deleteLead } from '../api/AdminServices.js';
import { LuPlus, LuX, LuPhone, LuTag, LuGripVertical } from 'react-icons/lu';

const STAGES = [
  { id: 'New',       label: 'New',       dot: s.leadColDotO, accent: 'orange' },
  { id: 'Follow up', label: 'Follow Up', dot: s.leadColDotA, accent: 'amber'  },
  { id: 'Converted', label: 'Converted', dot: s.leadColDotG, accent: 'green'  },
  { id: 'Cold',      label: 'Cold',      dot: s.leadColDotB, accent: 'blue'   },
];

const EMPTY = { name: '', phone: '', email: '', interestType: '', notes: '' };

// Deterministic lead score + priority (presentation only).
const scoreOf = (lead) => {
  const seed = (lead._id || lead.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return 40 + (seed % 60);
};
const priorityOf = (score) => (score > 75 ? ['High', s.prioHigh] : score > 55 ? ['Medium', s.prioMed] : ['Low', s.prioLow]);

export default function PipelineCRMLeads() {
  const [leads, setLeads]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [feedback, setFeedback]   = useState({ message: '', type: '' });
  const [movingId, setMovingId]   = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [dragId, setDragId]       = useState(null);
  const [overStage, setOverStage] = useState(null);

  const flash = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      setLeads(await getLeads());
    } catch {
      flash('Could not load leads.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name) { flash('Name is required.', 'error'); return; }
    setSaving(true);
    try {
      const data = await createLead(form);
      setLeads(prev => [data, ...prev]);
      setForm(EMPTY);
      setShowForm(false);
      flash(`Lead "${data.name}" added to pipeline!`);
    } catch (err) {
      flash(err.message || 'Failed to add lead.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStageChange = async (id, newStage) => {
    setMovingId(id);
    try {
      const data = await updateLeadStage(id, newStage);
      setLeads(prev => prev.map(l => l._id === id ? data : l));
    } catch {
      flash('Failed to update stage.', 'error');
    } finally {
      setMovingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove lead "${name}"?`)) return;
    setDeletingId(id);
    try {
      await deleteLead(id);
      setLeads(prev => prev.filter(l => l._id !== id));
      flash(`Lead "${name}" removed.`);
    } catch {
      flash('Failed to delete lead.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Drag & drop ──
  const onDrop = (stageId) => {
    setOverStage(null);
    if (!dragId) return;
    const lead = leads.find(l => l._id === dragId);
    setDragId(null);
    if (lead && lead.stage !== stageId) handleStageChange(dragId, stageId);
  };

  const stageLeads = (stageId) => leads.filter(l => l.stage === stageId);

  return (
    <div>
      <PageHeader title="Pipeline CRM" subtitle="Track & convert prospective students — drag cards between stages">
        <button
          type="button"
          className={`${s.btn} ${showForm ? '' : s.btnPrimary} ${s.btnSm}`}
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? <><LuX size={14} /> Cancel</> : <><LuPlus size={14} /> Add Lead</>}
        </button>
      </PageHeader>

      {feedback.message && (
        <div className={`${s.feedbackInline} ${feedback.type === 'success' ? s.bannerSuccess : s.bannerError}`}>
          <span className={s.bannerIcon}>{feedback.type === 'success' ? '✓' : '⚠'}</span>{feedback.message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className={s.card} style={{ marginBottom: '20px' }}>
          <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuPlus /></span>Add New Lead</h3>
          <div className={s.grid3} style={{ marginBottom: '12px' }}>
            <input type="text"  placeholder="Full name *"      value={form.name}         onChange={e => setForm({ ...form, name: e.target.value })}         required />
            <input type="text"  placeholder="Phone number"     value={form.phone}        onChange={e => setForm({ ...form, phone: e.target.value })}        />
            <input type="email" placeholder="Email (optional)" value={form.email}        onChange={e => setForm({ ...form, email: e.target.value })}        />
          </div>
          <div className={s.grid2} style={{ marginBottom: '14px' }}>
            <input type="text" placeholder="Interest (e.g. Hatha Yoga)" value={form.interestType} onChange={e => setForm({ ...form, interestType: e.target.value })} />
            <input type="text" placeholder="Notes (optional)"           value={form.notes}        onChange={e => setForm({ ...form, notes: e.target.value })}        />
          </div>
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={saving}>
            {saving ? 'Adding…' : 'Add to Pipeline'}
          </button>
        </form>
      )}

      <div className={s.statsGrid} style={{ marginBottom: '20px' }}>
        {STAGES.map((st) => {
          const val = loading ? 0 : stageLeads(st.id).length;
          return (
            <KpiCard key={st.id} icon={<LuTag />} accent={st.accent} label={st.label}
              value={val} spark={[val * 0.3 || 1, val * 0.5 || 2, val * 0.7 || 3, val * 0.8 || 4, val * 0.9 || 5, val || 6]} />
          );
        })}
      </div>

      {loading ? (
        <div className={s.kanban}>
          {STAGES.map(st => <div key={st.id} className={`${s.skel} ${s.skelCard}`} style={{ height: 200 }} />)}
        </div>
      ) : (
        <div className={s.kanban}>
          {STAGES.map(stage => (
            <div
              key={stage.id}
              className={`${s.leadCol} ${overStage === stage.id ? s.leadColOver : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOverStage(stage.id); }}
              onDragLeave={() => setOverStage(prev => (prev === stage.id ? null : prev))}
              onDrop={() => onDrop(stage.id)}
            >
              <div className={s.leadColHead}>
                <div className={s.leadColTitle}><span className={stage.dot} />{stage.label}</div>
                <span className={s.leadColCount}>{stageLeads(stage.id).length}</span>
              </div>

              {stageLeads(stage.id).length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-3)', padding: '14px 0', textAlign: 'center' }}>
                  Drop leads here
                </div>
              )}

              {stageLeads(stage.id).map(lead => {
                const score = scoreOf(lead);
                const [prio, prioCls] = priorityOf(score);
                return (
                  <div
                    key={lead._id}
                    className={`${s.leadCard} ${dragId === lead._id ? s.leadCardDragging : ''}`}
                    draggable
                    onDragStart={() => setDragId(lead._id)}
                    onDragEnd={() => { setDragId(null); setOverStage(null); }}
                  >
                    <div className={s.leadCardTop}>
                      <Avatar name={lead.name} size={s.avatarSm} />
                      <span className={s.leadCardName}>{lead.name}</span>
                      <span className={s.leadScore}>{score}</span>
                    </div>
                    <div className={s.leadMeta}><LuTag size={12} /> {lead.interestType || 'General Yoga'}</div>
                    {lead.phone && <div className={s.leadMeta}><LuPhone size={12} /> {lead.phone}</div>}
                    {lead.notes && <div className={s.leadMeta} style={{ fontStyle: 'italic' }}>"{lead.notes}"</div>}

                    <div className={s.leadTags}>
                      <span className={`${s.priorityTag} ${prioCls}`}>{prio} priority</span>
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <LuGripVertical size={13} style={{ color: 'var(--text-3)' }} />
                      {STAGES.filter(st => st.id !== stage.id).map(st => (
                        <button
                          key={st.id}
                          type="button"
                          className={`${s.btn} ${s.btnSm}`}
                          style={{ fontSize: '10px', padding: '3px 8px' }}
                          disabled={movingId === lead._id}
                          onClick={() => handleStageChange(lead._id, st.id)}
                        >
                          {st.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`${s.btn} ${s.btnSm} ${s.btnDanger}`}
                        style={{ fontSize: '10px', padding: '3px 8px', marginLeft: 'auto' }}
                        disabled={deletingId === lead._id}
                        onClick={() => handleDelete(lead._id, lead.name)}
                      >
                        {deletingId === lead._id ? '…' : <LuX size={12} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
