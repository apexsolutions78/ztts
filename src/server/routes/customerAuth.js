import { Router } from 'express';
import {
  getRegister, postRegister,
  getLogin, postLogin, postLogout,
  getDashboard, postUpdateProfile,
  getBrowseTours, getTourDetail,
  getFlightRequest, postFlightRequest, getFlightRequestSuccess
} from '../controllers/customerAuthController.js';
import { requireCustomerAuth } from '../middleware/customerAuth.js';

const router = Router();

router.get('/register', getRegister);
router.post('/register', postRegister);
router.get('/login', getLogin);
router.post('/login', postLogin);
router.post('/logout', postLogout);

router.get('/', requireCustomerAuth, getDashboard);
router.post('/profile', requireCustomerAuth, postUpdateProfile);
router.get('/tours', requireCustomerAuth, getBrowseTours);
router.get('/tours/:id', requireCustomerAuth, getTourDetail);
router.get('/flights/request', requireCustomerAuth, getFlightRequest);
router.post('/flights/request', requireCustomerAuth, postFlightRequest);
router.get('/flights/request/success', requireCustomerAuth, getFlightRequestSuccess);

export default router;
