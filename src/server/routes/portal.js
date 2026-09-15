import { Router } from 'express';
import { viewCustomerPortal } from '../controllers/portalController.js';

const router = Router();

router.get('/:token', viewCustomerPortal);

export default router;
