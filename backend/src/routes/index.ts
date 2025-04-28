import express from 'express';
import agentRoutes from './agentRoutes';
import executionRoutes from './executionRoutes';
import authRoutes from './authRoutes';

const router = express.Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/agents', agentRoutes);
router.use('/execution', executionRoutes);

export default router;