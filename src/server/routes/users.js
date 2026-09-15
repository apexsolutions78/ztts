import { Router } from 'express';
import { listUsers, getNewUserForm, postCreateUser, getEditUserForm, postUpdateUser, postDeleteUser } from '../controllers/userController.js';

const router = Router();

router.get('/', listUsers);
router.get('/new', getNewUserForm);
router.post('/new', postCreateUser);
router.get('/:id/edit', getEditUserForm);
router.post('/:id/edit', postUpdateUser);
router.post('/:id/delete', postDeleteUser);

export default router;
