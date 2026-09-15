import { Router } from 'express';
import { viewAuditLogs } from '../controllers/auditController.js';

const router = Router();

router.get('/', viewAuditLogs);

export default router;
