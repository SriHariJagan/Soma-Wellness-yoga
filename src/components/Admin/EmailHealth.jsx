import React, { useEffect, useState } from 'react';
import s from './YogaAdmin.module.css';
import { LuActivity, LuMail, LuDatabase, LuRefreshCw, LuSend, LuCircleCheck, LuCircleX, LuClock, LuLoader, LuChartBar } from 'react-icons/lu';
import { getEmailHealth, testSmtp as testSmtpApi } from '../api/AdminServices.js';

function Badge({ status }) {
  const green = ['delivered', 'sent', 'connected', 'verified', 'healthy'];
  const amber = ['pending', 'queued', 'connecting', 'unverified', 'degraded'];
  const red = ['failed', 'disconnected', 'disconnecting', 'unconfigured', 'unknown'];
  let cls = s.badgeGreen;
  if (amber.includes(status)) cls = s.badgeAmber;
  if (red.includes(status)) cls = s.badgeRed;
  return <span className={`${s.badge} ${cls}`}>{status}</span>;
}

function StatusCard({ icon, label, value, status }) {
  const borderCls = status === 'connected' || status === 'verified' || status === 'healthy'
    ? s.statGreen : status === 'degraded' ? s.statAmber : s.statOrange;
  return (
    <div className={`${s.statCard} ${borderCls}`}>
      <div className={s.statTopRow}>
        <div className={s.statIcon}>{icon}</div>
      </div>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statVal} style={{ fontSize: 22 }}>{value}</div>
      <Badge status={status} />
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  const iconCls = color === 'amber' ? s.statIconAmber : color === 'blue' ? s.statIconBlue : color === 'green' ? s.statIconGreen : '';
  const borderCls = color === 'orange' ? s.statOrange : color === 'amber' ? s.statAmber : color === 'blue' ? s.statBlue : s.statGreen;
  return (
    <div className={`${s.statCard} ${borderCls}`}>
      <div className={s.statTopRow}>
        <div className={`${s.statIcon} ${iconCls}`}>{icon}</div>
      </div>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statVal}>{value}</div>
    </div>
  );
}

export default function EmailHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpResult, setSmtpResult] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getEmailHealth();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    setSmtpResult(null);
    try {
      const result = await testSmtpApi();
      setSmtpResult({ type: 'success', message: result.message });
    } catch (err) {
      setSmtpResult({ type: 'error', message: err.message });
    } finally {
      setSmtpTesting(false);
    }
  };

  if (loading) {
    return (
      <div className={s.card} style={{ textAlign: 'center', padding: 60 }}>
        <LuLoader size={32} className={s.spin} style={{ color: '#2E7D5B', marginBottom: 12 }} />
        <div style={{ color: '#7C6A58', fontSize: 14 }}>Loading system health...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.card} style={{ textAlign: 'center', padding: 60 }}>
        <LuCircleX size={32} color="#DC2626" style={{ marginBottom: 12 }} />
        <div style={{ color: '#DC2626', fontWeight: 600, marginBottom: 8 }}>Failed to load system health</div>
        <div style={{ color: '#7C6A58', fontSize: 13, marginBottom: 16 }}>{error}</div>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={load}>Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const { database, smtp, notifications, queue } = data;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className={s.pageHeader}>
          <LuActivity size={22} color="#2E7D5B" />
          <div>
            <h2 className={s.pageTitle} style={{ margin: 0 }}>Email & Notification Health</h2>
            <p className={s.pageSub} style={{ margin: 0 }}>Monitor email delivery, queue performance, and system status</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`${s.btn} ${s.btnSm}`} onClick={load}>
            <LuRefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className={s.grid3}>
        <StatusCard
          icon={<LuDatabase />}
          label="Database"
          value={database === 'connected' ? 'Connected' : 'Disconnected'}
          status={database}
        />
        <StatusCard
          icon={<LuMail />}
          label="SMTP"
          value={smtp.status === 'verified' ? 'Verified' : smtp.status === 'unverified' ? 'Unverified' : 'Not Configured'}
          status={smtp.status === 'verified' ? 'verified' : 'degraded'}
        />
        <StatusCard
          icon={<LuChartBar />}
          label="Queue Health"
          value={queue.unavailable ? 'Unavailable' : 'Active'}
          status={queue.unavailable ? 'unknown' : 'healthy'}
        />
      </div>

      {smtp.note && (
        <div className={s.card} style={{ padding: '12px 18px', marginBottom: 18, fontSize: 13, color: '#7C6A58' }}>
          {smtp.note}
        </div>
      )}

      <div className={s.gridDash} style={{ marginBottom: 18 }}>
        <div className={s.card}>
          <h3 className={s.cardTitle}><LuCircleCheck className={s.cardTitleIcon} /> Notification Stats</h3>
          <div className={s.statsGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <StatCard icon={<LuCircleCheck />} label="Delivered" value={notifications.successCount} color="green" />
            <StatCard icon={<LuCircleX />} label="Failed" value={notifications.failedCount} color="orange" />
            <StatCard icon={<LuClock />} label="Pending" value={notifications.pendingCount} color="amber" />
          </div>
        </div>

        <div className={s.card}>
          <h3 className={s.cardTitle}><LuChartBar className={s.cardTitleIcon} /> Queue Stats</h3>
          <div className={s.statsGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <StatCard icon={<LuClock />} label="Waiting" value={queue.waiting} color="amber" />
            <StatCard icon={<LuActivity />} label="Active" value={queue.active} color="blue" />
            <StatCard icon={<LuCircleCheck />} label="Completed" value={queue.completed} color="green" />
            <StatCard icon={<LuCircleX />} label="Failed" value={queue.failed} color="orange" />
          </div>
        </div>
      </div>

      <div className={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className={s.cardTitle} style={{ margin: 0 }}><LuActivity className={s.cardTitleIcon} /> Recent Notifications</h3>
          {notifications.recent?.length > 0 && (
            <span style={{ fontSize: 12, color: '#7C6A58' }}>Last 20</span>
          )}
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {notifications.recent?.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 32, color: '#7C6A58' }}>
                    No notifications found
                  </td>
                </tr>
              )}
              {notifications.recent?.map((n) => (
                <tr key={n.id}>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.email || 'system'}
                  </td>
                  <td><span className={s.badge} style={{ textTransform: 'capitalize' }}>{n.type || 'general'}</span></td>
                  <td><Badge status={n.status || 'unknown'} /></td>
                  <td className={s.tdMuted}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={s.card}>
        <h3 className={s.cardTitle}><LuSend className={s.cardTitleIcon} /> Test SMTP</h3>
        <p className={s.cardDesc}>Send a test email to your admin address to verify SMTP is working end-to-end.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className={`${s.btn} ${s.btnPrimary}`}
            onClick={handleTestSmtp}
            disabled={smtpTesting}
          >
            {smtpTesting ? <LuLoader size={14} className={s.spin} /> : <LuSend size={14} />}
            {smtpTesting ? 'Sending...' : 'Send Test Email'}
          </button>
          {smtpResult && (
            <span style={{ fontSize: 13, color: smtpResult.type === 'success' ? '#16A34A' : '#DC2626' }}>
              {smtpResult.type === 'success' ? '✅ ' : '❌ '}{smtpResult.message}
            </span>
          )}
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#7C6A58', textAlign: 'right', marginTop: 8 }}>
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
