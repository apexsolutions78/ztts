import { pool, memoryStore, isUsingMySQL, hashPassword } from '../config/db.js';
import { randomBytes } from 'node:crypto';

// --- USER MODEL ---
export async function findUserByEmail(email) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }
  return memoryStore.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function findUserById(id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
  }
  return memoryStore.users.find(u => u.id === Number(id)) || null;
}

export async function getAllUsers() {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    return rows;
  }
  return memoryStore.users.map(({ password_hash, ...u }) => u);
}

export async function updateUser(id, { name, email, role, password }) {
  if (isUsingMySQL()) {
    if (password) {
      const password_hash = hashPassword(password);
      await pool.query('UPDATE users SET name=?, email=?, role=?, password_hash=? WHERE id=?', [name, email, role, password_hash, id]);
    } else {
      await pool.query('UPDATE users SET name=?, email=?, role=? WHERE id=?', [name, email, role, id]);
    }
    return true;
  }
  const u = memoryStore.users.find(u => u.id === Number(id));
  if (!u) return false;
  u.name = name;
  u.email = email;
  u.role = role;
  if (password) u.password_hash = hashPassword(password);
  return true;
}

export async function deleteUser(id) {
  if (isUsingMySQL()) {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return true;
  }
  const idx = memoryStore.users.findIndex(u => u.id === Number(id));
  if (idx === -1) return false;
  memoryStore.users.splice(idx, 1);
  return true;
}

export async function createUser({ name, email, password, role = 'agent' }) {
  const password_hash = hashPassword(password);
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, password_hash, role]
    );
    return { id: result.insertId, name, email, role };
  }
  const newUser = {
    id: memoryStore.users.length + 1,
    name,
    email,
    password_hash,
    role,
    created_at: new Date().toISOString()
  };
  memoryStore.users.push(newUser);
  return newUser;
}

// --- CUSTOMER MODEL ---
export async function getAllCustomers() {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    return rows;
  }
  return [...memoryStore.customers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function findCustomerById(id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
    return rows[0] || null;
  }
  return memoryStore.customers.find(c => c.id === Number(id)) || null;
}

export async function createCustomer({ full_name, passport_number, nationality, email, phone }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO customers (full_name, passport_number, nationality, email, phone) VALUES (?, ?, ?, ?, ?)',
      [full_name, passport_number, nationality, email, phone]
    );
    return { id: result.insertId, full_name, passport_number, nationality, email, phone };
  }
  const newCustomer = {
    id: memoryStore.customers.length + 1,
    full_name,
    passport_number,
    nationality,
    email,
    phone,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.customers.push(newCustomer);
  return newCustomer;
}

export async function updateCustomer(id, { full_name, passport_number, nationality, email, phone }) {
  if (isUsingMySQL()) {
    await pool.query(
      'UPDATE customers SET full_name=?, passport_number=?, nationality=?, email=?, phone=? WHERE id=?',
      [full_name, passport_number, nationality, email, phone, id]
    );
    return true;
  }
  const c = memoryStore.customers.find(c => c.id === Number(id));
  if (!c) return false;
  Object.assign(c, { full_name, passport_number, nationality, email, phone });
  return true;
}

export async function deleteCustomer(id) {
  if (isUsingMySQL()) {
    await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    return true;
  }
  const idx = memoryStore.customers.findIndex(c => c.id === Number(id));
  if (idx === -1) return false;
  memoryStore.customers.splice(idx, 1);
  return true;
}

// --- FLIGHT BOOKING MODEL ---
export async function getAllFlightBookings() {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(`
      SELECT fb.*, c.full_name AS customer_name, c.passport_number
      FROM flight_bookings fb
      LEFT JOIN customers c ON fb.customer_id = c.id
      ORDER BY fb.created_at DESC
    `);
    return rows;
  }
  return memoryStore.flight_bookings.map(fb => {
    const cust = memoryStore.customers.find(c => c.id === fb.customer_id);
    return {
      ...fb,
      customer_name: cust ? cust.full_name : fb.customer_name || 'Guest Passenger',
      passport_number: cust ? cust.passport_number : 'N/A'
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function findFlightBookingById(id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(`
      SELECT fb.*, c.full_name AS customer_name, c.passport_number, c.nationality, c.email AS customer_email, c.phone AS customer_phone
      FROM flight_bookings fb
      LEFT JOIN customers c ON fb.customer_id = c.id
      WHERE fb.id = ?
    `, [id]);
    return rows[0] || null;
  }
  const fb = memoryStore.flight_bookings.find(f => f.id === Number(id));
  if (!fb) return null;
  const cust = memoryStore.customers.find(c => c.id === fb.customer_id) || {};
  return {
    ...fb,
    customer_name: cust.full_name || fb.customer_name,
    passport_number: cust.passport_number,
    nationality: cust.nationality,
    customer_email: cust.email,
    customer_phone: cust.phone
  };
}

export async function createFlightBooking({
  customer_id, airline, flight_number, origin, destination,
  departure_date, arrival_date, cabin_class = 'Economy', total_amount = 0, created_by = 1
}) {
  const booking_ref = 'ZHB-' + Math.floor(1000 + Math.random() * 9000);
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      `INSERT INTO flight_bookings 
       (booking_ref, customer_id, airline, flight_number, origin, destination, departure_date, arrival_date, cabin_class, ticket_status, total_amount, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)`,
      [booking_ref, customer_id, airline, flight_number, origin, destination, departure_date, arrival_date, cabin_class, total_amount, created_by]
    );
    return { id: result.insertId, booking_ref };
  }
  const cust = memoryStore.customers.find(c => c.id === Number(customer_id));
  const newBooking = {
    id: memoryStore.flight_bookings.length + 1,
    booking_ref,
    customer_id: Number(customer_id),
    customer_name: cust ? cust.full_name : 'Customer',
    airline,
    flight_number,
    origin,
    destination,
    departure_date,
    arrival_date,
    cabin_class,
    ticket_status: 'confirmed',
    total_amount: Number(total_amount),
    created_by: Number(created_by),
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.flight_bookings.push(newBooking);
  return newBooking;
}

export async function updateFlightTicketStatus(id, ticket_status) {
  if (isUsingMySQL()) {
    await pool.query('UPDATE flight_bookings SET ticket_status = ? WHERE id = ?', [ticket_status, id]);
    return true;
  }
  const fb = memoryStore.flight_bookings.find(f => f.id === Number(id));
  if (fb) {
    fb.ticket_status = ticket_status;
    return true;
  }
  return false;
}

export async function updateFlightBooking(id, { customer_id, airline, flight_number, origin, destination, departure_date, arrival_date, cabin_class, total_amount }) {
  if (isUsingMySQL()) {
    await pool.query(
      `UPDATE flight_bookings SET customer_id=?, airline=?, flight_number=?, origin=?, destination=?, departure_date=?, arrival_date=?, cabin_class=?, total_amount=? WHERE id=?`,
      [customer_id, airline, flight_number, origin, destination, departure_date, arrival_date, cabin_class, total_amount, id]
    );
    return true;
  }
  const fb = memoryStore.flight_bookings.find(f => f.id === Number(id));
  if (!fb) return false;
  const cust = memoryStore.customers.find(c => c.id === Number(customer_id));
  Object.assign(fb, {
    customer_id: Number(customer_id),
    customer_name: cust ? cust.full_name : fb.customer_name,
    airline, flight_number,
    origin: origin.toUpperCase(),
    destination: destination.toUpperCase(),
    departure_date, arrival_date,
    cabin_class,
    total_amount: Number(total_amount)
  });
  return true;
}

export async function deleteFlightBooking(id) {
  if (isUsingMySQL()) {
    await pool.query('DELETE FROM flight_bookings WHERE id = ?', [id]);
    return true;
  }
  const idx = memoryStore.flight_bookings.findIndex(f => f.id === Number(id));
  if (idx === -1) return false;
  memoryStore.flight_bookings.splice(idx, 1);
  return true;
}

// --- TOUR PACKAGE MODEL ---
export async function getAllTourPackages() {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM tour_packages ORDER BY created_at DESC');
    return rows;
  }
  return [...memoryStore.tour_packages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function findTourPackageById(id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM tour_packages WHERE id = ?', [id]);
    return rows[0] || null;
  }
  return memoryStore.tour_packages.find(t => t.id === Number(id)) || null;
}

export async function createTourPackage({ title, destination, duration_days, price, description, image_url, status = 'active' }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO tour_packages (title, destination, duration_days, price, description, status, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, destination, duration_days, price, description, status, image_url]
    );
    return { id: result.insertId, title };
  }
  const newPkg = {
    id: memoryStore.tour_packages.length + 1,
    title,
    destination,
    duration_days: Number(duration_days),
    price: Number(price),
    description,
    status,
    image_url: image_url || '/static/img/default_tour.jpg',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.tour_packages.push(newPkg);
  return newPkg;
}

export async function updateTourPackage(id, { title, destination, duration_days, price, description, image_url, status }) {
  if (isUsingMySQL()) {
    await pool.query(
      'UPDATE tour_packages SET title=?, destination=?, duration_days=?, price=?, description=?, image_url=?, status=? WHERE id=?',
      [title, destination, duration_days, price, description, image_url, status, id]
    );
    return true;
  }
  const pkg = memoryStore.tour_packages.find(t => t.id === Number(id));
  if (!pkg) return false;
  Object.assign(pkg, {
    title, destination,
    duration_days: Number(duration_days),
    price: Number(price),
    description, image_url, status
  });
  return true;
}

export async function deleteTourPackage(id) {
  if (isUsingMySQL()) {
    await pool.query('DELETE FROM tour_packages WHERE id = ?', [id]);
    return true;
  }
  const idx = memoryStore.tour_packages.findIndex(t => t.id === Number(id));
  if (idx === -1) return false;
  memoryStore.tour_packages.splice(idx, 1);
  return true;
}

// --- TOUR BOOKINGS MODEL ---
export async function getAllTourBookings() {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(`
      SELECT tb.*, tp.title AS tour_title, c.full_name AS customer_name
      FROM tour_bookings tb
      JOIN tour_packages tp ON tb.tour_package_id = tp.id
      JOIN customers c ON tb.customer_id = c.id
      ORDER BY tb.created_at DESC
    `);
    return rows;
  }
  return memoryStore.tour_bookings.map(tb => {
    const pkg = memoryStore.tour_packages.find(p => p.id === tb.tour_package_id);
    const cust = memoryStore.customers.find(c => c.id === tb.customer_id);
    return {
      ...tb,
      tour_title: pkg ? pkg.title : tb.tour_title,
      customer_name: cust ? cust.full_name : tb.customer_name
    };
  });
}

export async function createTourBooking({ tour_package_id, customer_id, travel_date, total_travelers, total_amount }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO tour_bookings (tour_package_id, customer_id, travel_date, total_travelers, total_amount, status) VALUES (?, ?, ?, ?, ?, "confirmed")',
      [tour_package_id, customer_id, travel_date, total_travelers, total_amount]
    );
    return { id: result.insertId };
  }
  const pkg = memoryStore.tour_packages.find(p => p.id === Number(tour_package_id));
  const cust = memoryStore.customers.find(c => c.id === Number(customer_id));
  const newBooking = {
    id: memoryStore.tour_bookings.length + 1,
    tour_package_id: Number(tour_package_id),
    tour_title: pkg ? pkg.title : 'Tour Package',
    customer_id: Number(customer_id),
    customer_name: cust ? cust.full_name : 'Customer',
    travel_date,
    total_travelers: Number(total_travelers),
    total_amount: Number(total_amount),
    status: 'confirmed',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.tour_bookings.push(newBooking);
  return newBooking;
}

export async function cancelTourBooking(id) {
  if (isUsingMySQL()) {
    await pool.query('UPDATE tour_bookings SET status = "cancelled" WHERE id = ?', [id]);
    return true;
  }
  const tb = memoryStore.tour_bookings.find(t => t.id === Number(id));
  if (tb) { tb.status = 'cancelled'; return true; }
  return false;
}

export async function findTourBookingById(id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(`
      SELECT tb.*, tp.title AS tour_title, c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
      FROM tour_bookings tb
      JOIN tour_packages tp ON tb.tour_package_id = tp.id
      JOIN customers c ON tb.customer_id = c.id
      WHERE tb.id = ?
    `, [id]);
    return rows[0] || null;
  }
  const tb = memoryStore.tour_bookings.find(t => t.id === Number(id));
  if (!tb) return null;
  const pkg = memoryStore.tour_packages.find(p => p.id === tb.tour_package_id) || {};
  const cust = memoryStore.customers.find(c => c.id === tb.customer_id) || {};
  return { ...tb, tour_title: pkg.title || tb.tour_title, customer_name: cust.full_name || tb.customer_name, customer_email: cust.email, customer_phone: cust.phone };
}

export async function getTourBookingsByCustomerId(customerId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(`
      SELECT tb.*, tp.title AS tour_title
      FROM tour_bookings tb
      JOIN tour_packages tp ON tb.tour_package_id = tp.id
      WHERE tb.customer_id = ?
      ORDER BY tb.created_at DESC
    `, [customerId]);
    return rows;
  }
  return memoryStore.tour_bookings
    .filter(tb => tb.customer_id === Number(customerId))
    .map(tb => {
      const pkg = memoryStore.tour_packages.find(p => p.id === tb.tour_package_id);
      return { ...tb, tour_title: pkg ? pkg.title : tb.tour_title };
    });
}

// --- PORTAL TOKENS MODEL ---
export async function createPortalToken({ customer_id, flight_booking_id = null, tour_booking_id = null }) {
  const token = 'zhb_' + randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19); // 90 days

  if (isUsingMySQL()) {
    await pool.query(
      'INSERT INTO portal_tokens (token, customer_id, flight_booking_id, tour_booking_id, expires_at) VALUES (?, ?, ?, ?, ?)',
      [token, customer_id, flight_booking_id, tour_booking_id, expiresAt]
    );
    return token;
  }
  memoryStore.portal_tokens.push({
    id: memoryStore.portal_tokens.length + 1,
    token,
    customer_id: Number(customer_id),
    flight_booking_id: flight_booking_id ? Number(flight_booking_id) : null,
    tour_booking_id: tour_booking_id ? Number(tour_booking_id) : null,
    expires_at: expiresAt,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  });
  return token;
}

export async function findPortalToken(token) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM portal_tokens WHERE token = ?', [token]);
    return rows[0] || null;
  }
  return memoryStore.portal_tokens.find(t => t.token === token) || null;
}

export async function findPortalTokenByFlightBooking(flightBookingId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM portal_tokens WHERE flight_booking_id = ? ORDER BY id DESC LIMIT 1', [flightBookingId]);
    return rows[0] || null;
  }
  return memoryStore.portal_tokens.find(t => t.flight_booking_id === Number(flightBookingId)) || null;
}

// --- DASHBOARD METRICS MODEL ---
export async function getDashboardStats() {
  const flights = await getAllFlightBookings();
  const tours = await getAllTourPackages();
  const tourBookings = await getAllTourBookings();
  const customers = await getAllCustomers();

  const totalFlightRevenue = flights.reduce((sum, f) => sum + (Number(f.total_amount) || 0), 0);
  const totalTourRevenue = tourBookings.reduce((sum, t) => sum + (Number(t.total_amount) || 0), 0);
  const totalRevenue = totalFlightRevenue + totalTourRevenue;

  const ticketedFlightsCount = flights.filter(f => f.ticket_status === 'ticketed').length;
  const activeToursCount = tours.filter(t => t.status === 'active').length;

  return {
    totalRevenue,
    totalFlightRevenue,
    totalTourRevenue,
    flightBookingsCount: flights.length,
    ticketedFlightsCount,
    activeToursCount,
    customersCount: customers.length,
    recentFlights: flights.slice(0, 5),
    recentTourBookings: tourBookings.slice(0, 5)
  };
}

// --- AUDIT LOG MODEL ---
export async function logAuditAction({ user_id = 0, user_name = 'System', action, entity_type, entity_id, details, ip_address = '127.0.0.1' }) {
  if (isUsingMySQL()) {
    await pool.query(
      'INSERT INTO audit_logs (user_id, user_name, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, user_name, action, entity_type, entity_id, details, ip_address]
    );
    return;
  }
  memoryStore.audit_logs.unshift({
    id: memoryStore.audit_logs.length + 1,
    user_id: Number(user_id),
    user_name,
    action,
    entity_type,
    entity_id: String(entity_id),
    details,
    ip_address,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  });
}

export async function getAuditLogs(limit = 50) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
    return rows;
  }
  return memoryStore.audit_logs.slice(0, limit);
}

// --- FINANCIAL LEDGER & INVOICE MODEL ---
export async function getFinancialLedger() {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(`
      SELECT p.*,
        c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.passport_number,
        CASE
          WHEN p.booking_type = 'flight' THEN fb.airline
          WHEN p.booking_type = 'tour' THEN tp.title
        END AS booking_title,
        CASE
          WHEN p.booking_type = 'flight' THEN CONCAT(fb.origin, ' → ', fb.destination)
          WHEN p.booking_type = 'tour' THEN tp.destination
        END AS booking_route,
        CASE
          WHEN p.booking_type = 'flight' THEN fb.total_amount
          WHEN p.booking_type = 'tour' THEN tb.total_amount
        END AS booking_total,
        CASE
          WHEN p.booking_type = 'flight' THEN fb.booking_ref
          ELSE NULL
        END AS booking_ref,
        CASE
          WHEN p.booking_type = 'flight' THEN fb.departure_date
          WHEN p.booking_type = 'tour' THEN tb.travel_date
        END AS travel_date
      FROM payments p
      LEFT JOIN customers c ON (
        (p.booking_type = 'flight' AND p.booking_id IN (SELECT id FROM flight_bookings WHERE customer_id = c.id))
        OR (p.booking_type = 'tour' AND p.booking_id IN (SELECT id FROM tour_bookings WHERE customer_id = c.id))
      )
      LEFT JOIN flight_bookings fb ON p.booking_type = 'flight' AND p.booking_id = fb.id
      LEFT JOIN tour_bookings tb ON p.booking_type = 'tour' AND p.booking_id = tb.id
      LEFT JOIN tour_packages tp ON tb.tour_package_id = tp.id
      ORDER BY p.created_at DESC
    `);
    return rows;
  }
  return memoryStore.payments;
}

export async function createInvoiceForBooking({ booking_type, booking_id, amount, base_fare, tax_amount, agency_fee, payment_method = 'credit_card', transaction_id }) {
  const invoice_no = 'INV-2026-' + Math.floor(1000 + Math.random() * 9000);
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      `INSERT INTO payments (invoice_no, booking_type, booking_id, amount, base_fare, tax_amount, agency_fee, payment_method, payment_status, transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
      [invoice_no, booking_type, booking_id, amount, base_fare, tax_amount, agency_fee, payment_method, transaction_id || ('TXN-' + Math.floor(1000000 + Math.random() * 9000000))]
    );
    return { id: result.insertId, invoice_no };
  }
  const newInvoice = {
    id: memoryStore.payments.length + 1,
    invoice_no,
    booking_type,
    booking_id: Number(booking_id),
    amount: Number(amount),
    base_fare: Number(base_fare || amount * 0.88),
    tax_amount: Number(tax_amount || amount * 0.08),
    agency_fee: Number(agency_fee || amount * 0.04),
    payment_method,
    payment_status: 'paid',
    transaction_id: transaction_id || ('TXN-' + Math.floor(1000000 + Math.random() * 9000000)),
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.payments.unshift(newInvoice);
  return newInvoice;
}

// --- SPLIT PAYMENT MODEL ---
export async function getPaymentsByBooking(booking_type, booking_id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM payments WHERE booking_type = ? AND booking_id = ? ORDER BY created_at ASC',
      [booking_type, booking_id]
    );
    return rows;
  }
  return memoryStore.payments.filter(p => p.booking_type === booking_type && p.booking_id === Number(booking_id));
}

export async function getBookingTotalAmount(booking_type, booking_id) {
  if (isUsingMySQL()) {
    const table = booking_type === 'flight' ? 'flight_bookings' : 'tour_bookings';
    const [rows] = await pool.query(`SELECT total_amount FROM ${table} WHERE id = ?`, [booking_id]);
    return rows[0] ? Number(rows[0].total_amount) : 0;
  }
  if (booking_type === 'flight') {
    const fb = memoryStore.flight_bookings.find(f => f.id === Number(booking_id));
    return fb ? Number(fb.total_amount) : 0;
  }
  const tb = memoryStore.tour_bookings.find(t => t.id === Number(booking_id));
  return tb ? Number(tb.total_amount) : 0;
}

export async function getBookingPaymentSummary(booking_type, booking_id) {
  const payments = await getPaymentsByBooking(booking_type, booking_id);
  const totalAmount = await getBookingTotalAmount(booking_type, booking_id);
  const totalPaid = payments
    .filter(p => p.payment_status === 'paid' || p.payment_status === 'partial')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingAmount = payments
    .filter(p => p.payment_status === 'pending')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balance = totalAmount - totalPaid;
  return {
    totalAmount,
    totalPaid,
    pendingAmount,
    balance: Math.max(0, balance),
    isFullyPaid: balance <= 0,
    paymentCount: payments.length,
    payments
  };
}

export async function getCustomerLedger(customerId) {
  if (isUsingMySQL()) {
    const [customer] = await pool.query('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!customer[0]) return null;
    const cust = customer[0];

    const [flights] = await pool.query(`
      SELECT fb.*, 'flight' AS type, fb.total_amount AS booking_total,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE booking_type = 'flight' AND booking_id = fb.id AND payment_status = 'paid') AS total_paid
      FROM flight_bookings fb WHERE fb.customer_id = ?
      ORDER BY fb.created_at DESC
    `, [customerId]);

    const [tours] = await pool.query(`
      SELECT tb.*, 'tour' AS type, tp.title AS tour_title, tb.total_amount AS booking_total,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE booking_type = 'tour' AND booking_id = tb.id AND payment_status = 'paid') AS total_paid
      FROM tour_bookings tb
      JOIN tour_packages tp ON tb.tour_package_id = tp.id
      WHERE tb.customer_id = ?
      ORDER BY tb.created_at DESC
    `, [customerId]);

    const [payments] = await pool.query(`
      SELECT p.*, 
        CASE WHEN p.booking_type = 'flight' THEN fb.booking_ref ELSE tp.title END AS ref_name
      FROM payments p
      LEFT JOIN flight_bookings fb ON p.booking_type = 'flight' AND p.booking_id = fb.id
      LEFT JOIN tour_bookings tb ON p.booking_type = 'tour' AND p.booking_id = tb.id
      LEFT JOIN tour_packages tp ON tb.tour_package_id = tp.id
      WHERE (p.booking_type = 'flight' AND p.booking_id IN (SELECT id FROM flight_bookings WHERE customer_id = ?))
         OR (p.booking_type = 'tour' AND p.booking_id IN (SELECT id FROM tour_bookings WHERE customer_id = ?))
      ORDER BY p.created_at DESC
    `, [customerId, customerId]);

    const allBookings = [...flights.map(f => ({ ...f, type: 'flight', ref: f.booking_ref })), ...tours.map(t => ({ ...t, type: 'tour', ref: t.tour_title }))];
    allBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const totalBookingValue = allBookings.reduce((s, b) => s + Number(b.booking_total || 0), 0);
    const totalPaid = payments.filter(p => p.payment_status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0);

    return { customer: cust, bookings: allBookings, payments, totalBookingValue, totalPaid, balance: totalBookingValue - totalPaid };
  }
  return null;
}

export async function addPayment({ booking_type, booking_id, amount, payment_method, payment_reference, notes, recorded_by }) {
  const invoice_no = 'INV-2026-' + Math.floor(1000 + Math.random() * 9000);
  const transaction_id = 'TXN-' + Math.floor(1000000 + Math.random() * 9000000);
  const amt = Number(amount);
  const base_fare = (amt * 0.88).toFixed(2);
  const tax_amount = (amt * 0.08).toFixed(2);
  const agency_fee = (amt * 0.04).toFixed(2);

  if (isUsingMySQL()) {
    const [result] = await pool.query(
      `INSERT INTO payments (invoice_no, booking_type, booking_id, amount, base_fare, tax_amount, agency_fee, payment_method, payment_reference, notes, payment_status, transaction_id, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
      [invoice_no, booking_type, booking_id, amt, base_fare, tax_amount, agency_fee, payment_method || 'cash', payment_reference || null, notes || null, transaction_id, recorded_by || null]
    );
    return { id: result.insertId, invoice_no, transaction_id };
  }
  const newPayment = {
    id: memoryStore.payments.length + 1,
    invoice_no,
    booking_type,
    booking_id: Number(booking_id),
    amount: Number(amount),
    payment_method: payment_method || 'cash',
    payment_reference: payment_reference || null,
    notes: notes || null,
    payment_status: 'paid',
    transaction_id,
    recorded_by: recorded_by || null,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.payments.unshift(newPayment);
  return newPayment;
}

export async function updatePayment(id, { amount, payment_method, payment_reference, notes, payment_status }) {
  if (isUsingMySQL()) {
    const fields = [];
    const values = [];
    if (amount !== undefined) { fields.push('amount = ?'); values.push(amount); }
    if (payment_method !== undefined) { fields.push('payment_method = ?'); values.push(payment_method); }
    if (payment_reference !== undefined) { fields.push('payment_reference = ?'); values.push(payment_reference); }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
    if (payment_status !== undefined) { fields.push('payment_status = ?'); values.push(payment_status); }
    if (fields.length === 0) return null;
    values.push(id);
    await pool.query(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`, values);
    const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [id]);
    return rows[0] || null;
  }
  const idx = memoryStore.payments.findIndex(p => p.id === Number(id));
  if (idx === -1) return null;
  if (amount !== undefined) memoryStore.payments[idx].amount = Number(amount);
  if (payment_method !== undefined) memoryStore.payments[idx].payment_method = payment_method;
  if (payment_reference !== undefined) memoryStore.payments[idx].payment_reference = payment_reference;
  if (notes !== undefined) memoryStore.payments[idx].notes = notes;
  if (payment_status !== undefined) memoryStore.payments[idx].payment_status = payment_status;
  return memoryStore.payments[idx];
}

export async function deletePayment(id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [id]);
    await pool.query('DELETE FROM payments WHERE id = ?', [id]);
    return rows[0] || null;
  }
  const idx = memoryStore.payments.findIndex(p => p.id === Number(id));
  if (idx === -1) return null;
  const [removed] = memoryStore.payments.splice(idx, 1);
  return removed;
}

// --- LIVE FLIGHT STATUS ENGINE ---
export function getFlightLiveStatus(flight) {
  if (!flight) return { status: 'UNKNOWN', statusClass: 'muted', gate: 'TBA', terminal: '1' };
  
  // Real-time status simulation engine based on ticket status and departure
  const now = new Date();
  const dep = new Date(flight.departure_date);
  const diffHours = (dep - now) / (1000 * 60 * 60);

  if (flight.ticket_status === 'cancelled') {
    return { status: 'CANCELLED', statusClass: 'cancelled', gate: 'N/A', terminal: 'N/A', baggage: 'N/A' };
  }
  if (diffHours < 0 && diffHours > -12) {
    return { status: 'IN-AIR / EN ROUTE', statusClass: 'active', gate: 'G14', terminal: '3', baggage: 'B04' };
  }
  if (diffHours <= -12) {
    return { status: 'LANDED / COMPLETED', statusClass: 'ticketed', gate: 'A08', terminal: '3', baggage: 'B08' };
  }
  if (diffHours <= 2) {
    return { status: 'FINAL BOARDING', statusClass: 'active', gate: 'B12', terminal: '3', baggage: 'TBA' };
  }
  if (diffHours <= 5) {
    return { status: 'CHECK-IN OPEN', statusClass: 'active', gate: 'C05', terminal: '2', baggage: 'TBA' };
  }
  return { status: 'ON TIME / SCHEDULED', statusClass: 'ticketed', gate: 'TBA', terminal: '3', baggage: 'TBA' };
}

// --- ADVANCED SEARCH & CSV EXPORT HELPERS ---
export async function searchFlights({ pnr, status, airline, query }) {
  let flights = await getAllFlightBookings();
  if (pnr) {
    flights = flights.filter(f => f.booking_ref.toLowerCase().includes(pnr.toLowerCase()));
  }
  if (status) {
    flights = flights.filter(f => f.ticket_status === status);
  }
  if (airline) {
    flights = flights.filter(f => f.airline.toLowerCase().includes(airline.toLowerCase()));
  }
  if (query) {
    const q = query.toLowerCase();
    flights = flights.filter(f => 
      f.booking_ref.toLowerCase().includes(q) ||
      f.customer_name.toLowerCase().includes(q) ||
      f.airline.toLowerCase().includes(q) ||
      f.origin.toLowerCase().includes(q) ||
      f.destination.toLowerCase().includes(q)
    );
  }
  return flights;
}

export function generateCSV(headers, rows) {
  const headerRow = headers.join(',') + '\n';
  const dataRows = rows.map(r => r.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  return headerRow + dataRows;
}

// --- EXCHANGE RATES & CURRENCY FORMATTING ---
export async function getExchangeRates() {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM exchange_rates');
    const result = {};
    for (const r of rows) {
      result[r.currency_code] = {
        symbol: r.currency_symbol,
        name: r.currency_name,
        rate: Number(r.rate_to_usd)
      };
    }
    return result;
  }
  return memoryStore.exchange_rates;
}

export async function updateExchangeRate(currency_code, rate) {
  const numRate = Number(rate);
  if (isNaN(numRate) || numRate <= 0) return false;

  if (isUsingMySQL()) {
    await pool.query('UPDATE exchange_rates SET rate_to_usd = ? WHERE currency_code = ?', [numRate, currency_code]);
    return true;
  }
  if (memoryStore.exchange_rates[currency_code]) {
    memoryStore.exchange_rates[currency_code].rate = numRate;
    return true;
  }
  return false;
}

export function formatPrice(amountInUSD, currencyCode = 'USD', ratesStore = null) {
  const amount = Number(amountInUSD) || 0;
  const rates = ratesStore || memoryStore.exchange_rates;
  const curr = rates[currencyCode] || rates['USD'] || { symbol: '$', rate: 1.0 };
  const converted = amount * curr.rate;

  // Format integer or decimal based on currency
  const decimals = (currencyCode === 'PKR' || currencyCode === 'JPY') ? 0 : 2;
  const formattedVal = converted.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return `${curr.symbol}${formattedVal}`;
}

// --- NOTIFICATION LOGS MODEL ---
export async function logNotificationRecord({ customer_id, flight_booking_id = null, channel, recipient, subject = '', content, status = 'delivered' }) {
  if (isUsingMySQL()) {
    await pool.query(
      'INSERT INTO notification_logs (customer_id, flight_booking_id, channel, recipient, subject, content, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customer_id, flight_booking_id, channel, recipient, subject, content, status]
    );
    return;
  }
  memoryStore.notification_logs.unshift({
    id: memoryStore.notification_logs.length + 1,
    customer_id: Number(customer_id),
    flight_booking_id: flight_booking_id ? Number(flight_booking_id) : null,
    channel,
    recipient,
    subject,
    content,
    status,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  });
}

export async function getNotificationsForBooking(flight_booking_id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM notification_logs WHERE flight_booking_id = ? ORDER BY created_at DESC', [flight_booking_id]);
    return rows;
  }
  return memoryStore.notification_logs.filter(n => n.flight_booking_id === Number(flight_booking_id));
}



