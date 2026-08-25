import { get } from './registry.js';
import { withTimeout } from '../utils/timeout.js';
import logger from './logger.js';

const MODULE = 'Dispatcher';

const CHANNEL_TIMEOUT_MS = parseInt(process.env.CHANNEL_TIMEOUT_MS, 10) || 60000;

export async function dispatch(notification) {
  const channelNames = notification.channels || [];

  if (channelNames.length === 0) return;

  const results = await Promise.allSettled(
    channelNames.map(async (name) => {
      const channel = get(name);
      if (!channel) {
        logger.warn(MODULE, 'Channel not registered, skipping', { channel: name });
        return { success: false, channel: name, reason: 'not_registered' };
      }
      await withTimeout(channel.send(notification), CHANNEL_TIMEOUT_MS, `channel:${name}`);
      return { success: true, channel: name };
    })
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error(MODULE, 'Channel delivery failed', { error: result.reason?.message });
    }
  }
}

export default dispatch;
