import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import p from "./ProfilePage.module.css";
import { Stagger, Item, Panel, PrimaryButton, GhostButton, Pill } from "./widgets/DashboardWidgets";
import { updateStudentProfile, getMyEnrollments } from "../api/StudentServices";

const ENROLLMENT_META = {
  membership: { icon: "ti-shield-check", tone: "orange", label: "Plan" },
  service:    { icon: "ti-package",      tone: "green",  label: "Service" },
  trial:      { icon: "ti-gift",         tone: "amber",  label: "Free Trial" },
  course:     { icon: "ti-books",        tone: "purple", label: "Course" },
  workshop:   { icon: "ti-award",        tone: "violet", label: "Workshop" },
  yttc:       { icon: "ti-certificate",  tone: "cyan",   label: "YTTC" },
};

const STATUS_META = {
  active:    { label: "Active",    tone: "green"  },
  expired:   { label: "Expired",   tone: "neutral"},
  paused:    { label: "Paused",    tone: "amber"  },
  upcoming:  { label: "Upcoming",  tone: "blue"   },
  completed: { label: "Completed", tone: "neutral"},
  cancelled: { label: "Cancelled", tone: "danger" },
};

function EnrollmentCard({ item, status, expiry, ...rest }) {
  const meta = ENROLLMENT_META[item.type] || { icon: "ti-bolt", tone: "neutral", label: item.typeLabel || item.type };
  const displayName = item.name || item.label || "";
  const statusMeta = STATUS_META[status] || null;
  return (
    <Item {...rest}>
      <div className={p.enrollmentCard} data-tone={meta.tone}>
        <span className={p.enrollIcon} data-tone={meta.tone}>
          <i className={`ti ${meta.icon}`} aria-hidden="true" />
        </span>
        <div className={p.enrollBody}>
          <div className={p.enrollTop}>
            <span className={p.enrollType}>{meta.label}</span>
            {statusMeta && (
              <span className={p.enrollStatus} data-tone={statusMeta.tone}>{statusMeta.label}</span>
            )}
          </div>
          <span className={p.enrollName} title={displayName}>{displayName}</span>
          {expiry && <span className={p.enrollExpiry}>{expiry}</span>}
        </div>
      </div>
    </Item>
  );
}

export default function ProfilePage({ student, onUpdateSuccess }) {
  const pData = student ?? {};
  const enrollmentProgress = pData.enrollmentProgress || {};
  const memProg = enrollmentProgress.membership;
  const svcProg = enrollmentProgress.services || [];
  const workshops = pData.workshops?.registered || [];

  const [myEnrollments, setMyEnrollments] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    name:  pData.name  ?? "",
    email: pData.email ?? "",
    phone: pData.phone ?? "",
    city:  pData.city  ?? "",
    style: pData.style ?? "",
    level: pData.level ?? "",
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name:  student.name  ?? "",
        email: student.email ?? "",
        phone: student.phone ?? "",
        city:  student.city  ?? "",
        style: student.style ?? "",
        level: student.level ?? "",
      });
    }
  }, [student]);

  useEffect(() => {
    getMyEnrollments()
      .then((data) => setMyEnrollments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  function handleEdit() {
    setErrorMessage("");
    setIsEditing(true);
  }

  function handleCancel() {
    setFormData({
      name:  pData.name  ?? "",
      email: pData.email ?? "",
      phone: pData.phone ?? "",
      city:  pData.city  ?? "",
      style: pData.style ?? "",
      level: pData.level ?? "",
    });
    setErrorMessage("");
    setIsEditing(false);
  }

  async function handleSave() {
    setIsSubmitting(true);
    setErrorMessage("");
    try {
      const savedData = await updateStudentProfile(formData);
      setErrorMessage("");
      if (typeof onUpdateSuccess === "function") onUpdateSuccess(savedData);
      setIsEditing(false);
    } catch (error) {
      console.error("Profile Save Failure:", error);
      setErrorMessage(error.message || "Could not save your profile. Please check connection.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const personalDetailsFields = [
    { icon: "ti-user",      label: "Name",  name: "name",  type: "text"  },
    { icon: "ti-mail",      label: "Email", name: "email", type: "email" },
    { icon: "ti-phone",     label: "Phone", name: "phone", type: "tel"   },
    { icon: "ti-map-pin",   label: "City",  name: "city",  type: "text"  },
    { icon: "ti-yoga",      label: "Style", name: "style", type: "text"  },
    { icon: "ti-chart-bar", label: "Level", name: "level", type: "text"  },
  ];

  const studentName = pData.name || pData.email?.split("@")[0] || "User";
  const initials = studentName.split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase();

  const courses = myEnrollments.filter((e) => e.type === "course");
  const yttc = myEnrollments.filter((e) => e.type === "yttc");

  return (
    <Stagger>
      {/* ── Hero ── */}
      <Item className={p.hero} as="header">
        <div className={p.heroDeco} aria-hidden="true">
          <span className={p.heroOrb} />
          <span className={p.heroOrb2} />
        </div>

        <div className={p.heroMain}>
          <div className={p.heroAvatar}>
            {initials}
            <span className={p.heroAvatarDot} aria-hidden="true" />
          </div>
          <div className={p.heroText}>
            <h1 className={p.heroName}>{pData.name || studentName}</h1>
            {pData.email && <p className={p.heroEmail}><i className="ti ti-mail" aria-hidden="true" />{pData.email}</p>}
            <div className={p.heroPills}>
              {pData.level && <Pill tone="orange" icon="ti-chart-bar">{pData.level}</Pill>}
              {pData.style && <Pill tone="neutral" icon="ti-yoga">{pData.style}</Pill>}
              {pData.city  && <Pill tone="neutral" icon="ti-map-pin">{pData.city}</Pill>}
            </div>
          </div>
        </div>

        <div className={p.heroAction}>
          {!isEditing ? (
            <PrimaryButton icon="ti-edit" onClick={handleEdit}>Edit</PrimaryButton>
          ) : (
            <>
              <GhostButton icon="ti-x" onClick={handleCancel} disabled={isSubmitting}>Cancel</GhostButton>
              <PrimaryButton icon="ti-check" onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save"}
              </PrimaryButton>
            </>
          )}
        </div>
      </Item>

      {errorMessage && (
        <motion.div
          className={p.errorNote}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <i className="ti ti-alert-triangle" aria-hidden="true" />
          {errorMessage}
        </motion.div>
      )}

      {/* ── Active Enrollments & Purchases ── */}
      <Panel title="Active Enrollments &amp; Purchases" icon="ti-layout-list">
        {!memProg && svcProg.length === 0 && workshops.length === 0 && courses.length === 0 && yttc.length === 0 && !enrollmentProgress.trial ? (
          <p className={p.emptyText}>No active enrollments yet. Explore plans, services, or workshops to get started.</p>
        ) : (
          <div className={p.enrollmentGrid}>
            {memProg && (() => {
              return <EnrollmentCard
                item={{ ...memProg, type: "membership", name: memProg.planType }}
                status={memProg.computedStatus || (memProg.isActive ? 'active' : memProg.status || 'expired')}
                expiry={memProg.expiryDate ? new Date(memProg.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
              />;
            })()}

            {svcProg.map((svc) => (
              <EnrollmentCard
                key={svc._id}
                item={{ ...svc, type: "service", name: svc.serviceName }}
                status={svc.isActive ? 'active' : (svc.status || 'expired')}
                expiry={svc.expiryDate ? new Date(svc.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined}
              />
            ))}

            {enrollmentProgress.trial && (
              <EnrollmentCard
                item={{ ...enrollmentProgress.trial, type: "trial", name: "Free Trial" }}
                status={(enrollmentProgress.trial.sessionsLeft ?? 0) > 0 ? 'active' : 'expired'}
                expiry={enrollmentProgress.trial.daysLeft > 0 ? `${enrollmentProgress.trial.daysLeft} days left` : undefined}
              />
            )}

            {workshops.map((wk) => {
              const wkDate = wk.date ? new Date(wk.date) : null;
              const isUpcoming = wkDate && wkDate >= new Date();
              return <EnrollmentCard
                key={wk.id}
                item={{ _id: wk.id, type: "workshop", name: wk.name }}
                status={wk.attended ? 'completed' : (isUpcoming ? 'upcoming' : 'completed')}
              />;
            })}

            {courses.map((c) => (
              <EnrollmentCard key={c._id} item={c} status="active" />
            ))}

            {yttc.map((y) => (
              <EnrollmentCard key={y._id} item={y} status="active" />
            ))}
          </div>
        )}
      </Panel>

      {/* ── Personal details ── */}
      <Panel title="Personal details" icon="ti-id-badge-2">
        <div className={p.fieldGrid}>
          {personalDetailsFields.map(({ icon, label, name, type }) => (
            <div className={`${p.field} ${isEditing ? p.fieldEditing : ""}`} key={name}>
              <span className={p.fieldIcon}><i className={`ti ${icon}`} aria-hidden="true" /></span>
              <div className={p.fieldBody}>
                <span className={p.fieldLabel}>{label}</span>
                {isEditing ? (
                  <input
                    type={type}
                    name={name}
                    value={formData[name]}
                    onChange={handleInputChange}
                    className={p.fieldInput}
                    disabled={isSubmitting || name === "email"}
                    maxLength={50}
                    autoComplete="off"
                  />
                ) : (
                  <span className={p.fieldValue}>{formData[name] || "—"}</span>
                )}
              </div>
              {name === "email" && isEditing && (
                <span className={p.fieldLock} title="Email cannot be edited"><i className="ti ti-lock" aria-hidden="true" /></span>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </Stagger>
  );
}
