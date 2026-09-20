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
export async function findCustomerByEmail(email) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM customers WHERE email = ?', [email]);
    return rows[0] || null;
  }
  return memoryStore.customers.find(c => c.email && c.email.toLowerCase() === email.toLowerCase()) || null;
}

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

export async function createCustomer({ full_name, passport_number, nationality, email, phone, password }) {
  const password_hash = password ? hashPassword(password) : null;
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO customers (full_name, passport_number, nationality, email, phone, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [full_name, passport_number, nationality, email, phone, password_hash]
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
    password_hash,
    is_guest: 0,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.customers.push(newCustomer);
  return newCustomer;
}

export async function createGuestCustomer({ full_name, email, phone }) {
  if (isUsingMySQL()) {
    const [existing] = await pool.query('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing[0]) return existing[0];
    const [result] = await pool.query(
      'INSERT INTO customers (full_name, email, phone, is_guest) VALUES (?, ?, ?, 1)',
      [full_name, email, phone || null]
    );
    return { id: result.insertId, full_name, email, phone, is_guest: 1 };
  }
  const existing = memoryStore.customers.find(c => c.email && c.email.toLowerCase() === email.toLowerCase());
  if (existing) return existing;
  const newCustomer = {
    id: memoryStore.customers.length + 1,
    full_name, email, phone: phone || null,
    password_hash: null, is_guest: 1,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.customers.push(newCustomer);
  return newCustomer;
}

export async function upgradeGuestToRegistered(customerId, passwordHash) {
  if (isUsingMySQL()) {
    await pool.query('UPDATE customers SET password_hash = ?, is_guest = 0 WHERE id = ?', [passwordHash, customerId]);
    return true;
  }
  const c = memoryStore.customers.find(c => c.id === Number(customerId));
  if (c) { c.password_hash = passwordHash; c.is_guest = 0; return true; }
  return false;
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
    // Delete associated records first (payments -> bookings -> customer)
    const [flightBookings] = await pool.query('SELECT id FROM flight_bookings WHERE customer_id = ?', [id]);
    for (const fb of flightBookings) {
      await pool.query('DELETE FROM payments WHERE booking_type = ? AND booking_id = ?', ['flight', fb.id]);
    }
    await pool.query('DELETE FROM flight_bookings WHERE customer_id = ?', [id]);

    const [tourBookings] = await pool.query('SELECT id FROM tour_bookings WHERE customer_id = ?', [id]);
    for (const tb of tourBookings) {
      await pool.query('DELETE FROM payments WHERE booking_type = ? AND booking_id = ?', ['tour', tb.id]);
    }
    await pool.query('DELETE FROM tour_bookings WHERE customer_id = ?', [id]);

    await pool.query('DELETE FROM customers WHERE id = ?', [id]);
    return true;
  }
  const idx = memoryStore.customers.findIndex(c => c.id === Number(id));
  if (idx === -1) return false;
  const cid = Number(id);
  memoryStore.payments = memoryStore.payments.filter(p => {
    if (p.booking_type === 'flight') {
      const fb = memoryStore.flight_bookings.find(f => f.id === p.booking_id && f.customer_id === cid);
      return !fb;
    }
    if (p.booking_type === 'tour') {
      const tb = memoryStore.tour_bookings.find(b => b.id === p.booking_id && b.customer_id === cid);
      return !tb;
    }
    return true;
  });
  memoryStore.flight_bookings = memoryStore.flight_bookings.filter(f => f.customer_id !== cid);
  memoryStore.tour_bookings = memoryStore.tour_bookings.filter(b => b.customer_id !== cid);
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
      SELECT fb.*, c.full_name AS customer_name, c.passport_number, c.nationality, c.email AS customer_email, c.phone AS customer_phone, c.is_guest AS customer_is_guest
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
  departure_date, arrival_date, cabin_class = 'Economy', total_amount = 0, created_by = 1,
  ticket_status = 'pending', passengers = null, notes = null,
  trip_type = 'one_way', adults = 1, children = 0, infants = 0, return_date = null,
  preferred_airline = null, flexible_dates = false, budget = null,
  baggage_priority = false, direct_transit = 'any', customer_notes = null,
  workflow_stage = 'inquiry',
  price_per_adult = 0, price_per_child = 0, price_per_infant = 0, baggage_fee = 0
}) {
  const booking_ref = 'ZHB-' + Math.floor(1000 + Math.random() * 9000);
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      `INSERT INTO flight_bookings 
       (booking_ref, customer_id, airline, flight_number, origin, destination,
        departure_date, arrival_date, cabin_class, ticket_status, total_amount, created_by,
        passengers, workflow_stage, trip_type, adults, children, infants, return_date,
        preferred_airline, flexible_dates, budget, baggage_priority, direct_transit, customer_notes,
        price_per_adult, price_per_child, price_per_infant, baggage_fee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [booking_ref, customer_id || null, airline || null, flight_number || null, origin, destination,
       departure_date, arrival_date || null, cabin_class, ticket_status, total_amount, created_by,
       passengers ? Number(passengers) : null, workflow_stage, trip_type,
       adults, children, infants, return_date || null,
       preferred_airline || null, flexible_dates ? 1 : 0, budget || null,
       baggage_priority ? 1 : 0, direct_transit, customer_notes || notes || null,
       price_per_adult || 0, price_per_child || 0, price_per_infant || 0, baggage_fee || 0]
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
    ticket_status,
    total_amount: Number(total_amount),
    created_by: Number(created_by),
    passengers: passengers ? Number(passengers) : null,
    notes: notes || null,
    price_per_adult: Number(price_per_adult) || 0,
    price_per_child: Number(price_per_child) || 0,
    price_per_infant: Number(price_per_infant) || 0,
    baggage_fee: Number(baggage_fee) || 0,
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

export async function savePassengerDetails(flightBookingId, passengers) {
  const json = JSON.stringify(passengers);
  if (isUsingMySQL()) {
    await pool.query('UPDATE flight_bookings SET passenger_details = ? WHERE id = ?', [json, flightBookingId]);
    return true;
  }
  const fb = memoryStore.flight_bookings.find(f => f.id === Number(flightBookingId));
  if (fb) {
    fb.passenger_details = json;
    return true;
  }
  return false;
}

export async function savePaymentProof(flightBookingId, proofPath) {
  if (isUsingMySQL()) {
    await pool.query('UPDATE flight_bookings SET payment_proof = ?, payment_proof_uploaded_at = NOW() WHERE id = ?', [proofPath, flightBookingId]);
    return true;
  }
  const fb = memoryStore.flight_bookings.find(f => f.id === Number(flightBookingId));
  if (fb) {
    fb.payment_proof = proofPath;
    fb.payment_proof_uploaded_at = new Date().toISOString();
    return true;
  }
  return false;
}

export async function updateFlightBooking(id, {
  customer_id, airline, flight_number, origin, destination, departure_date, arrival_date, cabin_class, total_amount,
  trip_type, adults, children, infants, return_date, preferred_airline, flexible_dates, budget,
  baggage_priority, direct_transit, customer_notes, pnr, ticket_number,
  reservation_date, ticketing_deadline, fare_change_reason,
  price_per_adult, price_per_child, price_per_infant, baggage_fee
}) {
  if (isUsingMySQL()) {
    await pool.query(
      `UPDATE flight_bookings SET
        customer_id=?, airline=?, flight_number=?, origin=?, destination=?,
        departure_date=?, arrival_date=?, cabin_class=?, total_amount=?,
        trip_type=?, adults=?, children=?, infants=?, return_date=?,
        preferred_airline=?, flexible_dates=?, budget=?,
        baggage_priority=?, direct_transit=?, customer_notes=?, pnr=?,
        ticket_number=?, reservation_date=?, ticketing_deadline=?, fare_change_reason=?,
        price_per_adult=?, price_per_child=?, price_per_infant=?, baggage_fee=?
       WHERE id=?`,
      [
        customer_id || null, airline || null, flight_number || null,
        origin ? origin.toUpperCase() : null, destination ? destination.toUpperCase() : null,
        departure_date, arrival_date || null, cabin_class, total_amount || 0,
        trip_type || 'one_way', adults || 1, children || 0, infants || 0, return_date || null,
        preferred_airline || null, flexible_dates ? 1 : 0, budget || null,
        baggage_priority ? 1 : 0, direct_transit || 'any', customer_notes || null, pnr || null,
        ticket_number || null, reservation_date || null, ticketing_deadline || null, fare_change_reason || null,
        price_per_adult || 0, price_per_child || 0, price_per_infant || 0, baggage_fee || 0,
        id
      ]
    );
    return true;
  }
  const fb = memoryStore.flight_bookings.find(f => f.id === Number(id));
  if (!fb) return false;
  const cust = memoryStore.customers.find(c => c.id === Number(customer_id));
  Object.assign(fb, {
    customer_id: customer_id ? Number(customer_id) : null,
    customer_name: cust ? cust.full_name : fb.customer_name,
    airline: airline || null, flight_number: flight_number || null,
    origin: origin ? origin.toUpperCase() : fb.origin,
    destination: destination ? destination.toUpperCase() : fb.destination,
    departure_date, arrival_date: arrival_date || null,
    cabin_class, total_amount: Number(total_amount) || 0,
    trip_type: trip_type || 'one_way', adults: Number(adults) || 1,
    children: Number(children) || 0, infants: Number(infants) || 0,
    return_date: return_date || null, preferred_airline: preferred_airline || null,
    flexible_dates: !!flexible_dates, budget: budget ? Number(budget) : null,
    baggage_priority: !!baggage_priority, direct_transit: direct_transit || 'any',
    customer_notes: customer_notes || null, pnr: pnr || null,
    ticket_number: ticket_number || null, reservation_date: reservation_date || null,
    ticketing_deadline: ticketing_deadline || null, fare_change_reason: fare_change_reason || null,
    price_per_adult: Number(price_per_adult) || 0,
    price_per_child: Number(price_per_child) || 0,
    price_per_infant: Number(price_per_infant) || 0,
    baggage_fee: Number(baggage_fee) || 0
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

export async function linkOrphanedFlightsToCustomer(customerId, email) {
  if (isUsingMySQL()) {
    try {
      const [result] = await pool.query(
        "UPDATE flight_bookings SET customer_id = ? WHERE customer_id IS NULL AND (customer_notes LIKE ? OR customer_id IS NULL)",
        [customerId, `%${email}%`]
      );
      return result.affectedRows;
    } catch (err) {
      console.warn('[FlightLink] Orphan linking skipped:', err.message);
      return 0;
    }
  }
  let linked = 0;
  memoryStore.flight_bookings.forEach(f => {
    if (f.customer_id === null && f.customer_notes && f.customer_notes.includes(email)) {
      f.customer_id = Number(customerId);
      linked++;
    }
  });
  return linked;
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

// --- TOUR DATE RANGES MODEL ---
export async function createDateRange({ tour_package_id, label, start_date, end_date, max_capacity = null }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO tour_date_ranges (tour_package_id, label, start_date, end_date, max_capacity) VALUES (?, ?, ?, ?, ?)',
      [tour_package_id, label, start_date, end_date, max_capacity]
    );
    return { id: result.insertId, label, start_date, end_date };
  }
  const newRange = {
    id: memoryStore.tour_date_ranges.length + 1,
    tour_package_id: Number(tour_package_id),
    label,
    start_date,
    end_date,
    max_capacity: max_capacity ? Number(max_capacity) : null,
    current_bookings: 0,
    status: 'open',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.tour_date_ranges.push(newRange);
  return newRange;
}

export async function getDateRangesByTourId(tourPackageId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM tour_date_ranges WHERE tour_package_id = ? ORDER BY start_date ASC',
      [tourPackageId]
    );
    return rows;
  }
  return memoryStore.tour_date_ranges
    .filter(r => r.tour_package_id === Number(tourPackageId))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
}

export async function getDateRangeById(id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM tour_date_ranges WHERE id = ?', [id]);
    return rows[0] || null;
  }
  return memoryStore.tour_date_ranges.find(r => r.id === Number(id)) || null;
}

export async function deleteDateRange(id) {
  if (isUsingMySQL()) {
    await pool.query('DELETE FROM tour_date_ranges WHERE id = ?', [id]);
    return true;
  }
  const idx = memoryStore.tour_date_ranges.findIndex(r => r.id === Number(id));
  if (idx === -1) return false;
  memoryStore.tour_date_ranges.splice(idx, 1);
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

export async function createTourBooking({ tour_package_id, customer_id, travel_date, total_travelers, total_amount, tour_date_range_id = null }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO tour_bookings (tour_package_id, tour_date_range_id, customer_id, travel_date, total_travelers, members_required, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, "pending")',
      [tour_package_id, tour_date_range_id, customer_id, travel_date, total_travelers, total_travelers, total_amount]
    );
    // Increment current_bookings on the date range
    if (tour_date_range_id) {
      await pool.query(
        'UPDATE tour_date_ranges SET current_bookings = current_bookings + ? WHERE id = ?',
        [Number(total_travelers), tour_date_range_id]
      );
    }
    return { id: result.insertId };
  }
  const pkg = memoryStore.tour_packages.find(p => p.id === Number(tour_package_id));
  const cust = memoryStore.customers.find(c => c.id === Number(customer_id));
  const newBooking = {
    id: memoryStore.tour_bookings.length + 1,
    tour_package_id: Number(tour_package_id),
    tour_date_range_id: tour_date_range_id ? Number(tour_date_range_id) : null,
    tour_title: pkg ? pkg.title : 'Tour Package',
    customer_id: Number(customer_id),
    customer_name: cust ? cust.full_name : 'Customer',
    travel_date,
    total_travelers: Number(total_travelers),
    members_added: 0,
    members_required: Number(total_travelers),
    total_amount: Number(total_amount),
    status: 'pending',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.tour_bookings.push(newBooking);
  // Increment current_bookings on the date range
  if (tour_date_range_id) {
    const dr = memoryStore.tour_date_ranges.find(r => r.id === Number(tour_date_range_id));
    if (dr) dr.current_bookings = (dr.current_bookings || 0) + Number(total_travelers);
  }
  return newBooking;
}

export async function updateTourBookingStatus(id, status) {
  if (isUsingMySQL()) {
    await pool.query('UPDATE tour_bookings SET status = ? WHERE id = ?', [status, id]);
    return true;
  }
  const tb = memoryStore.tour_bookings.find(t => t.id === Number(id));
  if (tb) tb.status = status;
  return true;
}

export async function cancelTourBooking(id) {
  if (isUsingMySQL()) {
    // Get booking details before cancelling
    const [rows] = await pool.query('SELECT tour_date_range_id, total_travelers FROM tour_bookings WHERE id = ?', [id]);
    const booking = rows[0];
    await pool.query('UPDATE tour_bookings SET status = "cancelled" WHERE id = ?', [id]);
    // Decrement current_bookings on the date range
    if (booking && booking.tour_date_range_id) {
      await pool.query(
        'UPDATE tour_date_ranges SET current_bookings = GREATEST(current_bookings - ?, 0) WHERE id = ?',
        [booking.total_travelers, booking.tour_date_range_id]
      );
    }
    return true;
  }
  const tb = memoryStore.tour_bookings.find(t => t.id === Number(id));
  if (tb) {
    tb.status = 'cancelled';
    // Decrement current_bookings on the date range
    if (tb.tour_date_range_id) {
      const dr = memoryStore.tour_date_ranges.find(r => r.id === tb.tour_date_range_id);
      if (dr) dr.current_bookings = Math.max((dr.current_bookings || 0) - (tb.total_travelers || 0), 0);
    }
    return true;
  }
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

// --- TOUR BOOKING MEMBERS MODEL ---
export async function createBookingMember({ tour_booking_id, full_name, passport_number = null, nationality = null, phone = null }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO tour_booking_members (tour_booking_id, full_name, passport_number, nationality, phone) VALUES (?, ?, ?, ?, ?)',
      [tour_booking_id, full_name, passport_number, nationality, phone]
    );
    // Increment members_added
    await pool.query('UPDATE tour_bookings SET members_added = members_added + 1 WHERE id = ?', [tour_booking_id]);
    return { id: result.insertId, full_name };
  }
  const newMember = {
    id: memoryStore.tour_booking_members.length + 1,
    tour_booking_id: Number(tour_booking_id),
    full_name,
    passport_number: passport_number || null,
    nationality: nationality || null,
    phone: phone || null,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.tour_booking_members.push(newMember);
  const booking = memoryStore.tour_bookings.find(b => b.id === Number(tour_booking_id));
  if (booking) booking.members_added = (booking.members_added || 0) + 1;
  return newMember;
}

export async function getMembersByBookingId(tourBookingId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM tour_booking_members WHERE tour_booking_id = ? ORDER BY id ASC',
      [tourBookingId]
    );
    return rows;
  }
  return memoryStore.tour_booking_members.filter(m => m.tour_booking_id === Number(tourBookingId));
}

export async function getMemberById(id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM tour_booking_members WHERE id = ?', [id]);
    return rows[0] || null;
  }
  return memoryStore.tour_booking_members.find(m => m.id === Number(id)) || null;
}

export async function deleteBookingMember(id) {
  if (isUsingMySQL()) {
    // Decrement members_added
    const [rows] = await pool.query('SELECT tour_booking_id FROM tour_booking_members WHERE id = ?', [id]);
    if (rows[0]) {
      await pool.query('UPDATE tour_bookings SET members_added = GREATEST(members_added - 1, 0) WHERE id = ?', [rows[0].tour_booking_id]);
    }
    await pool.query('DELETE FROM tour_booking_members WHERE id = ?', [id]);
    return true;
  }
  const idx = memoryStore.tour_booking_members.findIndex(m => m.id === Number(id));
  if (idx === -1) return false;
  const member = memoryStore.tour_booking_members[idx];
  memoryStore.tour_booking_members.splice(idx, 1);
  const booking = memoryStore.tour_bookings.find(b => b.id === member.tour_booking_id);
  if (booking) booking.members_added = Math.max((booking.members_added || 1) - 1, 0);
  return true;
}

export async function isBookingComplete(tourBookingId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT members_added, members_required FROM tour_bookings WHERE id = ?', [tourBookingId]);
    const b = rows[0];
    return b && b.members_added >= b.members_required;
  }
  const b = memoryStore.tour_bookings.find(b => b.id === Number(tourBookingId));
  return b && (b.members_added || 0) >= (b.members_required || 1);
}

// --- GROUP TOUR MODEL ---
export async function createGroupTour({ booking_id, title, assigned_guide_user_id = null, group_size_expected = null, start_at = null, end_at = null, welcome_message = null, emergency_instructions = null, created_by = 1 }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO group_tours (booking_id, title, assigned_guide_user_id, group_size_expected, start_at, end_at, welcome_message, emergency_instructions, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [booking_id, title, assigned_guide_user_id, group_size_expected, start_at, end_at, welcome_message, emergency_instructions, created_by]
    );
    return { id: result.insertId, title };
  }
  const newGroup = {
    id: memoryStore.group_tours.length + 1,
    booking_id: Number(booking_id),
    title,
    status: 'draft',
    assigned_guide_user_id: assigned_guide_user_id ? Number(assigned_guide_user_id) : null,
    group_size_expected: group_size_expected ? Number(group_size_expected) : null,
    start_at: start_at || null,
    end_at: end_at || null,
    welcome_message: welcome_message || null,
    emergency_instructions: emergency_instructions || null,
    created_by: Number(created_by),
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.group_tours.push(newGroup);
  return newGroup;
}

export async function getGroupTourById(id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(`
      SELECT gt.*,
        tb.tour_package_id, tb.travel_date, tb.total_travelers, tb.total_amount, tb.customer_id,
        tp.title AS tour_title, tp.destination AS tour_destination, tp.duration_days,
        u.name AS guide_name,
        c.full_name AS customer_name
      FROM group_tours gt
      JOIN tour_bookings tb ON gt.booking_id = tb.id
      JOIN tour_packages tp ON tb.tour_package_id = tp.id
      LEFT JOIN users u ON gt.assigned_guide_user_id = u.id
      LEFT JOIN customers c ON tb.customer_id = c.id
      WHERE gt.id = ?
    `, [id]);
    return rows[0] || null;
  }
  const gt = memoryStore.group_tours.find(g => g.id === Number(id));
  if (!gt) return null;
  const tb = memoryStore.tour_bookings.find(t => t.id === gt.booking_id) || {};
  const tp = memoryStore.tour_packages.find(p => p.id === tb.tour_package_id) || {};
  const guide = memoryStore.users.find(u => u.id === gt.assigned_guide_user_id) || {};
  const cust = memoryStore.customers.find(c => c.id === tb.customer_id) || {};
  return {
    ...gt,
    tour_package_id: tb.tour_package_id,
    travel_date: tb.travel_date,
    total_travelers: tb.total_travelers,
    total_amount: tb.total_amount,
    customer_id: tb.customer_id,
    tour_title: tp.title || tb.tour_title,
    tour_destination: tp.destination,
    duration_days: tp.duration_days,
    guide_name: guide.name || null,
    customer_name: cust.full_name || null
  };
}

export async function getGroupTourByBookingId(bookingId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM group_tours WHERE booking_id = ? ORDER BY id DESC LIMIT 1',
      [bookingId]
    );
    return rows[0] || null;
  }
  return memoryStore.group_tours.find(g => g.booking_id === Number(bookingId)) || null;
}

export async function getAllGroupTours() {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(`
      SELECT gt.*,
        tb.tour_package_id, tb.travel_date, tb.total_travelers, tb.total_amount,
        tp.title AS tour_title, tp.destination AS tour_destination,
        u.name AS guide_name
      FROM group_tours gt
      JOIN tour_bookings tb ON gt.booking_id = tb.id
      JOIN tour_packages tp ON tb.tour_package_id = tp.id
      LEFT JOIN users u ON gt.assigned_guide_user_id = u.id
      ORDER BY gt.created_at DESC
    `);
    return rows;
  }
  return memoryStore.group_tours.map(gt => {
    const tb = memoryStore.tour_bookings.find(t => t.id === gt.booking_id) || {};
    const tp = memoryStore.tour_packages.find(p => p.id === tb.tour_package_id) || {};
    const guide = memoryStore.users.find(u => u.id === gt.assigned_guide_user_id) || {};
    return {
      ...gt,
      tour_title: tp.title || tb.tour_title,
      tour_destination: tp.destination,
      travel_date: tb.travel_date,
      total_travelers: tb.total_travelers,
      total_amount: tb.total_amount,
      guide_name: guide.name || null
    };
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function updateGroupTour(id, { title, status, assigned_guide_user_id, group_size_expected, start_at, end_at, welcome_message, emergency_instructions }) {
  if (isUsingMySQL()) {
    const fields = [];
    const values = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (assigned_guide_user_id !== undefined) { fields.push('assigned_guide_user_id = ?'); values.push(assigned_guide_user_id); }
    if (group_size_expected !== undefined) { fields.push('group_size_expected = ?'); values.push(group_size_expected); }
    if (start_at !== undefined) { fields.push('start_at = ?'); values.push(start_at); }
    if (end_at !== undefined) { fields.push('end_at = ?'); values.push(end_at); }
    if (welcome_message !== undefined) { fields.push('welcome_message = ?'); values.push(welcome_message); }
    if (emergency_instructions !== undefined) { fields.push('emergency_instructions = ?'); values.push(emergency_instructions); }
    if (fields.length === 0) return false;
    values.push(id);
    await pool.query(`UPDATE group_tours SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  }
  const gt = memoryStore.group_tours.find(g => g.id === Number(id));
  if (!gt) return false;
  if (title !== undefined) gt.title = title;
  if (status !== undefined) gt.status = status;
  if (assigned_guide_user_id !== undefined) gt.assigned_guide_user_id = assigned_guide_user_id ? Number(assigned_guide_user_id) : null;
  if (group_size_expected !== undefined) gt.group_size_expected = group_size_expected ? Number(group_size_expected) : null;
  if (start_at !== undefined) gt.start_at = start_at;
  if (end_at !== undefined) gt.end_at = end_at;
  if (welcome_message !== undefined) gt.welcome_message = welcome_message;
  if (emergency_instructions !== undefined) gt.emergency_instructions = emergency_instructions;
  gt.updated_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
  return true;
}

export async function deleteGroupTour(id) {
  if (isUsingMySQL()) {
    await pool.query('DELETE FROM group_tours WHERE id = ?', [id]);
    return true;
  }
  const idx = memoryStore.group_tours.findIndex(g => g.id === Number(id));
  if (idx === -1) return false;
  memoryStore.group_tours.splice(idx, 1);
  return true;
}

export async function getGroupTourStats() {
  const all = await getAllGroupTours();
  return {
    total: all.length,
    draft: all.filter(g => g.status === 'draft').length,
    finalized: all.filter(g => g.status === 'finalized').length,
    active: all.filter(g => g.status === 'active').length,
    completed: all.filter(g => g.status === 'completed').length,
    cancelled: all.filter(g => g.status === 'cancelled').length
  };
}

// --- GROUP MILESTONE MODEL ---
export async function createMilestone({ group_tour_id, title, description = null, sort_order = 0 }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO group_milestones (group_tour_id, title, description, sort_order) VALUES (?, ?, ?, ?)',
      [group_tour_id, title, description, sort_order]
    );
    return { id: result.insertId, title };
  }
  const newMilestone = {
    id: memoryStore.group_milestones.length + 1,
    group_tour_id: Number(group_tour_id),
    title,
    description: description || null,
    sort_order: Number(sort_order),
    status: 'pending',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.group_milestones.push(newMilestone);
  return newMilestone;
}

export async function getMilestonesByGroupId(groupTourId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM group_milestones WHERE group_tour_id = ? ORDER BY sort_order ASC, id ASC',
      [groupTourId]
    );
    return rows;
  }
  return memoryStore.group_milestones
    .filter(m => m.group_tour_id === Number(groupTourId))
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

export async function getMilestoneById(id) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM group_milestones WHERE id = ?', [id]);
    return rows[0] || null;
  }
  return memoryStore.group_milestones.find(m => m.id === Number(id)) || null;
}

export async function updateMilestone(id, { title, description, sort_order, status }) {
  if (isUsingMySQL()) {
    const fields = [];
    const values = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (description !== undefined) { fields.push('description = ?'); values.push(description); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); values.push(sort_order); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (fields.length === 0) return false;
    values.push(id);
    await pool.query(`UPDATE group_milestones SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  }
  const m = memoryStore.group_milestones.find(m => m.id === Number(id));
  if (!m) return false;
  if (title !== undefined) m.title = title;
  if (description !== undefined) m.description = description;
  if (sort_order !== undefined) m.sort_order = Number(sort_order);
  if (status !== undefined) m.status = status;
  return true;
}

export async function deleteMilestone(id) {
  if (isUsingMySQL()) {
    await pool.query('DELETE FROM group_milestones WHERE id = ?', [id]);
    return true;
  }
  const idx = memoryStore.group_milestones.findIndex(m => m.id === Number(id));
  if (idx === -1) return false;
  memoryStore.group_milestones.splice(idx, 1);
  return true;
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

export async function findPortalTokenByTourBooking(tourBookingId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM portal_tokens WHERE tour_booking_id = ? ORDER BY id DESC LIMIT 1', [tourBookingId]);
    return rows[0] || null;
  }
  return memoryStore.portal_tokens.find(t => t.tour_booking_id === Number(tourBookingId)) || null;
}

// --- DASHBOARD METRICS MODEL ---
export async function getDashboardStats() {
  const flights = await getAllFlightBookings();
  const tours = await getAllTourPackages();
  const tourBookings = await getAllTourBookings();
  const customers = await getAllCustomers();
  const groups = await getAllGroupTours();
  const allPayments = isUsingMySQL()
    ? (await pool.query('SELECT * FROM payments'))[0]
    : memoryStore.payments;

  // Revenue = actual payments on confirmed bookings (exclude cancelled/pending bookings)
  const activeFlights = flights.filter(f => f.ticket_status !== 'cancelled');
  const activeTourBookings = tourBookings.filter(t => t.status !== 'cancelled');

  // Build sets of confirmed booking IDs
  const confirmedFlightIds = new Set(flights.filter(f => f.ticket_status === 'confirmed' || f.ticket_status === 'ticketed').map(f => f.id));
  const confirmedTourBookingIds = new Set(tourBookings.filter(t => t.status === 'confirmed').map(t => t.id));

  // Calculate revenue from actual payments (subtract refunds, only confirmed bookings)
  const totalFlightRevenue = allPayments
    .filter(p => p.booking_type === 'flight' && (p.payment_status === 'paid' || p.payment_status === 'partial') && confirmedFlightIds.has(p.booking_id))
    .reduce((sum, p) => sum + (Number(p.amount) || 0) - (Number(p.refund_amount) || 0), 0);
  const totalTourRevenue = allPayments
    .filter(p => p.booking_type === 'tour' && (p.payment_status === 'paid' || p.payment_status === 'partial') && confirmedTourBookingIds.has(p.booking_id))
    .reduce((sum, p) => sum + (Number(p.amount) || 0) - (Number(p.refund_amount) || 0), 0);
  const totalRevenue = totalFlightRevenue + totalTourRevenue;

  const ticketedFlightsCount = flights.filter(f => f.ticket_status === 'ticketed').length;
  const activeToursCount = tours.filter(t => t.status === 'active').length;

  return {
    totalRevenue,
    totalFlightRevenue,
    totalTourRevenue,
    flightBookingsCount: flights.length,
    ticketedFlightsCount: flights.filter(f => f.ticket_status === 'ticketed').length,
    pendingBookingsCount: flights.filter(f => f.ticket_status === 'pending').length + tourBookings.filter(t => t.status === 'pending').length,
    activeToursCount: tours.filter(t => t.status === 'active').length,
    customersCount: customers.length,
    pendingFlightRequests: flights.filter(f => f.ticket_status === 'pending').length,
    recentFlights: activeFlights.slice(0, 5),
    recentTourBookings: activeTourBookings.slice(0, 5),
    recentGroups: groups.slice(0, 5),
    groupToursCount: groups.length
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
  const invoice_no = await generateUniqueInvoiceNo();
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      `INSERT INTO payments (invoice_no, booking_type, booking_id, amount, base_fare, tax_amount, agency_fee, payment_method, payment_status, transaction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
      [invoice_no, booking_type, booking_id, amount, base_fare, tax_amount, agency_fee, payment_method, transaction_id || ('TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000))]
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
    .reduce((sum, p) => sum + Number(p.amount || 0) - Number(p.refund_amount || 0), 0);
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
      WHERE fb.customer_id = ? OR tb.customer_id = ?
      ORDER BY p.created_at DESC
    `, [customerId, customerId]);

    const allBookings = [...flights.map(f => ({ ...f, type: 'flight', ref: f.booking_ref })), ...tours.map(t => ({ ...t, type: 'tour', ref: t.tour_title }))];
    allBookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Exclude cancelled bookings from totals
    const activeBookings = allBookings.filter(b => b.status !== 'cancelled');
    const totalBookingValue = activeBookings.reduce((s, b) => s + Number(b.booking_total || 0), 0);
    const totalPaid = payments.filter(p => p.payment_status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0);

    return { customer: cust, bookings: allBookings, payments, totalBookingValue, totalPaid, balance: totalBookingValue - totalPaid };
  }
  return null;
}

async function generateUniqueInvoiceNo() {
  if (isUsingMySQL()) {
    const [rows] = await pool.query("SELECT invoice_no FROM payments WHERE invoice_no LIKE 'INV-%' ORDER BY id DESC LIMIT 1");
    let nextNum = 1;
    if (rows.length > 0) {
      const last = rows[0].invoice_no;
      const parts = last.split('-');
      nextNum = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return 'INV-' + String(nextNum).padStart(6, '0');
  }
  const maxExisting = memoryStore.payments.reduce((max, p) => {
    if (p.invoice_no && p.invoice_no.startsWith('INV-')) {
      const n = parseInt(p.invoice_no.split('-')[1], 10);
      return n > max ? n : max;
    }
    return max;
  }, 0);
  return 'INV-' + String(maxExisting + 1).padStart(6, '0');
}

export async function addPayment({ booking_type, booking_id, amount, payment_method, payment_reference, notes, base_fare, tax_amount, agency_fee, recorded_by }) {
  const invoice_no = await generateUniqueInvoiceNo();
  const transaction_id = 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
  const amt = Number(amount);
  const finalBaseFare = base_fare != null ? Number(base_fare) : null;
  const finalTaxAmount = tax_amount != null ? Number(tax_amount) : null;
  const finalAgencyFee = agency_fee != null ? Number(agency_fee) : null;

  if (isUsingMySQL()) {
    const [result] = await pool.query(
      `INSERT INTO payments (invoice_no, booking_type, booking_id, amount, base_fare, tax_amount, agency_fee, payment_method, payment_reference, notes, payment_status, transaction_id, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
      [invoice_no, booking_type, booking_id, amt, finalBaseFare, finalTaxAmount, finalAgencyFee, payment_method || 'cash', payment_reference || null, notes || null, transaction_id, recorded_by || null]
    );
    return { id: result.insertId, invoice_no, transaction_id };
  }
  const newPayment = {
    id: memoryStore.payments.length + 1,
    invoice_no,
    booking_type,
    booking_id: Number(booking_id),
    amount: Number(amount),
    base_fare: finalBaseFare,
    tax_amount: finalTaxAmount,
    agency_fee: finalAgencyFee,
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

export async function refundPayment(id, refundAmount, reason) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const payment = rows[0];
    const amt = refundAmount != null ? Number(refundAmount) : Number(payment.amount);
    const newStatus = amt < Number(payment.amount) ? 'partial' : 'refunded';
    await pool.query(
      'UPDATE payments SET payment_status = ?, refund_amount = ?, refund_reason = ?, refunded_at = NOW() WHERE id = ?',
      [newStatus, amt, reason || null, id]
    );
    return { ...payment, payment_status: newStatus, refund_amount: amt, refund_reason: reason || null };
  }
  const payment = memoryStore.payments.find(p => p.id === Number(id));
  if (!payment) return null;
  const amt = refundAmount != null ? Number(refundAmount) : Number(payment.amount);
  payment.payment_status = amt < Number(payment.amount) ? 'partial' : 'refunded';
  payment.refund_amount = amt;
  payment.refund_reason = reason || null;
  payment.refunded_at = new Date().toISOString();
  return { ...payment };
}

// --- LIVE FLIGHT STATUS ENGINE ---
export function getFlightLiveStatus(flight) {
  if (!flight) return null;
  
  // Only show live status for ticketed bookings — do not simulate data for inquiries/requests
  if (flight.ticket_status !== 'ticketed') return null;

  const now = new Date();
  const dep = new Date(flight.departure_date);
  const diffHours = (dep - now) / (1000 * 60 * 60);

  if (flight.ticket_status === 'cancelled') {
    return { status: 'CANCELLED', statusClass: 'cancelled', gate: 'N/A', terminal: 'N/A', baggage: 'N/A' };
  }
  if (diffHours < 0 && diffHours > -12) {
    return { status: 'IN-AIR / EN ROUTE', statusClass: 'active', gate: 'TBA', terminal: 'TBA', baggage: 'TBA' };
  }
  if (diffHours <= -12) {
    return { status: 'LANDED / COMPLETED', statusClass: 'ticketed', gate: 'TBA', terminal: 'TBA', baggage: 'TBA' };
  }
  if (diffHours <= 2) {
    return { status: 'FINAL BOARDING', statusClass: 'active', gate: 'TBA', terminal: 'TBA', baggage: 'TBA' };
  }
  if (diffHours <= 5) {
    return { status: 'CHECK-IN OPEN', statusClass: 'active', gate: 'TBA', terminal: 'TBA', baggage: 'TBA' };
  }
  return { status: 'ON TIME / SCHEDULED', statusClass: 'ticketed', gate: 'TBA', terminal: 'TBA', baggage: 'TBA' };
}

// --- WORKFLOW STAGE MANAGEMENT ---

const ALLOWED_WORKFLOW_TRANSITIONS = {
  inquiry:                    ['search_details_complete', 'cancelled'],
  search_details_complete:    ['quote_prepared', 'cancelled'],
  quote_prepared:             ['quote_sent', 'cancelled'],
  quote_sent:                 ['customer_approved', 'cancelled'],
  customer_approved:          ['passenger_details_pending', 'cancelled'],
  passenger_details_pending:  ['passenger_details_complete', 'cancelled'],
  passenger_details_complete: ['reservation_pending', 'cancelled'],
  reservation_pending:        ['reserved', 'cancelled', 'customer_approved'],
  reserved:                   ['payment_pending', 'cancelled', 'customer_approved'],
  payment_pending:            ['payment_under_review', 'cancelled'],
  payment_under_review:       ['ready_for_ticketing', 'reserved', 'cancelled'],
  ready_for_ticketing:        ['ticketed', 'cancelled'],
  ticketed:                   ['completed'],
  completed:                  [],
  cancelled:                  [],
  legacy:                     ['inquiry', 'cancelled']
};

export function getAllowedWorkflowTransitions(currentStage) {
  return ALLOWED_WORKFLOW_TRANSITIONS[currentStage] || [];
}

export function canTransitionWorkflow(currentStage, targetStage) {
  const allowed = ALLOWED_WORKFLOW_TRANSITIONS[currentStage];
  if (!allowed) return false;
  return allowed.includes(targetStage);
}

export async function transitionWorkflowStage(bookingId, newStage, reason = null) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT workflow_stage FROM flight_bookings WHERE id = ?', [bookingId]);
    const current = rows[0]?.workflow_stage;
    if (!current) return { success: false, error: 'Booking not found' };
    if (!canTransitionWorkflow(current, newStage)) {
      return { success: false, error: `Cannot transition from '${current}' to '${newStage}'` };
    }
    await pool.query('UPDATE flight_bookings SET workflow_stage = ? WHERE id = ?', [newStage, bookingId]);
    return { success: true, from: current, to: newStage };
  }
  const fb = memoryStore.flight_bookings.find(f => f.id === Number(bookingId));
  if (!fb) return { success: false, error: 'Booking not found' };
  const current = fb.workflow_stage || 'legacy';
  if (!canTransitionWorkflow(current, newStage)) {
    return { success: false, error: `Cannot transition from '${current}' to '${newStage}'` };
  }
  fb.workflow_stage = newStage;
  return { success: true, from: current, to: newStage };
}

export async function getWorkflowStats() {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT workflow_stage, COUNT(*) as count FROM flight_bookings GROUP BY workflow_stage');
    const stats = {};
    for (const row of rows) stats[row.workflow_stage] = row.count;
    return stats;
  }
  const stats = {};
  for (const fb of memoryStore.flight_bookings) {
    const stage = fb.workflow_stage || 'legacy';
    stats[stage] = (stats[stage] || 0) + 1;
  }
  return stats;
}

export async function getFlightRequests({ status } = {}) {
  if (isUsingMySQL()) {
    let query = `
      SELECT fb.*, c.full_name AS customer_name, c.email AS customer_email, c.phone AS customer_phone
      FROM flight_bookings fb
      LEFT JOIN customers c ON fb.customer_id = c.id
    `;
    const params = [];
    if (status) {
      query += ' WHERE fb.ticket_status = ?';
      params.push(status);
    }
    query += ' ORDER BY fb.created_at DESC';
    const [rows] = await pool.query(query, params);
    return rows;
  }
  let bookings = memoryStore.flight_bookings.map(fb => {
    const cust = memoryStore.customers.find(c => c.id === fb.customer_id) || {};
    return {
      ...fb,
      customer_name: cust.full_name || fb.customer_name || 'Guest',
      customer_email: cust.email || null,
      customer_phone: cust.phone || null
    };
  });
  if (status) {
    bookings = bookings.filter(b => b.ticket_status === status);
  }
  return bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getFlightRequestStats() {
  const all = await getFlightRequests();
  return {
    total: all.length,
    pending: all.filter(f => f.ticket_status === 'pending').length,
    confirmed: all.filter(f => f.ticket_status === 'confirmed').length,
    ticketed: all.filter(f => f.ticket_status === 'ticketed').length,
    cancelled: all.filter(f => f.ticket_status === 'cancelled').length
  };
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
  const rounded = decimals === 0 ? Math.round(converted) : converted;
  const formattedVal = rounded.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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

// --- AUTH CODES MODEL ---
export async function createAuthCode({ email, purpose = 'login', target_role = null, extra_data = null, ttlMinutes = 30 }) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19);
  if (isUsingMySQL()) {
    await pool.query(
      'INSERT INTO auth_codes (email, code, purpose, target_role, extra_data, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [email.toLowerCase(), code, purpose, target_role, extra_data ? JSON.stringify(extra_data) : null, expiresAt]
    );
  } else {
    memoryStore.auth_codes.push({
      id: memoryStore.auth_codes.length + 1,
      email: email.toLowerCase(), code, purpose, target_role,
      extra_data, expires_at: expiresAt, used: 0,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
  }
  return { code, expiresAt };
}

export async function verifyAuthCode(email, code) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM auth_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [email.toLowerCase(), code]
    );
    if (rows[0]) {
      await pool.query('UPDATE auth_codes SET used = 1 WHERE id = ?', [rows[0].id]);
    }
    return rows[0] || null;
  }
  const record = memoryStore.auth_codes.find(
    ac => ac.email === email.toLowerCase() && ac.code === code && !ac.used && new Date(ac.expires_at) > new Date()
  );
  if (record) record.used = 1;
  return record || null;
}

export async function peekAuthCode(email, code) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM auth_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [email.toLowerCase(), code]
    );
    return rows[0] || null;
  }
  return memoryStore.auth_codes.find(
    ac => ac.email === email.toLowerCase() && ac.code === code && !ac.used && new Date(ac.expires_at) > new Date()
  ) || null;
}

export async function cleanupExpiredCodes() {
  if (isUsingMySQL()) {
    await pool.query('DELETE FROM auth_codes WHERE expires_at < NOW() OR used = 1');
  } else {
    memoryStore.auth_codes = memoryStore.auth_codes.filter(
      ac => new Date(ac.expires_at) > new Date() && !ac.used
    );
  }
}

// --- GUIDE MODEL ---
export async function getGroupsByGuideUserId(userId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(`
      SELECT gt.*, tp.title AS tour_title, tp.destination, tb.total_amount, tb.total_travelers,
             (SELECT COUNT(*) FROM group_milestones gm WHERE gm.group_tour_id = gt.id) AS milestone_count,
             (SELECT COUNT(*) FROM group_milestones gm WHERE gm.group_tour_id = gt.id AND gm.status = 'completed') AS completed_milestones
      FROM group_tours gt
      LEFT JOIN tour_bookings tb ON gt.booking_id = tb.id
      LEFT JOIN tour_packages tp ON tb.tour_package_id = tp.id
      WHERE gt.assigned_guide_user_id = ?
      ORDER BY gt.created_at DESC
    `, [userId]);
    return rows;
  }
  return memoryStore.group_tours
    .filter(gt => gt.assigned_guide_user_id === Number(userId))
    .map(gt => {
      const tb = memoryStore.tour_bookings.find(b => b.id === gt.booking_id);
      const tp = tb ? memoryStore.tour_packages.find(p => p.id === tb.tour_package_id) : null;
      const milestones = memoryStore.group_milestones.filter(m => m.group_tour_id === gt.id);
      return {
        ...gt,
        tour_title: tp?.title || 'Unknown',
        destination: tp?.destination || 'TBD',
        total_amount: tb?.total_amount || 0,
        total_travelers: tb?.total_travelers || 0,
        milestone_count: milestones.length,
        completed_milestones: milestones.filter(m => m.status === 'completed').length
      };
    });
}

// --- GROUP MESSAGING MODEL ---
export async function createGroupMessage({ group_tour_id, sender_user_id = null, sender_member_id = null, sender_name, message, message_type = 'text', metadata = null }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO group_messages (group_tour_id, sender_user_id, sender_member_id, sender_name, message, message_type, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [group_tour_id, sender_user_id, sender_member_id, sender_name, message, message_type, metadata ? JSON.stringify(metadata) : null]
    );
    return { id: result.insertId };
  }
  const msg = {
    id: memoryStore.group_messages.length + 1,
    group_tour_id: Number(group_tour_id), sender_user_id, sender_member_id, sender_name,
    message, message_type, metadata,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.group_messages.push(msg);
  return msg;
}

export async function getGroupMessages(groupTourId, limit = 100) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM group_messages WHERE group_tour_id = ? ORDER BY created_at ASC LIMIT ?',
      [groupTourId, limit]
    );
    return rows;
  }
  return memoryStore.group_messages
    .filter(m => m.group_tour_id === Number(groupTourId))
    .slice(-limit);
}

// --- GUIDE POLLS MODEL ---
export async function createGuidePoll({ group_tour_id, created_by_user_id, question, options }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO guide_polls (group_tour_id, created_by_user_id, question, options) VALUES (?, ?, ?, ?)',
      [group_tour_id, created_by_user_id, question, JSON.stringify(options)]
    );
    return { id: result.insertId };
  }
  const poll = {
    id: memoryStore.guide_polls.length + 1,
    group_tour_id: Number(group_tour_id), created_by_user_id: Number(created_by_user_id),
    question, options, status: 'active',
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.guide_polls.push(poll);
  return poll;
}

export async function getGuidePollsByGroup(groupTourId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM guide_polls WHERE group_tour_id = ? ORDER BY created_at DESC',
      [groupTourId]
    );
    return rows;
  }
  return memoryStore.guide_polls.filter(p => p.group_tour_id === Number(groupTourId));
}

export async function castPollVote({ poll_id, voter_member_id = null, voter_name, selected_option }) {
  if (isUsingMySQL()) {
    await pool.query(
      'INSERT INTO guide_poll_votes (poll_id, voter_member_id, voter_name, selected_option) VALUES (?, ?, ?, ?)',
      [poll_id, voter_member_id, voter_name, selected_option]
    );
    return true;
  }
  memoryStore.guide_poll_votes.push({
    id: memoryStore.guide_poll_votes.length + 1,
    poll_id: Number(poll_id), voter_member_id, voter_name, selected_option: Number(selected_option),
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  });
  return true;
}

export async function getPollResults(pollId) {
  if (isUsingMySQL()) {
    const [votes] = await pool.query(
      'SELECT selected_option, COUNT(*) AS vote_count FROM guide_poll_votes WHERE poll_id = ? GROUP BY selected_option',
      [pollId]
    );
    return votes;
  }
  const votes = memoryStore.guide_poll_votes.filter(v => v.poll_id === Number(pollId));
  const results = {};
  votes.forEach(v => { results[v.selected_option] = (results[v.selected_option] || 0) + 1; });
  return Object.entries(results).map(([selected_option, vote_count]) => ({ selected_option: Number(selected_option), vote_count }));
}

export async function closePoll(pollId) {
  if (isUsingMySQL()) {
    await pool.query('UPDATE guide_polls SET status = ? WHERE id = ?', ['closed', pollId]);
    return true;
  }
  const poll = memoryStore.guide_polls.find(p => p.id === Number(pollId));
  if (poll) poll.status = 'closed';
  return true;
}

// --- MEMBER PORTAL PRIVACY MODEL ---
export async function createMemberWithToken({ tour_booking_id, full_name, passport_number = null, nationality = null, phone = null, email = null }) {
  const portalToken = 'zm_' + randomBytes(16).toString('hex');
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO tour_booking_members (tour_booking_id, full_name, passport_number, nationality, phone, email, portal_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tour_booking_id, full_name, passport_number, nationality, phone, email, portalToken]
    );
    return { id: result.insertId, full_name, portal_token: portalToken };
  }
  const member = {
    id: memoryStore.tour_booking_members.length + 1,
    tour_booking_id: Number(tour_booking_id), full_name, passport_number, nationality, phone, email,
    portal_token: portalToken,
    created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
  };
  memoryStore.tour_booking_members.push(member);
  return { id: member.id, full_name, portal_token: portalToken };
}

export async function findMemberByPortalToken(token) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query('SELECT * FROM tour_booking_members WHERE portal_token = ?', [token]);
    return rows[0] || null;
  }
  return memoryStore.tour_booking_members.find(m => m.portal_token === token) || null;
}

export async function getBookingMembersForLeader(tourBookingId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM tour_booking_members WHERE tour_booking_id = ? ORDER BY id ASC',
      [tourBookingId]
    );
    return rows;
  }
  return memoryStore.tour_booking_members.filter(m => m.tour_booking_id === Number(tourBookingId));
}

export async function isGroupLeader(tourBookingId, memberId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT group_leader_member_id FROM tour_bookings WHERE id = ?',
      [tourBookingId]
    );
    return rows[0]?.group_leader_member_id === Number(memberId);
  }
  const tb = memoryStore.tour_bookings.find(b => b.id === Number(tourBookingId));
  return tb?.group_leader_member_id === Number(memberId);
}

export async function setGroupLeader(tourBookingId, memberId) {
  if (isUsingMySQL()) {
    await pool.query('UPDATE tour_bookings SET group_leader_member_id = ? WHERE id = ?', [memberId, tourBookingId]);
    return true;
  }
  const tb = memoryStore.tour_bookings.find(b => b.id === Number(tourBookingId));
  if (tb) tb.group_leader_member_id = Number(memberId);
  return true;
}

export async function getGroupLeader(tourBookingId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(`
      SELECT tbm.* FROM tour_booking_members tbm
      JOIN tour_bookings tb ON tb.group_leader_member_id = tbm.id
      WHERE tb.id = ?
    `, [tourBookingId]);
    return rows[0] || null;
  }
  const tb = memoryStore.tour_bookings.find(b => b.id === Number(tourBookingId));
  if (!tb?.group_leader_member_id) return null;
  return memoryStore.tour_booking_members.find(m => m.id === tb.group_leader_member_id) || null;
}

// --- GROUP LOCATION SHARING MODEL ---
export async function createGroupLocation({ group_tour_id, shared_by_user_id = null, shared_by_member_id = null, sender_name, latitude, longitude, accuracy_meters = null, label = null }) {
  if (isUsingMySQL()) {
    const [result] = await pool.query(
      'INSERT INTO group_locations (group_tour_id, shared_by_user_id, shared_by_member_id, sender_name, latitude, longitude, accuracy_meters, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [group_tour_id, shared_by_user_id, shared_by_member_id, sender_name, latitude, longitude, accuracy_meters, label]
    );
    return { id: result.insertId };
  }
  const loc = {
    id: memoryStore.group_locations.length + 1,
    group_tour_id: Number(group_tour_id), shared_by_user_id, shared_by_member_id, sender_name,
    latitude: Number(latitude), longitude: Number(longitude), accuracy_meters, label,
    status: 'active',
    started_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    ended_at: null
  };
  memoryStore.group_locations.push(loc);
  return loc;
}

export async function getActiveGroupLocation(groupTourId) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM group_locations WHERE group_tour_id = ? AND status = ? ORDER BY started_at DESC LIMIT 1',
      [groupTourId, 'active']
    );
    return rows[0] || null;
  }
  return memoryStore.group_locations
    .filter(l => l.group_tour_id === Number(groupTourId) && l.status === 'active')
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0] || null;
}

export async function getGroupLocationHistory(groupTourId, limit = 20) {
  if (isUsingMySQL()) {
    const [rows] = await pool.query(
      'SELECT * FROM group_locations WHERE group_tour_id = ? ORDER BY started_at DESC LIMIT ?',
      [groupTourId, limit]
    );
    return rows;
  }
  return memoryStore.group_locations
    .filter(l => l.group_tour_id === Number(groupTourId))
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
    .slice(0, limit);
}

export async function endGroupLocation(locationId) {
  if (isUsingMySQL()) {
    await pool.query(
      "UPDATE group_locations SET status = 'ended', ended_at = NOW() WHERE id = ?",
      [locationId]
    );
    return true;
  }
  const loc = memoryStore.group_locations.find(l => l.id === Number(locationId));
  if (loc) {
    loc.status = 'ended';
    loc.ended_at = new Date().toISOString().replace('T', ' ').substring(0, 19);
  }
  return true;
}
