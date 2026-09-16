export function requireCustomerAuth(req, res, next) {
  if (req.session?.customer) {
    res.locals.customer = req.session.customer;
    return next();
  }
  return res.redirect('/account/login');
}
