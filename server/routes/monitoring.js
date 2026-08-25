import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import * as mon from '../controllers/monitoringController.js';

const router = express.Router();

router.get('/health', asyncHandler(mon.adminHealth));
router.get('/queues', asyncHandler(mon.adminQueues));
router.get('/smtp', asyncHandler(mon.adminSmtp));
router.get('/notifications', asyncHandler(mon.adminNotifications));
router.get('/emails', asyncHandler(mon.adminEmails));
router.get('/failed-jobs', asyncHandler(mon.adminFailedJobs));
router.get('/system', asyncHandler(mon.adminSystem));

export default router;
