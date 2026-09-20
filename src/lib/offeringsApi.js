// ============================================================
// lib/offeringsApi.js — Public API client for the Offering catalog
// ============================================================

const API_DOMAIN = import.meta.env.VITE_API_URL || '';
const BASE = `${API_DOMAIN}/api/offerings`;

async function apiGet(path = '', params = {}) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || 'Failed to fetch offerings');
  }
  return res.json();
}

export async function getPublicOfferings(params = {}) {
  return apiGet('', params);
}

export async function getPublicOffering(slug) {
  return apiGet(`/${slug}`);
}

export async function getOfferingCategories() {
  return apiGet('/categories');
}

// Format price with KES
export function formatPrice(price) {
  if (price == null || price === 0) return '';
  return `KES ${Number(price).toLocaleString()}`;
}

// Get category display label
export function categoryLabel(cat) {
  const labels = {
    group_yoga: 'Group Yoga',
    membership: 'Wellness Membership',
    personal_training: 'Personal Training',
    meditation: 'Meditation & Breathwork',
    corporate: 'Corporate Wellness',
    therapy: 'Yoga Therapy',
    mama: 'SOMA Mama',
    signature: 'Signature Experience',
    academy: 'SOMA Academy',
  };
  return labels[cat] || cat;
}

// Get status display info
export function statusInfo(status) {
  const map = {
    available: { label: 'Available', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
    unavailable: { label: 'Currently Unavailable', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
    upcoming: { label: 'Coming Soon', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    draft: { label: 'Draft', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
    archived: { label: 'Archived', color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
  };
  return map[status] || map.draft;
}

// Get validity display text
export function validityText(offering) {
  if (!offering.validityDuration || offering.validityUnit === 'single') return '';
  const unit = offering.validityUnit === 'sessions' ? 'sessions' : offering.validityUnit;
  return `${offering.validityDuration} ${unit}`;
}
