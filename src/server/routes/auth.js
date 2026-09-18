import { Router } from 'express';
import { getLogin, postLogin, postVerify, postCreatePassword, postLogout } from '../controllers/authController.js';

const router = Router();

router.get('/login', getLogin);
router.post('/login', postLogin);
router.post('/verify', postVerify);
router.post('/create-password', postCreatePassword);
router.post('/logout', postLogout);

export default router;
