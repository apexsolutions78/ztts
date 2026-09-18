import { Router } from 'express';
import { requireAuth, requireGuide } from '../middleware/auth.js';
import {
  getGuideDashboard, viewGroupDetail, confirmMilestone,
  sendMessageToGroup, createPoll, closePollAction,
  postAdminMessage, postShareDetails, postShareLocation, postEndLocation
} from '../controllers/guideController.js';

const router = Router();

router.use(requireAuth, requireGuide);

router.get('/', getGuideDashboard);
router.get('/group/:id', viewGroupDetail);
router.post('/group/:id/milestone/:milestoneId/confirm', confirmMilestone);
router.post('/group/:id/message', sendMessageToGroup);
router.post('/group/:id/poll', createPoll);
router.post('/group/:id/poll/:pollId/close', closePollAction);
router.post('/group/:id/admin-message', postAdminMessage);
router.post('/group/:id/share', postShareDetails);
router.post('/group/:id/location/share', postShareLocation);
router.post('/group/:id/location/end', postEndLocation);

export default router;
