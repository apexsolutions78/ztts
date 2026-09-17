import { Router } from 'express';
import { viewCustomerPortal, getMemberPortal, postAddMember, postDeleteMember, viewMemberPortal, postTransferLeadership } from '../controllers/portalController.js';
import { generateQRSvg } from '../services/qrService.js';

const router = Router();

router.get('/:token/qr', async (req, res) => {
  try {
    const url = `${req.protocol}://${req.get('host')}/t/${req.params.token}`;
    const svg = await generateQRSvg(url, { width: 180, margin: 1 });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  } catch (err) {
    res.status(500).send('<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><text x="10" y="90" font-size="12" fill="#e53e3e">QR Error</text></svg>');
  }
});

router.get('/member/:token', viewMemberPortal);
router.post('/:token/members/transfer-leader/:memberId', postTransferLeadership);
router.get('/:token/members', getMemberPortal);
router.post('/:token/members/add', postAddMember);
router.post('/:token/members/:memberId/delete', postDeleteMember);
router.get('/:token', viewCustomerPortal);

export default router;
