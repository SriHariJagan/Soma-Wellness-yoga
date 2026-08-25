import React, { memo, useRef, useState, useEffect } from 'react';
import './Instructor.css';

const instructors = [
  {
    initials: 'KK',
    name: 'Dr. Kapil Kesari',
    role: 'Founder & Director',
    bio: '20+ years of experience spreading the science of yoga and holistic wellness.',
    tags: ['Hatha', 'Wellness'],
    color: 'orange',
    image: '/images/instructor/kapil.webp',
  },
  {
    initials: 'SA',
    name: 'Shreya Agnihotri',
    role: 'Master Yoga Teacher',
    bio: 'Grace and precision in every class, specialising in Vinyasa and Ashtanga flows.',
    tags: ['Vinyasa', 'Ashtanga'],
    color: 'blue',
    image: '/images/instructor/Shreya.webp',
  },
  {
    initials: 'MK',
    name: 'Mrityunjay Kesari',
    role: 'Co-Founder & Lead Trainer',
    bio: 'Leads advanced training and mentors aspiring yoga teachers with rigour and heart.',
    tags: ['Training', 'Mentorship'],
    color: 'green',
    image: '/images/instructor/Mrityunjay.webp'
  },
  {
    initials: 'VK',
    name: 'Vinod Kumar',
    role: 'Yoga Therapist',
    bio: 'Blends clinical knowledge with yogic healing for injury and stress recovery.',
    tags: ['Therapy', 'Yin'],
    color: 'amber',
    image: '/images/instructor/Vinod.webp'
  },
  {
    initials: 'AK',
    name: 'Ashish Kumar',
    role: 'Yoga Instructor',
    bio: 'Inversions master who helps students build confidence and strength on the mat.',
    tags: ['Inversions', 'Strength'],
    color: 'pink',
    image: '/images/instructor/Ashish.webp'
  },
  {
    initials: 'SK',
    name: 'Sunil Kumar',
    role: 'Yoga Instructor',
    bio: 'Inversions master who helps students build confidence and strength on the mat.',
    tags: ['Inversions', 'Strength'],
    color: 'pink',
    image: '/images/instructor/Sunil.webp'
  },
  {
    initials: 'DK',
    name: 'Deepak Kumar',
    role: 'Yoga Therapist',
    bio: 'Combines therapeutic techniques with mindful movement for deep physical healing.',
    tags: ['Therapy', 'Mindfulness'],
    color: 'teal',
    image: '/images/instructor/Deepak.webp'
  },
];

const avatarColors = {
  orange: { bg: '#FEF3E6', color: '#9D4F00' },
  blue:   { bg: '#E6F1FB', color: '#0C447C' },
  green:  { bg: '#EAF3DE', color: '#3B6D11' },
  amber:  { bg: '#FAEEDA', color: '#633806' },
  pink:   { bg: '#FBEAF0', color: '#72243E' },
  teal:   { bg: '#E1F5EE', color: '#085041' },
};

// Updated width for the wider, modern cards (240px card + 24px gap)
const CARD_WIDTH = 264; 

const InstructorCard = memo(({ initials, name, role, bio, tags, color, image }) => {
  const { bg, color: textColor } = avatarColors[color] || avatarColors.orange;
  
  return (
    <div className="instructor-card">
      <div className="av-ring">
        {image ? (
          <img src={image} alt={name} className="av-img" width="220" height="220" loading="lazy" decoding="async" />
        ) : (
          <div className="av" style={{ background: bg, color: textColor }}>
            {initials}
          </div>
        )}
      </div>
      <p className="c-name">{name}</p>
      <p className="c-role">{role}</p>
      <div className="c-hr" />
      <p className="c-bio">{bio}</p>
      <div className="c-tags">
        {tags.map((t) => (
          <span key={t} className="tag">{t}</span>
        ))}
      </div>
    </div>
  );
});

const InstructorsSection = () => {
  const outerRef = useRef(null);
  const [current, setCurrent] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    const updateVisibleCount = () => {
      if (outerRef.current) {
        const count = Math.floor(outerRef.current.offsetWidth / CARD_WIDTH);
        setVisibleCount(count > 0 ? count : 1);
      }
    };
    
    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  const maxIndex = Math.max(0, instructors.length - visibleCount);
  const pages = maxIndex + 1;

  useEffect(() => {
    if (current > maxIndex) {
      setCurrent(maxIndex);
    }
  }, [maxIndex, current]);

  const goTo = (idx) => {
    const clamped = Math.max(0, Math.min(idx, maxIndex));
    setCurrent(clamped);
  };

  return (
    <section className="instructors-section">
      <p className="sec-label">Meet the team</p>
      <h2 className="sec-title">Our yoga instructors</h2>
      <div className="divider">
        <span className="divider-line" />
        <span className="divider-dot" />
        <span className="divider-line" />
      </div>

      <div className="slider-wrap">
        <button
          className="scroll-btn"
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          aria-label="Previous instructors"
        >
          &#8249;
        </button>

        <div className="track-outer" ref={outerRef}>
          <div 
            className="track" 
            style={{ transform: `translateX(-${current * CARD_WIDTH}px)` }}
          >
            {instructors.map((inst) => (
              <InstructorCard key={inst.name} {...inst} />
            ))}
          </div>
        </div>

        <button
          className="scroll-btn"
          onClick={() => goTo(current + 1)}
          disabled={current >= maxIndex}
          aria-label="Next instructors"
        >
          &#8250;
        </button>
      </div>

      <div className="dots">
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            className={`dot${i === current ? ' active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide group ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default InstructorsSection;