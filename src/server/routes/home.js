import { Router } from 'express';
import { viewHomePage } from '../controllers/homeController.js';

const router = Router();

router.get('/', viewHomePage);

export default router;
