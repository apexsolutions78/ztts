import { Router } from 'express';
import {
  getLogin, postAuth, postVerify, postCreatePassword, postLogout,
  getDashboard, postUpdateProfile,
  getBrowseTours, getTourDetail, getTourBookForm, postCustomerBookTour, postCancelTourBooking,
  getFlightRequest, postFlightRequest, getFlightRequestSuccess, postApproveFlight, postDeclineFlight, postPassengerDetails
} from '../controllers/customerAuthController.js';
import { requireCustomerAuth } from '../middleware/customerAuth.js';

const router = Router();

router.get('/login', getLogin);
router.post('/auth', postAuth);
router.post('/verify', postVerify);
router.post('/create-password', postCreatePassword);
router.post('/logout', postLogout);

router.get('/', requireCustomerAuth, getDashboard);
router.post('/profile', requireCustomerAuth, postUpdateProfile);
router.get('/tours', requireCustomerAuth, getBrowseTours);
router.get('/tours/:id/book', requireCustomerAuth, getTourBookForm);
router.post('/tours/:id/book', requireCustomerAuth, postCustomerBookTour);
router.get('/tours/:id', requireCustomerAuth, getTourDetail);
router.get('/flights/request', requireCustomerAuth, getFlightRequest);
router.post('/flights/request', requireCustomerAuth, postFlightRequest);
router.get('/flights/request/success', requireCustomerAuth, getFlightRequestSuccess);
router.post('/flights/:id/approve', requireCustomerAuth, postApproveFlight);
router.post('/flights/:id/decline', requireCustomerAuth, postDeclineFlight);
router.post('/flights/:id/passengers', requireCustomerAuth, postPassengerDetails);

router.post('/tours/:id/cancel', requireCustomerAuth, postCancelTourBooking);

export default router;
