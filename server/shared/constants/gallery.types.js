// ── Gallery categories (single source of truth, backend) ──
export const GALLERY_CATEGORIES = [
  'Studio',
  'Yoga Classes',
  'Workshops',
  'Events',
  'Retreats',
  'Community',
  'Trainers',
  'Other',
];

export function isValidGalleryCategory(c) {
  return GALLERY_CATEGORIES.includes(String(c || ''));
}
