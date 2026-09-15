import { Router } from 'express';
import {
  sendFlightEmailNotification,
  sendFlightWhatsAppNotification,
  getBookingNotifications
} from '../controllers/notificationController.js';

const router = Router({ mergeParams: true });

router.post('/flights/:id/notify/email', sendFlightEmailNotification);
router.post('/flights/:id/notify/whatsapp', sendFlightWhatsAppNotification);
router.get('/flights/:id/notifications', getBookingNotifications);

export default router;
