import { routeQuery } from '../services/aiRouter.js';
import { logAuditAction, getAllCustomers, getAllFlightBookings, getAllTourPackages, getAllTourBookings, getFinancialLedger, getDashboardStats, searchFlights, getFlightLiveStatus } from '../models/index.js';

export async function getChatPage(req, res, next) {
  try {
    res.render('admin/chat/index', {
      title: 'AI Travel Assistant'
    });
  } catch (error) {
    next(error);
  }
}

async function buildDatabaseContext(query) {
  const q = query.toLowerCase();
  const ctx = [];

  // Customer lookups
  if (q.match(/customer|passenger|traveller|traveler|client|who booked|name|passport/)) {
    const customers = await getAllCustomers();
    if (customers.length > 0) {
      ctx.push('## CUSTOMERS IN SYSTEM (' + customers.length + ' total)');
      customers.slice(0, 20).forEach(c => {
        ctx.push('- ' + c.full_name + ' | Passport: ' + (c.passport_number || 'N/A') + ' | Nationality: ' + (c.nationality || 'N/A') + ' | Phone: ' + (c.phone || 'N/A') + ' | Email: ' + (c.email || 'N/A'));
      });
    }
  }

  // Flight bookings
  if (q.match(/flight|ticket|booking|pnr|airline|departure|arrival|seat|boarding|emirates|flydubai|qatar|piya|airblue/)) {
    const flights = await getAllFlightBookings();
    if (flights.length > 0) {
      ctx.push('## FLIGHT BOOKINGS (' + flights.length + ' total)');
      flights.slice(0, 15).forEach(f => {
        ctx.push('- PNR: ' + f.booking_ref + ' | ' + f.customer_name + ' | ' + f.airline + ' ' + f.flight_number + ' | ' + f.origin + ' → ' + f.destination + ' | Departs: ' + f.departure_date + ' | ' + f.cabin_class + ' | $' + f.total_amount + ' | Status: ' + f.ticket_status);
      });
    }
  }

  // Tour packages
  if (q.match(/tour|package|vacation|holiday|umrah|hajj|trip|destination|switzerland|paris|maldives|dubai|turkey|saudi/)) {
    const tours = await getAllTourPackages();
    if (tours.length > 0) {
      ctx.push('## TOUR PACKAGES (' + tours.length + ' total)');
      tours.forEach(t => {
        ctx.push('- ' + t.title + ' | ' + t.destination + ' | ' + t.duration_days + ' days | $' + t.price + ' per person | Status: ' + t.status);
      });
    }
  }

  // Tour bookings
  if (q.match(/tour booking|tour reservation|booked tour|cancel tour|tour status/)) {
    const bookings = await getAllTourBookings();
    if (bookings.length > 0) {
      ctx.push('## TOUR BOOKINGS (' + bookings.length + ' total)');
      bookings.slice(0, 10).forEach(b => {
        ctx.push('- ' + b.tour_title + ' | ' + b.customer_name + ' | Travel: ' + b.travel_date + ' | ' + b.total_travelers + ' travelers | $' + b.total_amount + ' | Status: ' + b.status);
      });
    }
  }

  // Financial data
  if (q.match(/revenue|invoice|payment|financial|money|income|sales|total|ledger|profit/)) {
    const stats = await getDashboardStats();
    const ledger = await getFinancialLedger();
    ctx.push('## FINANCIAL SUMMARY');
    ctx.push('- Total Revenue: $' + stats.totalRevenue);
    ctx.push('- Flight Revenue: $' + stats.totalFlightRevenue);
    ctx.push('- Tour Revenue: $' + stats.totalTourRevenue);
    ctx.push('- Total Customers: ' + stats.customersCount);
    ctx.push('- Flight Bookings: ' + stats.flightBookingsCount);
    ctx.push('- Active Tours: ' + stats.activeToursCount);
    if (ledger.length > 0) {
      ctx.push('## RECENT INVOICES');
      ledger.slice(0, 5).forEach(p => {
        ctx.push('- ' + (p.invoice_no || 'INV-' + p.id) + ' | ' + p.booking_type + ' | $' + p.amount + ' | ' + p.payment_method + ' | ' + p.payment_status);
      });
    }
  }

  // General dashboard overview for any query
  if (ctx.length === 0) {
    const stats = await getDashboardStats();
    ctx.push('## BUSINESS OVERVIEW');
    ctx.push('- Total Revenue: $' + stats.totalRevenue);
    ctx.push('- Customers: ' + stats.customersCount);
    ctx.push('- Flight Bookings: ' + stats.flightBookingsCount + ' (' + stats.ticketedFlightsCount + ' ticketed)');
    ctx.push('- Tour Packages: ' + stats.activeToursCount + ' active');
    ctx.push('- Recent Bookings: ' + stats.recentFlights.length + ' flights, ' + stats.recentTourBookings.length + ' tours');
  }

  return ctx.join('\n');
}

export async function postChatMessage(req, res, next) {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const dbContext = await buildDatabaseContext(message.trim());

    const result = await routeQuery(message.trim(), {
      booking: req.session.lastBooking || null,
      databaseContext: dbContext
    });

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'AI_CHAT',
      entity_type: 'chat',
      entity_id: null,
      details: 'Intent: ' + result.intent + ' | Provider: ' + result.provider + ' | Query: ' + message.substring(0, 100)
    });

    res.json({
      success: true,
      response: result.response,
      intent: result.intent,
      provider: result.provider,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('[Chat] Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process your message. Please try again.'
    });
  }
}
