import React from "react";
import EventCalendar from "./EventCalendar";
import styles from "./EventBooking.module.css";

const EventBooking = () => (
  <section className={styles.section} id="event-booking">
    <header className={styles.header}>
      <h2 className={styles.title}>Book Your Spot</h2>
      <p className={styles.sub}>
        Reserve your place in upcoming yoga classes or special events at Pragya Yoga.
      </p>
    </header>

    <div className={styles.container}>
      <EventCalendar />
    </div>
  </section>
);

export default EventBooking;
