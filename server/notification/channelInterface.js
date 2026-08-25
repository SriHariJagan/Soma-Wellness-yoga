export class NotificationChannel {
  async send(notification) {
    throw new Error(`Channel ${this.constructor.name} must implement send()`);
  }
}

export function validateChannelResult(result) {
  if (!result || typeof result !== 'object') {
    throw new Error('Channel send() must return an object');
  }
  if (typeof result.providerMessageId !== 'string' || result.providerMessageId.length === 0) {
    throw new Error('Channel send() must return a non-empty providerMessageId string');
  }
  return true;
}

export default NotificationChannel;
