import express from 'express';
import { processMessage, getAgents, getProviders } from '../controllers/agentController';

const router = express.Router();

// GET /api/agents - Get information about available agents
router.get('/', getAgents);

// GET /api/agents/providers - Get supported AI providers
router.get('/providers', getProviders);

// POST /api/agents/process - Process a message through the agent system
router.post('/process', processMessage);

export default router;