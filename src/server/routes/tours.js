import { Router } from 'express';
import { 
  listTours, getNewTourForm, postCreateTour, viewTourDetail, viewTourBooking, postBookTour, 
  getEditTourForm, postUpdateTour, postDeleteTour, postCancelTourBooking,
  listGroupTours, getCreateGroupForm, postCreateGroup, viewGroupTour, postUpdateGroup, 
  postDeleteGroup, postAddGroupMember, postUpdateGroupMember, postDeleteGroupMember
} from '../controllers/tourController.js';
import { uploadTourImage } from '../middleware/upload.js';

const router = Router();

// Group Tour routes (must be before /:id routes)
router.get('/groups', listGroupTours);
router.get('/bookings/:bookingId/group/new', getCreateGroupForm);
router.post('/bookings/:bookingId/group/new', postCreateGroup);
router.get('/group/:id', viewGroupTour);
router.post('/group/:id/edit', postUpdateGroup);
router.post('/group/:id/delete', postDeleteGroup);
router.post('/group/:id/member', postAddGroupMember);
router.post('/group/:groupId/member/:memberId/edit', postUpdateGroupMember);
router.post('/group/:groupId/member/:memberId/delete', postDeleteGroupMember);

// Existing routes
router.get('/', listTours);
router.get('/new', getNewTourForm);
router.post('/new', uploadTourImage('image_file'), postCreateTour);
router.get('/bookings/:id', viewTourBooking);
router.get('/bookings/:id/share', async (req, res) => {
  try {
    const { findTourBookingById, createPortalToken, findPortalTokenByTourBooking } = await import('../models/index.js');
    const booking = await findTourBookingById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    let tokenRecord = await findPortalTokenByTourBooking(booking.id);
    if (!tokenRecord) {
      const token = await createPortalToken({ customer_id: booking.customer_id, tour_booking_id: booking.id });
      tokenRecord = { token };
    }
    const shareUrl = `${req.protocol}://${req.get('host')}/t/${tokenRecord.token}`;
    res.json({ success: true, token: tokenRecord.token, shareUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
router.post('/bookings/:id/cancel', postCancelTourBooking);
router.get('/:id', viewTourDetail);
router.get('/:id/edit', getEditTourForm);
router.post('/:id/edit', uploadTourImage('image_file'), postUpdateTour);
router.post('/:id/delete', postDeleteTour);
router.post('/book', postBookTour);

export default router;
