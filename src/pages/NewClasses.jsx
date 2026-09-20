import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SomaPageHeader from '../components/soma/SomaPageHeader';
import SomaCTA from '../components/soma/SomaCTA';
import { getPublicOfferings, formatPrice, categoryLabel, statusInfo, validityText } from '../lib/offeringsApi';
import './Classes.module.css';

const CATEGORY_ORDER = [
  'group_yoga', 'membership', 'personal_training', 'meditation',
  'corporate', 'therapy', 'mama', 'signature', 'academy',
];

const CATEGORY_ANCHORS = {
  group_yoga: 'group-yoga',
  membership: 'wellness-memberships',
  personal_training: 'personal-training',
  meditation: 'meditation-breathwork',
  corporate: 'corporate-wellness',
  therapy: 'yoga-therapy',
  mama: 'soma-mama',
  signature: 'signature-experiences',
  academy: 'soma-academy',
};

const CATEGORY_DESCRIPTIONS = {
  group_yoga: 'Join our group yoga classes led by expert instructors. Small groups, big transformations.',
  membership: 'Unlimited access to yoga, meditation, and wellness amenities. Choose your tier.',
  personal_training: 'One-on-one or couple sessions tailored to your goals and schedule.',
  meditation: 'Guided meditation, breathwork, and Yoga Nidra for inner calm.',
  corporate: 'Bring wellness to your workplace with our corporate programs.',
  therapy: 'Therapeutic yoga for healing and recovery, guided by specialists.',
  mama: 'Safe, nurturing yoga for expectant and new mothers.',
  signature: 'Curated wellness journeys combining yoga, massage, and steam.',
  academy: 'Transform your practice. Become a certified yoga instructor.',
};

export default function Classes() {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('group_yoga');

  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        const data = await getPublicOfferings();
        setOfferings(data);
      } catch (err) {
        setError(err.message || 'Failed to load offerings');
      } finally {
        setLoading(false);
      }
    };
    fetchOfferings();
  }, []);

  const byCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = offerings.filter(o => o.category === cat && o.status !== 'archived');
    return acc;
  }, {});

  const visibleCategories = CATEGORY_ORDER.filter(cat => byCategory[cat]?.length > 0);

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat);
    const el = document.getElementById(CATEGORY_ANCHORS[cat]);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="classesPage">
      <SomaPageHeader
        eyebrow="Our Offerings"
        title="Find Your Practice"
        subtitle="From group yoga to private therapy, signature journeys to teacher training — everything SOMA offers, in one place."
      />

      {/* Category Navigation */}
      <div className="categoryNav">
        <div className="categoryNavInner">
          {visibleCategories.map(cat => (
            <button
              key={cat}
              className={`categoryPill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat)}
            >
              {categoryLabel(cat)}
              <span className="categoryCount">{byCategory[cat].length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loadingState">
          <div className="loadingGrid">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeletonCard">
                <div className="skeletonImage" />
                <div className="skeletonLine" style={{ width: '60%' }} />
                <div className="skeletonLine" style={{ width: '80%' }} />
                <div className="skeletonLine" style={{ width: '40%' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="errorState">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </div>
      )}

      {/* Offerings by Category */}
      {!loading && !error && visibleCategories.map(cat => (
        <section key={cat} id={CATEGORY_ANCHORS[cat]} className="categorySection">
          <div className="categoryHeader">
            <h2 className="categoryTitle">{categoryLabel(cat)}</h2>
            <p className="categoryDesc">{CATEGORY_DESCRIPTIONS[cat]}</p>
          </div>

          <div className="offeringsGrid">
            {byCategory[cat].map((offering, idx) => (
              <OfferingCard key={offering._id} offering={offering} index={idx} />
            ))}
          </div>
        </section>
      ))}

      {/* Empty State */}
      {!loading && !error && offerings.length === 0 && (
        <div className="emptyState">
          <p>No offerings available at the moment.</p>
        </div>
      )}

      <SomaCTA />
    </div>
  );
}

function OfferingCard({ offering, index }) {
  const si = statusInfo(offering.status);
  const validity = validityText(offering);
  const isBookable = offering.status === 'available' && offering.bookingEnabled;

  return (
    <motion.div
      className={`offeringCard ${!isBookable ? 'unavailable' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      {/* Image */}
      {offering.image && (
        <div className="offeringImage">
          <img src={offering.image} alt={offering.name} loading="lazy" />
          {offering.featured && <span className="badge featured">Featured</span>}
          {offering.isPopular && <span className="badge popular">Popular</span>}
          {offering.status === 'upcoming' && <span className="badge upcoming">Coming Soon</span>}
        </div>
      )}

      {/* Content */}
      <div className="offeringContent">
        {/* Status Badge */}
        {offering.status !== 'available' && (
          <span className="statusBadge" style={{ color: si.color, background: si.bg, border: `1px solid ${si.border}` }}>
            {si.label}
          </span>
        )}

        <h3 className="offeringName">{offering.name}</h3>
        {offering.subtitle && <p className="offeringSubtitle">{offering.subtitle}</p>}

        {/* Price */}
        <div className="offeringPrice">
          {offering.originalPrice && (
            <span className="originalPrice">{formatPrice(offering.originalPrice)}</span>
          )}
          <span className="currentPrice">{formatPrice(offering.price)}</span>
          {offering.pricingModel === 'per_session' && <span className="priceUnit">/session</span>}
          {offering.pricingModel === 'monthly' && <span className="priceUnit">/month</span>}
        </div>

        {/* Quick Info */}
        <div className="offeringMeta">
          {offering.sessions > 0 && <span>{offering.sessions} session{offering.sessions > 1 ? 's' : ''}</span>}
          {offering.sessionDuration > 0 && <span>{offering.sessionDuration} min</span>}
          {validity && <span>{validity}</span>}
        </div>

        {/* What's Included (first 3) */}
        {offering.whatIncluded?.length > 0 && (
          <ul className="offeringInclusions">
            {offering.whatIncluded.slice(0, 3).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
            {offering.whatIncluded.length > 3 && (
              <li className="moreInclusions">+{offering.whatIncluded.length - 3} more</li>
            )}
          </ul>
        )}

        {/* CTA */}
        <div className="offeringCTA">
          {isBookable ? (
            <Link to={`/payment`} state={{ offeringId: offering._id, name: offering.name, price: offering.price, type: 'offering' }} className="ctaButton">
              Book Now
            </Link>
          ) : offering.status === 'upcoming' ? (
            <button className="ctaButton upcoming" disabled>
              Coming Soon
            </button>
          ) : (
            <button className="ctaButton disabled" disabled>
              Currently Unavailable
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
