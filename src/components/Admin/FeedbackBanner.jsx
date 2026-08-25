import React from 'react';
import s from './YogaAdmin.module.css';

export default function FeedbackBanner({ message, type }) {
  if (!message) return null;
  return (
    <div className={`${s.feedbackBanner} ${type === 'success' ? s.bannerSuccess : s.bannerError}`}>
      <span className={s.bannerIcon}>{type === 'success' ? '✓' : '⚠️'}</span>
      <p className={s.bannerText}>{message}</p>
    </div>
  );
}