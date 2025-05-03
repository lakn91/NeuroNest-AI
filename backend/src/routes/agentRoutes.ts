import express, { RequestHandler } from 'express';
import { processMessage, getAgents, getProviders } from '../controllers/agentController';

const router = express.Router();

// GET /api/agents - Get information about available agents
router.get('/', getAgents as RequestHandler);

// GET /api/agents/providers - Get supported AI providers
router.get('/providers', getProviders as RequestHandler);

// POST /api/agents/process - Process a message through the agent system
router.post('/process', processMessage as RequestHandler);

export default router;