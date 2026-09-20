import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./AvailableServicesPage.module.css";
import {
  Stagger, Item, PageHeader, Pill, PrimaryButton, EmptyState,
} from "./widgets/DashboardWidgets";
import { getAvailableServices, addToCart } from "../api/StudentServices.js";
import CheckoutGate from "../checkout/CheckoutGate.jsx";

const CATEGORY_ORDER = ["Group", "Personal", "Therapy", "Specialty", "Corporate"];
const CATEGORY_DESC = {
  Group: "Small guided groups — drop in or commit.",
  Personal: "One-to-one attention, solo or shared for two.",
  Therapy: "Targeted healing with expert guidance.",
  Specialty: "Focused programs for every stage.",
  Corporate: "Workplace wellness for teams.",
};

const fmtPrice = (n) => `KES ${Number(n || 0).toLocaleString("en-KE")}`;

function ServiceRow({ svc, busy, enrolled, onEnroll }) {
  const priceLabel =
    svc.pricingModel === "contact"
      ? "Price on request"
      : svc.price > 0
        ? fmtPrice(svc.price)
        : "Free";
  const perSession =
    svc.pricingModel !== "contact" && svc.price > 0 && svc.totalSessions > 1
      ? `KES ${Math.round(svc.price / svc.totalSessions).toLocaleString("en-KE")} / session`
      : svc.sessionDuration > 0
        ? `${svc.sessionDuration} min`
        : "";
  return (
    <div className={styles.card}>
      <span className={styles.cardGlow} aria-hidden="true" />
      <div className={styles.cardTop}>
        <span className={styles.cardName}>{svc.name}</span>
        <span className={styles.cardBadges}>
          {svc.mode && <span className={styles.cardMode}>{svc.mode}</span>}
          {svc.isPopular && <Pill tone="amber">Popular</Pill>}
          {svc.featured && <Pill tone="green">Featured</Pill>}
        </span>
      </div>
      {svc.description && <p className={styles.cardDesc}>{svc.description}</p>}
      <div className={styles.cardMeta}>
        {svc.sessionDuration > 0 && (
          <span className={styles.metaItem}><i className="ti ti-hourglass" aria-hidden="true" />{svc.sessionDuration} min</span>
        )}
        {svc.totalSessions > 0 && (
          <span className={styles.metaItem}><i className="ti ti-calendar-check" aria-hidden="true" />{svc.totalSessions} sessions</span>
        )}
        {svc.instructor && (
          <span className={styles.metaItem}><i className="ti ti-user" aria-hidden="true" />{typeof svc.instructor === "object" ? svc.instructor.name : svc.instructor}</span>
        )}
      </div>
      <div className={styles.cardFoot}>
        <div className={styles.cardPrice}>
          <span className={styles.priceValue}>{priceLabel}</span>
          {perSession && <span className={styles.priceLabel}>{perSession}</span>}
        </div>
        {enrolled ? (
          <span className={styles.btnEnrolled}>✓ Enrolled</span>
        ) : svc.pricingModel === "contact" ? (
          <a className={styles.buyBtn} href={`mailto:${svc.contactEmail || "somawellnesslimited@gmail.com"}`}>Enquire</a>
        ) : svc.bookingEnabled === false ? (
          <div className={styles.bookingDisabled}>
            <span className={styles.disabledText}>Booking not enabled</span>
          </div>
        ) : (
<CheckoutGate
              intent={{ name: svc.name, price: svc.price ? fmtPrice(svc.price) : "Free", sub: svc.category, type: "service", itemType: "service", itemId: svc._id }}
              onProceed={() => {
                // Both new and existing users redirect to cart for purchase
                navigate("/studentdashboard?tab=cart");
              }}
            >
              <button type="button" className={styles.buyBtn} disabled={busy}>
                {busy ? "Adding…" : "Add to Cart"}
              </button>
            </CheckoutGate>
        )}
      </div>
    </div>
  );
}

export default function AvailableServicesPage() {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");

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

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((s) => {
      if (activeCat !== "All" && (s.category || "Other") !== activeCat) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q) ||
        ((s.instructor?.name || s.instructor || "")).toLowerCase().includes(q)
      );
    });
  }, [catalog, search, activeCat]);

  const allCats = useMemo(() => {
    const present = [...new Set(catalog.map((s) => s.category || "Other"))];
    return [
      ...CATEGORY_ORDER.filter((c) => present.includes(c)),
      ...present.filter((c) => !CATEGORY_ORDER.includes(c)),
    ];
  }, [catalog]);

  const groups = useMemo(() => {
    const present = [...new Set(searched.map((s) => s.category || "Other"))];
    const ordered = [
      ...CATEGORY_ORDER.filter((c) => present.includes(c)),
      ...present.filter((c) => !CATEGORY_ORDER.includes(c)),
    ];
    return ordered.map((cat) => ({
      cat,
      items: searched.filter((s) => (s.category || "Other") === cat),
    }));
  }, [searched]);

  return (
    <>
      <PageHeader
        title="All Services"
        sub="Everything bookable at SomaWellness — grouped so you can compare at a glance."
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

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <i className="ti ti-search" aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by name, instructor, keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className={styles.searchClear} onClick={() => setSearch("")}>
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          )}
        </div>
        {!loading && !error && catalog.length > 0 && (
          <span className={styles.resultCount}>
            {searched.length} of {catalog.length} shown
          </span>
        )}
      </div>

      {!loading && !error && allCats.length > 1 && (
        <div className={styles.catRow} role="tablist" aria-label="Filter by category">
          {["All", ...allCats].map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={activeCat === c}
              className={`${styles.catChip} ${activeCat === c ? styles.catActive : ""}`}
              onClick={() => setActiveCat(c)}
            >
              {c}
              {c !== "All" && (
                <span className={styles.catCount}>
                  {catalog.filter((s) => (s.category || "Other") === c).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className={styles.cardGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.skelCard}>
              <div className={styles.skelGlow} />
              <div className={styles.skelLine} style={{ width: "70%", height: 22 }} />
              <div className={styles.skelLine} style={{ width: "100%", height: 14, marginTop: 10 }} />
              <div className={styles.skelLine} style={{ width: "45%", height: 14, marginTop: 8 }} />
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
          sub="Check back later for new wellness services and programs."
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon="ti-search"
          title="No matching services"
          sub={`No services found for "${search}".`}
        />
      ) : (
        <Stagger>
          {groups.map((g, gi) => (
            <Item key={g.cat}>
              <div className={`${styles.sectionHead} ${gi === 0 ? styles.sectionHeadFirst : ""}`}>
                <h3 className={styles.sectionTitle}>{g.cat}</h3>
                <span className={styles.sectionSub}>
                  {CATEGORY_DESC[g.cat] || `${g.items.length} option${g.items.length !== 1 ? "s" : ""}`}
                  {CATEGORY_DESC[g.cat] && ` · ${g.items.length} option${g.items.length !== 1 ? "s" : ""}`}
                </span>
              </div>
              <div className={styles.cardGrid}>
                {g.items.map((svc) => (
                  <ServiceRow
                    key={svc._id}
                    svc={svc}
                    busy={busy === svc._id}
                    enrolled={svc.alreadyEnrolled}
                    onEnroll={handleEnroll}
                  />
                ))}
              </div>
            </Item>
          ))}
        </Stagger>
      )}
    </>
  );
}
