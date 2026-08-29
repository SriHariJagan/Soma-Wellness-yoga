import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  getYTTCStatus,
  addToCart,
  getMyYTTCInvites,
  joinYTTCInvite,
} from "../api/StudentServices.js";
import styles from "./YTTCPage.module.css";

const learningItems = [
  "Yoga foundation, philosophy, history, and major paths of yoga",
  "Patanjali Yoga Sutra, Hatha Yoga Pradipika, Gheranda Samhita, Bhagavad Gita",
  "Basic anatomy: skeletal, muscular, cardiovascular, respiratory, endocrine systems",
  "Practical yoga training: mantra chanting, Surya Namaskar, standing, sitting, supine, and prone asanas",
  "Pranayama, mudra, bandha, meditation, Yoga Nidra, and breath awareness",
  "Yogic management of common disorders and lifestyle guidance",
  "Teaching methodology, class sequencing, correction, safety, and practice teaching",
];

const courseFeatures = [
  "Live online classes with recordings",
  "Weekly revision sessions",
  "Regular quizzes and learning support",
  "Free study material",
  "Guidance from expert faculties",
  "Practical and theory-based training",
  "Post-course assistance and lifetime guidance",
];

export default function YTTCPage({ student }) {
  const [enrollment, setEnrollment] = useState(null);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState("");
  const [selectedMode, setSelectedMode] = useState("online");

  const isActive =
    enrollment?.isEnrolled === true && enrollment?.status === "active";

  useEffect(() => {
    loadYTTCData();
  }, []);

  async function loadYTTCData() {
    try {
      setLoading(true);
      setError("");

      const statusData = await getYTTCStatus();
      const yttcEnrollment = statusData?.yttcEnrollment || {
        isEnrolled: false,
        mode: "",
        status: "not_enrolled",
        enrolledAt: null,
      };

      setEnrollment(yttcEnrollment);

      if (yttcEnrollment.isEnrolled && yttcEnrollment.status === "active") {
        const inviteData = await getMyYTTCInvites();
        setInvites(Array.isArray(inviteData) ? inviteData : []);
      } else {
        setInvites([]);
      }
    } catch (err) {
      console.error("YTTC load error:", err);
      setError(err.message || "Failed to load YTTC details");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnroll(mode = "online") {
    try {
      setEnrolling(true);
      setError("");

      const result = await addToCart("yttc", mode);
      window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: result.alreadyInCart ? "Already in cart" : "YTTC added to cart", type: result.alreadyInCart ? "info" : "success" } }));
      window.dispatchEvent(new CustomEvent("cart-update", { detail: { count: result.cartCount } }));
    } catch (err) {
      console.error("YTTC add to cart error:", err);
      window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: err.message || "Failed to add YTTC to cart", type: "error" } }));
    } finally {
      setEnrolling(false);
    }
  }

  async function handleJoinInvite(invite) {
    try {
      const result = await joinYTTCInvite(invite._id);
  
      const link = result?.meetingLink || invite.meetingLink;
  
      if (link) {
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        alert("Meeting link is not available.");
      }
  
      await loadYTTCData();
    } catch (err) {
      console.error("YTTC join error:", err);
      alert(err.message || "Unable to join this class");
    }
  }

  return (
    <div className={styles.page}>
      <motion.section
        className={styles.hero}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div>
          <span className={styles.badge}>26th Batch • Online & Hybrid</span>
          <h1>200 Hours Yoga Teacher Training Course</h1>
          <p>
            Welcome {student?.name || "Student"}, begin your journey to become a
            confident and certified yoga teacher with Soma Wellness.
          </p>

          {loading ? (
            <p className={styles.note}>Checking your YTTC enrollment...</p>
          ) : isActive ? (
            <p className={styles.successText}>
              You are enrolled in YTTC ({enrollment?.mode || "online"} mode).
            </p>
          ) : (
            <p className={styles.note}>
              You are not enrolled yet. Enroll first to receive YTTC class
              meeting invitations.
            </p>
          )}

          {error && <p className={styles.errorText}>{error}</p>}

          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={enrolling || isActive}
              onClick={() => handleEnroll(selectedMode)}
            >
              {isActive
                ? "Already Enrolled"
                : enrolling
                ? "Adding…"
                : `Add to Cart — KES ${selectedMode === "online" ? "35,000" : "45,000"}`}
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() =>
                document
                  .getElementById("yttc-orientation")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              View Orientation Details
            </button>
          </div>
        </div>

        <div className={styles.heroCard}>
          <h3>Course Overview</h3>
          <ul>
            <li><strong>Course:</strong> 200 Hours Yoga Teacher Training Course</li>
            <li><strong>Batch:</strong> 26th Batch</li>
            <li><strong>Duration:</strong> 45 Days</li>
            <li><strong>Dates:</strong> 15 July – 30 August 2026</li>
            <li><strong>Mode:</strong> Online & Hybrid</li>
            <li><strong>Lead Faculty:</strong> Dr. Kapil Kesari</li>
          </ul>
        </div>
      </motion.section>

      <section className={styles.grid}>
        <div className={styles.card} id="yttc-orientation">
          <h2>Free Orientation Session</h2>
          <p>
            Join the free orientation session to understand the course structure,
            syllabus, teaching method, certification process, and career
            opportunities.
          </p>

          <div className={styles.infoGrid}>
            <div><span>Date</span><strong>11 July 2026</strong></div>
            <div><span>Time</span><strong>8:30 PM IST</strong></div>
            <div><span>Platform</span><strong>Zoom</strong></div>
            <div><span>Zoom ID</span><strong>816 3690 4486</strong></div>
            <div><span>Passcode</span><strong>555555</strong></div>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Course Modes & Fees</h2>

          <div
            className={`${styles.feeBox} ${selectedMode === "online" ? styles.feeBoxSelected : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedMode("online")}
            onKeyDown={(e) => e.key === "Enter" && setSelectedMode("online")}
          >
            <div>
              <h3>Online Mode</h3>
              <p>Theory and practical both will be conducted online.</p>
            </div>
            <strong>KES 35,000</strong>
          </div>

          <div
            className={`${styles.feeBox} ${selectedMode === "hybrid" ? styles.feeBoxSelected : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedMode("hybrid")}
            onKeyDown={(e) => e.key === "Enter" && setSelectedMode("hybrid")}
          >
            <div>
              <h3>Hybrid Mode</h3>
              <p>Theory online and practical training will be conducted offline.</p>
            </div>
            <strong>KES 45,000</strong>
          </div>

          <p className={styles.note}>
            Students can pay the course fee in two installments within the course
            duration.
          </p>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Who Can Join This Course?</h2>
        <div className={styles.chipWrap}>
          <span>Yoga practitioners</span>
          <span>Beginners</span>
          <span>Aspiring yoga teachers</span>
          <span>Fitness professionals</span>
          <span>Wellness coaches</span>
          <span>School teachers</span>
          <span>Therapists</span>
          <span>Lifestyle consultants</span>
        </div>
        <p className={styles.note}>
          No advanced yoga background is required. A sincere attitude and regular
          participation are most important.
        </p>
      </section>

      <section className={styles.card}>
        <h2>What You Will Learn</h2>
        <div className={styles.listGrid}>
          {learningItems.map((item) => (
            <div className={styles.listItem} key={item}>
              <i className="ti ti-check" aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.grid}>
        <div className={styles.card}>
          <h2>Course Features</h2>
          <div className={styles.listStack}>
            {courseFeatures.map((item) => (
              <div className={styles.listItem} key={item}>
                <i className="ti ti-sparkles" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h2>Certification</h2>
          <p>
            After successful completion of the course, required attendance,
            practice, assignments, and assessment, students will receive
             certification from Soma Wellness.
          </p>

          <div className={styles.certBox}>
            <i className="ti ti-certificate" aria-hidden="true" />
            <div>
               <strong>Soma Wellness Certification</strong>
              <span>For sincere practitioners and future yoga teachers</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.inviteSection}>
        <div className={styles.inviteHeader}>
          <div>
            <span className={styles.badge}>My YTTC Classes</span>
            <h2>YTTC Meeting Invitations</h2>
            <p>
              Admin-created YTTC class links will appear here only after you are
              enrolled in YTTC.
            </p>
          </div>
        </div>

        {!isActive ? (
          <div className={styles.emptyInvite}>
            <i className="ti ti-lock" aria-hidden="true" />
            <h3>Enroll first to access YTTC classes</h3>
            <p>
              YTTC meeting links are visible only for students who are enrolled
              in the YTTC course.
            </p>
          </div>
        ) : invites.length === 0 ? (
          <div className={styles.emptyInvite}>
            <i className="ti ti-calendar-time" aria-hidden="true" />
            <h3>No YTTC class invitation yet</h3>
            <p>
              Once admin creates and sends a YTTC class invitation, the meeting
              link, date, time, and password will show here.
            </p>
          </div>
        ) : (
          <div className={styles.inviteList}>
            {invites.map((invite) => (
              <div className={styles.inviteCard} key={invite._id}>
                <div>
                  <span className={styles.badge}>{invite.computedStatus || "upcoming"}</span>
                  <h3>{invite.title}</h3>
                  <p>{invite.description || "YTTC live class session"}</p>
                  <p className={styles.note}>
                    {new Date(invite.date).toLocaleDateString("en-KE")} •{" "}
                    {invite.startTime}
                    {invite.endTime ? ` - ${invite.endTime}` : ""}
                  </p>
                  {invite.instructor && (
                    <p className={styles.note}>Instructor: {invite.instructor}</p>
                  )}
                  {invite.meetingPassword && (
                    <p className={styles.note}>Password: {invite.meetingPassword}</p>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => handleJoinInvite(invite)}
                >
                  Join Class
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}