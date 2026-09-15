import { Router } from 'express';
import { listCustomers, postCreateCustomer, viewCustomerDetail, getEditCustomerForm, postUpdateCustomer, postDeleteCustomer } from '../controllers/customerController.js';

const router = Router();

router.get('/', listCustomers);
router.post('/new', postCreateCustomer);
router.get('/:id', viewCustomerDetail);
router.get('/:id/edit', getEditCustomerForm);
router.post('/:id/edit', postUpdateCustomer);
router.post('/:id/delete', postDeleteCustomer);

export default router;
