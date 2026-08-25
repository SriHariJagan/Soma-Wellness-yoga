import logger from './logger.js';

const MODULE = 'Registry';
const channels = new Map();

export function registerChannel(name, channel) {
  if (!name || !channel) {
    throw new Error('registerChannel requires a name and a channel instance');
  }
  if (channels.has(name)) {
    logger.warn(MODULE, 'Channel re-registered', { name });
  }
  channels.set(name, channel);
}

export function getChannel(name) {
  if (!channels.has(name)) {
    logger.warn(MODULE, 'Unknown channel requested', { name, registered: [...channels.keys()] });
    return null;
  }
  return channels.get(name);
}

export function hasChannel(name) {
  return channels.has(name);
}

export function getChannels() {
  return Array.from(channels.values());
}

export const get = getChannel;
export const has = hasChannel;
export const getAll = getChannels;

export default { registerChannel, getChannel, hasChannel, getChannels, get, has, getAll };
