// ============================================================
// services/attendanceService.js
// Atomic attendance marking that cascades to all related
// records: invitation, membership, user service, free trial.
// ============================================================
import Attendance from '../models/Attendance.js';
import ClassInvite from '../models/ClassInvite.js';
import Membership from '../models/Membership.js';
import UserService from '../models/UserService.js';
import FreeTrial from '../models/FreeTrial.js';
import ActivityLog from '../models/ActivityLog.js';
import Course from '../models/Course.js';
import Workshop from '../models/Workshop.js';
import { notify } from './notificationService.js';
import { isSingleSessionService } from '../utils/serviceHelpers.js';

function fmtDate(d) {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
}

/**
 * Mark attendance for a student and cascade updates to every related
 * enrollment record. Statuses present, zoom, and late count as
 * "completed" sessions that increment progress. This is the single
 * source of truth for all progress tracking — nothing else should
 * mutate usedSessions or completedSessions directly.
 *
 * @param {Object} params
 * @param {string} params.user        - student ObjectId
 * @param {string} params.date        - ISO date string
 * @param {string} params.status      - 'present' | 'zoom' | 'absent' | 'late' | 'excused' | 'not_marked'
 * @param {string} params.mode        - 'online' | 'offline'
 * @param {string} params.classType   - e.g. 'General'
 * @param {string} params.session     - ClassSession ObjectId (optional)
 * @param {string} params.invitation  - ClassInvite ObjectId (optional)
 * @param {string} params.entityType  - 'membership' | 'service' | 'course' | 'trial' | 'workshop' | 'batch' | 'none'
 * @param {string} params.entityId    - the enrollment ObjectId
 * @param {string} params.adminId     - admin who marked it (for audit)
 * @returns {Promise<Object>} { attendance, updates }
 */
export async function markAttendanceAtomic(params) {
  const { user, date, status, mode, classType, session, invitation, entityType, entityId, adminId } = params;
  if (!user || !date || !status) {
    throw Object.assign(new Error('user, date and status are required'), { statusCode: 400 });
  }

  const day = fmtDate(date);
  const now = new Date();

  // Find existing record to check if it is locked
  const existing = await Attendance.findOne({ user, date: day });
  if (existing && existing.locked) {
    return { attendance: existing, updates: [], skipped: true, reason: 'locked' };
  }

  // Upsert the attendance record (skip if record is locked)
  const record = await Attendance.findOneAndUpdate(
    { user, date: day },
    {
      $set: {
        status,
        mode: mode || 'offline',
        classType: classType || 'General',
        session: session || null,
        invitation: invitation || null,
        entityType: entityType || 'none',
        entityId: entityId || null,
      },
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  const updates = [];

  // ---- 1. Update invitation recipient status if linked ----
  if (invitation) {
    const invite = await ClassInvite.findOneAndUpdate(
      {
        _id: invitation,
        'recipients.user': user,
      },
      {
        $set: {
          'recipients.$.status': status === 'absent' ? 'read' : 'joined',
          'recipients.$.joinedAt': now,
        },
        $inc: status === 'absent' ? {} : { readCount: 0 },
      },
      { returnDocument: 'after' }
    );
    if (invite) updates.push('invitation');
  }

  // ---- 2. Update the entity that owns this session ----
  if (entityType && entityId) {
    // Verify enrollment before recording attendance for course/workshop
    if (entityType === 'course') {
      const course = await Course.findById(entityId);
      if (!course || !course.enrolledUsers.some((uid) => uid.equals(user))) {
        throw Object.assign(new Error('User is not enrolled in this course'), { statusCode: 403 });
      }
    } else if (entityType === 'workshop') {
      const workshop = await Workshop.findById(entityId);
      if (!workshop || !workshop.registrations.some((r) => r.user && r.user.equals(user))) {
        throw Object.assign(new Error('User is not registered for this workshop'), { statusCode: 403 });
      }
    }

    // A session is "completed" (counted) only when present, zoom, or late
    const isCompleted = status === 'present' || status === 'zoom' || status === 'late';

    switch (entityType) {
      case 'membership': {
        const membership = await Membership.findById(entityId);
        if (membership && membership.isPaused) {
          throw Object.assign(new Error('Cannot mark attendance: membership is paused. Resume the membership first.'), { statusCode: 400 });
        }
        if (membership) {
          // Check if this session was already counted (re-attendance)
          const alreadyCounted = membership.sessionHistory?.some(
            (sh) => sh.invitation?.toString() === invitation && fmtDate(sh.date).getTime() === day.getTime()
          );
          if (!alreadyCounted && isCompleted) {
            membership.completedSessions = (membership.completedSessions || 0) + 1;
            membership.sessionHistory = membership.sessionHistory || [];
            membership.sessionHistory.push({
              invitation: invitation || undefined,
              title: classType || 'Class',
              date: day,
              attendance: status,
              completedAt: now,
            });
            await membership.save();
            updates.push('membership');
          }
        }
        break;
      }

      case 'service': {
        const userService = await UserService.findById(entityId);
        if (userService) {
          if (userService.status === 'completed') {
            throw Object.assign(new Error('This service has already been completed.'), { statusCode: 400 });
          }
          if (isCompleted) {
            const singleSession = isSingleSessionService(userService.serviceName);
            if (singleSession) {
              userService.usedSessions = 1;
              userService.totalSessions = 1;
              userService.status = 'completed';
              userService.completionDate = now;
              userService.frozenProgressPct = 100;
              userService.history = userService.history || [];
              userService.history.push({ action: 'completed', note: 'Session attended — service completed', at: now });
              await userService.save();
              try {
                await notify(userService.user, {
                  title: 'Service completed',
                   message: `Your <strong>${userService.serviceName}</strong> service has been successfully completed. Thank you for visiting Soma Wellness.`,
                  type: 'success',
                });
              } catch {}
              updates.push('service');
            } else if (userService.isActive) {
              userService.usedSessions = (userService.usedSessions || 0) + 1;
              await userService.save();
              updates.push('service');
            }
          }
        }
        break;
      }

      case 'trial': {
        const trial = await FreeTrial.findById(entityId);
        if (trial && trial.status === 'active') {
          if (isCompleted) {
            trial.completedSessions = (trial.completedSessions || 0) + 1;
            if (trial.completedSessions >= trial.maxSessions) {
              trial.status = 'expired';
              trial.completedAt = now;
              trial.history = trial.history || [];
              trial.history.push({
                action: 'expired',
                note: 'All trial sessions completed via attendance',
                by: adminId || 'system',
                at: now,
              });
            }
            await trial.save();
            updates.push('trial');
          }
        }
        break;
      }

      case 'workshop':
      case 'course':
      case 'batch':
        // These use their own tracking mechanisms — attendance is
        // recorded but progress is managed by their own controllers.
        updates.push(entityType);
        break;

      default:
        break;
    }
  }

  // Audit log
  try {
    await ActivityLog.create({
      action: `Marked ${status} attendance`,
      performedBy: adminId || user,
      targetUser: user,
      meta: { date: day.toISOString(), entityType, entityId, invitation, session },
    });
  } catch { /* noop */ }

  return { attendance: record, updates };
}

export default { markAttendanceAtomic };
