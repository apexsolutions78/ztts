import { createFlightBooking, logAuditAction } from '../models/index.js';
import { sendEmail } from '../services/emailService.js';

export async function getPublicFlightRequest(req, res, next) {
  try {
    res.render('home/flight-request', {
      title: 'Request a Flight',
      error: null,
      form: {}
    });
  } catch (err) {
    next(err);
  }
}

export async function postPublicFlightRequest(req, res, next) {
  try {
    const { full_name, email, phone, origin, destination, departure_date, return_date, cabin_class, passengers, preferred_airline } = req.body;

    if (!full_name || !email || !origin || !destination || !departure_date) {
      return res.status(400).render('home/flight-request', {
        title: 'Request a Flight',
        error: 'Name, email, origin, destination, and departure date are required.',
        form: req.body
      });
    }

    const booking = await createFlightBooking({
      customer_id: null,
      airline: preferred_airline || 'Any',
      flight_number: 'PENDING',
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departure_date,
      arrival_date: return_date || null,
      cabin_class: cabin_class || 'Economy',
      total_amount: 0,
      created_by: null,
      ticket_status: 'pending',
      passengers: passengers || 1,
      notes: `Public request from ${full_name} (${email})${phone ? ' | Phone: ' + phone : ''}`
    });

    await logAuditAction({
      action: 'PUBLIC_FLIGHT_REQUEST',
      entity_type: 'flight',
      entity_id: booking.id,
      details: `Public flight request: ${full_name} — ${origin.toUpperCase()} → ${destination.toUpperCase()} on ${departure_date}`
    });

    const adminEmail = process.env.ADMIN_EMAIL || 'info@zahabiatravel.com';
    try {
      await sendEmail({
        to: adminEmail,
        subject: `[Zahabia] New Public Flight Request — ${origin.toUpperCase()} → ${destination.toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
            <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #d4a843;">NEW PUBLIC FLIGHT REQUEST</h1>
            </div>
            <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${full_name}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${email}</td></tr>
                ${phone ? `<tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${phone}</td></tr>` : ''}
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Route</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${origin.toUpperCase()} → ${destination.toUpperCase()}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Departure</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${departure_date}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Return</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${return_date || 'One-way'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Class</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${cabin_class || 'Economy'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Passengers</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${passengers || 1}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Preferred Airline</td><td style="padding: 8px;">${preferred_airline || 'Any'}</td></tr>
              </table>
              <p style="margin-top: 15px;"><a href="${process.env.APP_URL || 'https://ztts.apexsol.pk'}/admin/flights/${booking.id}" style="display: inline-block; background: #1a3a2a; color: #d4a843; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Review in Admin</a></p>
            </div>
          </div>
        `,
        text: `New Public Flight Request\nName: ${full_name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nRoute: ${origin.toUpperCase()} → ${destination.toUpperCase()}\nDeparture: ${departure_date}\nReturn: ${return_date || 'One-way'}\nClass: ${cabin_class || 'Economy'}\nPassengers: ${passengers || 1}\nPreferred Airline: ${preferred_airline || 'Any'}`
      });
    } catch (e) {
      console.error('[Public Flight Request] Admin email failed:', e.message);
    }

    res.redirect('/flights/request/success');
  } catch (err) {
    next(err);
  }
}

export async function getPublicFlightRequestSuccess(req, res, next) {
  try {
    res.render('home/flight-request-success', {
      title: 'Flight Request Submitted'
    });
  } catch (err) {
    next(err);
  }
}
