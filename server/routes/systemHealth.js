import express from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import * as sys from '../controllers/systemHealthController.js';

const router = express.Router();

router.get('/email-health', asyncHandler(sys.getEmailHealth));
router.post('/email-health/test-smtp', asyncHandler(sys.testSmtp));

export default router;
