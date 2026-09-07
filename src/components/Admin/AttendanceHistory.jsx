import React, { useState, useEffect, useMemo } from 'react';
import { getQRAttendanceList, getQRAttendanceDetail } from '../api/AdminServices.js';
import s from './AttendanceHistory.module.css';
import { PageHeader, Avatar } from './ui/Primitives.jsx';

export default function AttendanceHistory({ branchId }) {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [dateFilter, setDateFilter] = useState('');

  const limit = 20;

  const params = useMemo(() => {
    const q = new URLSearchParams();
    if (branchId) q.set('branch', branchId);
    if (dateFilter) q.set('date', dateFilter);
    if (search) q.set('search', search);
    q.set('page', page);
    q.set('limit', limit);
    return q.toString();
  }, [branchId, dateFilter, search, page]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getQRAttendanceList({ branch: branchId, date: dateFilter, page, limit, search })
      .then((data) => {
        if (mounted && data.success) {
          setRecords(data.data?.records || []);
          setTotal(data.data?.total || 0);
        }
      })
      .catch(() => {
        if (mounted) setError('Failed to load attendance history');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [params]);

  const handleViewDetail = async (id) => {
    try {
      const data = await getQRAttendanceDetail(id);
      if (data.success) setSelectedRecord(data.data);
    } catch {
      // noop
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <PageHeader title="Attendance History" subtitle="View and filter attendance records" />

      {/* Filters */}
      <div className={s.filters}>
        <input
          type="date"
          className={s.input}
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
        />
        <input
          type="text"
          className={s.input}
          placeholder="Search member name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* Records Table */}
      {loading ? (
        <div className={s.loading}>Loading attendance records…</div>
      ) : error ? (
        <p className={s.error}>{error}</p>
      ) : (
        <>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Member ID</th>
                  <th>Branch</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={s.empty}>No records found</td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record._id}>
                      <td>
                        <div className={s.memberCell}>
                          <Avatar name={record.user?.name} size="small" />
                          <span className={s.memberName}>{record.user?.name}</span>
                        </div>
                      </td>
                      <td className={s.tdMuted}>{record.user?.memberId || '—'}</td>
                      <td className={s.tdMuted}>{record.branch?.name || '—'}</td>
                      <td>{formatDate(record.attendanceDate)}</td>
                      <td>{formatTime(record.scannedAt)}</td>
                      <td>
                        <span className={`${s.statusBadge} ${record.status === 'PRESENT' ? s.statusPresent : s.statusCancelled}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>
                        <button className={s.viewBtn} onClick={() => handleViewDetail(record._id)}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className={s.pagination}>
              <button
                disabled={page <= 1}
                className={s.pageBtn}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className={s.pageInfo}>
                Page {page} of {Math.ceil(total / limit)}
              </span>
              <button
                disabled={page >= Math.ceil(total / limit)}
                className={s.pageBtn}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div className={s.modalOverlay} onClick={() => setSelectedRecord(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <button className={s.modalClose} onClick={() => setSelectedRecord(null)}>✕</button>
            <h3 className={s.modalTitle}>Attendance Details</h3>
            <div className={s.modalBody}>
              <div className={s.modalRow}>
                <span className={s.modalLabel}>Member</span>
                <span>{selectedRecord.user?.name}</span>
              </div>
              <div className={s.modalRow}>
                <span className={s.modalLabel}>Member ID</span>
                <span>{selectedRecord.user?.memberId}</span>
              </div>
              <div className={s.modalRow}>
                <span className={s.modalLabel}>Branch</span>
                <span>{selectedRecord.branch?.name}</span>
              </div>
              <div className={s.modalRow}>
                <span className={s.modalLabel}>Date</span>
                <span>{formatDate(selectedRecord.attendanceDate)}</span>
              </div>
              <div className={s.modalRow}>
                <span className={s.modalLabel}>Check-in</span>
                <span>{formatTime(selectedRecord.scannedAt)}</span>
              </div>
              <div className={s.modalRow}>
                <span className={s.modalLabel}>Method</span>
                <span>QR Scan</span>
              </div>
              <div className={s.modalRow}>
                <span className={s.modalLabel}>Scanned By</span>
                <span>{selectedRecord.scannedBy?.name}</span>
              </div>
              <div className={s.modalRow}>
                <span className={s.modalLabel}>Status</span>
                <span>{selectedRecord.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
