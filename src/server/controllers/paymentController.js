import {
  getBookingPaymentSummary,
  addPayment,
  updatePayment,
  deletePayment,
  findFlightBookingById,
  findTourBookingById,
  logAuditAction
} from '../models/index.js';

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
    const { amount, payment_method, payment_reference, notes } = req.body;

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
      details: `Voided payment #${removed.invoice_no} (${removed.amount})`
    });

    const summary = await getBookingPaymentSummary(removed.booking_type, removed.booking_id);
    res.json({ success: true, summary, message: 'Payment voided successfully' });
  } catch (error) {
    next(error);
  }
}
