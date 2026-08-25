import React from 'react';
import s from './YogaAdmin.module.css';

export default function Badge({ label }) {
  const map = {
    Active: s.badgeGreen, Completed: s.badgeGreen, Settled: s.badgeGreen, 'Free Preview': s.badgeGreen, Confirmed: s.badgeGreen, Converted: s.badgeGreen, paid: s.badgeGreen, present: s.badgeGreen, zoom: s.badgeGreen, Published: s.badgeGreen,
    Draft: s.badgeAmber, Expiring: s.badgeAmber, Pending: s.badgeAmber, Upcoming: s.badgeAmber, 'Plan-Specific': s.badgeAmber, 'Follow up': s.badgeAmber, 'Follow Up': s.badgeAmber, absent: s.badgeAmber,
    Archived: s.badgeBlue, Cold: s.badgeBlue, Referral: s.badgeBlue, 'All Members': s.badgeBlue, New: s.badgeBlue,
    Failed: s.badgeRed, Cancelled: s.badgeRed, Refunded: s.badgeRed, refunded: s.badgeRed, expired: s.badgeRed,
    Missed: s.badgeRed, 'Pending Attendance': s.badgeAmber, Rescheduled: s.badgeBlue, Scheduled: s.badgeAmber, 'Live Now': s.badgeGreen, Awaiting: s.badgeAmber,
  };
  return <span className={`${s.badge} ${map[label] || s.badgeBlue}`}>{label}</span>;
}