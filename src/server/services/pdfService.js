import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

const BRAND = {
  primary: '#05443b',
  gold: '#d4af37',
  dark: '#0b192c',
  muted: '#5c7370',
  light: '#f4f7f6'
};

export async function generateETicketPDF(flight, customer, res, portalToken) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=E-Ticket_${flight.booking_ref}.pdf`);
  doc.pipe(res);

  // Generate QR code buffer if token available
  let qrDataUrl = null;
  if (portalToken) {
    try {
      const host = res.req?.get('host') || 'ztts.apexsol.pk';
      const protocol = res.req?.protocol || 'https';
      qrDataUrl = await QRCode.toDataURL(`${protocol}://${host}/t/${portalToken}`, { width: 200, margin: 1 });
    } catch (e) { /* skip QR on error */ }
  }

  // Header bar
  doc.rect(0, 0, 595.28, 90).fill(BRAND.dark);
  doc.fontSize(22).fill('#ffffff').font('Helvetica-Bold').text('ZAHABIA TRAVEL & TOURISM', 50, 25);
  doc.fontSize(10).fill(BRAND.gold).text('ELECTRONIC TICKET RECEIPT', 50, 55);

  // PNR box
  doc.roundedRect(420, 20, 130, 50, 5).fill(BRAND.gold);
  doc.fontSize(9).fill(BRAND.dark).text('PNR / BOOKING REF', 430, 28, { width: 110, align: 'center' });
  doc.fontSize(18).font('Helvetica-Bold').text(flight.booking_ref, 430, 45, { width: 110, align: 'center' });

  // Flight route
  let y = 110;
  doc.fill(BRAND.light).rect(50, y, 495, 80).fill();
  doc.fontSize(28).font('Helvetica-Bold').fill(BRAND.primary).text(flight.origin, 70, y + 15);
  doc.fontSize(12).fill(BRAND.muted).text('Departure Airport', 70, y + 50);
  doc.fontSize(14).font('Helvetica-Bold').fill(BRAND.primary).text(`${flight.airline} | ${flight.flight_number}`, 220, y + 10);
  doc.moveTo(200, y + 35).lineTo(390, y + 35).stroke(BRAND.gold);
  doc.fontSize(10).fill(BRAND.muted).text(`${flight.cabin_class} Class`, 240, y + 42);
  doc.fontSize(28).font('Helvetica-Bold').fill(BRAND.primary).text(flight.destination, 400, y + 15);
  doc.fontSize(10).fill(BRAND.muted).text('Destination', 400, y + 50);

  // Passenger details
  y = 210;
  doc.fontSize(14).font('Helvetica-Bold').fill(BRAND.primary).text('PASSENGER DETAILS', 50, y);
  y += 25;
  const details = [
    ['Passenger Name', customer?.full_name || 'N/A'],
    ['Passport Number', customer?.passport_number || 'N/A'],
    ['Nationality', customer?.nationality || 'N/A'],
    ['Departure', new Date(flight.departure_date).toLocaleString()],
    ['Arrival', new Date(flight.arrival_date).toLocaleString()],
    ['Total Fare', `$${Number(flight.total_amount).toFixed(2)}`],
    ['Ticket Status', flight.ticket_status.toUpperCase()]
  ];
  details.forEach(([label, value]) => {
    doc.fontSize(9).font('Helvetica-Bold').fill(BRAND.muted).text(label.toUpperCase(), 50, y, { width: 150 });
    doc.fontSize(10).font('Helvetica').fill(BRAND.dark).text(value, 210, y, { width: 300 });
    y += 18;
  });

  // QR Code or verification
  y += 20;
  doc.moveTo(50, y).lineTo(545, y).dash(3, { space: 3 }).stroke(BRAND.muted);
  y += 15;
  doc.fontSize(8).fill(BRAND.muted).text('E-TICKET VERIFICATION', 50, y);
  doc.fontSize(10).font('Helvetica-Bold').fill(BRAND.primary).text(`ZHB-ETKT-${flight.id}-2026-X99`, 50, y + 14);
  if (qrDataUrl) {
    try {
      doc.image(qrDataUrl, 420, y - 10, { width: 100, height: 100 });
      doc.fontSize(7).fill(BRAND.muted).text('Scan to open portal', 420, y + 95, { width: 100, align: 'center' });
    } catch (e) { /* skip */ }
  }

  // Footer
  doc.fontSize(8).fill(BRAND.muted).text('For customer support, contact support@zahabiatravel.com | Powered by Apex Solutions', 50, 760, { width: 495, align: 'center' });

  doc.end();
}

export function generateInvoicePDF(invoice, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoice_no || invoice.id}.pdf`);
  doc.pipe(res);

  // Header
  doc.rect(0, 0, 595.28, 80).fill(BRAND.dark);
  doc.fontSize(20).fill('#ffffff').font('Helvetica-Bold').text('ZAHABIA TRAVEL & TOURISM', 50, 20);
  doc.fontSize(10).fill(BRAND.gold).text('TAX INVOICE', 50, 48);

  // Invoice info
  let y = 100;
  doc.fontSize(9).font('Helvetica-Bold').fill(BRAND.muted).text('INVOICE NO', 50, y);
  doc.fontSize(12).font('Helvetica-Bold').fill(BRAND.dark).text(invoice.invoice_no || `INV-${invoice.id}`, 50, y + 14);
  doc.fontSize(9).font('Helvetica-Bold').fill(BRAND.muted).text('DATE', 250, y);
  doc.fontSize(10).fill(BRAND.dark).text(invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : new Date().toLocaleDateString(), 250, y + 14);
  doc.fontSize(9).font('Helvetica-Bold').fill(BRAND.muted).text('PAYMENT METHOD', 400, y);
  doc.fontSize(10).fill(BRAND.dark).text((invoice.payment_method || '').replace('_', ' ').toUpperCase(), 400, y + 14);

  // Customer details
  y = 145;
  doc.rect(50, y, 495, 60).fill('#f0f4f8');
  y += 10;
  doc.fontSize(9).font('Helvetica-Bold').fill(BRAND.muted).text('BILL TO', 60, y);
  doc.fontSize(11).font('Helvetica-Bold').fill(BRAND.dark).text(invoice.customer_name || 'Customer', 60, y + 14);
  const customerDetails = [];
  if (invoice.passport_number) customerDetails.push(`Passport: ${invoice.passport_number}`);
  if (invoice.customer_email) customerDetails.push(`Email: ${invoice.customer_email}`);
  if (invoice.customer_phone) customerDetails.push(`Phone: ${invoice.customer_phone}`);
  doc.fontSize(9).fill(BRAND.muted).text(customerDetails.join('  |  ') || 'No customer details', 60, y + 30, { width: 480 });

  // Booking details
  y = 220;
  doc.fontSize(10).font('Helvetica-Bold').fill(BRAND.primary).text('BOOKING DETAILS', 50, y);
  y += 18;
  doc.moveTo(50, y).lineTo(545, y).stroke(BRAND.gold);
  y += 10;

  const bookingItems = [];
  bookingItems.push(['Service', invoice.booking_type === 'flight' ? 'Air Ticket' : 'Tour Package']);
  if (invoice.booking_ref) bookingItems.push(['Booking Ref / PNR', invoice.booking_ref]);
  if (invoice.booking_title) bookingItems.push([invoice.booking_type === 'flight' ? 'Airline' : 'Tour Package', invoice.booking_title]);
  if (invoice.booking_route) bookingItems.push(['Route / Destination', invoice.booking_route]);
  if (invoice.travel_date) bookingItems.push([invoice.booking_type === 'flight' ? 'Departure Date' : 'Travel Date', new Date(invoice.travel_date).toLocaleDateString()]);

  bookingItems.forEach(([label, value]) => {
    doc.fontSize(9).font('Helvetica-Bold').fill(BRAND.muted).text(label.toUpperCase(), 60, y, { width: 150 });
    doc.fontSize(10).font('Helvetica').fill(BRAND.dark).text(value, 220, y, { width: 320 });
    y += 16;
  });

  // Line items
  y += 10;
  doc.rect(50, y, 495, 25).fill(BRAND.light);
  doc.fontSize(8).font('Helvetica-Bold').fill(BRAND.muted).text('DESCRIPTION', 60, y + 8);
  doc.text('AMOUNT', 380, y + 8, { width: 160, align: 'right' });
  y += 30;

  const baseFare = invoice.base_fare != null ? Number(invoice.base_fare) : null;
  const taxAmount = invoice.tax_amount != null ? Number(invoice.tax_amount) : null;
  const agencyFee = invoice.agency_fee != null ? Number(invoice.agency_fee) : null;

  const items = [];
  if (baseFare != null) items.push(['Base Fare', `$${baseFare.toFixed(2)}`]);
  if (taxAmount != null) items.push(['Taxes & Fees', `$${taxAmount.toFixed(2)}`]);
  if (agencyFee != null) items.push(['Agency Service Fee', `$${agencyFee.toFixed(2)}`]);
  if (items.length === 0) items.push(['Total Amount', `$${Number(invoice.amount).toFixed(2)}`]);
  items.forEach(([desc, amt]) => {
    doc.fontSize(10).fill(BRAND.dark).text(desc, 60, y, { width: 300 });
    doc.text(amt, 380, y, { width: 160, align: 'right' });
    y += 20;
  });

  // Total
  y += 5;
  doc.moveTo(50, y).lineTo(545, y).stroke(BRAND.muted);
  y += 10;
  doc.fontSize(14).font('Helvetica-Bold').fill(BRAND.primary).text('TOTAL AMOUNT', 60, y);
  doc.fontSize(14).font('Helvetica-Bold').fill(BRAND.gold).text(`$${Number(invoice.amount).toFixed(2)}`, 380, y, { width: 160, align: 'right' });

  // Payment status
  y += 30;
  doc.roundedRect(50, y, 100, 25, 5).fill(invoice.payment_status === 'paid' ? '#38a169' : invoice.payment_status === 'partial' ? '#d69e2e' : '#e53e3e');
  doc.fontSize(10).font('Helvetica-Bold').fill('#ffffff').text((invoice.payment_status || 'PAID').toUpperCase(), 55, y + 7, { width: 90, align: 'center' });

  // Transaction ID
  if (invoice.transaction_id) {
    doc.fontSize(8).fill(BRAND.muted).text(`Transaction: ${invoice.transaction_id}`, 170, y + 8);
  }

  // Footer
  doc.fontSize(8).fill(BRAND.muted).text('Thank you for your business! | support@zahabiatravel.com | Powered by Apex Solutions', 50, 760, { width: 495, align: 'center' });

  doc.end();
}
