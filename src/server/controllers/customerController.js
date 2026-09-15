import { getAllCustomers, findCustomerById, createCustomer, updateCustomer, deleteCustomer, getAllFlightBookings, getTourBookingsByCustomerId, logAuditAction } from '../models/index.js';

export async function listCustomers(req, res, next) {
  try {
    let customers = await getAllCustomers();

    // Apply search filter
    const { search } = req.query;
    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter(c =>
        (c.full_name && c.full_name.toLowerCase().includes(q)) ||
        (c.passport_number && c.passport_number.toLowerCase().includes(q)) ||
        (c.nationality && c.nationality.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
      );
    }

    res.render('admin/customers/index', {
      title: 'Customer Directory & CRM',
      customers,
      filters: { search }
    });
  } catch (error) {
    next(error);
  }
}

export async function postCreateCustomer(req, res, next) {
  try {
    const { full_name, passport_number, nationality, email, phone } = req.body;
    if (!full_name) {
      const customers = await getAllCustomers();
      return res.status(400).render('admin/customers/index', {
        title: 'Customer Directory & CRM',
        customers,
        error: 'Customer full name is required.'
      });
    }

    const customer = await createCustomer({ full_name, passport_number, nationality, email, phone });

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'CREATE_CUSTOMER',
      entity_type: 'customer',
      entity_id: customer.id,
      details: `Created customer profile: ${full_name}`
    });

    res.redirect(`/admin/customers/${customer.id}`);
  } catch (error) {
    next(error);
  }
}

export async function viewCustomerDetail(req, res, next) {
  try {
    const customer = await findCustomerById(req.params.id);
    if (!customer) return res.status(404).render('errors/404', { title: 'Customer Not Found' });

    const allFlights = await getAllFlightBookings();
    const customerFlights = allFlights.filter(f => f.customer_id === customer.id);
    const tourBookings = await getTourBookingsByCustomerId(customer.id);

    res.render('admin/customers/show', {
      title: `Customer: ${customer.full_name}`,
      customer,
      flights: customerFlights,
      tourBookings
    });
  } catch (error) {
    next(error);
  }
}

export async function getEditCustomerForm(req, res, next) {
  try {
    const customer = await findCustomerById(req.params.id);
    if (!customer) return res.status(404).render('errors/404', { title: 'Customer Not Found' });
    res.render('admin/customers/edit', {
      title: `Edit Customer: ${customer.full_name}`,
      customer
    });
  } catch (error) {
    next(error);
  }
}

export async function postUpdateCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, passport_number, nationality, email, phone } = req.body;
    if (!full_name) {
      const customer = await findCustomerById(id);
      return res.status(400).render('admin/customers/edit', {
        title: `Edit Customer: ${customer?.full_name}`,
        customer: { ...customer, ...req.body, id },
        error: 'Customer full name is required.'
      });
    }

    await updateCustomer(id, { full_name, passport_number, nationality, email, phone });

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'UPDATE_CUSTOMER',
      entity_type: 'customer',
      entity_id: id,
      details: `Updated customer profile: ${full_name}`
    });

    res.redirect(`/admin/customers/${id}?success=Updated`);
  } catch (error) {
    next(error);
  }
}

export async function postDeleteCustomer(req, res, next) {
  try {
    const { id } = req.params;
    const customer = await findCustomerById(id);
    await deleteCustomer(id);

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'DELETE_CUSTOMER',
      entity_type: 'customer',
      entity_id: id,
      details: `Deleted customer profile: ${customer ? customer.full_name : id}`
    });

    res.redirect('/admin/customers?deleted=true');
  } catch (error) {
    next(error);
  }
}
