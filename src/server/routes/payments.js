import { Router } from 'express';
import { getBookingPaymentsAPI, postAddPayment, postUpdatePayment, postDeletePayment, downloadPaymentReceipt, postRecordBatchPayments, postRefundPayment } from '../controllers/paymentController.js';
import { validateCsrf } from '../middleware/auth.js';

const router = Router();

router.get('/:type/:id/summary', getBookingPaymentsAPI);
router.post('/:type/:id/record', validateCsrf, postAddPayment);
router.post('/:type/:id/record-batch', validateCsrf, postRecordBatchPayments);
router.get('/record/:paymentId/receipt', downloadPaymentReceipt);
router.put('/record/:paymentId', validateCsrf, postUpdatePayment);
router.post('/record/:paymentId/refund', validateCsrf, postRefundPayment);
router.delete('/record/:paymentId', validateCsrf, postDeletePayment);

export default router;
