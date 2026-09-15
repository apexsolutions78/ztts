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
  downloadETicketPDF
} from '../controllers/flightController.js';

const router = Router();

router.get('/', listFlights);
router.get('/export/csv', exportFlightsCSV);
router.get('/new', getNewFlightForm);
router.post('/new', postCreateFlight);
router.get('/:id', viewFlightDetail);
router.get('/:id/edit', getEditFlightForm);
router.post('/:id/edit', postUpdateFlight);
router.post('/:id/delete', postDeleteFlight);
router.post('/:id/issue', issueTicket);
router.post('/:id/share', generateShareToken);
router.get('/:id/pdf', downloadETicketPDF);

export default router;

