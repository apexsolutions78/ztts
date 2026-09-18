import { getFinancialLedger, getDashboardStats, generateCSV } from '../models/index.js';
import { generateInvoicePDF } from '../services/pdfService.js';

export async function viewFinanceOverview(req, res, next) {
  try {
    let ledger = await getFinancialLedger();
    const stats = await getDashboardStats();

    // Apply filters
    const { search, type, date_from, date_to } = req.query;
    let filtered = [...ledger];

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        (p.invoice_no && p.invoice_no.toLowerCase().includes(q)) ||
        (p.transaction_id && p.transaction_id.toLowerCase().includes(q)) ||
        (p.payment_method && p.payment_method.toLowerCase().includes(q))
      );
    }

    if (type) {
      filtered = filtered.filter(p => p.booking_type === type);
    }

    if (date_from) {
      const from = new Date(date_from);
      filtered = filtered.filter(p => new Date(p.created_at) >= from);
    }

    if (date_to) {
      const to = new Date(date_to);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.created_at) <= to);
    }

    // Calculate filtered totals
    const filteredTotal = filtered.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const filteredFlightTotal = filtered.filter(p => p.booking_type === 'flight').reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const filteredTourTotal = filtered.filter(p => p.booking_type === 'tour').reduce((sum, p) => sum + Number(p.amount || 0), 0);

    res.render('admin/finance/index', {
      title: 'Agency Financial Ledger',
      ledger: filtered,
      stats,
      filters: { search, type, date_from, date_to },
      filteredStats: { total: filteredTotal, flight: filteredFlightTotal, tour: filteredTourTotal, count: filtered.length }
    });
  } catch (error) {
    next(error);
  }
}

export async function exportFinanceCSV(req, res, next) {
  try {
    const ledger = await getFinancialLedger();
    const headers = ['Invoice No', 'Booking Type', 'Booking ID', 'Total Amount', 'Base Fare', 'Taxes', 'Agency Fee', 'Payment Method', 'Status', 'Transaction ID', 'Date'];
    const rows = ledger.map(p => [
      p.invoice_no || `INV-${p.id}`,
      p.booking_type,
      p.booking_id,
      p.amount,
      p.base_fare || '',
      p.tax_amount || '',
      p.agency_fee || '',
      p.payment_method,
      p.payment_status,
      p.transaction_id,
      p.created_at
    ]);

    const csvContent = generateCSV(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=Zahabia_Financial_Ledger_2026.csv');
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
}

export async function downloadInvoicePDF(req, res, next) {
  try {
    const ledger = await getFinancialLedger();
    const invoice = ledger.find(p => String(p.id) === String(req.params.id));
    if (!invoice) return res.status(404).render('errors/404', { title: 'Invoice Not Found' });
    generateInvoicePDF(invoice, res, res.locals.activeCurrency, res.locals.exchangeRates);
  } catch (error) {
    next(error);
  }
}
