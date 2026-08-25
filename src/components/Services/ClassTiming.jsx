import React from 'react';
import { useNavigate } from 'react-router-dom';
import { scrollToSection } from '../../hooks/useScrollToSection';
import './ClassTiming.css';

/* ── DATA ── */
const FEATURES = [
  { icon: '🤸', label: 'Improved Flexibility' },
  { icon: '💪', label: 'Enhanced Strength' },
  { icon: '🧍', label: 'Better Posture' },
  { icon: '🌿', label: 'Stress Reduction' },
  { icon: '🧠', label: 'Mental Clarity & Focus' },
  { icon: '⚖️', label: 'Emotional Balance' },
  { icon: '⚡', label: 'Increased Energy Levels' },
  { icon: '🌙', label: 'Improved Sleep Quality' },
  { icon: '✨', label: 'Holistic Well-Being' },
  { icon: '🤝', label: 'Community Connection' },
];

const SCHEDULES = [
  {
    days: 'Mon – Fri',
    heading: <>Regular <em>Offline</em> Classes</>,
    slots: [
      { time: '06:00 – 07:00 AM', instructor: 'Ashish', role: 'Yoga Instructor' },
      { time: '07:30 – 08:30 AM', instructor: 'Shreya', role: 'Yoga Instructor' },
      { time: '05:00 – 06:00 PM', instructor: 'Ashish', role: 'Yoga Instructor' },
    ],
  },
  {
    days: 'Mon, Wed & Thu',
    heading: <>Midday <em>Session</em></>,
    slots: [
      { time: '11:30 – 12:30 Noon', instructor: 'Shreya', role: 'Yoga Instructor' },
    ],
  },
];

/* ── SUB-COMPONENTS ── */
const SectionHeader = ({ label, title, sub }) => (
  <>
    <p className="classSection__label">{label}</p>
    <h2 className="classSection__title">{title}</h2>
    <p className="classSection__sub">{sub}</p>
  </>
);

const FeatureCard = ({ icon, label }) => (
  <div className="featCard">
    <div className="featCard__icon">{icon}</div>
    <span className="featCard__text">{label}</span>
  </div>
);

const TimeSlot = ({ time, instructor, role }) => (
  <div className="slot">
    <span className="slot__time">{time}</span>
    <div className="slot__divider" />
    <div>
      <div className="slot__instructor">{instructor}</div>
      <div className="slot__role">{role}</div>
    </div>
  </div>
);

const ScheduleCard = ({ days, heading, slots }) => (
  <div className="schedCard">
    <div className="schedCard__days">{days}</div>
    <div className="schedCard__heading">{heading}</div>
    {slots.map((slot, i) => (
      <TimeSlot key={i} {...slot} />
    ))}
  </div>
);

/* ── MAIN COMPONENT ── */
const ClassTiming = () => {
  const navigate = useNavigate();

  const handleJoinClass = () => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/studentdashboard?tab=browseServices");
    } else {
      navigate(`/login?redirectTo=${encodeURIComponent("/studentdashboard?tab=browseServices")}`);
    }
  };

  return (
  <section className="classSection">
    <div className="classSection__glow" aria-hidden="true" />

    {/* Benefits */}
    <SectionHeader
      label="What You Gain"
      title={<>Benefits of <em>Practice</em></>}
      sub="Every session nurtures your body, mind & spirit"
    />

    <div className="featuresGrid">
      {FEATURES.map((f, i) => (
        <FeatureCard key={i} {...f} />
      ))}
    </div>

    <div className="classSection__divider" aria-hidden="true" />

    {/* Schedule */}
    <div id="offline-schedule" style={{ scrollMarginTop: 'calc(var(--header-height) + var(--topbar-height) + 20px)' }}>
      <SectionHeader
        label="Class Timings"
        title={<>Offline <em>Schedule</em></>}
        sub="Join in-person · All sessions led by certified instructors"
      />

      <div className="scheduleGrid">
        {SCHEDULES.map((s, i) => (
          <ScheduleCard key={i} {...s} />
        ))}
      </div>

      {/* CTA */}
      <div className="classSection__cta">
        <button className="btn--primary" onClick={handleJoinClass}>Join Class Today</button>
        <button className="btn--secondary" onClick={() => scrollToSection('offline-schedule')}>View Full Schedule</button>
      </div>
    </div>
  </section>
);
};

export default ClassTiming;
