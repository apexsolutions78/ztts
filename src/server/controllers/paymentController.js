import {
  getBookingPaymentSummary,
  addPayment,
  updatePayment,
  deletePayment,
  refundPayment,
  findFlightBookingById,
  findTourBookingById,
  getFinancialLedger,
  logAuditAction
} from '../models/index.js';
import { generatePaymentReceiptPDF } from '../services/pdfService.js';

export async function getBookingPaymentsAPI(req, res, next) {
  try {
    const { type, id } = req.params;
    const summary = await getBookingPaymentSummary(type, id);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

export async function postAddPayment(req, res, next) {
  try {
    const { type, id } = req.params;
    const { amount, payment_method, payment_reference, notes, base_fare, tax_amount, agency_fee } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid payment amount' });
    }

    const summary = await getBookingPaymentSummary(type, id);
    if (summary.isFullyPaid) {
      return res.status(400).json({ success: false, error: 'This booking is already fully paid' });
    }

    const paymentAmount = Math.min(Number(amount), summary.balance);
    const payment = await addPayment({
      booking_type: type,
      booking_id: id,
      amount: paymentAmount,
      payment_method: payment_method || 'cash',
      payment_reference,
      notes,
      base_fare: base_fare ? Number(base_fare) : null,
      tax_amount: tax_amount ? Number(tax_amount) : null,
      agency_fee: agency_fee ? Number(agency_fee) : null,
      recorded_by: req.session.user?.id
    });

    let booking;
    if (type === 'flight') {
      booking = await findFlightBookingById(id);
    } else {
      booking = await findTourBookingById(id);
    }

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'ADD_PAYMENT',
      entity_type: 'payment',
      entity_id: payment.id,
      details: `Recorded ${paymentAmount} payment (${payment_method || 'cash'}) for ${type} booking #${id}${payment_reference ? ' — Ref: ' + payment_reference : ''}`
    });

    const updatedSummary = await getBookingPaymentSummary(type, id);
    res.json({
      success: true,
      payment,
      summary: updatedSummary,
      message: `Payment of ${paymentAmount} recorded successfully`
    });
  } catch (error) {
    next(error);
  }
}

export async function postUpdatePayment(req, res, next) {
  try {
    const { paymentId } = req.params;
    const { amount, payment_method, payment_reference, notes, payment_status } = req.body;

    const updated = await updatePayment(paymentId, {
      amount: amount ? Number(amount) : undefined,
      payment_method,
      payment_reference,
      notes,
      payment_status
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'UPDATE_PAYMENT',
      entity_type: 'payment',
      entity_id: paymentId,
      details: `Updated payment record #${paymentId}`
    });

    const summary = await getBookingPaymentSummary(updated.booking_type, updated.booking_id);
    res.json({ success: true, payment: updated, summary });
  } catch (error) {
    next(error);
  }
}

export async function postDeletePayment(req, res, next) {
  try {
    const { paymentId } = req.params;
    const removed = await deletePayment(paymentId);

    if (!removed) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'DELETE_PAYMENT',
      entity_type: 'payment',
      entity_id: paymentId,
      details: `Deleted payment #${removed.invoice_no} (${removed.amount})`
    });

    const summary = await getBookingPaymentSummary(removed.booking_type, removed.booking_id);
    res.json({ success: true, summary, message: 'Payment deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function postRefundPayment(req, res, next) {
  try {
    const { paymentId } = req.params;
    const { refund_amount, reason } = req.body;

    const refunded = await refundPayment(paymentId, refund_amount ? Number(refund_amount) : null);

    if (!refunded) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'REFUND_PAYMENT',
      entity_type: 'payment',
      entity_id: paymentId,
      details: `Refunded payment #${refunded.invoice_no} (${refunded.amount})${reason ? ' — Reason: ' + reason : ''}`
    });

    const summary = await getBookingPaymentSummary(refunded.booking_type, refunded.booking_id);
    res.json({ success: true, payment: refunded, summary, message: 'Payment refunded successfully' });
  } catch (error) {
    next(error);
  }
}

export async function downloadPaymentReceipt(req, res, next) {
  try {
    const { paymentId } = req.params;
    const ledger = await getFinancialLedger();
    const payment = ledger.find(p => String(p.id) === String(paymentId));
    if (!payment) return res.status(404).render('errors/404', { title: 'Payment Not Found' });
    generatePaymentReceiptPDF(payment, res, res.locals.activeCurrency, res.locals.exchangeRates);
  } catch (error) {
    next(error);
  }
}

export async function postRecordBatchPayments(req, res, next) {
  try {
    const { type, id } = req.params;
    const { payments } = req.body;

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ success: false, error: 'No payments provided' });
    }

    const summary = await getBookingPaymentSummary(type, id);
    if (summary.isFullyPaid) {
      return res.status(400).json({ success: false, error: 'This booking is already fully paid' });
    }

    let remainingBalance = summary.balance;
    const recordedPayments = [];

    for (const p of payments) {
      if (!p.amount || Number(p.amount) <= 0 || remainingBalance <= 0) continue;
      const paymentAmount = Math.min(Number(p.amount), remainingBalance);
      const payment = await addPayment({
        booking_type: type,
        booking_id: id,
        amount: paymentAmount,
        payment_method: p.payment_method || 'cash',
        payment_reference: p.payment_reference,
        notes: p.notes,
        base_fare: p.base_fare ? Number(p.base_fare) : null,
        tax_amount: p.tax_amount ? Number(p.tax_amount) : null,
        agency_fee: p.agency_fee ? Number(p.agency_fee) : null,
        recorded_by: req.session.user?.id
      });
      recordedPayments.push(payment);
      remainingBalance -= paymentAmount;
    }

    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'ADD_BATCH_PAYMENT',
      entity_type: 'payment',
      entity_id: id,
      details: `Recorded ${recordedPayments.length} payment(s) for ${type} booking #${id}`
    });

    const updatedSummary = await getBookingPaymentSummary(type, id);
    res.json({
      success: true,
      payments: recordedPayments,
      summary: updatedSummary,
      message: `${recordedPayments.length} payment(s) recorded successfully`
    });
  } catch (error) {
    next(error);
  }
}
