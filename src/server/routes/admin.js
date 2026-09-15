import { Router } from 'express';
import { getDashboard } from '../controllers/adminController.js';

const router = Router();

router.get('/', getDashboard);

export default router;
