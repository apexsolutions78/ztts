import { 
  getAllFlightBookings, 
  findFlightBookingById, 
  createFlightBooking, 
  updateFlightBooking,
  deleteFlightBooking,
  updateFlightTicketStatus, 
  getAllCustomers,
  findCustomerById,
  createPortalToken,
  logAuditAction,
  logNotificationRecord,
  getFlightLiveStatus,
  searchFlights,
  generateCSV,
  addPayment,
  findPortalTokenByFlightBooking,
  getFlightRequests,
  getFlightRequestStats
} from '../models/index.js';
import { sendEmail, buildETicketEmail } from '../services/emailService.js';
import { sendWhatsApp, buildETicketWhatsAppMessage } from '../services/whatsAppService.js';
import { generateETicketPDF } from '../services/pdfService.js';

export async function listFlights(req, res, next) {
  try {
    const { pnr, status, airline, query } = req.query;
    const flights = await searchFlights({ pnr, status, airline, query });
    res.render('admin/flights/index', {
      title: 'Flight Bookings & Tickets',
      flights,
      filters: { pnr, status, airline, query }
    });
  } catch (error) {
    next(error);
  }
}

export async function exportFlightsCSV(req, res, next) {
  try {
    const flights = await getAllFlightBookings();
    const headers = ['PNR', 'Passenger', 'Airline', 'Flight No', 'Origin', 'Destination', 'Departure Date', 'Cabin Class', 'Total Amount', 'Status'];
    const rows = flights.map(f => [
      f.booking_ref,
      f.customer_name,
      f.airline,
      f.flight_number,
      f.origin,
      f.destination,
      f.departure_date,
      f.cabin_class,
      f.total_amount,
      f.ticket_status
    ]);

    const csvContent = generateCSV(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=Zahabia_Flight_Bookings_2026.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

export async function getNewFlightForm(req, res, next) {
  try {
    const customers = await getAllCustomers();
    const { activeCurrency, exchangeRates } = res.locals;
    res.render('admin/flights/new', {
      title: 'New Flight Booking',
      customers,
      activeCurrency,
      exchangeRates
    });
  } catch (error) {
    next(error);
  }
}

export async function postCreateFlight(req, res, next) {
  try {
    const { customer_id, airline, flight_number, origin, destination, departure_date, arrival_date, cabin_class, total_amount, total_amount_usd, pay_now, pay_amount, pay_amount_usd, pay_reference, pay_notes } = req.body;
    if (!customer_id || !airline || !flight_number || !origin || !destination) {
      const customers = await getAllCustomers();
      const { activeCurrency, exchangeRates } = res.locals;
      return res.status(400).render('admin/flights/new', {
        title: 'New Flight Booking',
        customers,
        activeCurrency,
        exchangeRates,
        error: 'Please fill in all mandatory flight fields.'
      });
    }

    let finalAmount;
    if (total_amount_usd && Number(total_amount_usd) > 0) {
      finalAmount = Number(total_amount_usd);
    } else {
      const { getExchangeRates } = await import('../models/index.js');
      const rates = await getExchangeRates();
      const activeCurrency = req.session?.currency || 'PKR';
      const rate = rates[activeCurrency]?.rate || 1;
      finalAmount = Number(total_amount) / rate;
    }

    const booking = await createFlightBooking({
      customer_id,
      airline,
      flight_number,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departure_date,
      arrival_date,
      cabin_class,
      total_amount: finalAmount,
      created_by: req.session.user.id
    });

    // Record initial payment if provided
    if (pay_now && pay_now !== 'no' && pay_amount && Number(pay_amount) > 0) {
      let finalPayAmount;
      if (pay_amount_usd && Number(pay_amount_usd) > 0) {
        finalPayAmount = Number(pay_amount_usd);
      } else {
        const { getExchangeRates } = await import('../models/index.js');
        const rates = await getExchangeRates();
        const activeCurrency = req.session?.currency || 'PKR';
        const rate = rates[activeCurrency]?.rate || 1;
        finalPayAmount = Number(pay_amount) / rate;
      }
      await addPayment({
        booking_type: 'flight',
        booking_id: booking.id,
        amount: finalPayAmount,
        payment_method: pay_now,
        payment_reference: pay_reference,
        notes: pay_notes,
        recorded_by: req.session.user.id
      });
    }

    // Log Audit Action
    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'CREATE_BOOKING',
      entity_type: 'flight',
      entity_id: booking.id,
      details: `Created flight PNR ${booking.booking_ref} (${airline} ${flight_number} ${origin}-${destination})`
    });

    // Auto-create portal token and send notifications to customer
    const customer = await findCustomerById(customer_id);
    if (customer) {
      const portalToken = await createPortalToken({
        customer_id: customer.id,
        flight_booking_id: booking.id
      });
      const portalUrl = `${req.protocol}://${req.get('host')}/t/${portalToken}`;

      // Email notification
      if (customer.email) {
        const emailContent = buildETicketEmail({
          customerName: customer.full_name,
          bookingRef: booking.booking_ref,
          airline,
          flightNumber: flight_number,
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          departureDate: departure_date,
          arrivalDate: arrival_date,
          cabinClass: cabin_class,
          totalAmount: total_amount,
          portalUrl
        });
        const emailResult = await sendEmail({ to: customer.email, subject: emailContent.subject, html: emailContent.html, text: emailContent.text });
        await logNotificationRecord({ customer_id: customer.id, flight_booking_id: booking.id, channel: 'email', recipient: customer.email, subject: emailContent.subject, content: emailContent.text, status: emailResult.success ? 'delivered' : 'failed' });
      }

      // WhatsApp notification
      if (customer.phone) {
        const waMessage = buildETicketWhatsAppMessage({
          customerName: customer.full_name,
          bookingRef: booking.booking_ref,
          airline,
          flightNumber: flight_number,
          origin: origin.toUpperCase(),
          destination: destination.toUpperCase(),
          departureDate: departure_date,
          cabinClass: cabin_class,
          portalUrl
        });
        const waResult = await sendWhatsApp({ to: customer.phone, message: waMessage });
        await logNotificationRecord({ customer_id: customer.id, flight_booking_id: booking.id, channel: 'whatsapp', recipient: customer.phone, subject: `WhatsApp E-Ticket: ${booking.booking_ref}`, content: waMessage, status: waResult.success ? 'delivered' : 'failed' });
      }
    }

    res.redirect(`/admin/flights/${booking.id}`);
  } catch (error) {
    next(error);
  }
}

export async function viewFlightDetail(req, res, next) {
  try {
    const flight = await findFlightBookingById(req.params.id);
    if (!flight) {
      return res.status(404).render('errors/404', { title: 'Flight Booking Not Found' });
    }
    const liveStatus = getFlightLiveStatus(flight);
    const { activeCurrency, exchangeRates } = res.locals;
    const existingToken = await findPortalTokenByFlightBooking(flight.id);
    res.render('admin/flights/show', {
      title: flight.ticket_status === 'pending' ? `Flight Request #${flight.id}` : `Flight ${flight.booking_ref}`,
      flight,
      liveStatus,
      activeCurrency,
      exchangeRates,
      formatPrice: res.locals.formatPrice,
      portalToken: existingToken?.token || null
    });
  } catch (error) {
    next(error);
  }
}

export async function issueTicket(req, res, next) {
  try {
    const { id } = req.params;
    const flight = await findFlightBookingById(id);

    // Only allow ticketing if booking is confirmed (fully paid)
    if (flight && flight.ticket_status !== 'confirmed') {
      return res.status(400).json({ success: false, error: 'Booking must be fully paid before issuing a ticket.' });
    }

    await updateFlightTicketStatus(id, 'ticketed');

    // Log Audit Action
    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'ISSUE_TICKET',
      entity_type: 'flight',
      entity_id: id,
      details: `Issued E-Ticket for PNR ${flight ? flight.booking_ref : id}`
    });

    // Auto-send email notification if customer has email
    if (flight) {
      const customer = await findCustomerById(flight.customer_id);
      if (customer && customer.email) {
        const portalToken = await createPortalToken({
          customer_id: flight.customer_id,
          flight_booking_id: flight.id
        });
        const portalUrl = `${req.protocol}://${req.get('host')}/t/${portalToken}`;

        const emailContent = buildETicketEmail({
          customerName: customer.full_name,
          bookingRef: flight.booking_ref,
          airline: flight.airline,
          flightNumber: flight.flight_number,
          origin: flight.origin,
          destination: flight.destination,
          departureDate: flight.departure_date,
          arrivalDate: flight.arrival_date,
          cabinClass: flight.cabin_class,
          totalAmount: flight.total_amount,
          portalUrl
        });

        const emailResult = await sendEmail({
          to: customer.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });

        await logNotificationRecord({
          customer_id: flight.customer_id,
          flight_booking_id: flight.id,
          channel: 'email',
          recipient: customer.email,
          subject: emailContent.subject,
          content: emailContent.text,
          status: emailResult.success ? 'delivered' : 'failed'
        });

        // Auto-send WhatsApp notification if customer has phone
        if (customer.phone) {
          const whatsappMessage = buildETicketWhatsAppMessage({
            customerName: customer.full_name,
            bookingRef: flight.booking_ref,
            airline: flight.airline,
            flightNumber: flight.flight_number,
            origin: flight.origin,
            destination: flight.destination,
            departureDate: flight.departure_date,
            cabinClass: flight.cabin_class,
            portalUrl
          });

          const whatsappResult = await sendWhatsApp({
            to: customer.phone,
            message: whatsappMessage
          });

          await logNotificationRecord({
            customer_id: flight.customer_id,
            flight_booking_id: flight.id,
            channel: 'whatsapp',
            recipient: customer.phone,
            subject: `WhatsApp E-Ticket: ${flight.booking_ref}`,
            content: whatsappMessage,
            status: whatsappResult.success ? 'delivered' : 'failed'
          });
        }
      }
    }

    res.redirect(`/admin/flights/${id}?success=Ticketed`);
  } catch (error) {
    next(error);
  }
}

export async function generateShareToken(req, res, next) {
  try {
    const { id } = req.params;
    const flight = await findFlightBookingById(id);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });

    const token = await createPortalToken({
      customer_id: flight.customer_id,
      flight_booking_id: flight.id
    });

    const shareUrl = `${req.protocol}://${req.get('host')}/t/${token}`;
    res.json({ success: true, token, shareUrl });
  } catch (error) {
    next(error);
  }
}

export async function getEditFlightForm(req, res, next) {
  try {
    const flight = await findFlightBookingById(req.params.id);
    if (!flight) return res.status(404).render('errors/404', { title: 'Flight Not Found' });
    const customers = await getAllCustomers();
    res.render('admin/flights/edit', {
      title: `Edit Flight: ${flight.booking_ref}`,
      flight,
      customers
    });
  } catch (error) {
    next(error);
  }
}

export async function postUpdateFlight(req, res, next) {
  try {
    const { id } = req.params;
    const { customer_id, airline, flight_number, origin, destination, departure_date, arrival_date, cabin_class, total_amount } = req.body;
    if (!customer_id || !airline || !flight_number || !origin || !destination) {
      const flight = await findFlightBookingById(id);
      const customers = await getAllCustomers();
      return res.status(400).render('admin/flights/edit', {
        title: `Edit Flight: ${flight?.booking_ref}`,
        flight: { ...flight, ...req.body, id },
        customers,
        error: 'Please fill in all mandatory fields.'
      });
    }

    await updateFlightBooking(id, {
      customer_id, airline, flight_number,
      origin: origin.toUpperCase(), destination: destination.toUpperCase(),
      departure_date, arrival_date, cabin_class, total_amount
    });

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'UPDATE_BOOKING',
      entity_type: 'flight',
      entity_id: id,
      details: `Updated flight PNR ${airline} ${flight_number} ${origin}-${destination}`
    });

    res.redirect(`/admin/flights/${id}?success=Updated`);
  } catch (error) {
    next(error);
  }
}

export async function postDeleteFlight(req, res, next) {
  try {
    const { id } = req.params;
    const flight = await findFlightBookingById(id);
    await deleteFlightBooking(id);

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'DELETE_BOOKING',
      entity_type: 'flight',
      entity_id: id,
      details: `Deleted flight booking ${flight ? flight.booking_ref : id}`
    });

    res.redirect('/admin/flights?deleted=true');
  } catch (error) {
    next(error);
  }
}

export async function downloadETicketPDF(req, res, next) {
  try {
    const flight = await findFlightBookingById(req.params.id);
    if (!flight) return res.status(404).render('errors/404', { title: 'Flight Not Found' });
    const customer = await findCustomerById(flight.customer_id);
    const portalToken = await findPortalTokenByFlightBooking(flight.id);
    generateETicketPDF(flight, customer, res, portalToken?.token, res.locals.activeCurrency, res.locals.exchangeRates);
  } catch (error) {
    next(error);
  }
}

export async function listFlightRequests(req, res, next) {
  try {
    const { status } = req.query;
    const requests = await getFlightRequests({ status: status || null });
    const stats = await getFlightRequestStats();
    const { activeCurrency, exchangeRates } = res.locals;
    res.render('admin/flight-requests', {
      title: 'Flight Requests',
      requests,
      stats,
      statusFilter: status || null,
      activeCurrency,
      exchangeRates
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmFlightRequest(req, res, next) {
  try {
    const { id } = req.params;
    const flight = await findFlightBookingById(id);

    // Only allow confirmation if fully paid
    if (flight) {
      const { getBookingPaymentSummary } = await import('../models/index.js');
      const summary = await getBookingPaymentSummary('flight', id);
      if (!summary.isFullyPaid) {
        return res.redirect('/admin/flights/requests?error=not_paid');
      }
    }

    await updateFlightTicketStatus(id, 'confirmed');

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'CONFIRM_FLIGHT_REQUEST',
      entity_type: 'flight',
      entity_id: id,
      details: `Confirmed customer flight request PNR ${flight ? flight.booking_ref : id}`
    });

    res.redirect('/admin/flights/requests?confirmed=true');
  } catch (error) {
    next(error);
  }
}

export async function cancelFlightRequest(req, res, next) {
  try {
    const { id } = req.params;
    await updateFlightTicketStatus(id, 'cancelled');

    const flight = await findFlightBookingById(id);
    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'CANCEL_FLIGHT_REQUEST',
      entity_type: 'flight',
      entity_id: id,
      details: `Cancelled customer flight request PNR ${flight ? flight.booking_ref : id}`
    });

    res.redirect('/admin/flights/requests?cancelled=true');
  } catch (error) {
    next(error);
  }
}

export async function sendFlightNotification(req, res, next) {
  try {
    const { id, channel } = req.params;
    const flight = await findFlightBookingById(id);
    if (!flight) return res.status(404).json({ success: false, error: 'Flight not found' });

    const customer = flight.customer_id ? await findCustomerById(flight.customer_id) : null;
    if (!customer || !customer.email) {
      return res.json({ success: true, message: 'No customer email on file', simulated: true });
    }

    const { sendEmail } = await import('../services/emailService.js');

    if (channel === 'email') {
      try {
        await sendEmail({
          to: customer.email,
          subject: `[Zahabia] Flight Booking Update — ${flight.origin} → ${flight.destination}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
              <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; color: #d4a843;">FLIGHT BOOKING UPDATE</h1>
              </div>
              <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
                <p>Dear ${customer.full_name},</p>
                <p>Your flight booking has been updated:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Route</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flight.origin} → ${flight.destination}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Airline</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flight.airline}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Flight</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flight.flight_number}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Date</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flight.departure_date}</td></tr>
                  <tr><td style="padding: 8px; font-weight: bold;">Status</td><td style="padding: 8px;">${flight.ticket_status}</td></tr>
                </table>
              </div>
            </div>
          `
        });
        await logNotificationRecord({ booking_type: 'flight', booking_id: flight.id, channel: 'email', recipient: customer.email, status: 'sent' });
        res.json({ success: true, message: 'Email sent to ' + customer.email });
      } catch (e) {
        await logNotificationRecord({ booking_type: 'flight', booking_id: flight.id, channel: 'email', recipient: customer.email, status: 'failed', error: e.message });
        res.json({ success: true, message: 'Email failed: ' + e.message, simulated: true });
      }
    } else {
      res.json({ success: true, message: 'WhatsApp integration not yet configured', simulated: true });
    }
  } catch (error) {
    next(error);
  }
}

export async function getFlightNotifications(req, res, next) {
  try {
    const { id } = req.params;
    const { isUsingMySQL, pool } = await import('../config/db.js');
    let notifications = [];
    if (isUsingMySQL()) {
      const [rows] = await pool.query('SELECT * FROM notification_logs WHERE booking_type = ? AND booking_id = ? ORDER BY created_at DESC', ['flight', id]);
      notifications = rows;
    }
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
}
