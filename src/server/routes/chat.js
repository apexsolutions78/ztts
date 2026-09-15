import { Router } from 'express';
import { getChatPage, postChatMessage } from '../controllers/chatController.js';

const router = Router();

router.get('/', getChatPage);
router.post('/', postChatMessage);

export default router;
