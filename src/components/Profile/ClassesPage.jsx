import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ClassesPage.module.css";
import w from "./widgets/DashboardWidgets.module.css";
import {
  Stagger, Item, StatCard, Tabs, Pill, EmptyState, PrimaryButton, PageHeader,
} from "./widgets/DashboardWidgets";
import { getMyInvites, getMyInviteDetail, markInviteRead, joinInvite } from "../api/StudentServices.js";

function formatCountdown(dateStr, timeStr) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number);
  const start = new Date(dateStr);
  start.setHours(h, m, 0, 0);
  const diff = start.getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatShortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  });
}

const STATUS_MAP = {
  upcoming: { label: 'Upcoming', cls: 'badgeBlue' },
  live: { label: 'Live Now', cls: 'badgeGreen' },
  completed: { label: 'Completed', cls: 'badgeAmber' },
  cancelled: { label: 'Cancelled', cls: 'badgeRed' },
};

function EntityBadge({ entityType, entityLabel }) {
  if (!entityLabel && !entityType) return null;
  const toneMap = {
    membership: { bg: '#2E7D5B', label: 'Membership' },
    service: { bg: '#16A34A', label: 'Service' },
    course: { bg: '#7C3AED', label: 'Course' },
    trial: { bg: '#D97706', label: 'Trial' },
    workshop: { bg: '#2563EB', label: 'Workshop' },
    batch: { bg: '#0891B2', label: 'Batch' },
  };
  const t = toneMap[entityType] || { bg: '#7C6A58', label: '' };
  const display = entityLabel || entityType || '';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 9px', borderRadius: 6, fontSize: 10.5, fontWeight: 700,
      background: `${t.bg}18`, color: t.bg, letterSpacing: '0.01em',
      whiteSpace: 'nowrap', lineHeight: '20px',
    }}>
      {display}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.upcoming;
  const cls = s.cls === 'badgeGreen' ? w.badgeGreen
    : s.cls === 'badgeRed' ? w.badgeRed
    : s.cls === 'badgeAmber' ? w.badgeAmber
    : w.badgeBlue;
  return <span className={`${w.badge} ${cls}`}>{s.label}</span>;
}

function platformIcon(p) {
  if (p === 'Zoom') return 'ti-device-laptop';
  if (p === 'Google Meet') return 'ti-brand-google';
  if (p === 'Offline') return 'ti-building';
  return 'ti-link';
}

export default function ClassesPage() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState("upcoming");
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const pollRef = useRef();

  const fetchInvites = useCallback(async (isInitial) => {
    if (isInitial) setLoading(true);
    try {
      const data = await getMyInvites();
      setInvites(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load invitations');
      setInvites([]);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvites(true); }, [fetchInvites]);

  useEffect(() => {
    pollRef.current = setInterval(() => { fetchInvites(false); }, 30000);
    return () => clearInterval(pollRef.current);
  }, [fetchInvites]);

  function categorize(inv) {
    if (inv.computedStatus === 'live') return 'live';
    if (inv.computedStatus === 'completed') return 'completed';
    if (inv.computedStatus === 'cancelled') return 'cancelled';
    return 'upcoming';
  }

  const filtered = tab === 'all' ? invites : invites.filter(i => categorize(i) === tab);
  const upcomingCount = invites.filter(i => categorize(i) === 'upcoming').length;
  const liveCount = invites.filter(i => categorize(i) === 'live').length;
  const completedCount = invites.filter(i => categorize(i) === 'completed').length;

  async function openDetail(inv) {
    setModalLoading(true);
    setModalOpen(true);
    try {
      const data = await getMyInviteDetail(inv._id);
      setSelected(data);
      if (inv.myStatus !== 'read' && inv.myStatus !== 'joined') {
        markInviteRead(inv._id).catch(() => {});
      }
    } catch {
      setSelected(null);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleJoin(inv) {
    try {
      const result = await joinInvite(inv._id);
      if (result.meetingLink) {
        window.open(result.meetingLink, '_blank', 'noopener,noreferrer');
      }
      fetchInvites(false);
    } catch { /* ignore */ }
  }

  return (
    <>
      <PageHeader
        title="Classes"
        sub="View and join your upcoming classes and workshops."
      />

      <Stagger>
        <div className={w.statGrid}>
          <StatCard
            tone="orange"
            icon="ti-calendar-event"
            label="Upcoming"
            value={upcomingCount}
            index={0}
          />
          <StatCard
            tone="green"
            icon="ti-player-play"
            label="Live Now"
            value={liveCount}
            index={1}
          />
          <StatCard
            tone="blue"
            icon="ti-check"
            label="Completed"
            value={completedCount}
            index={2}
          />
          <StatCard
            tone="neutral"
            icon="ti-mail"
            label="Total Invitations"
            value={invites.length}
            index={3}
          />
        </div>

        <Item>
          <Tabs
            layoutId="classesInvitesTab"
            active={tab}
            onChange={setTab}
            tabs={[
              { id: "upcoming",   label: "Upcoming",   icon: "ti-calendar-event" },
              { id: "live",       label: "Live",       icon: "ti-player-play" },
              { id: "completed",  label: "Completed",  icon: "ti-check" },
              { id: "all",        label: "All",        icon: "ti-mail" },
            ]}
          />
        </Item>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {loading ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Loading invitations…</p>
              </div>
            ) : error ? (
              <div className={styles.errorState}>
                <i className="ti ti-alert-circle" style={{ fontSize: 28 }} />
                <p>{error}</p>
                <PrimaryButton icon="ti-refresh" onClick={() => fetchInvites(true)}>
                  Retry
                </PrimaryButton>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="ti-calendar"
                title={`No ${tab === 'all' ? '' : tab} class invitations${tab === 'upcoming' ? ' yet' : ''}.`}
                sub={tab === 'upcoming' ? 'Your admin will send you invitations for upcoming classes.' : ''}
              />
            ) : (
              <div className={styles.list}>
                {filtered.map(inv => {
                  const cat = categorize(inv);
                  const countdown = formatCountdown(inv.date, inv.startTime);
                  const isUnread = inv.myStatus !== 'read' && inv.myStatus !== 'joined';

                  return (
                    <motion.div
                      key={inv._id}
                      className={styles.classCard}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26 }}
                      whileHover={{ y: -3 }}
                      onClick={() => openDetail(inv)}
                    >
                      {/* Date Block */}
                      <div className={styles.dateBlock}>
                        <span className={styles.dateDay}>
                          {new Date(inv.date).getDate()}
                        </span>
                        <span className={styles.dateMonth}>
                          {new Date(inv.date).toLocaleString('en-IN', { month: 'short' })}
                        </span>
                      </div>

                      {/* Content */}
                      <div className={styles.cardBody}>
                        <div className={styles.cardTop}>
                          <span className={styles.cardTitle}>{inv.title}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <EntityBadge entityType={inv.entityType} entityLabel={inv.entityBadge} />
                            {isUnread && <span className={styles.unreadDot} />}
                          </div>
                        </div>
                        <div className={styles.cardMeta}>
                          <span>
                            <i className="ti ti-clock" style={{ marginRight: 4 }} />
                            {inv.startTime}{inv.endTime ? ` - ${inv.endTime}` : ''}
                          </span>
                          {inv.instructor && (
                            <span>
                              <i className="ti ti-user" style={{ marginRight: 4 }} />
                              {inv.instructor}
                            </span>
                          )}
                          <Pill
                            tone={inv.platform === 'Offline' ? 'green' : 'orange'}
                            icon={platformIcon(inv.platform)}
                          >
                            {inv.platform}
                          </Pill>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className={styles.cardActions}>
                        <StatusBadge status={cat} />
                        {countdown && cat === 'upcoming' && (
                          <span className={styles.countdown}>
                            Starts in {countdown}
                          </span>
                        )}
                        {cat === 'live' && (
                          <PrimaryButton
                            icon="ti-video"
                            onClick={(e) => { e.stopPropagation(); handleJoin(inv); }}
                          >
                            Join
                          </PrimaryButton>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Stagger>

      {/* Detail Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.modalClose}
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>

              {modalLoading ? (
                <div className={styles.modalLoading}>
                  <div className={styles.spinner} />
                  <p>Loading details…</p>
                </div>
              ) : selected ? (
                  <>
                    {/* Header */}
                    <div className={styles.modalHeader}>
                      <div>
                        <h2 className={styles.modalTitle}>{selected.title}</h2>
                        <p className={styles.modalDate}>
                          {formatDate(selected.date)}
                        </p>
                        <div style={{ marginTop: 6 }}>
                          <EntityBadge entityType={selected.entityType} entityLabel={selected.entityBadge} />
                        </div>
                      </div>
                      <StatusBadge status={selected.computedStatus || 'upcoming'} />
                    </div>

                  {/* Info Grid */}
                  <div className={styles.infoGrid}>
                    <div className={styles.infoField}>
                      <div className={styles.infoLabel}>Start Time</div>
                      <div className={styles.infoValue}>{selected.startTime}</div>
                    </div>
                    <div className={styles.infoField}>
                      <div className={styles.infoLabel}>End Time</div>
                      <div className={styles.infoValue}>{selected.endTime || '—'}</div>
                    </div>
                    <div className={styles.infoField}>
                      <div className={styles.infoLabel}>Duration</div>
                      <div className={styles.infoValue}>{selected.duration} min</div>
                    </div>
                    <div className={styles.infoField}>
                      <div className={styles.infoLabel}>Instructor</div>
                      <div className={styles.infoValue}>{selected.instructor || '—'}</div>
                    </div>
                    <div className={styles.infoField}>
                      <div className={styles.infoLabel}>Platform</div>
                      <div className={styles.infoValue}>
                        <Pill
                          tone={selected.platform === 'Offline' ? 'green' : 'orange'}
                          icon={platformIcon(selected.platform)}
                        >
                          {selected.platform}
                        </Pill>
                      </div>
                    </div>
                    <div className={styles.infoField}>
                      <div className={styles.infoLabel}>Status</div>
                      <div className={styles.infoValue}>
                        <StatusBadge status={selected.computedStatus || 'upcoming'} />
                      </div>
                    </div>
                  </div>

                  {/* Meeting Link */}
                  {selected.meetingLink && (
                    <div className={styles.section}>
                      <div className={styles.sectionLabel}>
                        <i className="ti ti-link" style={{ marginRight: 6 }} />
                        Meeting Link
                      </div>
                      <a
                        href={selected.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.meetingLink}
                      >
                        {selected.meetingLink}
                      </a>
                      {selected.meetingPassword && (
                        <div className={styles.meetingPassword}>
                          Password: <strong>{selected.meetingPassword}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {selected.description && (
                    <div className={styles.section}>
                      <div className={styles.sectionLabel}>
                        <i className="ti ti-align-left" style={{ marginRight: 6 }} />
                        Description
                      </div>
                      <p className={styles.sectionText}>{selected.description}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {selected.notes && (
                    <div className={styles.notesBox}>
                      <div className={styles.sectionLabel}>
                        <i className="ti ti-notes" style={{ marginRight: 6 }} />
                        Notes
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.6, margin: '6px 0 0' }}>
                        {selected.notes}
                      </p>
                    </div>
                  )}

                  {/* Countdown */}
                  {selected.computedStatus === 'upcoming' && formatCountdown(selected.date, selected.startTime) && (
                    <div className={styles.countdownBar}>
                      <i className="ti ti-clock" />
                      Starts in {formatCountdown(selected.date, selected.startTime)}
                    </div>
                  )}

                  {/* Join Button */}
                  {selected.computedStatus === 'live' && (
                    <PrimaryButton
                      icon="ti-video"
                      onClick={() => handleJoin(selected)}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Join Class Now
                    </PrimaryButton>
                  )}
                </>
              ) : (
                <div className={styles.modalLoading}>
                  <i className="ti ti-alert-circle" style={{ fontSize: 28, color: 'var(--color-danger)' }} />
                  <p>Failed to load details.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
