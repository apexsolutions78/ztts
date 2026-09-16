import { Router } from 'express';
import { getBookingPaymentsAPI, postAddPayment, postUpdatePayment, postDeletePayment, downloadPaymentReceipt } from '../controllers/paymentController.js';

const router = Router();

router.get('/:type/:id/summary', getBookingPaymentsAPI);
router.post('/:type/:id/record', postAddPayment);
router.get('/record/:paymentId/receipt', downloadPaymentReceipt);
router.put('/record/:paymentId', postUpdatePayment);
router.delete('/record/:paymentId', postDeletePayment);

export default router;
