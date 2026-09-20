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
  getFlightRequestStats,
  getBookingPaymentSummary,
  transitionWorkflowStage,
  getAllowedWorkflowTransitions
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
    const {
      customer_id, airline, flight_number, origin, destination,
      departure_date, arrival_date, cabin_class, total_amount, total_amount_usd,
      pay_now, pay_amount, pay_amount_usd, pay_reference, pay_notes,
      trip_type, adults, children, infants, return_date,
      preferred_airline, flexible_dates, budget, budget_usd,
      baggage_priority, direct_transit, customer_notes
    } = req.body;

    if (!origin || !destination) {
      const customers = await getAllCustomers();
      const { activeCurrency, exchangeRates } = res.locals;
      return res.status(400).render('admin/flights/new', {
        title: 'New Flight Booking',
        customers,
        activeCurrency,
        exchangeRates,
        error: 'Origin and destination are required.'
      });
    }

    // Convert fare amount from local currency to USD
    let finalAmount = 0;
    if (total_amount_usd && Number(total_amount_usd) > 0) {
      finalAmount = Number(total_amount_usd);
    } else if (total_amount && Number(total_amount) > 0) {
      const { getExchangeRates } = await import('../models/index.js');
      const rates = await getExchangeRates();
      const activeCurrency = req.session?.currency || 'PKR';
      const rate = rates[activeCurrency]?.rate || 1;
      finalAmount = Number(total_amount) / rate;
    }

    // Convert budget from local currency to USD
    let budgetUSD = null;
    if (budget_usd && Number(budget_usd) > 0) {
      budgetUSD = Number(budget_usd);
    } else if (budget && Number(budget) > 0) {
      const { getExchangeRates } = await import('../models/index.js');
      const rates = await getExchangeRates();
      const activeCurrency = req.session?.currency || 'PKR';
      const rate = rates[activeCurrency]?.rate || 1;
      budgetUSD = Number(budget) / rate;
    }

    // Auto-determine workflow stage based on what was provided
    let workflow_stage = 'inquiry';
    if (airline && flight_number) workflow_stage = 'search_details_complete';
    if (finalAmount > 0) workflow_stage = 'quote_prepared';
    if (customer_id) workflow_stage = 'customer_approved';

    const booking = await createFlightBooking({
      customer_id: customer_id || null,
      airline: airline || null,
      flight_number: flight_number || null,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departure_date,
      arrival_date: arrival_date || null,
      cabin_class,
      total_amount: finalAmount,
      created_by: req.session.user.id,
      workflow_stage,
      trip_type: trip_type || 'one_way',
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      infants: Number(infants) || 0,
      return_date: return_date || null,
      preferred_airline: preferred_airline || null,
      flexible_dates: !!flexible_dates,
      budget: budgetUSD,
      baggage_priority: !!baggage_priority,
      direct_transit: direct_transit || 'any',
      customer_notes: customer_notes || null
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
      details: `Created flight PNR ${booking.booking_ref} (${airline || 'TBD'} ${flight_number || 'TBD'} ${origin.toUpperCase()}-${destination.toUpperCase()})`
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
    console.error('[Flight Detail] Error rendering flight', req.params.id, ':', error.message);
    next(error);
  }
}

export async function issueTicket(req, res, next) {
  try {
    const { id } = req.params;
    const { ticket_number } = req.body;
    const flight = await findFlightBookingById(id);

    if (!flight) {
      return res.status(404).render('errors/404', { title: 'Flight Booking Not Found' });
    }

    // Only allow ticketing if booking is confirmed (fully paid)
    if (flight.ticket_status !== 'confirmed') {
      return res.status(400).json({ success: false, error: 'Booking must be fully paid before issuing a ticket.' });
    }

    // Verify payment is actually recorded — do not ticket zero-amount bookings without real payment
    const summary = await getBookingPaymentSummary('flight', flight.id);
    if (!summary.isFullyPaid) {
      return res.status(400).json({ success: false, error: 'Payment not verified. Cannot issue ticket.' });
    }

    // M6: Require PNR before ticketing
    if (!flight.pnr) {
      return res.redirect(`/admin/flights/${id}?error=Please+record+a+PNR+before+issuing+the+ticket`);
    }

    // M7: Require actual ticket number from Amadeus/GDS
    const tn = ticket_number ? ticket_number.trim().toUpperCase() : null;
    if (!tn) {
      return res.redirect(`/admin/flights/${id}?error=Please+enter+the+actual+e-ticket+number+from+Amadeus`);
    }

    // Record ticket number and mark as ticketed
    await updateFlightBooking(id, { ticket_number: tn });
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
    const {
      customer_id, airline, flight_number, origin, destination,
      departure_date, arrival_date, cabin_class, total_amount,
      trip_type, adults, children, infants, return_date,
      preferred_airline, flexible_dates, budget,
      baggage_priority, direct_transit, customer_notes, pnr
    } = req.body;

    if (!origin || !destination) {
      const flight = await findFlightBookingById(id);
      const customers = await getAllCustomers();
      return res.status(400).render('admin/flights/edit', {
        title: `Edit Flight: ${flight?.booking_ref}`,
        flight: { ...flight, ...req.body, id },
        customers,
        error: 'Origin and destination are required.'
      });
    }

    await updateFlightBooking(id, {
      customer_id: customer_id || null, airline: airline || null, flight_number: flight_number || null,
      origin, destination, departure_date, arrival_date: arrival_date || null,
      cabin_class, total_amount: Number(total_amount) || 0,
      trip_type, adults, children, infants, return_date: return_date || null,
      preferred_airline: preferred_airline || null, flexible_dates: !!flexible_dates,
      budget: budget ? Number(budget) : null,
      baggage_priority: !!baggage_priority, direct_transit: direct_transit || 'any',
      customer_notes: customer_notes || null, pnr: pnr || null
    });

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'UPDATE_BOOKING',
      entity_type: 'flight',
      entity_id: id,
      details: `Updated flight PNR ${airline || 'TBD'} ${flight_number || 'TBD'} ${origin.toUpperCase()}-${destination.toUpperCase()}`
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

    if (!flight) {
      return res.status(404).render('errors/404', { title: 'Flight Booking Not Found' });
    }

    // Block zero-amount bookings from confirmation — fare must be set first
    if (!flight.total_amount || Number(flight.total_amount) <= 0) {
      return res.redirect('/admin/flights/requests?error=no_fare');
    }

    // Only allow confirmation if fully paid
    const summary = await getBookingPaymentSummary('flight', id);
    if (!summary.isFullyPaid) {
      return res.redirect('/admin/flights/requests?error=not_paid');
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

export async function postTransitionWorkflow(req, res, next) {
  try {
    const { id } = req.params;
    const { target_stage, reason } = req.body;

    if (!target_stage) {
      return res.redirect(`/admin/flights/${id}?error=No+target+stage+specified`);
    }

    const result = await transitionWorkflowStage(id, target_stage, reason || null);

    if (!result.success) {
      return res.redirect(`/admin/flights/${id}?error=${encodeURIComponent(result.error)}`);
    }

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'WORKFLOW_TRANSITION',
      entity_type: 'flight',
      entity_id: id,
      details: `Workflow: ${result.from} → ${result.to}${reason ? ' (' + reason + ')' : ''}`
    });

    res.redirect(`/admin/flights/${id}?success=Workflow+updated+to+${result.to}`);
  } catch (error) {
    next(error);
  }
}

export async function postRecordPNR(req, res, next) {
  try {
    const { id } = req.params;
    const { pnr, ticketing_deadline, reservation_date } = req.body;

    if (!pnr || !pnr.trim()) {
      return res.redirect(`/admin/flights/${id}?error=PNR+code+is+required`);
    }

    const flight = await findFlightBookingById(id);
    if (!flight) return res.status(404).render('errors/404', { title: 'Flight Not Found' });

    const updated = await updateFlightBooking(id, {
      pnr: pnr.trim().toUpperCase(),
      reservation_date: reservation_date || new Date().toISOString().slice(0, 19).replace('T', ' '),
      ticketing_deadline: ticketing_deadline || null
    });

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'RECORD_PNR',
      entity_type: 'flight',
      entity_id: id,
      details: `Recorded PNR ${pnr.trim().toUpperCase()} for ${flight.booking_ref}${ticketing_deadline ? ' — deadline: ' + ticketing_deadline : ''}`
    });

    res.redirect(`/admin/flights/${id}?success=PNR+recorded+successfully`);
  } catch (error) {
    next(error);
  }
}

export async function sendFlightNotification(req, res, next) {
  try {
    const { id, channel } = req.params;
    const flight = await findFlightBookingById(id);
    if (!flight) return res.status(404).json({ success: false, error: 'Flight not found' });

    let customer = flight.customer_id ? await findCustomerById(flight.customer_id) : null;
    let customerEmail = customer?.email || null;
    let customerName = customer?.full_name || null;

    if (!customerEmail && flight.customer_notes) {
      const emailMatch = flight.customer_notes.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
      if (emailMatch) customerEmail = emailMatch[0];
      const nameMatch = flight.customer_notes.match(/Public request from ([^(]+)/);
      if (nameMatch) customerName = nameMatch[1].trim();
    }

    if (!customerEmail) {
      return res.json({ success: true, message: 'No customer email on file', simulated: true });
    }

    if (channel === 'email') {
      try {
        let emailHtml, emailSubject;
        if (flight.ticket_status === 'pending' && (!flight.airline || !flight.flight_number)) {
          emailSubject = `[Zahabia] Your Flight Request is Being Processed — ${flight.origin} → ${flight.destination}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
              <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; color: #d4a843;">YOUR FLIGHT REQUEST</h1>
              </div>
              <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
                <p>Dear ${customerName || 'Customer'},</p>
                <p>We have received your flight request and our team is working on finding the best options for you.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Request #</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flight.booking_ref}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Route</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flight.origin} → ${flight.destination}</td></tr>
                  <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Departure</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flight.departure_date ? new Date(flight.departure_date).toLocaleDateString() : 'TBA'}</td></tr>
                  <tr><td style="padding: 8px; font-weight: bold;">Class</td><td style="padding: 8px;">${flight.cabin_class || 'Economy'}</td></tr>
                </table>
                <p>We will send you a detailed quote with available flight options shortly. You can also check the status from your dashboard.</p>
                <p style="margin-top: 20px;"><a href="${process.env.APP_URL || 'https://ztts.apexsol.pk'}/account" style="display: inline-block; background: #1a3a2a; color: #d4a843; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Dashboard</a></p>
              </div>
            </div>
          `;
        } else {
          emailSubject = `[Zahabia] Flight Booking Update — ${flight.origin} → ${flight.destination}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
              <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="margin: 0; color: #d4a843;">FLIGHT BOOKING UPDATE</h1>
              </div>
              <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
                <p>Dear ${customerName || 'Customer'},</p>
                <p>Your flight booking has been updated:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                  <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Route</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flight.origin} → ${flight.destination}</td></tr>
                  ${flight.airline ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Airline</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flight.airline}</td></tr>` : ''}
                  ${flight.flight_number ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Flight</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flight.flight_number}</td></tr>` : ''}
                  ${flight.total_amount > 0 ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Fare</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">$${Number(flight.total_amount).toFixed(2)}</td></tr>` : ''}
                  <tr><td style="padding: 8px; font-weight: bold;">Status</td><td style="padding: 8px;">${flight.ticket_status.toUpperCase()}</td></tr>
                </table>
                <p style="margin-top: 20px;"><a href="${process.env.APP_URL || 'https://ztts.apexsol.pk'}/account" style="display: inline-block; background: #1a3a2a; color: #d4a843; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Dashboard</a></p>
              </div>
            </div>
          `;
        }

        const { sendEmail } = await import('../services/emailService.js');
        await sendEmail({ to: customerEmail, subject: emailSubject, html: emailHtml });
        await logNotificationRecord({ booking_type: 'flight', booking_id: flight.id, channel: 'email', recipient: customerEmail, status: 'sent' });
        res.json({ success: true, message: 'Email sent to ' + customerEmail });
      } catch (e) {
        await logNotificationRecord({ booking_type: 'flight', booking_id: flight.id, channel: 'email', recipient: customerEmail, status: 'failed', error: e.message });
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
