import { Router } from 'express';
import { getExchangeRatesPage, postUpdateExchangeRates } from '../controllers/settingsController.js';

const router = Router();

router.get('/rates', getExchangeRatesPage);
router.post('/rates', postUpdateExchangeRates);

export default router;
