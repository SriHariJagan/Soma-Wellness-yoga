// ============================================================
// controllers/eventController.js
// Admin CRUD + registration listing for community Events, plus
// the public catalogue and student-facing list / register flow.
// Registration only requires an authenticated student (no plan
// or payment gating).
// ============================================================
import Event from '../models/Event.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// Start of the current day — so events happening later today still
// appear in public/student "upcoming" listings.
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// Whitelist the fields an admin is allowed to set from the request body.
const pickEventFields = (b = {}) => {
  const fields = {
    title: b.title,
    description: b.description ?? '',
    date: b.date ? new Date(b.date) : undefined,
    startTime: b.startTime ?? '',
    endTime: b.endTime ?? '',
    location: b.location ?? '',
    instructor: b.instructor ?? '',
    image: b.image ?? '',
    capacity: b.capacity ?? 0,
    registrationDeadline: b.registrationDeadline ? new Date(b.registrationDeadline) : null,
    isPublished: b.isPublished ?? false,
    status: b.status || 'available',
  };
  // Never overwrite required fields with undefined on update.
  if (fields.title === undefined) delete fields.title;
  if (fields.date === undefined) delete fields.date;
  return fields;
};

// Shape an event for a student, hiding other students' identities and
// exposing only whether the current user is registered.
const shapeForStudent = (ev, uid) => {
  const o = ev.toObject();
  const mine = o.registrations.find((r) => r.user && String(r.user) === String(uid));
  const total = o.registrations.length;
  const cap = o.capacity || 0;
  delete o.registrations;
  return {
    ...o,
    registered: !!mine,
    myRegistration: mine ? { registeredAt: mine.registeredAt } : null,
    totalRegistrations: total,
    remainingSeats: cap > 0 ? Math.max(0, cap - total) : null,
  };
};

// ─────────────────────────────  ADMIN  ─────────────────────────────

export const adminGetEvents = asyncHandler(async (req, res) => {
  const events = await Event.find().sort({ date: -1 });
  res.json(events);
});

export const adminCreateEvent = asyncHandler(async (req, res) => {
  if (!req.body.title || !req.body.date) throw ApiError.badRequest('Title and date are required');
  const fields = pickEventFields(req.body);
  const ev = await Event.create({
    ...fields,
    publishedAt: fields.isPublished ? new Date() : null,
  });
  res.status(201).json(ev);
});

export const adminUpdateEvent = asyncHandler(async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) throw ApiError.notFound('Event not found');
  const fields = pickEventFields(req.body);
  Object.assign(ev, fields);
  if (fields.isPublished && !ev.publishedAt) ev.publishedAt = new Date();
  await ev.save();
  res.json(ev);
});

export const adminDeleteEvent = asyncHandler(async (req, res) => {
  const ev = await Event.findByIdAndDelete(req.params.id);
  if (!ev) throw ApiError.notFound('Event not found');
  res.json({ success: true });
});

// Who registered for a given event (with user contact details).
export const adminGetEventRegistrations = asyncHandler(async (req, res) => {
  const ev = await Event.findById(req.params.id)
    .populate('registrations.user', 'name email phone');
  if (!ev) throw ApiError.notFound('Event not found');
  const registrations = ev.registrations.map((r) => ({
    _id: r._id,
    name: r.user?.name || r.name || '—',
    email: r.user?.email || r.email || '—',
    phone: r.user?.phone || '',
    registeredAt: r.registeredAt,
  }));
  res.json({ eventTitle: ev.title, count: registrations.length, registrations });
});

// ─────────────────────────────  PUBLIC  ────────────────────────────

// Upcoming published events for the marketing calendar. User
// identities are stripped; only the registration count is exposed.
export const publicGetEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({
    isPublished: true,
    status: 'available',
    date: { $gte: startOfToday() },
  }).sort({ date: 1 });
  const shaped = events.map((e) => {
    const o = e.toObject();
    const total = o.registrations.length;
    delete o.registrations;
    return { ...o, totalRegistrations: total };
  });
  res.json(shaped);
});

// ─────────────────────────────  STUDENT  ───────────────────────────

export const studentGetEvents = asyncHandler(async (req, res) => {
  const uid = req.user._id;
  const events = await Event.find({
    isPublished: true,
    status: 'available',
    date: { $gte: startOfToday() },
  }).sort({ date: 1 });
  const shaped = events.map((e) => shapeForStudent(e, uid));
  res.json({
    registered: shaped.filter((e) => e.registered),
    available: shaped.filter((e) => !e.registered),
  });
});

export const studentRegisterEvent = asyncHandler(async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) throw ApiError.notFound('Event not found');
  if (!ev.isPublished || ev.status !== 'available') {
    throw ApiError.badRequest('Registration is not open for this event');
  }
  if (ev.registrationDeadline && new Date(ev.registrationDeadline) < new Date()) {
    throw ApiError.badRequest('The registration deadline has passed');
  }
  if (ev.registrations.some((r) => r.user && r.user.equals(req.user._id))) {
    return res.json({ success: true, msg: 'Already registered' });
  }
  if (ev.capacity > 0 && ev.registrations.length >= ev.capacity) {
    throw ApiError.badRequest('This event is full');
  }
  ev.registrations.push({
    user: req.user._id,
    name: req.user.name || '',
    email: req.user.email || '',
  });
  await ev.save();
  res.json({ success: true, msg: 'Registered successfully' });
});
