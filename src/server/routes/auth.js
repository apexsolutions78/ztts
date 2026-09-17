import { Router } from 'express';
import { getLogin, postLogin, postVerify, postLogout } from '../controllers/authController.js';

const router = Router();

router.get('/login', getLogin);
router.post('/login', postLogin);
router.post('/verify', postVerify);
router.post('/logout', postLogout);

export default router;
