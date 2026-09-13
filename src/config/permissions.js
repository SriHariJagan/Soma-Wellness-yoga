// ── Permission Groups (mirrored from server/shared/constants/permissions.js) ──

export const PERMISSION_GROUPS = {
  users: {
    label: 'Users',
    permissions: [
      { key: 'users.view', label: 'View Users' },
      { key: 'users.create', label: 'Create Users' },
      { key: 'users.edit', label: 'Edit Users' },
    ],
  },
  courses: {
    label: 'Courses',
    permissions: [
      { key: 'courses.view', label: 'View Courses' },
      { key: 'courses.registration', label: 'Register Customers' },
      { key: 'courses.request', label: 'Request Course' },
      { key: 'courses.booking', label: 'Course Booking' },
    ],
  },
  sections: {
    label: 'Sections',
    permissions: [
      { key: 'sections.view', label: 'View Sections' },
      { key: 'sections.booking', label: 'Section Booking' },
      { key: 'sections.registration', label: 'Section Registration' },
    ],
  },
  classes: {
    label: 'Classes',
    permissions: [
      { key: 'classes.view', label: 'View Classes' },
      { key: 'classes.attendance', label: 'View Attendance' },
      { key: 'classes.attendance.create', label: 'Mark Attendance' },
      { key: 'classes.attendance.edit', label: 'Edit Attendance' },
    ],
  },
  customers: {
    label: 'Customers',
    permissions: [
      { key: 'customers.view', label: 'View Customers' },
      { key: 'customers.create', label: 'Create Customers' },
      { key: 'customers.edit', label: 'Edit Customers' },
    ],
  },
  bookings: {
    label: 'Bookings',
    permissions: [
      { key: 'bookings.view', label: 'View Bookings' },
      { key: 'bookings.create', label: 'Create Booking' },
      { key: 'bookings.edit', label: 'Edit Booking' },
      { key: 'bookings.cancel', label: 'Cancel Booking' },
    ],
  },
  attendance: {
    label: 'Attendance',
    permissions: [
      { key: 'attendance.view', label: 'View Attendance' },
      { key: 'attendance.create', label: 'Mark Attendance' },
      { key: 'attendance.edit', label: 'Edit Attendance' },
    ],
  },
};
