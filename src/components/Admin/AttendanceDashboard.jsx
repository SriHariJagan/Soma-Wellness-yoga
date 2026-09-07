import React, { useState, useEffect } from 'react';
import { getQRAttendanceStats, getQRAttendanceList } from '../api/AdminServices.js';
import s from './AttendanceDashboard.module.css';
import { PageHeader, Avatar, Counter } from './ui/Primitives.jsx';

export default function AttendanceDashboard({ branchId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      try {
        const data = await getQRAttendanceStats(branchId);
        if (data.success && mounted) {
          setStats(data.data);
        }
      } catch {
        if (mounted) setError('Failed to load statistics');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadStats();
    return () => { mounted = false; };
  }, [branchId]);

  if (loading) {
    return (
      <div className={s.grid}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={s.skeleton} />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className={s.error}>{error}</p>;
  }

  return (
    <div>
      <PageHeader title="Attendance Dashboard" subtitle="Monitor attendance across branches" />

      <div className={s.grid}>
        <div className={s.card}>
          <div className={s.cardIcon}>📋</div>
          <div className={s.cardValue}>{stats?.today ?? 0}</div>
          <div className={s.cardLabel}>Today's Attendance</div>
        </div>
        <div className={s.card}>
          <div className={s.cardIcon}>📅</div>
          <div className={s.cardValue}>{stats?.thisWeek ?? 0}</div>
          <div className={s.cardLabel}>This Week</div>
        </div>
        <div className={s.card}>
          <div className={s.cardIcon}>📊</div>
          <div className={s.cardValue}>{stats?.thisMonth ?? 0}</div>
          <div className={s.cardLabel}>This Month</div>
        </div>
        <div className={s.card}>
          <div className={s.cardIcon}>👥</div>
          <div className={s.cardValue}>{stats?.activeMembersToday ?? 0}</div>
          <div className={s.cardLabel}>Active Members Today</div>
        </div>
      </div>
    </div>
  );
}
