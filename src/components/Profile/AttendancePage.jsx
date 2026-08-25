/* ── AttendancePage ── */
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion"; // eslint-disable-line no-unused-vars
import styles from "./AttendancePage.module.css";
import w from "./widgets/DashboardWidgets.module.css";
import { Stagger, StatCard, Panel, ProgressRing, PageHeader } from "./widgets/DashboardWidgets";
import { getMyEnrollments, getEnrollmentAttendance } from "../api/StudentServices";

const STATUS_CLASS = {
  present: "present",
  zoom:    "zoom",
  absent:  "absent",
  late:    "late",
  excused: "excused",
  future:  "future",
  empty:   "empty",
};

const STATUS_COLORS = {
  present: { bg: "linear-gradient(135deg, #16a34a, #22c55e)" },
  zoom:    { bg: "linear-gradient(135deg, #F97316, #81B29A)" },
  absent:  { bg: "#fde8e8", shadow: "inset 0 0 0 1px rgba(239,68,68,0.35)" },
  late:    { bg: "linear-gradient(135deg, #EAB308, #FACC15)" },
  excused: { bg: "linear-gradient(135deg, #6B7280, #9CA3AF)" },
};

const DAYS = ["S","M","T","W","T","F","S"];

const ENROLLMENT_ICONS = {
  membership: "ti-shield-check",
  service:    "ti-package",
  trial:      "ti-gift",
  course:     "ti-books",
};

export default function AttendancePage() {
  const [enrollments, setEnrollments] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadingAttendance = selectedEnrollment && !attendanceData;
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [today] = useState(new Date());

  useEffect(() => {
    let mounted = true;
    getMyEnrollments()
      .then(data => {
        if (!mounted) return;
        setEnrollments(data);
        if (data.length > 0) {
          setSelectedEnrollment(data[0]);
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedEnrollment) return;
    setAttendanceData(null); // eslint-disable-line react-hooks/set-state-in-effect
    let mounted = true;
    getEnrollmentAttendance(selectedEnrollment.type, selectedEnrollment._id)
      .then(data => { if (mounted) setAttendanceData(data); })
      .catch(() => { if (mounted) setAttendanceData(null); });
    return () => { mounted = false; };
  }, [selectedEnrollment]);
  // loadingAttendance is set via the derived logic below

  const handleEnrollmentChange = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setSelectedRecord(null);
  };

  const buildCalendar = (records) => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayDate = today.getDate();

    const byDay = new Map();
    if (records) {
      for (const r of records) {
        const rd = new Date(r.date);
        if (rd.getFullYear() === year && rd.getMonth() === month) {
          byDay.set(rd.getDate(), r);
        }
      }
    }

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ status: 'empty', date: '', record: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(year, month, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      let status;
      let record = null;
      if (byDay.has(d)) {
        record = byDay.get(d);
        status = record.status;
      } else if (d > todayDate) {
        status = 'future';
      } else {
        status = 'empty';
      }
      cells.push({ status, date: dateStr, record, day: d });
    }

    const attendanceMonth = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    return { cells, attendanceMonth };
  };

  const { cells, attendanceMonth } = buildCalendar(attendanceData?.records);
  const summary = attendanceData?.summary || { total: 0, present: 0, absent: 0, late: 0, zoom: 0, rate: 0 };

  if (loading) {
    return (
      <>
        <PageHeader title="Attendance" />
        <div className={w.statGrid}>
          {[0,1,2,3].map(i => (
            <div key={i} className={w.stat} style={{ height: 130, borderRadius: 16, background: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Attendance" />

      {/* Enrollment Selector */}
      {enrollments.length > 1 && (
        <div className={styles.selectorWrap}>
          <div className={styles.selectorInner}>
            {enrollments.map((enr) => {
              const isActive = selectedEnrollment?._id === enr._id && selectedEnrollment?.type === enr.type;
              return (
                <button
                  key={`${enr.type}-${enr._id}`}
                  className={`${styles.selectorBtn} ${isActive ? styles.selectorActive : ''}`}
                  onClick={() => handleEnrollmentChange(enr)}
                >
                  <span className={styles.selectorIcon} style={{ background: enr.color }}>
                    <i className={`ti ${ENROLLMENT_ICONS[enr.type] || 'ti-calendar'}`} />
                  </span>
                  <span className={styles.selectorInfo}>
                    <span className={styles.selectorLabel}>{enr.label}</span>
                    <span className={styles.selectorType}>{enr.typeLabel || enr.type}</span>
                  </span>
                  {isActive && (
                    <span className={styles.selectorCheck}>
                      <i className="ti ti-check" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {enrollments.length === 1 && selectedEnrollment && (
        <div className={styles.singleEnrollment}>
          <span className={styles.singleEnrollmentIcon} style={{ background: selectedEnrollment.color }}>
            <i className={`ti ${ENROLLMENT_ICONS[selectedEnrollment.type] || 'ti-calendar'}`} />
          </span>
          <div>
            <strong>{selectedEnrollment.label}</strong>
            <span className={styles.singleEnrollmentType}>{selectedEnrollment.typeLabel || selectedEnrollment.type}</span>
          </div>
        </div>
      )}

      {enrollments.length === 0 && (
        <div className={w.empty} style={{ marginTop: 32 }}>
          <div className={w.emptyDeco} aria-hidden="true">
            <span className={w.emptyOrb} />
            <span className={w.emptyOrb2} />
          </div>
          <motion.span
            className={w.emptyIcon}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          >
            <i className="ti ti-calendar-off" aria-hidden="true" />
          </motion.span>
          <p className={w.emptyTitle}>No active enrollments</p>
          <p className={w.emptySub}>Enroll in a plan, service, or course to start tracking attendance.</p>
        </div>
      )}

      {loadingAttendance && selectedEnrollment && (
        <div className={w.statGrid}>
          {[0,1,2,3].map(i => (
            <div key={i} className={w.stat} style={{ height: 130, borderRadius: 16, background: 'var(--color-bg-secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      )}

      {!loadingAttendance && selectedEnrollment && attendanceData && (
        <Stagger>
          <div className={w.statGrid}>
            <StatCard tone="green"  icon="ti-circle-check"  label="Present"   value={summary.present} index={0} />
            <StatCard tone="danger" icon="ti-circle-x"      label="Absent"    value={summary.absent}  index={1} />
            <StatCard tone="orange" icon="ti-chart-donut"   label="Rate"      value={summary.rate} suffix="%" progress={summary.rate} index={2} />
            <StatCard tone="blue"   icon="ti-device-laptop" label="Zoom live" value={summary.zoom} index={3} />
          </div>

          <div className={w.grid2}>
            <Panel title={attendanceMonth} icon="ti-calendar">
              <div className={styles.calGrid}>
                {DAYS.map((d, i) => (
                  <div key={`h-${i}`} className={styles.calDayHead}>{d}</div>
                ))}
                {cells.map((cell, i) => (
                  <motion.div
                    key={i}
                    className={`${styles.cell} ${styles[STATUS_CLASS[cell.status]] || styles.future} ${cell.record ? styles.clickable : ''}`}
                    title={cell.date || ""}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: Math.min(i * 0.006, 0.5), ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => cell.record && setSelectedRecord(cell.record)}
                  />
                ))}
              </div>

              <div className={styles.legend}>
                {[
                  { cls: "present", label: "Present (offline)" },
                  { cls: "zoom",    label: "Present (Zoom)" },
                  { cls: "absent",  label: "Absent" },
                  { cls: "late",    label: "Late" },
                  { cls: "excused", label: "Excused" },
                ].map(({ cls, label }) => (
                  <div key={label} className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles[cls]}`} />
                    {label}
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Rate" icon="ti-chart-arcs">
              <div className={styles.rateBox}>
                <ProgressRing value={summary.rate} size={158} stroke={14} tone="orange" caption="Rate" />
                <div className={styles.rateMeta}>
                  <div className={styles.rateMetaRow}>
                    <span className={styles.rateDot} data-tone="green" />Present
                    <strong>{summary.present}</strong>
                  </div>
                  <div className={styles.rateMetaRow}>
                    <span className={styles.rateDot} data-tone="blue" />Zoom
                    <strong>{summary.zoom}</strong>
                  </div>
                  <div className={styles.rateMetaRow}>
                    <span className={styles.rateDot} data-tone="red" />Absent
                    <strong>{summary.absent}</strong>
                  </div>
                  {summary.late > 0 && (
                    <div className={styles.rateMetaRow}>
                      <span className={styles.rateDot} data-tone="amber" />Late
                      <strong>{summary.late}</strong>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </div>
        </Stagger>
      )}

      {/* Attendance Detail Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedRecord(null)}
          >
            <motion.div
              className={styles.detailModal}
              initial={{ opacity: 0, scale: 0.92, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 30 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <button className={styles.modalClose} onClick={() => setSelectedRecord(null)}>
                <i className="ti ti-x" />
              </button>

              <div className={styles.modalHeader}>
                <span className={styles.modalStatus} style={{
                  background: STATUS_COLORS[selectedRecord.status]?.bg || '#6B7280',
                  boxShadow: STATUS_COLORS[selectedRecord.status]?.shadow || 'none',
                }}>
                  <i className={`ti ${selectedRecord.status === 'present' || selectedRecord.status === 'zoom' ? 'ti-circle-check' : selectedRecord.status === 'absent' ? 'ti-circle-x' : selectedRecord.status === 'late' ? 'ti-clock' : 'ti-minus'}`} />
                </span>
                <div>
                  <h3 className={styles.modalTitle}>{selectedRecord.classType || 'Class Session'}</h3>
                  <span className={styles.modalStatusText}>
                    {selectedRecord.status === 'present' ? 'Present' :
                     selectedRecord.status === 'zoom' ? 'Present (Zoom)' :
                     selectedRecord.status === 'absent' ? 'Absent' :
                     selectedRecord.status === 'late' ? 'Late' :
                     selectedRecord.status === 'excused' ? 'Excused' : selectedRecord.status}
                  </span>
                </div>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.modalRow}>
                  <i className="ti ti-calendar" />
                  <span>{new Date(selectedRecord.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                {selectedRecord.invite?.startTime && (
                  <div className={styles.modalRow}>
                    <i className="ti ti-clock" />
                    <span>{selectedRecord.invite.startTime}{selectedRecord.invite.endTime ? ` - ${selectedRecord.invite.endTime}` : ''}</span>
                  </div>
                )}
                {selectedRecord.invite?.instructor && (
                  <div className={styles.modalRow}>
                    <i className="ti ti-user" />
                    <span>{selectedRecord.invite.instructor}</span>
                  </div>
                )}
                {selectedRecord.invite?.platform && (
                  <div className={styles.modalRow}>
                    <i className="ti ti-device-laptop" />
                    <span>{selectedRecord.invite.platform}</span>
                  </div>
                )}
                {selectedRecord.invite?.title && (
                  <div className={styles.modalRow}>
                    <i className="ti ti-book" />
                    <span>{selectedRecord.invite.title}</span>
                  </div>
                )}
                {selectedRecord.notes && (
                  <div className={styles.modalRow}>
                    <i className="ti ti-notes" />
                    <span>{selectedRecord.notes}</span>
                  </div>
                )}
                {selectedRecord.invite?.notes && (
                  <div className={styles.modalRow}>
                    <i className="ti ti-message" />
                    <span>{selectedRecord.invite.notes}</span>
                  </div>
                )}
              </div>

              {selectedEnrollment && (
                <div className={styles.modalFooter}>
                  <span className={styles.modalEntityBadge}>
                    <i className={`ti ${ENROLLMENT_ICONS[selectedEnrollment.type] || 'ti-calendar'}`} />
                    {selectedEnrollment.label}
                  </span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
