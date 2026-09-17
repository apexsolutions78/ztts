import mysql from 'mysql2/promise';
import { env } from './env.js';
import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto';

export let pool = null;
let isLiveMySQL = false;

// Create password hash helper
export function hashPassword(password, salt = 'zahabia_salt_2026') {
  return pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// In-Memory Seed Store for fallback / demo mode
export const memoryStore = {
  users: [
    {
      id: 1,
      name: 'Zahabia Admin',
      email: 'admin@zahabiatravel.com',
      password_hash: hashPassword('admin123'),
      role: 'admin',
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: 'Senior Ticketing Agent',
      email: 'agent@zahabiatravel.com',
      password_hash: hashPassword('agent123'),
      role: 'agent',
      created_at: new Date().toISOString()
    }
  ],
  customers: [
    {
      id: 1,
      full_name: 'Sheikh Hamdan Al-Maktoum',
      passport_number: 'A9823411',
      nationality: 'UAE',
      email: 'hamdan@example.com',
      phone: '+971 50 123 4567',
      password_hash: hashPassword('customer123'),
      created_at: '2026-08-10 10:00:00'
    },
    {
      id: 2,
      full_name: 'Elena Rostova',
      passport_number: 'N7739201',
      nationality: 'United Kingdom',
      email: 'elena.r@example.co.uk',
      phone: '+44 7700 900077',
      password_hash: hashPassword('customer123'),
      created_at: '2026-08-15 14:30:00'
    },
    {
      id: 3,
      full_name: 'Tariq Mansoor',
      passport_number: 'P5541923',
      nationality: 'Pakistan',
      email: 'tariq.m@example.com',
      phone: '+92 300 8877665',
      password_hash: hashPassword('customer123'),
      created_at: '2026-09-01 09:15:00'
    }
  ],
  flight_bookings: [
    {
      id: 1,
      booking_ref: 'ZHB-8921',
      customer_id: 1,
      customer_name: 'Sheikh Hamdan Al-Maktoum',
      airline: 'Emirates EK',
      flight_number: 'EK-201',
      origin: 'DXB',
      destination: 'JFK',
      departure_date: '2026-10-15 08:30:00',
      arrival_date: '2026-10-15 14:25:00',
      cabin_class: 'First',
      ticket_status: 'ticketed',
      total_amount: 5400.00,
      created_by: 1,
      created_at: '2026-09-02 11:20:00'
    },
    {
      id: 2,
      booking_ref: 'ZHB-4410',
      customer_id: 2,
      customer_name: 'Elena Rostova',
      airline: 'Qatar Airways QR',
      flight_number: 'QR-007',
      origin: 'LHR',
      destination: 'DOH',
      departure_date: '2026-09-28 12:00:00',
      arrival_date: '2026-09-28 20:45:00',
      cabin_class: 'Business',
      ticket_status: 'ticketed',
      total_amount: 3200.00,
      created_by: 2,
      created_at: '2026-09-05 16:10:00'
    },
    {
      id: 3,
      booking_ref: 'ZHB-1092',
      customer_id: 3,
      customer_name: 'Tariq Mansoor',
      airline: 'Flydubai FZ',
      flight_number: 'FZ-332',
      origin: 'DXB',
      destination: 'KHI',
      departure_date: '2026-09-20 18:00:00',
      arrival_date: '2026-09-20 21:00:00',
      cabin_class: 'Economy',
      ticket_status: 'confirmed',
      total_amount: 650.00,
      created_by: 2,
      created_at: '2026-09-10 09:40:00'
    }
  ],
  tour_packages: [
    {
      id: 1,
      title: 'Dubai Luxury Desert Safari & Royal Dinner',
      destination: 'Dubai, UAE',
      duration_days: 2,
      price: 450.00,
      description: 'Dune bashing in VIP 4x4 land cruisers, private desert camp setup, camel rides, falconry, quad biking, and 5-star live BBQ dinner under the stars.',
      status: 'active',
      image_url: '/static/img/desert_safari.jpg',
      created_at: '2026-07-01 00:00:00'
    },
    {
      id: 2,
      title: 'Umrah Premium Package 2026 (Makkah & Madinah)',
      destination: 'Saudi Arabia',
      duration_days: 10,
      price: 1850.00,
      description: '5-star clock tower accommodation in Makkah and front-row Prophet Mosque hotel in Madinah. Includes luxury VIP transport and Ziyarah tours.',
      status: 'active',
      image_url: '/static/img/umrah.jpg',
      created_at: '2026-07-15 00:00:00'
    },
    {
      id: 3,
      title: 'Maldives Overwater Bungalow Experience',
      destination: 'Maldives',
      duration_days: 5,
      price: 2900.00,
      description: 'All-inclusive private island resort stay with seaplane transfers, scuba diving sessions, sunset dolphin cruise, and private beach dining.',
      status: 'active',
      image_url: '/static/img/maldives.jpg',
      created_at: '2026-08-01 00:00:00'
    }
  ],
  tour_bookings: [
    {
      id: 1,
      tour_package_id: 1,
      tour_title: 'Dubai Luxury Desert Safari & Royal Dinner',
      customer_id: 2,
      customer_name: 'Elena Rostova',
      travel_date: '2026-09-30',
      total_travelers: 2,
      total_amount: 900.00,
      status: 'confirmed',
      created_at: '2026-09-06 14:00:00'
    }
  ],
  portal_tokens: [
    {
      id: 1,
      token: 'demo-token-hamdan-ek201',
      customer_id: 1,
      flight_booking_id: 1,
      tour_booking_id: null,
      expires_at: '2026-12-31 23:59:59',
      created_at: '2026-09-02 11:20:00'
    },
    {
      id: 2,
      token: 'demo-token-elena-qr007',
      customer_id: 2,
      flight_booking_id: 2,
      tour_booking_id: 1,
      expires_at: '2026-12-31 23:59:59',
      created_at: '2026-09-05 16:10:00'
    }
  ],
  payments: [
    {
      id: 1,
      invoice_no: 'INV-2026-001',
      booking_type: 'flight',
      booking_id: 1,
      amount: 5400.00,
      base_fare: 4800.00,
      tax_amount: 400.00,
      agency_fee: 200.00,
      payment_method: 'credit_card',
      payment_status: 'paid',
      transaction_id: 'TXN-9988112',
      created_at: '2026-09-02 11:25:00'
    },
    {
      id: 2,
      invoice_no: 'INV-2026-002',
      booking_type: 'flight',
      booking_id: 2,
      amount: 3200.00,
      base_fare: 2850.00,
      tax_amount: 250.00,
      agency_fee: 100.00,
      payment_method: 'bank_transfer',
      payment_status: 'paid',
      transaction_id: 'TXN-7766554',
      created_at: '2026-09-05 16:15:00'
    }
  ],
  audit_logs: [
    {
      id: 1,
      user_id: 1,
      user_name: 'Zahabia Admin',
      action: 'ISSUE_TICKET',
      entity_type: 'flight',
      entity_id: '1',
      details: 'Issued E-Ticket for PNR ZHB-8921 (Emirates EK-201)',
      ip_address: '127.0.0.1',
      created_at: '2026-09-02 11:25:00'
    },
    {
      id: 2,
      user_id: 2,
      user_name: 'Senior Ticketing Agent',
      action: 'CREATE_BOOKING',
      entity_type: 'flight',
      entity_id: '2',
      details: 'Created reservation PNR ZHB-4410 (Qatar Airways QR-007)',
      ip_address: '127.0.0.1',
      created_at: '2026-09-05 16:10:00'
    }
  ],
  exchange_rates: {
    USD: { symbol: '$', name: 'US Dollar', rate: 1.0 },
    AED: { symbol: 'AED ', name: 'UAE Dirham', rate: 3.6725 },
    EUR: { symbol: '€', name: 'Euro', rate: 0.92 },
    GBP: { symbol: '£', name: 'British Pound', rate: 0.79 },
    SAR: { symbol: 'SAR ', name: 'Saudi Riyal', rate: 3.75 },
    PKR: { symbol: 'Rs ', name: 'Pakistani Rupee', rate: 278.5 }
  },
  notification_logs: [
    {
      id: 1,
      customer_id: 1,
      flight_booking_id: 1,
      channel: 'email',
      recipient: 'hamdan@example.com',
      subject: '✈ E-Ticket Confirmation: PNR ZHB-8921',
      content: 'Your Emirates EK-201 ticket from DXB to JFK is confirmed.',
      status: 'delivered',
      created_at: '2026-09-02 11:25:00'
    },
    {
      id: 2,
      customer_id: 1,
      flight_booking_id: 1,
      channel: 'whatsapp',
      recipient: '+971 50 123 4567',
      subject: 'WhatsApp E-Ticket',
      content: 'Hello Sheikh Hamdan Al-Maktoum, your E-Ticket for flight EK-201 (PNR: ZHB-8921) has been issued.',
      status: 'delivered',
      created_at: '2026-09-02 11:25:05'
    }
  ],
  group_tours: [],
  group_members: []
};




// Attempt MySQL Pool Connection Initialization
if (env.db.host && env.db.name) {
  try {
    pool = mysql.createPool({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password,
      database: env.db.name,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  } catch (err) {
    console.warn('[Apex Solutions DB] MySQL pool initialization error, using in-memory store:', err.message);
    pool = null;
  }
}

export async function checkDatabase() {
  if (!pool) return false;
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    isLiveMySQL = rows?.[0]?.ok === 1;
    return isLiveMySQL;
  } catch (error) {
    isLiveMySQL = false;
    return false;
  }
}

export function isUsingMySQL() {
  return isLiveMySQL && pool !== null;
}

