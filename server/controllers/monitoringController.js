import mongoose from 'mongoose';
import os from 'node:os';
import transporter from '../mailer.js';
import { getNotificationQueue } from '../notification/queue/notificationQueue.js';
import { isWorkerRunning } from '../notification/queue/notificationWorker.js';
import { listDLQ } from '../notification/queue/dlq.js';
import notificationScheduler from '../notification/scheduler.js';
import NotificationLog from '../models/NotificationLog.js';
import Notification from '../models/Notification.js';
import logger from '../notification/logger.js';
import { NOTIFICATION_LOG_STATUSES } from '../shared/constants/index.js';

const SENT_DELIVERED = NOTIFICATION_LOG_STATUSES.filter(s => s === 'sent' || s === 'delivered');

const MODULE = 'MonitoringCtrl';

function getUptime() {
  const sec = process.uptime();
  return {
    seconds: Math.floor(sec),
    human: `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h ${Math.floor((sec % 3600) / 60)}m`,
  };
}

function getMemoryUsage() {
  const mem = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  return {
    rss: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
    external: Math.round(mem.external / 1024 / 1024 * 100) / 100,
    systemTotal: Math.round(total / 1024 / 1024 / 1024 * 100) / 100,
    systemFree: Math.round(free / 1024 / 1024 / 1024 * 100) / 100,
    systemUsedPercent: Math.round((1 - free / total) * 10000) / 100,
  };
}

function getCpuUsage() {
  const cpus = os.cpus();
  const avg = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((s, v) => s + v, 0);
    const idle = cpu.times.idle;
    acc.total += total;
    acc.idle += idle;
    return acc;
  }, { total: 0, idle: 0 });
  return {
    cores: cpus.length,
    loadAvg: os.loadavg(),
    model: cpus[0]?.model || 'unknown',
    idlePercent: Math.round(avg.idle / avg.total * 10000) / 100,
    usedPercent: Math.round((1 - avg.idle / avg.total) * 10000) / 100,
  };
}

async function getMongoStatus() {
  const state = mongoose.connection.readyState;
  const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const status = stateMap[state] || 'unknown';
  const healthy = state === 1;
  let details = {};
  if (healthy) {
    try {
      const admin = mongoose.connection.db.admin();
      const buildInfo = await admin.buildInfo();
      const serverStatus = await admin.serverStatus();
      details = {
        version: buildInfo.version,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        connections: {
          current: serverStatus.connections?.current,
          available: serverStatus.connections?.available,
          totalCreated: serverStatus.connections?.totalCreated,
        },
        uptimeSeconds: serverStatus.uptime,
        ops: serverStatus.opcounters,
      };
    } catch { }
  }
  return { status, healthy, details };
}

async function getSmtpStatus() {
  const s = transporter.getStatus();
  return {
    configured: s.configured,
    verified: s.verified,
    lastVerified: s.lastVerified || null,
    host: s.host || null,
    port: s.port || null,
    secure: s.secure || null,
    fromEmail: s.fromEmail || null,
    fromName: s.fromName || null,
    hasReplyTo: s.hasReplyTo || false,
    healthy: s.configured && s.verified,
  };
}

async function getQueueStatus() {
  try {
    const queue = getNotificationQueue();
    const [waiting, active, completed, failed, delayed, worker] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      isWorkerRunning(),
    ]);
    const total = waiting + active + completed + failed + delayed;
    return {
      queueName: 'notification-delivery',
      healthy: worker || total === 0,
      counts: { waiting, active, completed, failed, delayed, total },
      workerRunning: worker,
    };
  } catch (err) {
    return {
      queueName: 'notification-delivery',
      healthy: false,
      counts: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 },
      workerRunning: false,
      error: err.message,
    };
  }
}

async function getSchedulerStatus() {
  try {
    const doc = await mongoose.connection.db.collection('SchedulerState').findOne(
      { _id: 'reminder-scheduler' },
    );
    return {
      started: notificationScheduler._started || false,
      healthy: !!doc,
      lastTickAt: doc?.lastTickAt || null,
      lastJobName: doc?.lastJobName || null,
      lastResult: doc?.lastResult || null,
      firstTickAt: doc?.firstTickAt || null,
      updatedAt: doc?.updatedAt || null,
    };
  } catch {
    return { started: false, healthy: false, lastTickAt: null };
  }
}

async function getNotificationStats(days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  try {
    const [total, byStatus, byChannel, dailyCounts, topErrors] = await Promise.all([
      NotificationLog.countDocuments({ createdAt: { $gte: since } }),
      NotificationLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      NotificationLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$channel', count: { $sum: 1 } } },
      ]),
      NotificationLog.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            sent: { $sum: { $cond: [{ $in: ['$status', SENT_DELIVERED] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 90 },
      ]),
      NotificationLog.aggregate([
        { $match: { createdAt: { $gte: since }, status: 'failed' } },
        { $group: { _id: '$error.message', count: { $sum: 1 }, lastOccurrence: { $max: '$createdAt' } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const statusMap = {};
    for (const s of byStatus) statusMap[s._id] = s.count;
    const channelMap = {};
    for (const c of byChannel) channelMap[c._id] = c.count;
    const failedCount = statusMap['failed'] || 0;
    const sentCount = (statusMap['sent'] || 0) + (statusMap['delivered'] || 0);

    return {
      periodDays: days,
      since: since.toISOString(),
      total,
      byStatus: statusMap,
      byChannel: channelMap,
      daily: dailyCounts,
      topErrors,
      successRate: total > 0 ? Math.round((sentCount / total) * 10000) / 100 : 100,
      failureRate: total > 0 ? Math.round((failedCount / total) * 10000) / 100 : 0,
    };
  } catch (err) {
    logger.error(MODULE, 'Failed to get notification stats', { error: err.message });
    return { periodDays: days, total: 0, byStatus: {}, byChannel: {}, daily: [], topErrors: [], successRate: 100, failureRate: 0 };
  }
}

async function getEmailStats(days = 30) {
  const since = new Date(Date.now() - days * 86400000);
  try {
    const pipeline = [
      { $match: { createdAt: { $gte: since }, channel: 'email' } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sent: { $sum: { $cond: [{ $in: ['$status', SENT_DELIVERED] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          bounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $eq: ['$openedAt', null] }, 0, 1] } },
          totalRetries: { $sum: '$attempt' },
        },
      },
    ];
    const [agg, byDay] = await Promise.all([
      NotificationLog.aggregate(pipeline),
      NotificationLog.aggregate([
        { $match: { createdAt: { $gte: since }, channel: 'email' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: 1 },
            sent: { $sum: { $cond: [{ $in: ['$status', SENT_DELIVERED] }, 1, 0] } },
            failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 90 },
      ]),
    ]);

    const stats = agg[0] || { total: 0, sent: 0, failed: 0, bounced: 0, opened: 0, totalRetries: 0 };
    return {
      periodDays: days,
      since: since.toISOString(),
      total: stats.total,
      sent: stats.sent,
      failed: stats.failed,
      bounced: stats.bounced,
      opened: stats.opened,
      openRate: stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 10000) / 100 : 0,
      successRate: stats.total > 0 ? Math.round((stats.sent / stats.total) * 10000) / 100 : 100,
      totalRetries: stats.totalRetries,
      avgRetriesPerEmail: stats.total > 0 ? Math.round((stats.totalRetries / stats.total) * 100) / 100 : 0,
      daily: byDay,
    };
  } catch (err) {
    logger.error(MODULE, 'Failed to get email stats', { error: err.message });
    return { periodDays: days, total: 0, sent: 0, failed: 0, bounced: 0, opened: 0, openRate: 0, successRate: 100, totalRetries: 0, avgRetriesPerEmail: 0, daily: [] };
  }
}

async function getFailedJobsOverview() {
  try {
    const queue = getNotificationQueue();
    const [failed, dlqEntries] = await Promise.all([
      queue.getFailedCount(),
      listDLQ(100, 0),
    ]);

    const failedSince = new Date(Date.now() - 7 * 86400000);
    const [logFailures, recentFailures] = await Promise.all([
      NotificationLog.countDocuments({ status: 'failed', createdAt: { $gte: failedSince } }),
      NotificationLog.aggregate([
        { $match: { status: 'failed', createdAt: { $gte: failedSince } } },
        { $sort: { createdAt: -1 } },
        { $limit: 20 },
        {
          $project: {
            _id: 1,
            channel: 1,
            attempt: 1,
            maxAttempts: 1,
            error: 1,
            lastError: 1,
            createdAt: 1,
            failedAt: 1,
          },
        },
      ]),
    ]);

    const totalRetries = await NotificationLog.aggregate([
      { $match: { createdAt: { $gte: failedSince } } },
      { $group: { _id: null, total: { $sum: '$attempt' } } },
    ]);

    return {
      periodDays: 7,
      queueFailedCount: failed,
      dlqCount: dlqEntries.length,
      logFailures7d: logFailures,
      totalRetries7d: totalRetries[0]?.total || 0,
      recentFailures: recentFailures,
    };
  } catch (err) {
    logger.error(MODULE, 'Failed to get failed jobs overview', { error: err.message });
    return { queueFailedCount: 0, dlqCount: 0, logFailures7d: 0, totalRetries7d: 0, recentFailures: [] };
  }
}

// ── Public health endpoints (no auth) ──

export async function healthSummary(req, res) {
  const [mongo, smtp, queue, scheduler] = await Promise.all([
    getMongoStatus(),
    getSmtpStatus(),
    getQueueStatus(),
    getSchedulerStatus(),
  ]);

  const allHealthy = mongo.healthy && smtp.healthy && queue.healthy && scheduler.healthy;
  const degraded = !allHealthy;

  res.json({
    success: true,
    status: degraded ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    uptime: getUptime(),
    subsystems: { mongodb: mongo, smtp, queue, scheduler },
  });
}

export async function healthSmtp(req, res) {
  const smtp = await getSmtpStatus();
  res.json({ success: true, ...smtp });
}

export async function healthMongo(req, res) {
  const mongo = await getMongoStatus();
  res.json({ success: true, ...mongo });
}

export async function healthQueue(req, res) {
  const queue = await getQueueStatus();
  res.json({ success: true, ...queue });
}

export async function healthScheduler(req, res) {
  const scheduler = await getSchedulerStatus();
  res.json({ success: true, ...scheduler });
}

// ── Admin monitoring endpoints (require admin auth) ──

export async function adminHealth(req, res) {
  const [mongo, smtp, queue, scheduler, mem, cpu, notifStats, emailStats] = await Promise.all([
    getMongoStatus(),
    getSmtpStatus(),
    getQueueStatus(),
    getSchedulerStatus(),
    getMemoryUsage(),
    getCpuUsage(),
    getNotificationStats(7),
    getEmailStats(30),
  ]);

  const allHealthy = mongo.healthy && smtp.healthy && queue.healthy && scheduler.healthy;

  res.json({
    success: true,
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: getUptime(),
    system: { memory: mem, cpu },
    subsystems: { mongodb: mongo, smtp, queue, scheduler },
    notifications: notifStats,
    emails: emailStats,
  });
}

export async function adminQueues(req, res) {
  const [queue, worker, dlqEntries] = await Promise.all([
    getQueueStatus(),
    isWorkerRunning(),
    listDLQ(50, 0),
  ]);
  res.json({
    success: true,
    data: { ...queue, dlqCount: dlqEntries.length, dlqEntries },
  });
}

export async function adminSmtp(req, res) {
  const smtp = await getSmtpStatus();
  res.json({ success: true, ...smtp });
}

export async function adminNotifications(req, res) {
  const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);
  const stats = await getNotificationStats(days);
  res.json({ success: true, ...stats });
}

export async function adminEmails(req, res) {
  const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
  const stats = await getEmailStats(days);
  res.json({ success: true, ...stats });
}

export async function adminFailedJobs(req, res) {
  const overview = await getFailedJobsOverview();
  res.json({ success: true, ...overview });
}

export async function adminSystem(req, res) {
  const mem = getMemoryUsage();
  const cpu = getCpuUsage();
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: getUptime(),
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      uptime: getUptime(),
    },
    memory: mem,
    cpu,
    network: Object.entries(os.networkInterfaces()).map(([name, addrs]) => ({
      name,
      addresses: (addrs || []).map((a) => ({ family: a.family, address: a.address, internal: a.internal })),
    })),
  });
}
