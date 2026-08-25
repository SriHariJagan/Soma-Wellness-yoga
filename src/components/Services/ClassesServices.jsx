import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceCard from '../shared/ServiceCard';
import BrowseMoreCard from './BrowseMoreCard';
import styles from '../shared/ServiceCard.module.css';
import './ClassesServices.css';

const API_DOMAIN = import.meta.env.VITE_API_URL || "";

const CACHE_KEY = "pragya_public_services_v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

const slugify = (str) => str?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "";

const SKELETONS = Array.from({ length: 6 }, (_, i) => i);

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data } = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
  } catch {
    // storage full/unavailable — non-fatal
  }
}

export default function ClassesServices() {
  const navigate = useNavigate();
  const cachedRef = useRef(readCache());
  const [services, setServices] = useState(cachedRef.current || []);
  const [loading, setLoading] = useState(cachedRef.current === null);
  const [error, setError] = useState("");
  const scrolledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setError("");
    fetch(`${API_DOMAIN}/api/public/services`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load services");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          const list = Array.isArray(data) ? data : [];
          setServices(list);
          if (list.length > 0) writeCache(list);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (scrolledRef.current || loading || services.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const scrollTo = params.get("scrollTo");
    if (!scrollTo) return;
    const target = document.querySelector(`[data-service-slug*="${scrollTo}"]`);
    if (target) {
      scrolledRef.current = true;
      setTimeout(() => {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.style.transition = "box-shadow 0.5s, border-color 0.5s";
        target.style.boxShadow = "0 0 0 3px var(--color-primary, #2E7D5B)";
        target.style.borderColor = "var(--color-primary, #2E7D5B)";
        setTimeout(() => {
          target.style.boxShadow = "";
          target.style.borderColor = "";
        }, 2500);
      }, 300);
    }
  }, [loading, services]);

  const handleEnroll = (serviceId) => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/studentdashboard?tab=browseServices");
    } else {
      navigate(`/login?redirectTo=${encodeURIComponent("/studentdashboard?tab=browseServices")}`);
    }
  };

  const handleContact = (service) => {
    window.location.href = `mailto:${service.contactEmail || "pragyayogaofficial@gmail.com"}`;
  };

  if (loading) {
    return (
      <section className="classes-services">
        <h2 className="section-title">Our Yoga Services</h2>
        <div className="services-grid">
          {SKELETONS.map((i) => (
            <div key={i} className={styles.skelCard}>
              <div className={styles.skelBadge} />
              <div className={styles.skelTitle} />
              <div className={styles.skelPrice} />
              <div className={styles.skelDesc} />
              <div className={styles.skelMeta} />
              <div className={styles.skelFooter} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error && services.length === 0) {
    return (
      <section className="classes-services">
        <h2 className="section-title">Our Yoga Services</h2>
        <p className="services-error">
          Unable to load services at the moment. Please try again later.
        </p>
      </section>
    );
  }

  if (services.length === 0) {
    return (
      <section className="classes-services">
        <h2 className="section-title">Our Yoga Services</h2>
        <p className="services-error">No services available right now. Check back soon!</p>
      </section>
    );
  }

  return (
    <section className="classes-services" id="our-services" style={{ scrollMarginTop: 'calc(var(--header-height) + var(--topbar-height) + 20px)' }}>
      <h2 className="section-title">Our Yoga Services</h2>
      <div className="services-grid">
        {services.map((s, i) => (
          <div key={s._id || i} data-service-slug={slugify(s.name)}>
            <ServiceCard
              service={s}
              onEnroll={handleEnroll}
              onContact={handleContact}
            />
          </div>
        ))}
        <BrowseMoreCard />
      </div>
    </section>
  );
}
