import { Router } from 'express';
import { listTours, getNewTourForm, postCreateTour, viewTourDetail, postBookTour, getEditTourForm, postUpdateTour, postDeleteTour, postCancelTourBooking } from '../controllers/tourController.js';
import { uploadTourImage } from '../middleware/upload.js';

const router = Router();

router.get('/', listTours);
router.get('/new', getNewTourForm);
router.post('/new', uploadTourImage('image_file'), postCreateTour);
router.get('/:id', viewTourDetail);
router.get('/:id/edit', getEditTourForm);
router.post('/:id/edit', uploadTourImage('image_file'), postUpdateTour);
router.post('/:id/delete', postDeleteTour);
router.post('/book', postBookTour);
router.post('/bookings/:id/cancel', postCancelTourBooking);

export default router;
