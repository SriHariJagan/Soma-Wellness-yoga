import { memo } from "react";
import styles from "./ServiceCard.module.css";

const fmtPrice = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const PRICE_LABEL = {
  monthly: "/month",
  per_session: "/session",
  flat: "",
  contact: "",
};

const MODE_ICON = {
  center: "🏛",
  offline: "🧘",
  online: "🌐",
  home: "🏠",
  hybrid: "🔄",
};

const MODE_LABEL = {
  center: "At Center",
  offline: "Studio",
  online: "Online",
  home: "At Home",
  hybrid: "Hybrid",
};

const BADGE_TONES = {
  Popular: { bg: "rgba(46,125,91,0.12)", color: "#D97706" },
  Featured: { bg: "rgba(46,125,91,0.18)", color: "#2E7D5B" },
  New: { bg: "rgba(22,163,74,0.12)", color: "#16A34A" },
};

function ServiceCard({
  service,
  onEnroll,
  onContact,
  enrolled = false,
  busy = false,
}) {
  const {
    _id,
    name,
    description,
    category,
    type,
    mode,
    instructor,
    instructors,
    timeSlots,
    price,
    pricingModel,
    contactEmail,
    sessionDuration,
    totalSessions,
    validityDuration,
    validityUnit,
    scheduleDays,
    scheduleTime,
    image,
    images,
    isPopular,
    featured,
    enrolledCount,
    alreadyEnrolled,
  } = service;

  const priceLabel = PRICE_LABEL[pricingModel] || "";
  const modeIcon = MODE_ICON[mode] || "🧘";
  const modeLabel = MODE_LABEL[mode] || mode;
  const hasSlots = Array.isArray(timeSlots) && timeSlots.length > 0;
  const hasSchedule = Array.isArray(scheduleDays) && scheduleDays.length > 0;
  const hasInstructor = instructor || (Array.isArray(instructors) && instructors.length > 0);
  const slotHasInstructors = hasSlots && timeSlots.some((s) => s.label);

  const badges = [];
  if (isPopular) badges.push("Popular");
  if (featured) badges.push("Featured");

  // Show schedule section only if scheduleDays exist AND there aren't time slots with the same info
  // For single-timeSlot services (like Advanced Yoga), don't duplicate
  const showSchedule = hasSchedule && !hasSlots;

  const handleCta = () => {
    if (pricingModel === "contact") {
      if (onContact) onContact(service);
      else window.location.href = `mailto:${contactEmail || "pragyayogaofficial@gmail.com"}`;
    } else {
      if (onEnroll) onEnroll(_id);
    }
  };

  const ctaLabel = pricingModel === "contact"
    ? "Enquire now"
    : enrolled || alreadyEnrolled
      ? "Enrolled"
      : busy
        ? "Adding…"
        : "Add to Cart";

  const ctaDisabled = (enrolled || alreadyEnrolled || busy) && pricingModel !== "contact";

  return (
    <article className={`${styles.card} ${featured ? styles.featured : ""}`}>
      {badges.length > 0 && (
        <div className={styles.badgeStrip}>
          {badges.map((b) => (
            <span key={b} className={styles.badge} style={BADGE_TONES[b] || {}}>
              {b}
            </span>
          ))}
        </div>
      )}

      <div className={styles.cardBody}>
        <div className={styles.topRow}>
          <div className={styles.badgesLeft}>
            {category && <span className={styles.catBadge}>{category}</span>}
            <span className={styles.modeBadge}>{modeIcon} {modeLabel}</span>
          </div>
        </div>

        <h3 className={styles.cardTitle}>{name}</h3>

        {description && <p className={styles.cardDesc}>{description}</p>}

        {/* ── Pricing ── */}
        <div className={styles.priceRow}>
          {pricingModel === "contact" ? (
            <span className={styles.priceSub}>Pricing depends on number of employees</span>
          ) : price > 0 ? (
            <>
              <span className={styles.priceValue}>{fmtPrice(price)}</span>
              <span className={styles.priceUnit}>{priceLabel}</span>
            </>
          ) : (
            <span className={styles.priceSub}>Free</span>
          )}
        </div>

        {/* ── Meta grid: duration, sessions, validity ── */}
        <div className={styles.metaGrid}>
          {sessionDuration > 0 && (
            <div className={styles.metaItem}>
              <i className="ti ti-hourglass" aria-hidden="true" />
              <span>{sessionDuration} min</span>
            </div>
          )}
          {totalSessions > 0 && pricingModel !== "per_session" && (
            <div className={styles.metaItem}>
              <i className="ti ti-calendar-check" aria-hidden="true" />
              <span>{totalSessions} session{totalSessions > 1 ? "s" : ""} / {validityDuration || 1} {validityUnit || "month"}{validityDuration > 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {/* ── Schedule (only when no timeSlots) ── */}
        {showSchedule && (
          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>Schedule</span>
            <span className={styles.sectionValue}>
              {scheduleDays.join(", ")}
              {scheduleTime && scheduleTime !== "Flexible" && scheduleTime !== "As per batch assignment" && (
                <span className={styles.scheduleTime}> · {scheduleTime}</span>
              )}
              {(scheduleTime === "Flexible" || scheduleTime === "As per batch assignment") && (
                <span className={styles.scheduleTime}> · {scheduleTime}</span>
              )}
            </span>
          </div>
        )}

        {/* ── Time Slots (with optional schedule context) ── */}
        {hasSlots ? (
          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>
              {timeSlots.length === 1 ? "Timing" : "Available Time Slots"}
            </span>
            {timeSlots.length === 1 ? (
              <div className={styles.singleSlot}>
                <span className={styles.sectionValue}>
                  {timeSlots[0].day ? `${timeSlots[0].day} · ` : ""}{timeSlots[0].time}
                </span>
              </div>
            ) : (
              <div className={styles.slotList}>
                {timeSlots.map((slot, i) => (
                  <div key={i} className={styles.slotItem}>
                    <span className={styles.slotDay}>{slot.day}</span>
                    <span className={styles.slotTime}>{slot.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : !showSchedule && hasSchedule ? (
          /* Fallback: schedule exists but no slots -> show as schedule block inline */
          null // handled above by showSchedule
        ) : null}

        {/* ── Instructors (mapped to slots or standalone) ── */}
        {slotHasInstructors ? (
          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>Instructors</span>
            <div className={styles.instructorList}>
              {timeSlots.map((slot, i) => (
                slot.label ? (
                  <div key={i} className={styles.instructorRow}>
                    <span className={styles.instructorLabel}>{slot.label}</span>
                    <span className={styles.instructorTime}>{slot.time}</span>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        ) : hasInstructor && !slotHasInstructors ? (
          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>Instructor</span>
            <span className={styles.sectionValue}>
              {instructor ? (typeof instructor === "object" ? instructor.name : instructor) : ""}
              {Array.isArray(instructors) && instructors.length > 0 && (
                instructors.map((inst, i) => (
                  <span key={i}>{i > 0 ? ", " : ""}{typeof inst === "object" ? inst.name : inst}</span>
                ))
              )}
            </span>
          </div>
        ) : null}

        {/* ── Contact email for Corporate Yoga ── */}
        {pricingModel === "contact" && contactEmail && (
          <div className={styles.sectionBlock}>
            <span className={styles.sectionLabel}>Contact</span>
            <a href={`mailto:${contactEmail}`} className={styles.contactLink}>{contactEmail}</a>
          </div>
        )}

        {type && (
          <div className={styles.typeTag}>
            <i className="ti ti-flame" aria-hidden="true" />
            <span>{type}</span>
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <button
          type="button"
          className={`${styles.ctaBtn} ${ctaDisabled ? styles.ctaDisabled : ""} ${pricingModel === "contact" ? styles.ctaContact : ""}`}
          onClick={handleCta}
          disabled={ctaDisabled}
        >
          {ctaLabel}
        </button>
        {enrolledCount > 0 && pricingModel !== "contact" && (
          <span className={styles.enrollCount}>
            <i className="ti ti-users" aria-hidden="true" />
            {enrolledCount} enrolled
          </span>
        )}
      </div>
    </article>
  );
}

export default memo(ServiceCard);
