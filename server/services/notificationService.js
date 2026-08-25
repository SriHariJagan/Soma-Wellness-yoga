import Membership from '../models/Membership.js';
import notificationService from '../notification/core/NotificationService.js';
import dispatcher from './NotificationDispatcher.js';
import logger from '../notification/logger.js';

const MODULE = 'PlanNotifier';

export function registerChannel(name, channel) {
  notificationService.registerChannel(name, channel);
}

/**
 * Thin wrapper around NotificationDispatcher for backward compatibility.
 *
 * ALWAYS delegates to the centralized dispatcher, which guarantees:
 *  - Notification + NotificationRecipient are always created together
 *  - unreadNotifications is always incremented
 *  - Channel dispatch is consistent
 */
export async function notify(userId, opts = {}) {
  const {
    title = '',
    message,
    type = 'info',
    channels,
    asset,
    assetName,
    category,
    link,
    workshop,
  } = opts;

  return dispatcher.dispatch({
    recipients: userId,
    title,
    message,
    type,
    channels: channels && channels.length > 0 ? channels : ['inApp'],
    link: link || '',
    data: { message, title },
    ...(asset !== undefined ? { asset } : {}),
    ...(assetName !== undefined ? { assetName } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(workshop !== undefined ? { workshop } : {}),
  });
}

export async function notifyPlanMembers(planNames, opts = {}) {
  if (!planNames) {
    logger.warn(MODULE, 'notifyPlanMembers skipped', { reason: 'planNames is null/undefined' });
    return [];
  }

  const {
    title = '',
    message,
    type = 'new_asset',
    channels,
    asset,
    assetName,
    category,
    link,
    workshop,
  } = opts;

  logger.debug(MODULE, 'Starting notifyPlanMembers', { planNames, title });

  const activeMemberships = await Membership.find({
    status: 'active',
    expiryDate: { $gt: new Date() },
  }).populate('user', '_id');

  logger.debug(MODULE, 'Active memberships found', { count: activeMemberships.length });

  const now = new Date();
  const userIds = new Set();
  for (const m of activeMemberships) {
    if (!m.user) continue;
    const planMatch = planNames.length === 0 || planNames.some((pn) => {
      const pl = pn.toLowerCase();
      const mt = m.planType.toLowerCase();
      return mt.includes(pl) || pl.includes(mt);
    });
    if (planMatch && m.expiryDate > now) {
      userIds.add(m.user._id.toString());
    }
  }

  logger.debug(MODULE, 'Matched users', { count: userIds.size });
  if (userIds.size === 0) return [];

  const notification = await dispatcher.broadcast([...userIds], {
    title,
    message,
    type,
    channels: channels && channels.length > 0 ? channels : ['inApp'],
    data: { title, message, ...(asset ? { asset } : {}), ...(workshop ? { workshop } : {}) },
    asset,
    assetName,
    category,
    link,
    workshop,
  });

  logger.info(MODULE, 'notifyPlanMembers complete', { created: notification ? 1 : 0, userIds: userIds.size });
  return notification ? [notification] : [];
}

export default { notify, notifyPlanMembers };
