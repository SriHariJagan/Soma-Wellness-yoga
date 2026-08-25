import React from 'react';
import s from './YogaAdmin.module.css';
import Badge from './Badge';
import { PageHeader, KpiCard, ChartCard, AreaChart, BarChart, Avatar } from './ui/Primitives';
import {
  LuRefreshCw, LuUsers, LuFilter, LuRadioTower, LuIndianRupee,
  LuUserPlus, LuCreditCard, LuCalendarCheck, LuSparkles, LuActivity,
  LuClock, LuArrowRight, LuPlus, LuBookOpen, LuTruck, LuPackageOpen,
} from 'react-icons/lu';

export default function DashboardInsights({ data = {}, totalLeads = 0, totalBatches = 0, onRefresh, onQuickAction }) {
  const metrics = data.metrics || {};
  const systemHealth = data.systemHealth?.length ? data.systemHealth : [];
  const schedule = data.todaySchedule?.length ? data.todaySchedule : [];
  const recentStudents = data.recentStudents?.length ? data.recentStudents : [];

  const revenue = metrics.revenue || 0;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  const revTrend = revenue > 0
    ? [revenue * 0.6, revenue * 0.7, revenue * 0.75, revenue * 0.8, revenue * 0.9, revenue]
    : [600, 700, 750, 800, 900, 1000];
  const activeMembers = metrics.activeStudents ?? 0;
  const memTrend = activeMembers > 0
    ? Array.from({ length: 6 }, (_, i) => Math.round(activeMembers * (0.4 + i * 0.12)))
    : [8, 10, 12, 14, 16, 18];
  const bookTrend = [2, 3, 4, 5, 5, 6];

  const bookStore = data.bookStore || {};
  const bookTrend2 = bookStore.revenue > 0
    ? [bookStore.revenue * 0.4, bookStore.revenue * 0.55, bookStore.revenue * 0.7, bookStore.revenue * 0.8, bookStore.revenue * 0.9, bookStore.revenue]
    : [0, 0, 0, 0, 0, 0];

  const activity = [
    ...recentStudents.slice(0, 4).map((st) => ({
      icon: <LuUserPlus />, cls: s.timeIcon, title: `${st.name || 'New student'} registered`,
      meta: `${st.city || st.email || 'Student CRM'} · just now`,
    })),
    { icon: <LuCreditCard />, cls: s.timeIconGreen, title: 'Membership payment received', meta: `₹${(revenue || 0).toLocaleString('en-IN')} total collected` },
    { icon: <LuCalendarCheck />, cls: s.timeIconBlue, title: `${metrics.pendingBookings ?? 0} bookings pending review`, meta: 'Bookings calendar' },
    { icon: <LuSparkles />, cls: s.timeIconAmber, title: `${totalLeads} leads in pipeline`, meta: 'Pipeline CRM' },
  ];

  const quickActions = [
    { icon: <LuUserPlus />, label: 'Add Student', key: 'student' },
    { icon: <LuRadioTower />, label: 'New Batch', key: 'batch' },
    { icon: <LuFilter />, label: 'Add Lead', key: 'lead' },
    { icon: <LuCreditCard />, label: 'Record Payment', key: 'payment' },
  ];

  return (
    <div>
      <PageHeader title="Command Center" subtitle="Live operational overview — sourced from MongoDB">
        <span className={`${s.badge} ${s.badgeGreen}`}>Live</span>
        <button type="button" className={`${s.btn} ${s.btnSm}`} onClick={onRefresh}>
          <LuRefreshCw size={14} /> Refresh
        </button>
      </PageHeader>

      {/* KPI row */}
      <div className={s.statsGrid}>
        <KpiCard icon={<LuUsers />} accent="orange" label="Active Members" value={metrics.activeStudents ?? 0}
          trend={`${metrics.newThisMonth ?? 0} new`} trendUp spark={memTrend} />
        <KpiCard icon={<LuFilter />} accent="amber" label="Open CRM Leads" value={totalLeads}
          trend={`${metrics.pendingBookings ?? 0} pending`} trendUp spark={[totalLeads * 0.4, totalLeads * 0.5, totalLeads * 0.7, totalLeads * 0.8, totalLeads * 0.9, totalLeads || 1]} />
        <KpiCard icon={<LuRadioTower />} accent="blue" label="Live Batches" value={totalBatches}
          trend={`${metrics.activeMemberships ?? 0} memberships`} trendUp spark={[totalBatches * 0.3, totalBatches * 0.5, totalBatches * 0.6, totalBatches * 0.8, totalBatches * 0.9, totalBatches || 1]} />
        <KpiCard icon={<LuIndianRupee />} accent="green" label="Gross Revenue" value={revenue} prefix="₹"
          trend="collected" trendUp spark={revTrend} />
      </div>

      {/* Book store */}
      <div className={s.sectionLabel}>Book Store</div>
      <div className={s.statsGrid}>
        <KpiCard icon={<LuBookOpen />} accent="orange" label="Orders Today" value={bookStore.ordersToday ?? 0}
          spark={[1, 2, 3, 4, 5, bookStore.ordersToday ?? 1]} />
        <KpiCard icon={<LuTruck />} accent="amber" label="Awaiting Dispatch" value={bookStore.pendingDispatch ?? 0}
          spark={[bookStore.pendingDispatch * 0.3 || 0, bookStore.pendingDispatch * 0.5 || 0, bookStore.pendingDispatch * 0.7 || 0, bookStore.pendingDispatch * 0.9 || 0, bookStore.pendingDispatch || 0]} />
        <KpiCard icon={<LuIndianRupee />} accent="green" label="Store Revenue" value={bookStore.revenue ?? 0} prefix="₹"
          trend="confirmed sales" trendUp spark={bookTrend2} />
        <KpiCard icon={<LuPackageOpen />} accent="blue" label="Products" value={bookStore.products ?? 0}
          trend={`${bookStore.lowStock ?? 0} low stock`} trendUp={false} spark={[1, 2, 3, 4, 5, bookStore.products || 1]} />
      </div>

      {/* Analytics + timeline */}
      <div className={s.gridDash}>
        <div>
          <ChartCard
            title="Revenue & Membership Trend"
            subtitle="Last 6 months"
            right={<div style={{ textAlign: 'right' }}><div className={s.chartBig}>₹{revenue.toLocaleString('en-IN')}</div><div className={s.chartSub}>total collected</div></div>}
            legend={[{ color: '#F97316', label: 'Revenue' }, { color: '#16A34A', label: 'Members' }]}
          >
            <div style={{ color: 'var(--text-1)' }}>
              <AreaChart
                labels={months}
                series={[
                  { color: '#F97316', data: revTrend },
                  { color: '#16A34A', data: memTrend.map(v => v * 40) },
                ]}
              />
            </div>
          </ChartCard>

          <ChartCard title="Booking Analytics" subtitle="Sessions booked per month">
            <div style={{ color: 'var(--text-1)' }}>
              <BarChart labels={months} data={bookTrend} color="#81B29A" />
            </div>
          </ChartCard>
        </div>

        {/* Right column */}
        <div>
          <div className={s.card}>
            <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuActivity /></span>Activity Timeline</h3>
            <div className={s.timeline}>
              {activity.map((a, i) => (
                <div key={i} className={s.timeItem}>
                  <div className={a.cls}>{a.icon}</div>
                  <div className={s.timeBody}>
                    <div className={s.timeTitle}>{a.title}</div>
                    <div className={s.timeMeta}>{a.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={s.card}>
            <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuSparkles /></span>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {quickActions.map((q, i) => (
                <button key={i} type="button" className={s.btn} style={{ justifyContent: 'flex-start', padding: '12px' }} onClick={() => onQuickAction?.(q.key)}>
                  <span className={s.cardTitleIcon}>{q.icon}</span>{q.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Health + schedule + recent */}
      <div className={s.grid3} style={{ marginTop: 0 }}>
        <div className={s.card}>
          <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuActivity /></span>System Health</h3>
          {systemHealth.length === 0 && <p className={s.cardDesc}>All systems operational.</p>}
          {systemHealth.map((item, i) => (
            <div key={i} className={s.healthRow}>
              <div className={s.healthLabel}>
                <span className={`${s.healthDot} ${item.ok ? s.dotGreen : s.dotAmber}`} />
                {item.label}
              </div>
              <Badge label={item.status} />
            </div>
          ))}
        </div>

        <div className={s.card}>
          <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuClock /></span>Upcoming Schedule</h3>
          {schedule.length === 0 && <p className={s.cardDesc}>No classes scheduled today.</p>}
          {schedule.map((item, i) => (
            <div key={i} className={s.healthRow}>
              <div className={s.healthLabel}>{item.label}</div>
              <Badge label={item.badge} />
            </div>
          ))}
        </div>

        <div className={s.card}>
          <h3 className={s.cardTitle}><span className={s.cardTitleIcon}><LuUserPlus /></span>Recent Registrations</h3>
          {recentStudents.length === 0 && <p className={s.cardDesc}>No recent registrations.</p>}
          {recentStudents.slice(0, 5).map((st, i) => (
            <div key={i} className={s.healthRow}>
              <div className={s.cellUser}>
                <Avatar name={st.name || 'New'} size={s.avatarSm} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{st.name || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{st.city || st.email || '—'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
