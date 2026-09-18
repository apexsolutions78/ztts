import { Router } from 'express';
import { 
  listFlights, 
  exportFlightsCSV,
  getNewFlightForm, 
  postCreateFlight, 
  viewFlightDetail, 
  issueTicket, 
  generateShareToken,
  getEditFlightForm,
  postUpdateFlight,
  postDeleteFlight,
  downloadETicketPDF,
  listFlightRequests,
  confirmFlightRequest,
  cancelFlightRequest,
  sendFlightNotification,
  getFlightNotifications
} from '../controllers/flightController.js';

const router = Router();

router.get('/', listFlights);
router.get('/export/csv', exportFlightsCSV);
router.get('/new', getNewFlightForm);
router.post('/new', postCreateFlight);

router.get('/requests', listFlightRequests);
router.post('/requests/:id/confirm', confirmFlightRequest);
router.post('/requests/:id/cancel', cancelFlightRequest);

router.get('/:id', viewFlightDetail);
router.get('/:id/edit', getEditFlightForm);
router.post('/:id/edit', postUpdateFlight);
router.post('/:id/delete', postDeleteFlight);
router.post('/:id/issue', issueTicket);
router.post('/:id/share', generateShareToken);
router.get('/:id/pdf', downloadETicketPDF);
router.post('/:id/notify/:channel', sendFlightNotification);
router.get('/:id/notifications', getFlightNotifications);

export default router;

