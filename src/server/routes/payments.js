import { Router } from 'express';
import { getBookingPaymentsAPI, postAddPayment, postUpdatePayment, postDeletePayment } from '../controllers/paymentController.js';

const router = Router();

router.get('/:type/:id/payments', getBookingPaymentsAPI);
router.post('/:type/:id/payments', postAddPayment);
router.put('/payments/:paymentId', postUpdatePayment);
router.delete('/payments/:paymentId', postDeletePayment);

export default router;
