import { Router } from 'express';
import { getBookingPaymentsAPI, postAddPayment, postUpdatePayment, postDeletePayment, downloadPaymentReceipt, postRecordBatchPayments, postRefundPayment } from '../controllers/paymentController.js';

const router = Router();

router.get('/:type/:id/summary', getBookingPaymentsAPI);
router.post('/:type/:id/record', postAddPayment);
router.post('/:type/:id/record-batch', postRecordBatchPayments);
router.get('/record/:paymentId/receipt', downloadPaymentReceipt);
router.put('/record/:paymentId', postUpdatePayment);
router.post('/record/:paymentId/refund', postRefundPayment);
router.delete('/record/:paymentId', postDeletePayment);

export default router;
