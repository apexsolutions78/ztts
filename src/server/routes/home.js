import { Router } from 'express';
import { viewHomePage } from '../controllers/homeController.js';
import { getPublicFlightRequest, postPublicFlightRequest, getPublicFlightRequestSuccess } from '../controllers/publicFlightController.js';

const router = Router();

router.get('/', viewHomePage);
router.get('/flights/request', getPublicFlightRequest);
router.post('/flights/request', postPublicFlightRequest);
router.get('/flights/request/success', getPublicFlightRequestSuccess);

export default router;
