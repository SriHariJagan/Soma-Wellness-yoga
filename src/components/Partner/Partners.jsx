import { useEffect, useRef } from "react";
import "./Partners.css";

const PARTNERS = [
  { id: 1, initials: "DSV", name: "Dev Sanskriti Vishwavidyalaya", type: "University", color: "blue" },
  { id: 2, initials: "CYF", name: "Chaitanya Yoga Foundation", type: "Foundation", color: "amber" },
  { id: 3, initials: "YA",  name: "Yoga Alliance", type: "International Body", color: "coral" },
  { id: 4, initials: "AY",  name: "Aranya Yogshala", type: "Yoga School", color: "teal" },
  { id: 5, initials: "SKM", name: "SKM Yoga", type: "Institute", color: "purple" },
  { id: 6, initials: "GYS", name: "Gyanish Yoga Studio", type: "Studio", color: "green" },
  { id: 7, initials: "IYF", name: "Indian Yoga Federation", type: "Federation", color: "pink" },
];

const STATS = [
  { value: "7+",   label: "Accredited partners" },
  { value: "200+", label: "Certified teachers"  },
  { value: "15+",  label: "Years of trust"      },
  { value: "12",   label: "Countries reached"   },
];

export default function PartnersSection() {
  const trackRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf;
    let pos = 0;
    const speed = 0.4;
    const halfWidth = track.scrollWidth / 2;

    const tick = () => {
      if (!track.matches(":hover")) {
        pos += speed;
        if (pos >= halfWidth) pos = 0;
        track.style.transform = `translateX(-${pos}px)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="ps-root" aria-label="Accreditation and partners">
      <div className="ps-header">
        <span className="ps-eyebrow">trusted by</span>
        <h2 className="ps-heading">Our accreditation &amp; partners</h2>
        <p className="ps-sub">Recognized by leading yoga bodies and institutions worldwide</p>
        <div className="ps-rule" />
      </div>

      <div className="ps-marquee-wrap">
        <div className="ps-fade ps-fade--left" />
        <div className="ps-fade ps-fade--right" />
        <div className="ps-track" ref={trackRef}>
          {[...PARTNERS, ...PARTNERS].map((p, i) => (
            <article className="ps-card" key={`${p.id}-${i}`}>
              <div className={`ps-avatar ps-avatar--${p.color}`}>{p.initials}</div>
              <p className="ps-card-name">{p.name}</p>
              <span className="ps-card-type">{p.type}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="ps-stats">
        {STATS.map((s) => (
          <div className="ps-stat" key={s.label}>
            <span className="ps-stat-value">{s.value}</span>
            <span className="ps-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
