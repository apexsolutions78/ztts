import { Router } from 'express';
import { getBookingPaymentsAPI, postAddPayment, postUpdatePayment, postDeletePayment } from '../controllers/paymentController.js';

const router = Router();

router.get('/:type/:id/summary', getBookingPaymentsAPI);
router.post('/:type/:id/record', postAddPayment);
router.put('/record/:paymentId', postUpdatePayment);
router.delete('/record/:paymentId', postDeletePayment);

export default router;
