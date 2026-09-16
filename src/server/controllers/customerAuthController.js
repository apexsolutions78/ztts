import { findCustomerByEmail, createCustomer, findCustomerById, updateCustomer, getAllTourPackages, getTourBookingsByCustomerId, getAllFlightBookings, createFlightBooking, getAllCustomers, logAuditAction } from '../models/index.js';
import { hashPassword } from '../config/db.js';
import { sendEmail } from '../services/emailService.js';

export async function getRegister(req, res) {
  if (req.session?.customer) return res.redirect('/account');
  res.render('customer/register', { title: 'Create Account', error: null, form: {} });
}

export async function postRegister(req, res) {
  const { full_name, email, password, confirm_password, phone, nationality } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).render('customer/register', {
      title: 'Create Account',
      error: 'Name, email, and password are required.',
      form: req.body
    });
  }

  if (password !== confirm_password) {
    return res.status(400).render('customer/register', {
      title: 'Create Account',
      error: 'Passwords do not match.',
      form: req.body
    });
  }

  if (password.length < 6) {
    return res.status(400).render('customer/register', {
      title: 'Create Account',
      error: 'Password must be at least 6 characters.',
      form: req.body
    });
  }

  const existing = await findCustomerByEmail(email);
  if (existing) {
    return res.status(400).render('customer/register', {
      title: 'Create Account',
      error: 'An account with this email already exists.',
      form: req.body
    });
  }

  const customer = await createCustomer({
    full_name,
    email,
    password,
    phone: phone || null,
    nationality: nationality || null,
    passport_number: null
  });

  req.session.customer = {
    id: customer.id,
    name: customer.full_name,
    email: customer.email
  };

  return res.redirect('/account');
}

export async function getLogin(req, res) {
  if (req.session?.customer) return res.redirect('/account');
  res.render('customer/login', { title: 'Customer Login', error: null });
}

export async function postLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).render('customer/login', {
      title: 'Customer Login',
      error: 'Please enter both email and password.'
    });
  }

  const customer = await findCustomerByEmail(email);
  if (!customer || !customer.password_hash) {
    return res.status(401).render('customer/login', {
      title: 'Customer Login',
      error: 'Invalid credentials. Account not found.'
    });
  }

  const inputHash = hashPassword(password);
  if (customer.password_hash !== inputHash) {
    return res.status(401).render('customer/login', {
      title: 'Customer Login',
      error: 'Invalid credentials. Password incorrect.'
    });
  }

  req.session.customer = {
    id: customer.id,
    name: customer.full_name,
    email: customer.email
  };

  return res.redirect('/account');
}

export async function postLogout(req, res) {
  req.session.destroy(() => {
    res.redirect('/');
  });
}

export async function getDashboard(req, res, next) {
  try {
    const customer = await findCustomerById(req.session.customer.id);
    if (!customer) return res.redirect('/account/logout');

    const tourBookings = await getTourBookingsByCustomerId(customer.id);
    const allFlights = await getAllFlightBookings();
    const flightBookings = allFlights.filter(f => f.customer_id === customer.id);

    res.render('customer/dashboard', {
      title: 'My Account',
      customer,
      tourBookings,
      flightBookings,
      formatPrice: res.locals.formatPrice,
      activeCurrency: res.locals.activeCurrency
    });
  } catch (err) {
    next(err);
  }
}

export async function postUpdateProfile(req, res, next) {
  try {
    const { full_name, phone, nationality, passport_number } = req.body;
    const customer = await findCustomerById(req.session.customer.id);
    if (!customer) return res.redirect('/account/logout');

    await updateCustomer(customer.id, {
      full_name: full_name || customer.full_name,
      passport_number: passport_number || customer.passport_number,
      nationality: nationality || customer.nationality,
      email: customer.email,
      phone: phone || customer.phone
    });

    req.session.customer.name = full_name || customer.full_name;
    res.redirect('/account');
  } catch (err) {
    next(err);
  }
}

export async function getBrowseTours(req, res, next) {
  try {
    const packages = await getAllTourPackages();
    const activePackages = packages.filter(p => p.status === 'active');

    res.render('customer/tours', {
      title: 'Tour Packages',
      packages: activePackages,
      formatPrice: res.locals.formatPrice,
      activeCurrency: res.locals.activeCurrency
    });
  } catch (err) {
    next(err);
  }
}

export async function getTourDetail(req, res, next) {
  try {
    const packages = await getAllTourPackages();
    const tour = packages.find(p => p.id === Number(req.params.id));
    if (!tour) return res.status(404).render('errors/404', { title: 'Tour Not Found' });

    res.render('customer/tour-detail', {
      title: tour.title,
      tour,
      formatPrice: res.locals.formatPrice,
      activeCurrency: res.locals.activeCurrency
    });
  } catch (err) {
    next(err);
  }
}

export async function getFlightRequest(req, res, next) {
  try {
    res.render('customer/flight-request', {
      title: 'Request Flight Booking',
      error: null,
      form: {},
      formatPrice: res.locals.formatPrice,
      activeCurrency: res.locals.activeCurrency
    });
  } catch (err) {
    next(err);
  }
}

export async function getFlightRequestSuccess(req, res, next) {
  try {
    res.render('customer/flight-request-success', {
      title: 'Flight Request Submitted',
      formatPrice: res.locals.formatPrice,
      activeCurrency: res.locals.activeCurrency
    });
  } catch (err) {
    next(err);
  }
}

export async function postFlightRequest(req, res, next) {
  try {
    const { origin, destination, departure_date, return_date, cabin_class, passengers, notes } = req.body;

    if (!origin || !destination || !departure_date) {
      return res.status(400).render('customer/flight-request', {
        title: 'Request Flight Booking',
        error: 'Origin, destination, and departure date are required.',
        form: req.body,
        formatPrice: res.locals.formatPrice,
        activeCurrency: res.locals.activeCurrency
      });
    }

    const customer = await findCustomerById(req.session.customer.id);
    const booking = await createFlightBooking({
      customer_id: customer.id,
      airline: 'Pending Assignment',
      flight_number: 'PENDING',
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departure_date,
      arrival_date: return_date || null,
      cabin_class: cabin_class || 'Economy',
      total_amount: 0,
      created_by: customer.id,
      ticket_status: 'pending',
      passengers: passengers || 1,
      notes: notes || null
    });

    await logAuditAction({
      user_id: customer.id,
      user_name: customer.full_name,
      action: 'FLIGHT_REQUEST',
      entity_type: 'flight',
      entity_id: booking.id,
      details: `Customer requested flight: ${origin.toUpperCase()} → ${destination.toUpperCase()} on ${departure_date} (${cabin_class || 'Economy'}, ${passengers || 1} pax)`
    });

    const adminEmail = process.env.ADMIN_EMAIL || 'info@zahabiatravel.com';
    try {
      await sendEmail({
        to: adminEmail,
        subject: `[Zahabia] New Flight Request - ${origin.toUpperCase()} → ${destination.toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
            <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #d4a843;">NEW FLIGHT REQUEST</h1>
            </div>
            <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
              <p>A new flight request has been submitted by a customer.</p>
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Customer</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${customer.full_name} (${customer.email})</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Route</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${origin.toUpperCase()} → ${destination.toUpperCase()}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Departure</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${departure_date}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Return</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${return_date || 'One-way'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Class</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${cabin_class || 'Economy'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Passengers</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${passengers || 1}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Preferred Airline</td><td style="padding: 8px;">${notes || 'Any'}</td></tr>
              </table>
              <p style="margin-top: 15px;"><a href="${process.env.APP_URL || 'https://ztts.apexsol.pk'}/admin/flights/${booking.id}" style="display: inline-block; background: #1a3a2a; color: #d4a843; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review Request in Admin</a></p>
            </div>
          </div>
        `,
        text: `New Flight Request\nCustomer: ${customer.full_name}\nRoute: ${origin.toUpperCase()} → ${destination.toUpperCase()}\nDeparture: ${departure_date}\nReturn: ${return_date || 'One-way'}\nClass: ${cabin_class || 'Economy'}\nPassengers: ${passengers || 1}\nPreferred Airline: ${notes || 'Any'}`
      });
    } catch (emailErr) {
      console.error('[Flight Request] Admin notification email failed:', emailErr.message);
    }

    res.redirect('/account/flights/request/success');
  } catch (err) {
    next(err);
  }
}
