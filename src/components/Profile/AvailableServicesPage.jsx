import { useState, useEffect, useCallback } from "react";
import styles from "./AvailableServicesPage.module.css";
import w from "./widgets/DashboardWidgets.module.css";
import {
  Stagger, Item, Panel, Pill, PrimaryButton,
  PageHeader, StatCard, EmptyState, Tabs,
} from "./widgets/DashboardWidgets";
import { getAvailableServices, addToCart } from "../api/StudentServices.js";
import ServiceCard from "../shared/ServiceCard";

const CATEGORIES = ["All", "Group", "Personal", "Specialty", "Corporate", "Therapy"];

export default function AvailableServicesPage({ onNavigate, reload: parentReload }) {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [activeCat, setActiveCat] = useState("All");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAvailableServices();
      setCatalog(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load services");
      setCatalog([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleEnroll(serviceId) {
    setBusy(serviceId);
    setMsg({ text: "", type: "" });
    try {
      const result = await addToCart("service", serviceId);
      if (result.alreadyInCart) {
        setMsg({ text: "Already in cart", type: "info" });
        window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: "Already in cart", type: "info" } }));
      } else {
        setMsg({ text: `${result.item?.name || "Service"} added to cart!`, type: "success" });
        window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: `${result.item?.name || "Service"} added to cart`, type: "success" } }));
        window.dispatchEvent(new CustomEvent("cart-update", { detail: { count: result.cartCount } }));
      }
    } catch (err) {
      setMsg({ text: err.message || "Failed to add to cart.", type: "error" });
      window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: err.message || "Failed to add", type: "error" } }));
    } finally {
      setBusy("");
    }
  }

  const filtered = catalog.filter((s) => {
    if (activeCat !== "All" && s.category !== activeCat) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.instructor?.name || "").toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const categoryTabs = CATEGORIES.map((c) => ({ id: c, label: c }));
  const stats = {
    total: catalog.length,
    available: catalog.filter((s) => !s.alreadyEnrolled).length,
    enrolled: catalog.filter((s) => s.alreadyEnrolled).length,
    popular: catalog.filter((s) => s.isPopular).length,
  };

  return (
    <>
      <PageHeader
        title="Available class services"
        sub="Browse our yoga services and start your journey today."
      />

      {msg.text && (
        <div className={`${styles.msgBar} ${msg.type === "success" ? styles.msgSuccess : styles.msgError}`}>
          <i className={`ti ${msg.type === "success" ? "ti-circle-check" : "ti-alert-circle"}`} aria-hidden="true" />
          <span>{msg.text}</span>
          <button type="button" className={styles.msgDismiss} onClick={() => setMsg({ text: "", type: "" })}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>
      )}

      <Stagger>
        <div className={w.statGrid} style={{ marginBottom: 18 }}>
          <StatCard icon="ti-package" label="Total services" value={stats.total} tone="orange" />
          <StatCard icon="ti-circle-check" label="Available to enroll" value={stats.available} tone="green" />
          <StatCard icon="ti-user-check" label="Already enrolled" value={stats.enrolled} tone="blue" />
          {stats.popular > 0 && (
            <StatCard icon="ti-flame" label="Popular services" value={stats.popular} tone="amber" />
          )}
        </div>
      </Stagger>

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <i className="ti ti-search" aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, description, instructor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className={styles.searchClear} onClick={() => setSearch("")}>
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Tabs tabs={categoryTabs} active={activeCat} onChange={setActiveCat} layoutId="catPill" />
      </div>

      {loading ? (
        <div className={styles.cardGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.skelCard}>
              <div className={styles.skelGlow} />
              <div className={styles.skelLine} style={{ width: "70%", height: 22 }} />
              <div className={styles.skelLine} style={{ width: "100%", height: 14, marginTop: 10 }} />
              <div className={styles.skelLine} style={{ width: "45%", height: 14, marginTop: 8 }} />
              <div className={styles.skelLine} style={{ width: "60%", height: 14, marginTop: 8 }} />
              <div className={styles.skelLine} style={{ width: "30%", height: 36, marginTop: 16 }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon="ti-alert-circle"
          title="Could not load services"
          sub={error}
          action={<PrimaryButton icon="ti-refresh" onClick={load}>Retry</PrimaryButton>}
        />
      ) : catalog.length === 0 ? (
        <EmptyState
          icon="ti-bundle-off"
          title="No services available right now"
          sub="Check back later for new yoga services and programs."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="ti-search"
          title="No matching services"
          sub={`No services found${search ? ` for "${search}"` : ""} in the "${activeCat}" category.`}
        />
      ) : (
        <div className={styles.cardGrid}>
          {filtered.map((svc) => (
            <ServiceCard
              key={svc._id}
              service={svc}
              onEnroll={handleEnroll}
              enrolled={svc.alreadyEnrolled}
              busy={busy === svc._id}
            />
          ))}
        </div>
      )}
    </>
  );
}
