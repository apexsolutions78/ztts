import { getExchangeRates, formatPrice } from '../models/index.js';

export async function currencyMiddleware(req, res, next) {
  try {
    // Check if currency parameter is passed in URL query e.g. ?currency=AED
    if (req.query.currency) {
      const selectedCurrency = String(req.query.currency).toUpperCase();
      if (['USD', 'AED', 'EUR', 'GBP', 'SAR', 'PKR'].includes(selectedCurrency)) {
        req.session.currency = selectedCurrency;
      }
    }

    const activeCurrency = req.session?.currency || 'PKR';
    const exchangeRates = await getExchangeRates();

    res.locals.activeCurrency = activeCurrency;
    res.locals.exchangeRates = exchangeRates;
    res.locals.formatPrice = (amount) => formatPrice(amount, activeCurrency, exchangeRates);

    next();
  } catch (error) {
    next(error);
  }
}
