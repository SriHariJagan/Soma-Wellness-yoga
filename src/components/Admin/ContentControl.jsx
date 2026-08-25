import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { PageHeader, KpiCard } from './ui/Primitives';
import { assetsApi, membershipPlansApi } from '../api/AdminServices.js';
import {
  LuFolderLock, LuUpload, LuFileText, LuVideo, LuFileAudio,
  LuLayoutGrid, LuTable, LuX, LuTrash2, LuArchive, LuDownload,
  LuPencilLine, LuSave, LuRefreshCw, LuSearch, LuCircleAlert, LuCircleCheck,
  LuLoader, LuFile, LuReplace, LuUsers, LuShield, LuLock, LuGlobe,
  LuCalendarDays, LuCircleUser, LuEye, LuArrowUp,
} from 'react-icons/lu';

const TYPE_ICONS = {
  pdf: '\u{1F4C4}', video: '\u{1F3AC}', audio: '\u{1F3A7}', guide: '\u{1F4D8}',
  worksheet: '\u{1F4CA}', meditation: '\u{1F9D8}', document: '\u{1F4CB}', other: '\u{1F4E6}',
};

const TYPE_LABELS = {
  pdf: 'PDF', video: 'Video', audio: 'Audio', guide: 'Guide',
  worksheet: 'Worksheet', meditation: 'Meditation', document: 'Document', other: 'File',
};

const CATEGORY_COLORS = {
  pdf: '#DC2626', video: '#7C3AED', audio: '#0891B2',
  guide: '#16A34A', worksheet: '#D97706', meditation: '#9333EA',
  document: '#2563EB', other: '#6B7280',
};

const VISIBILITY_OPTIONS = [
  { value: 'all', label: 'All Users', icon: LuGlobe },
  { value: 'plan', label: 'Plan-Based', icon: LuUsers },
  { value: 'admin', label: 'Admin Only', icon: LuShield },
];

const CATEGORIES = ['All', 'PDF', 'Video', 'Audio', 'Guide', 'Worksheet', 'Meditation', 'Document'];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 26 } },
};

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtBytes(bytes) {
  if (!bytes || bytes === 0) return '';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0, s = bytes;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

function ProgressBar({ percent }) {
  return (
    <div style={{ width: '100%', height: 6, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: `${Math.min(100, Math.max(0, percent))}%`, height: '100%', background: 'var(--c-primary)', borderRadius: 4, transition: 'width 0.3s ease' }} />
    </div>
  );
}

function PermissionBadges({ visibility, allowedPlans }) {
  if (visibility === 'all') {
    return <span className={`${s.permBadge} ${s.permAll}`}><LuGlobe size={10} /> All Users</span>;
  }
  if (visibility === 'admin') {
    return <span className={`${s.permBadge} ${s.permAdmin}`}><LuShield size={10} /> Admin Only</span>;
  }
  if (!allowedPlans || allowedPlans.length === 0) {
    return <span className={`${s.permBadge} ${s.permPlan}`}><LuUsers size={10} /> All Plans</span>;
  }
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {allowedPlans.map(p => (
        <span key={p} className={`${s.permBadge} ${s.permPlan}`}>{p}</span>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className={s.assetGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={s.assetCard}>
          <div className={s.assetThumb}>
            <div className={s.skel} style={{ width: 50, height: 50, borderRadius: 12 }} />
          </div>
          <div className={s.assetBody}>
            <div className={s.skel} style={{ width: '70%', height: 14, marginBottom: 8 }} />
            <div className={s.skel} style={{ width: '45%', height: 11, marginBottom: 10 }} />
            <div className={s.skel} style={{ width: '55%', height: 22, borderRadius: 6, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <div className={s.skel} style={{ flex: 1, height: 28, borderRadius: 6 }} />
              <div className={s.skel} style={{ width: 28, height: 28, borderRadius: 6 }} />
              <div className={s.skel} style={{ width: 28, height: 28, borderRadius: 6 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanSelector({ selected = [], onChange, plans = [] }) {
  const toggle = (planName) => {
    onChange(selected.includes(planName) ? selected.filter(p => p !== planName) : [...selected, planName]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {plans.map(p => (
        <button key={p._id || p.name} type="button" onClick={() => toggle(p.name)}
          className={`${s.chip} ${selected.includes(p.name) ? s.chipActive : ''}`}
          style={{ cursor: 'pointer', fontSize: 12 }}
        >
          {selected.includes(p.name) ? '\u2713 ' : ''}{p.name}
        </button>
      ))}
      {plans.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', padding: 4 }}>No plans found</div>}
    </div>
  );
}

function UploadModal({ onClose, onSuccess, plans }) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [visibility, setVisibility] = useState('plan');
  const [allowedPlans, setAllowedPlans] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileSelect = useCallback((f) => {
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ''));
    setError('');
  }, [name]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file) { setError('Please select a file'); return; }
    if (visibility === 'plan' && allowedPlans.length === 0) {
      setError('Select at least one plan or change visibility');
      return;
    }
    setUploading(true);
    setProgress(0);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', name);
    fd.append('category', category);
    fd.append('visibility', visibility);
    allowedPlans.forEach(p => fd.append('allowedPlans', p));
    const fakeProgress = setInterval(() => { setProgress(prev => Math.min(prev + Math.random() * 15, 85)); }, 300);
    try {
      await assetsApi.upload(fd);
      clearInterval(fakeProgress);
      setProgress(100);
      setTimeout(onSuccess, 400);
    } catch (err) {
      clearInterval(fakeProgress);
      setError(err.message || 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className={s.drawerOverlay} onClick={onClose}>
      <div className={s.drawer} onClick={e => e.stopPropagation()}>
        <div className={s.drawerHeader}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)' }}>Upload Asset</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Add a new file to the content library</div>
          </div>
          <button type="button" className={s.drawerClose} onClick={onClose}><LuX size={18} /></button>
        </div>
        <div className={s.drawerBody}>
          {error && (
            <div className={`${s.feedbackBanner} ${s.bannerError}`}>
              <span className={s.bannerIcon}><LuCircleAlert /></span>
              <p className={s.bannerText}>{error}</p>
            </div>
          )}
          <div
            className={s.dropzone}
            style={{ borderColor: dragOver ? 'var(--c-primary)' : undefined, background: dragOver ? 'var(--c-primary-light)' : undefined, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {file ? (
              <>
                <div style={{ fontSize: 40, opacity: 0.6 }}>{TYPE_ICONS[file.name?.split('.').pop()] || '\u{1F4C4}'}</div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
                {!uploading && (
                  <button type="button" className={s.btn} style={{ marginTop: 6, padding: '4px 12px', fontSize: 12 }} onClick={e => { e.stopPropagation(); setFile(null); }}>
                    <LuReplace size={12} /> Change File
                  </button>
                )}
              </>
            ) : (
              <>
                <div className={s.dropIcon}><LuUpload /></div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>Drop file here or click to browse</div>
                <div className={s.cardDesc} style={{ margin: 0 }}>PDF, Video, Audio, Documents up to 500MB</div>
              </>
            )}
            <input ref={fileInputRef} type="file" hidden onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])} />
          </div>
          {uploading && <ProgressBar percent={progress} />}
          <div className={s.drawerSection}>
            <div className={s.drawerSectionTitle}>Asset Name</div>
            <input className={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Enter asset name" disabled={uploading} />
          </div>
          <div className={s.drawerSection}>
            <div className={s.drawerSectionTitle}>Category</div>
            <select className={s.input} value={category} onChange={e => setCategory(e.target.value)} disabled={uploading}>
              {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className={s.drawerSection}>
            <div className={s.drawerSectionTitle}>Visibility</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {VISIBILITY_OPTIONS.map(o => (
                <button key={o.value} type="button" className={`${s.chip} ${visibility === o.value ? s.chipActive : ''}`} onClick={() => setVisibility(o.value)} disabled={uploading}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {visibility === 'plan' && (
            <div className={s.drawerSection}>
              <div className={s.drawerSectionTitle}>Allowed Membership Plans</div>
              <PlanSelector selected={allowedPlans} onChange={setAllowedPlans} plans={plans} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleUpload} disabled={uploading || !file} style={{ flex: 1 }}>
              {uploading ? <><LuLoader className={s.spin} size={14} /> Uploading...</> : <><LuUpload size={14} /> Upload Asset</>}
            </button>
            <button type="button" className={s.btn} onClick={onClose} disabled={uploading}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ asset, onClose, onSuccess, plans }) {
  const [name, setName] = useState(asset.name || '');
  const [category, setCategory] = useState(asset.category || 'General');
  const [description, setDescription] = useState(asset.description || '');
  const [visibility, setVisibility] = useState(asset.visibility || 'plan');
  const [allowedPlans, setAllowedPlans] = useState(asset.allowedPlans || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await assetsApi.update(asset._id, { name, category, description, visibility, allowedPlans });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Update failed');
      setSaving(false);
    }
  };

  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()} style={{ width: 480, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)' }}>Edit Asset</div>
          <button type="button" className={s.drawerClose} onClick={onClose}><LuX size={18} /></button>
        </div>
        {error && (
          <div className={`${s.feedbackBanner} ${s.bannerError}`} style={{ marginBottom: 16 }}>
            <span className={s.bannerIcon}><LuCircleAlert /></span>
            <p className={s.bannerText}>{error}</p>
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <div className={s.drawerSectionTitle}>Asset Name</div>
          <input className={s.input} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className={s.drawerSectionTitle}>Category</div>
          <select className={s.input} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className={s.drawerSectionTitle}>Description</div>
          <textarea className={s.textarea} value={description} onChange={e => setDescription(e.target.value)} rows={3} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div className={s.drawerSectionTitle}>Visibility</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {VISIBILITY_OPTIONS.map(o => (
              <button key={o.value} type="button" className={`${s.chip} ${visibility === o.value ? s.chipActive : ''}`} onClick={() => setVisibility(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {visibility === 'plan' && (
          <div style={{ marginBottom: 16 }}>
            <div className={s.drawerSectionTitle}>Allowed Membership Plans</div>
            <PlanSelector selected={allowedPlans} onChange={setAllowedPlans} plans={plans} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? <><LuLoader className={s.spin} size={14} /> Saving...</> : <><LuSave size={14} /> Save Changes</>}
          </button>
          <button type="button" className={s.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); } catch { setLoading(false); }
  };
  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>{'\u26A0\uFE0F'}</div>
        <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 22, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button type="button" className={`${s.btn} ${s.btnDanger}`} onClick={handleConfirm} disabled={loading}>
            {loading ? <><LuLoader className={s.spin} size={14} /> Processing...</> : <>Confirm</>}
          </button>
          <button type="button" className={s.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function ReplaceFileModal({ asset, onClose, onSuccess }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const handleReplace = async () => {
    if (!file) { setError('Select a file'); return; }
    setUploading(true);
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      await assetsApi.replaceFile(asset._id, fd);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Replace failed');
      setUploading(false);
    }
  };
  return (
    <div className={s.modalOverlay} onClick={onClose}>
      <div className={s.modalBox} onClick={e => e.stopPropagation()} style={{ width: 400, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)' }}>Replace File</div>
          <button type="button" className={s.drawerClose} onClick={onClose}><LuX size={18} /></button>
        </div>
        {error && <div className={`${s.feedbackBanner} ${s.bannerError}`} style={{ marginBottom: 12 }}><p className={s.bannerText}>{error}</p></div>}
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
          Current file: <strong>{asset.originalName}</strong>
        </div>
        <div className={s.dropzone} style={{ padding: 20, cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          {file ? <div style={{ fontWeight: 600 }}>{file.name}</div> : <><LuUpload size={20} /> Click to select replacement file</>}
          <input ref={fileInputRef} type="file" hidden onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={handleReplace} disabled={uploading || !file} style={{ flex: 1 }}>
            {uploading ? <><LuLoader className={s.spin} size={14} /> Uploading...</> : <><LuReplace size={14} /> Replace</>}
          </button>
          <button type="button" className={s.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function ContentControl({ contentItems: parentItems, onRefresh }) {
  const [view, setView] = useState('grid');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [localItems, setLocalItems] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [editAsset, setEditAsset] = useState(null);
  const [deleteAsset, setDeleteAsset] = useState(null);
  const [replaceAsset, setReplaceAsset] = useState(null);
  const [archiveAsset, setArchiveAsset] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await assetsApi.list();
      const list = Array.isArray(res) ? res : (res.assets || []);
      setLocalItems(list);
    } catch { /* ignore */ }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchAssets(),
      membershipPlansApi.list().then(setPlans).catch(() => {}),
      assetsApi.stats().then(setStats).catch(() => {}),
    ]);
    setLoading(false);
  }, [fetchAssets]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasItems = Array.isArray(parentItems)
    ? parentItems.length > 0
    : parentItems?.assets
      ? parentItems.assets.length > 0
      : localItems.length > 0;

  const items = (Array.isArray(parentItems) ? parentItems : (parentItems?.assets || localItems));

  const filtered = items.filter(co => {
    if (category !== 'All' && (co.type || '').toLowerCase() !== category.toLowerCase()) return false;
    if (search) {
      const q = search.toLowerCase();
      const n = (co.name || '').toLowerCase();
      const c = (co.category || '').toLowerCase();
      const t = (co.type || '').toLowerCase();
      if (!n.includes(q) && !c.includes(q) && !t.includes(q)) return false;
    }
    return true;
  });

  const typeCounts = {};
  items.forEach(co => { const t = co.type || 'other'; typeCounts[t] = (typeCounts[t] || 0) + 1; });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const refreshAll = () => {
    fetchData();
    onRefresh?.();
  };

  const handleDelete = async (asset) => {
    await assetsApi.remove(asset._id);
    setDeleteAsset(null);
    showToast('Asset deleted permanently');
    refreshAll();
  };

  const handleArchive = async (asset) => {
    await assetsApi.archive(asset._id, !asset.active);
    setArchiveAsset(null);
    showToast(asset.active ? 'Asset archived' : 'Asset restored');
    refreshAll();
  };

  const statsTotal = items.length;
  const statsVideo = typeCounts['video'] || 0;
  const statsDocs = (typeCounts['pdf'] || 0) + (typeCounts['document'] || 0) + (typeCounts['guide'] || 0) + (typeCounts['worksheet'] || 0);

  return (
    <div>
      <PageHeader title="Digital Asset Manager" subtitle="Manage access tiers & digital assets">
        <div className={s.segment}>
          <button type="button" className={`${s.segBtn} ${view === 'grid' ? s.segActive : ''}`} onClick={() => setView('grid')}><LuLayoutGrid size={14} /> Gallery</button>
          <button type="button" className={`${s.segBtn} ${view === 'table' ? s.segActive : ''}`} onClick={() => setView('table')}><LuTable size={14} /> Table</button>
        </div>
      </PageHeader>

      <div className={s.statsGrid} style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
        <KpiCard icon={<LuFolderLock />} accent="orange" label="Total Assets" value={statsTotal} />
        <KpiCard icon={<LuVideo />} accent="blue" label="Video Series" value={statsVideo} />
        <KpiCard icon={<LuFileText />} accent="green" label="Documents" value={statsDocs} />
        <KpiCard icon={<LuDownload />} accent="amber" label="Total Downloads" value={stats?.totalDownloads ?? 0} />
      </div>

      {stats?.totalStorageFormatted && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 12, textAlign: 'right' }}>
          Storage used: {stats.totalStorageFormatted}
        </div>
      )}

      {/* ── Premium Search Bar ── */}
      <div className={s.card} style={{ marginBottom: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowUpload(true)} style={{ whiteSpace: 'nowrap' }}>
            <LuUpload size={14} /> Upload Asset
          </button>
          <div className={s.searchWrapper}>
            <LuSearch size={16} className={s.searchIcon} />
            <input
              className={s.searchInput}
              placeholder="Search assets by name, type, or category..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className={s.searchClear} onClick={() => setSearch('')}>
                <LuX size={14} />
              </button>
            )}
          </div>
          <button type="button" className={s.btn} onClick={refreshAll} title="Refresh"><LuRefreshCw size={15} /></button>
        </div>
      </div>

      {/* ── Category Filters ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Filter:</span>
        {CATEGORIES.map(c => {
          const color = c === 'All' ? null : CATEGORY_COLORS[c.toLowerCase()] || '#6B7280';
          return (
            <button key={c} type="button"
              className={`${s.chip} ${category === c ? s.chipActive : ''}`}
              onClick={() => setCategory(c)}
              style={category === c && color ? { background: `${color}18`, borderColor: color, color } : {}}
            >
              {c}
            </button>
          );
        })}
        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
          {filtered.length} / {items.length} assets
        </span>
      </div>

      {/* ── Loading State ── */}
      {loading && <SkeletonGrid />}

      {/* ── Empty State ── */}
      {!loading && filtered.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={s.card} style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.3 }}>{search || category !== 'All' ? '\u{1F50D}' : '\u{1F4C1}'}</div>
          <div style={{ fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)', color: 'var(--text-1)', marginBottom: 8 }}>
            {search || category !== 'All' ? 'No assets found' : 'No assets yet'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
            {search || category !== 'All'
              ? 'Try adjusting your search or filter to find what you\'re looking for.'
              : 'Upload your first digital asset to make it available for students. PDFs, videos, audio, guides, worksheets, and more.'}
          </div>
          {!(search || category !== 'All') && (
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowUpload(true)} style={{ padding: '10px 24px', fontSize: 14 }}>
              <LuUpload size={16} /> Upload Your First Asset
            </button>
          )}
        </motion.div>
      )}

      {/* ── Grid View ── */}
      {!loading && filtered.length > 0 && view === 'grid' && (
        <motion.div className={s.assetGrid} variants={container} initial="hidden" animate="show">
          <AnimatePresence mode="popLayout">
            {filtered.map((co, idx) => {
              const catColor = CATEGORY_COLORS[co.type] || '#6B7280';
              const uploaderName = co.uploadedBy?.name || 'Admin';
              return (
                <motion.div key={co._id} layout variants={itemAnim} className={s.assetCard}
                  style={{ opacity: co.active ? 1 : 0.5 }}
                  whileHover={{ y: -5, boxShadow: 'var(--sh-lg)', borderColor: 'var(--c-primary-line)' }}
                >
                  <div className={s.assetThumb} style={{ background: `linear-gradient(135deg, ${catColor}15, ${catColor}08)` }}>
                    <span style={{ fontSize: 38, filter: co.active ? 'none' : 'grayscale(0.6)' }}>{TYPE_ICONS[co.type] || '\u{1F4C4}'}</span>
                    <span className={s.assetTypeTag} style={{ background: `${catColor}20`, color: catColor }}>
                      {TYPE_LABELS[co.type] || 'FILE'}
                    </span>
                  </div>
                  <div className={s.assetBody}>
                    <div className={s.assetTitle} style={{ fontSize: 14 }}>{co.name}</div>
                    <div className={s.assetMeta}>
                      {co.category} · {co.size || fmtBytes(co.fileSize)}
                    </div>

                    {!co.active && <Badge label="Archived" />}

                    {/* Permission badges */}
                    <div style={{ marginTop: 10, marginBottom: 8 }}>
                      <PermissionBadges visibility={co.visibility} allowedPlans={co.allowedPlans} />
                    </div>

                    {/* Metadata row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-3)', marginBottom: 10, flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><LuCalendarDays size={11} /> {formatDate(co.createdAt)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><LuDownload size={11} /> {co.downloadCount || 0}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><LuCircleUser size={11} /> {uploaderName}</span>
                    </div>

                    {/* Quick actions */}
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button type="button" className={s.btn} style={{ padding: '5px 8px', fontSize: 11, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }} onClick={() => setEditAsset(co)} title="Edit">
                        <LuPencilLine size={11} /> Edit
                      </button>
                      <button type="button" className={s.btn} style={{ padding: '5px 8px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.open(assetsApi.downloadUrl(co._id), '_blank')} title="Download">
                        <LuDownload size={11} />
                      </button>
                      <button type="button" className={s.btn} style={{ padding: '5px 8px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setReplaceAsset(co)} title="Replace File">
                        <LuReplace size={11} />
                      </button>
                      <button type="button" className={s.btn} style={{ padding: '5px 8px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setArchiveAsset(co)} title={co.active ? 'Archive' : 'Restore'}>
                        <LuArchive size={11} />
                      </button>
                      <button type="button" className={`${s.btn} ${s.btnDanger}`} style={{ padding: '5px 8px', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDeleteAsset(co)} title="Delete">
                        <LuTrash2 size={11} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Table View ── */}
      {!loading && filtered.length > 0 && view === 'table' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${s.card} ${s.cardNoPad}`}>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Asset</th><th>Type</th><th>Size</th><th>Access</th><th>Plans</th><th>Downloads</th><th>Uploaded</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(co => {
                  const catColor = CATEGORY_COLORS[co.type] || '#6B7280';
                  return (
                    <tr key={co._id} style={{ opacity: co.active ? 1 : 0.5 }}>
                      <td>
                        <div className={s.cellUser}>
                          <span style={{ fontSize: 22 }}>{TYPE_ICONS[co.type] || '\u{1F4C4}'}</span>
                          <div>
                            <strong>{co.name}</strong>
                            {!co.active && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--c-danger)' }}>(Archived)</span>}
                            {co.originalName && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{co.originalName}</div>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ color: catColor, fontWeight: 600, fontSize: 12 }}>{TYPE_LABELS[co.type] || co.type}</span>
                      </td>
                      <td className={s.tdMuted}>{co.size || fmtBytes(co.fileSize)}</td>
                      <td><PermissionBadges visibility={co.visibility} allowedPlans={co.allowedPlans} /></td>
                      <td className={s.tdMuted} style={{ maxWidth: 140 }}>
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                          {co.allowedPlans?.length ? co.allowedPlans.map(p => (
                            <span key={p} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--surface-2)', color: 'var(--text-2)' }}>{p}</span>
                          )) : co.visibility === 'plan' ? 'All Plans' : '\u2014'}
                        </div>
                      </td>
                      <td className={s.tdMuted}>{co.downloadCount || 0}</td>
                      <td className={s.tdMuted} style={{ fontSize: 11 }}>{formatDate(co.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 3 }}>
                          <button type="button" className={s.btn} style={{ padding: '4px 6px', fontSize: 10 }} onClick={() => setEditAsset(co)} title="Edit"><LuPencilLine size={11} /></button>
                          <button type="button" className={s.btn} style={{ padding: '4px 6px', fontSize: 10 }} onClick={() => window.open(assetsApi.downloadUrl(co._id), '_blank')} title="Download"><LuDownload size={11} /></button>
                          <button type="button" className={s.btn} style={{ padding: '4px 6px', fontSize: 10 }} onClick={() => setReplaceAsset(co)} title="Replace"><LuReplace size={11} /></button>
                          <button type="button" className={s.btn} style={{ padding: '4px 6px', fontSize: 10 }} onClick={() => setArchiveAsset(co)} title={co.active ? 'Archive' : 'Restore'}><LuArchive size={11} /></button>
                          <button type="button" className={`${s.btn} ${s.btnDanger}`} style={{ padding: '4px 6px', fontSize: 10 }} onClick={() => setDeleteAsset(co)} title="Delete"><LuTrash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); showToast('Asset uploaded successfully'); refreshAll(); }} plans={plans} />}
      {editAsset && <EditModal asset={editAsset} onClose={() => setEditAsset(null)} onSuccess={() => { setEditAsset(null); showToast('Asset updated'); refreshAll(); }} plans={plans} />}
      {deleteAsset && <ConfirmModal title="Delete Asset" message={`Are you sure you want to permanently delete "${deleteAsset.name}"? The file will be removed from the server.`} onConfirm={() => handleDelete(deleteAsset)} onClose={() => setDeleteAsset(null)} />}
      {archiveAsset && <ConfirmModal title={archiveAsset.active ? 'Archive Asset' : 'Restore Asset'} message={archiveAsset.active ? `"${archiveAsset.name}" will be hidden from all users.` : `"${archiveAsset.name}" will be visible again.`} onConfirm={() => handleArchive(archiveAsset)} onClose={() => setArchiveAsset(null)} />}
      {replaceAsset && <ReplaceFileModal asset={replaceAsset} onClose={() => setReplaceAsset(null)} onSuccess={() => { setReplaceAsset(null); showToast('File replaced'); refreshAll(); }} />}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderRadius: 12, background: toast.type === 'success' ? '#16A34A' : '#DC2626', color: '#fff', fontSize: 13, fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
          >
            {toast.type === 'success' ? <LuCircleCheck size={18} /> : <LuCircleAlert size={18} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
