import { getExchangeRates, updateExchangeRate, logAuditAction } from '../models/index.js';

export async function getExchangeRatesPage(req, res, next) {
  try {
    const rates = await getExchangeRates();
    res.render('admin/settings/rates', {
      title: 'Exchange Rate Management',
      rates,
      success: req.query.success || null,
      error: null
    });
  } catch (error) {
    next(error);
  }
}

export async function postUpdateExchangeRates(req, res, next) {
  try {
    const ratesInput = req.body.rates;
    if (!ratesInput || typeof ratesInput !== 'object') {
      const rates = await getExchangeRates();
      return res.status(400).render('admin/settings/rates', {
        title: 'Exchange Rate Management',
        rates,
        success: null,
        error: 'Invalid rate inputs.'
      });
    }

    const updatedCurrencies = [];
    for (const [code, rateVal] of Object.entries(ratesInput)) {
      if (code !== 'USD') { // USD is base currency = 1.0
        const updated = await updateExchangeRate(code, rateVal);
        if (updated) updatedCurrencies.push(`${code}: ${rateVal}`);
      }
    }

    // Log Audit Action
    await logAuditAction({
      user_id: req.session.user.id,
      user_name: req.session.user.name,
      action: 'UPDATE_EXCHANGE_RATES',
      entity_type: 'settings',
      entity_id: 'rates',
      details: `Updated exchange rates: ${updatedCurrencies.join(', ')}`
    });

    res.redirect('/admin/settings/rates?success=Exchange+rates+updated+successfully');
  } catch (error) {
    next(error);
  }
}
