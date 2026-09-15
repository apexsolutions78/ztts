import {
  findFlightBookingById,
  findCustomerById,
  createPortalToken,
  logNotificationRecord,
  getNotificationsForBooking
} from '../models/index.js';
import { sendEmail, buildETicketEmail, buildTourConfirmationEmail } from '../services/emailService.js';
import { sendWhatsApp, buildETicketWhatsAppMessage, buildTourConfirmationWhatsAppMessage } from '../services/whatsAppService.js';

export async function sendFlightEmailNotification(req, res, next) {
  try {
    const { id } = req.params;
    const flight = await findFlightBookingById(id);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });

    const customer = await findCustomerById(flight.customer_id);
    if (!customer || !customer.email) {
      return res.status(400).json({ error: 'Customer has no email address on file' });
    }

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

    const result = await sendEmail({
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
      status: result.success ? 'delivered' : 'failed'
    });

    res.json({
      success: true,
      simulated: result.simulated || false,
      message: result.simulated
        ? `Email logged (SMTP not configured) — would be sent to ${customer.email}`
        : result.success
          ? `Email sent to ${customer.email}`
          : `Failed to send email — SMTP not configured`
    });
  } catch (error) {
    next(error);
  }
}

export async function sendFlightWhatsAppNotification(req, res, next) {
  try {
    const { id } = req.params;
    const flight = await findFlightBookingById(id);
    if (!flight) return res.status(404).json({ error: 'Flight not found' });

    const customer = await findCustomerById(flight.customer_id);
    if (!customer || !customer.phone) {
      return res.status(400).json({ error: 'Customer has no phone number on file' });
    }

    const portalToken = await createPortalToken({
      customer_id: flight.customer_id,
      flight_booking_id: flight.id
    });
    const portalUrl = `${req.protocol}://${req.get('host')}/t/${portalToken}`;

    const message = buildETicketWhatsAppMessage({
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

    const result = await sendWhatsApp({
      to: customer.phone,
      message
    });

    await logNotificationRecord({
      customer_id: flight.customer_id,
      flight_booking_id: flight.id,
      channel: 'whatsapp',
      recipient: customer.phone,
      subject: `WhatsApp E-Ticket: ${flight.booking_ref}`,
      content: message,
      status: result.success ? 'delivered' : 'failed'
    });

    res.json({
      success: true,
      simulated: result.simulated || false,
      message: result.simulated
        ? `WhatsApp logged (API not configured) — would be sent to ${customer.phone}`
        : result.success
          ? `WhatsApp sent to ${customer.phone}`
          : `Failed to send WhatsApp — API not configured`
    });
  } catch (error) {
    next(error);
  }
}

export async function getBookingNotifications(req, res, next) {
  try {
    const { id } = req.params;
    const notifications = await getNotificationsForBooking(id);
    res.json({ success: true, data: notifications });
  } catch (error) {
    next(error);
  }
}
