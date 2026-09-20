import React, { useState } from 'react';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { PageHeader, KpiCard, Avatar } from './ui/Primitives';
import {
  LuRefreshCw, LuUsers, LuFilter, LuRadioTower, LuCoins,
  LuUserPlus, LuCreditCard, LuCalendarCheck, LuClock, LuArrowRight,
  LuChevronLeft, LuChevronRight,
} from 'react-icons/lu';

export default function DashboardInsights({ data = {}, totalLeads = 0, totalBatches = 0, onRefresh, onQuickAction }) {
  const [page, setPage] = useState(0);

  const metrics = data.metrics || {};
  const schedule = data.todaySchedule?.length ? data.todaySchedule : [];
  // Overview already ships the most recent signups — cap at top 6, no more
  const recentStudents = (Array.isArray(data.recentStudents) ? data.recentStudents : []).slice(0, 6);

  const revenue = metrics.revenue || 0;

  const refresh = () => { setPage(0); onRefresh?.(); };

  const PAGE_SIZE = 3;
  const pageCount = Math.max(1, Math.ceil(recentStudents.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = recentStudents.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const needsAttention = [
    { icon: <LuFilter />, label: 'Open leads', value: totalLeads, hint: 'in pipeline', go: 'leads' },
    { icon: <LuCalendarCheck />, label: 'Pending bookings', value: metrics.pendingBookings ?? 0, hint: 'needs review', go: 'attendance-mgmt' },
  ];

  const quickActions = [
    { icon: <LuUserPlus />, label: 'Add User', key: 'student' },
    { icon: <LuRadioTower />, label: 'New Batch', key: 'batch' },
    { icon: <LuFilter />, label: 'Add Lead', key: 'lead' },
    { icon: <LuCreditCard />, label: 'Record Payment', key: 'payment' },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Today at SomaWellness">
        <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={refresh}>
          <LuRefreshCw size={14} /> Refresh
        </button>
      </PageHeader>

      {/* KPI row — real numbers only */}
      <div className={s.statsGrid}>
        <KpiCard icon={<LuUsers />} accent="orange" label="Active Members" value={metrics.activeStudents ?? 0}
          trend={`${metrics.newThisMonth ?? 0} new this month`} trendUp />
        <KpiCard icon={<LuCoins />} accent="green" label="Revenue Collected" value={revenue} prefix="KES " trend="all time" trendUp />
        <KpiCard icon={<LuRadioTower />} accent="blue" label="Live Batches" value={totalBatches} trend="on timetable" trendUp />
        <KpiCard icon={<LuFilter />} accent="amber" label="Open Leads" value={totalLeads} trend="in pipeline" trendUp />
      </div>

      {/* Needs attention */}
      <div className={s.card} style={{ marginBottom: '20px' }}>
        <h3 className={s.cardTitle}>Needs attention</h3>
        {needsAttention.every((n) => !n.value) && (
          <p className={s.cardDesc}>All clear — nothing waiting on you.</p>
        )}
        {needsAttention.filter((n) => n.value > 0).map((n) => (
          <div key={n.label} className={s.healthRow}>
            <div className={s.healthLabel}>{n.icon} {n.label} — <strong>{n.value}</strong> {n.hint}</div>
            <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={() => onQuickAction?.(n.go)}>
              Review <LuArrowRight size={13} />
            </button>
          </div>
        ))}
      </div>

      <div className={s.gridDash}>
        {/* Today's schedule */}
        <div className={s.card}>
          <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuClock /></span>Today's Schedule</h3>
          {schedule.length === 0 && <p className={s.cardDesc}>No classes scheduled today.</p>}
          {schedule.map((item, i) => (
            <div key={i} className={s.healthRow}>
              <div className={s.healthLabel}>{item.label}</div>
              <Badge label={item.badge} />
            </div>
          ))}
        </div>

        {/* Quick actions + recent */}
        <div>
          <div className={s.card}>
            <h3 className={s.cardTitle}>Quick Actions</h3>
            <div className={s.quickActions}>
              {quickActions.map((q, i) => (
                <button key={i} type="button" className={s.quickActionBtn} onClick={() => onQuickAction?.(q.key)}>
                  <span className={s.quickActionIcon}>{q.icon}</span>
                  <span className={s.quickActionLabel}>{q.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className={s.cardTitle} style={{ marginBottom: 0 }}><span className={s.cardTitleIcon}><LuUserPlus /></span>Recent Registrations</h3>
              {pageCount > 1 && (
                <div className={s.pager}>
                  <button
                    type="button" className={s.pagerBtn} aria-label="Previous"
                    disabled={safePage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
                  ><LuChevronLeft size={13} /></button>
                  <span className={s.pagerInfo}>{safePage + 1} / {pageCount}</span>
                  <button
                    type="button" className={s.pagerBtn} aria-label="Next"
                    disabled={safePage >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  ><LuChevronRight size={13} /></button>
                </div>
              )}
            </div>
            {recentStudents.length === 0 && <p className={s.cardDesc}>No recent registrations.</p>}
            {visible.map((st, i) => (
              <div key={st._id || i} className={s.healthRow}>
                <div className={s.cellUser}>
                  <Avatar name={st.name || 'New'} size={s.avatarSm} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{st.name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{st.email || '—'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
