import { Router } from 'express';
import { viewFinanceOverview, exportFinanceCSV, downloadInvoicePDF } from '../controllers/financeController.js';

const router = Router();

router.get('/', viewFinanceOverview);
router.get('/export/csv', exportFinanceCSV);
router.get('/:id/pdf', downloadInvoicePDF);

export default router;
