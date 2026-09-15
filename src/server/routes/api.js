import { Router } from 'express';
import { getApiInfo, getStats, getFlights, getTours, getCustomers } from '../controllers/apiController.js';

const router = Router();

router.get('/', getApiInfo);
router.get('/stats', getStats);
router.get('/flights', getFlights);
router.get('/tours', getTours);
router.get('/customers', getCustomers);

export default router;
