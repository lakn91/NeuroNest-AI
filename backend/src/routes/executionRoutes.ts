import express from 'express';
import { 
  createProject, 
  createFile, 
  executeProject, 
  stopExecution, 
  getExecutionLogs 
} from '../controllers/executionController';

const router = express.Router();

// POST /api/execution/projects - Create a new project
router.post('/projects', createProject);

// POST /api/execution/files - Create a file in a project
router.post('/files', createFile);

// POST /api/execution/execute - Execute a project
router.post('/execute', executeProject);

// DELETE /api/execution/containers/:containerId - Stop execution
router.delete('/containers/:containerId', stopExecution);

// GET /api/execution/logs/:containerId - Get execution logs
router.get('/logs/:containerId', getExecutionLogs);

export default router;