import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.email.host || !env.email.host.trim() || !env.email.user || !env.email.user.trim()) {
    console.warn('[Apex Solutions Email] SMTP not configured – emails will be logged only');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.secure,
    auth: {
      user: env.email.user,
      pass: env.email.pass
    }
  });

  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  const mail = getTransporter();

  const record = {
    to,
    subject,
    html,
    text: text || subject,
    from: env.email.from || `Zahabia Travel & Tourism <${env.email.user || 'noreply@zahabiatravel.com'}>`
  };

  if (!mail) {
    console.log('[Apex Solutions Email] SMTP unavailable – logging email only:', { to, subject });
    return { success: true, simulated: true, record };
  }

  try {
    const info = await mail.sendMail(record);
    console.log('[Apex Solutions Email] Sent:', info.messageId);
    return { success: true, simulated: false, messageId: info.messageId, record };
  } catch (error) {
    console.error('[Apex Solutions Email] Send failed:', error.message);
    return { success: false, error: error.message, record };
  }
}

export function buildETicketEmail({ customerName, bookingRef, airline, flightNumber, origin, destination, departureDate, arrivalDate, cabinClass, totalAmount, portalUrl }) {
  const subject = `E-Ticket Confirmation: PNR ${bookingRef}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
      <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; color: #d4a843;">ZAHABIA TRAVEL & TOURISM</h1>
        <p style="margin: 5px 0 0; color: #a0aec0; font-size: 12px;">ELECTRONIC TICKET CONFIRMATION</p>
      </div>
      <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Your electronic ticket has been issued successfully. Here are your flight details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">PNR / Booking Ref</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${bookingRef}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Airline</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${airline}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Flight Number</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${flightNumber}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Route</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${origin} → ${destination}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Departure</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${new Date(departureDate).toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Arrival</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${new Date(arrivalDate).toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Cabin Class</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${cabinClass}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Total Fare</td><td style="padding: 8px;">$${Number(totalAmount).toFixed(2)}</td></tr>
        </table>
        <p style="margin: 15px 0;">View your full e-ticket and itinerary online:</p>
        <a href="${portalUrl}" style="display: inline-block; background: #1a3a2a; color: #d4a843; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View E-Ticket Portal</a>
        <p style="margin-top: 20px; font-size: 12px; color: #718096;">For support, contact us at support@zahabiatravel.com</p>
      </div>
      <div style="text-align: center; padding: 15px; font-size: 11px; color: #a0aec0;">
        &copy; 2026 Zahabia Travel & Tourism. Powered by Apex Solutions.
      </div>
    </div>
  `;
  const textContent = `E-Ticket Confirmation\nPNR: ${bookingRef}\n${airline} ${flightNumber}\n${origin} → ${destination}\nDeparture: ${new Date(departureDate).toLocaleString()}\nArrival: ${new Date(arrivalDate).toLocaleString()}\nClass: ${cabinClass}\nTotal: $${Number(totalAmount).toFixed(2)}\n\nView your e-ticket: ${portalUrl}`;
  return { subject, html, text: textContent };
}

export function buildTourConfirmationEmail({ customerName, tourTitle, destination, travelDate, totalTravelers, totalAmount, portalUrl }) {
  const subject = `Tour Booking Confirmed: ${tourTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
      <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; color: #d4a843;">ZAHABIA TRAVEL & TOURISM</h1>
        <p style="margin: 5px 0 0; color: #a0aec0; font-size: 12px;">TOUR BOOKING CONFIRMATION</p>
      </div>
      <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Your tour booking has been confirmed. Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Tour Package</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tourTitle}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Destination</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${destination}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Travel Date</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${travelDate}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Travelers</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${totalTravelers}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Total Amount</td><td style="padding: 8px;">$${Number(totalAmount).toFixed(2)}</td></tr>
        </table>
        <a href="${portalUrl}" style="display: inline-block; background: #1a3a2a; color: #d4a843; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Booking Details</a>
        <p style="margin-top: 20px; font-size: 12px; color: #718096;">For support, contact us at support@zahabiatravel.com</p>
      </div>
      <div style="text-align: center; padding: 15px; font-size: 11px; color: #a0aec0;">
        &copy; 2026 Zahabia Travel & Tourism. Powered by Apex Solutions.
      </div>
    </div>
  `;
  const textContent = `Tour Booking Confirmed\n${tourTitle}\nDestination: ${destination}\nTravel Date: ${travelDate}\nTravelers: ${totalTravelers}\nTotal: $${Number(totalAmount).toFixed(2)}\n\nView booking: ${portalUrl}`;
  return { subject, html, text: textContent };
}

export function buildGroupTourNotificationEmail({ groupTitle, tourTitle, destination, travelDate, status, action, guideName }) {
  const subject = `Group Tour ${action}: ${groupTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
      <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; color: #d4a843;">ZAHABIA TRAVEL & TOURISM</h1>
        <p style="margin: 5px 0 0; color: #a0aec0; font-size: 12px;">GROUP TOUR ${action.toUpperCase()}</p>
      </div>
      <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
        <p>Hello,</p>
        <p>A group tour has been <strong>${action.toLowerCase()}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Group Title</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${groupTitle}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Tour Package</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tourTitle}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Destination</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${destination || 'TBD'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Travel Date</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${travelDate || 'TBD'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Status</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${status}</td></tr>
          ${guideName ? `<tr><td style="padding: 8px; font-weight: bold;">Assigned Guide</td><td style="padding: 8px;">${guideName}</td></tr>` : ''}
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #718096;">For support, contact us at support@zahabiatravel.com</p>
      </div>
      <div style="text-align: center; padding: 15px; font-size: 11px; color: #a0aec0;">
        &copy; 2026 Zahabia Travel & Tourism. Powered by Apex Solutions.
      </div>
    </div>
  `;
  const textNotification = `Group Tour ${action}\n${groupTitle}\nTour: ${tourTitle}\nDestination: ${destination || 'TBD'}\nDate: ${travelDate || 'TBD'}\nStatus: ${status}${guideName ? `\nGuide: ${guideName}` : ''}`;
  return { subject, html, text: textNotification };
}

export function buildMemberPortalEmail({ customerName, tourTitle, destination, travelDate, totalTravelers, membersAdded, portalUrl }) {
  const subject = `Complete Your Group — ${tourTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
      <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; color: #d4a843;">ZAHABIA TRAVEL & TOURISM</h1>
        <p style="margin: 5px 0 0; color: #a0aec0; font-size: 12px;">COMPLETE YOUR GROUP</p>
      </div>
      <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>Your tour booking for <strong>${tourTitle}</strong> has been received. To complete your reservation, please provide the details for all ${totalTravelers} traveler(s).</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Tour Package</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tourTitle}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Destination</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${destination}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Travel Date</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${travelDate}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Members Added</td><td style="padding: 8px;">${membersAdded} / ${totalTravelers}</td></tr>
        </table>
        <a href="${portalUrl}" style="display: inline-block; background: #1a3a2a; color: #d4a843; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Add Member Details →</a>
        <p style="margin-top: 20px; font-size: 12px; color: #718096;">For support, contact us at support@zahabiatravel.com</p>
      </div>
      <div style="text-align: center; padding: 15px; font-size: 11px; color: #a0aec0;">
        &copy; 2026 Zahabia Travel & Tourism. Powered by Apex Solutions.
      </div>
    </div>
  `;
  const textContent = `Complete Your Group\n${tourTitle}\nDestination: ${destination}\nTravel Date: ${travelDate}\nMembers Added: ${membersAdded} / ${totalTravelers}\n\nAdd member details: ${portalUrl}`;
  return { subject, html, text: textContent };
}

export function buildGroupCompleteEmail({ customerName, tourTitle, destination, travelDate, totalTravelers }) {
  const subject = `Group Complete — ${tourTitle} Confirmed!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
      <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; color: #d4a843;">ZAHABIA TRAVEL & TOURISM</h1>
        <p style="margin: 5px 0 0; color: #a0aec0; font-size: 12px;">GROUP COMPLETE — BOOKING CONFIRMED</p>
      </div>
      <div style="background: #fff; padding: 20px; border: 1px solid #e2e8f0;">
        <p>Dear <strong>${customerName}</strong>,</p>
        <p>All ${totalTravelers} member(s) have been added to your group. Your booking is now <strong>confirmed</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Tour Package</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${tourTitle}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Destination</td><td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${destination}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Travel Date</td><td style="padding: 8px;">${travelDate}</td></tr>
        </table>
        <p style="margin-top: 20px; font-size: 12px; color: #718096;">For support, contact us at support@zahabiatravel.com</p>
      </div>
      <div style="text-align: center; padding: 15px; font-size: 11px; color: #a0aec0;">
        &copy; 2026 Zahabia Travel & Tourism. Powered by Apex Solutions.
      </div>
    </div>
  `;
  const textContent = `Group Complete — Booking Confirmed!\n${tourTitle}\nDestination: ${destination}\nTravel Date: ${travelDate}\nAll ${totalTravelers} member(s) added.`;
  return { subject, html, text: textContent };
}

export function buildAuthCodeEmail({ email, code, purpose = 'login' }) {
  const subject = `Zahabia Travel — Your ${purpose === 'register' ? 'Registration' : 'Login'} Code: ${code}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
      <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; color: #d4a843;">ZAHABIA TRAVEL & TOURISM</h1>
        <p style="margin: 5px 0 0; color: #a0aec0; font-size: 12px;">${purpose === 'register' ? 'ACCOUNT VERIFICATION' : 'SECURE LOGIN CODE'}</p>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #4a5568; font-size: 14px;">Your 6-digit verification code:</p>
        <div style="font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #1a3a2a; margin: 20px 0;">${code}</div>
        <p style="color: #718096; font-size: 12px;">This code expires in 30 minutes. Do not share it with anyone.</p>
        <p style="color: #718096; font-size: 12px;">If you did not request this code, please ignore this email.</p>
      </div>
      <div style="text-align: center; padding: 15px; color: #a0aec0; font-size: 11px;">
        Zahabia Travel & Tourism — Dubai, UAE
      </div>
    </div>
  `;
  return { subject, html, text: `Your verification code is: ${code}. It expires in 30 minutes.` };
}

export function buildMemberPortalInviteEmail({ memberName, tourTitle, portalUrl }) {
  const subject = `You're Invited — Join Your Tour Group: ${tourTitle}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px;">
      <div style="background: #1a3a2a; color: #fff; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; color: #d4a843;">ZAHABIA TRAVEL & TOURISM</h1>
        <p style="margin: 5px 0 0; color: #a0aec0; font-size: 12px;">TOUR GROUP INVITATION</p>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #4a5568; font-size: 14px;">Hello <strong>${memberName}</strong>,</p>
        <p style="color: #4a5568; font-size: 14px;">You have been added to a tour group: <strong>${tourTitle}</strong>.</p>
        <p style="color: #4a5568; font-size: 14px;">Click below to view your tour details and milestones:</p>
        <a href="${portalUrl}" style="display: inline-block; background: #1a3a2a; color: #d4a843; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">View My Tour Details</a>
        <p style="color: #718096; font-size: 12px;">This is your personal tour link. Keep it safe.</p>
      </div>
      <div style="text-align: center; padding: 15px; color: #a0aec0; font-size: 11px;">
        Zahabia Travel & Tourism — Dubai, UAE
      </div>
    </div>
  `;
  return { subject, html, text: `Hello ${memberName}, you've been added to ${tourTitle}. View your details: ${portalUrl}` };
}
