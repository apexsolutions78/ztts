export function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect(`/auth/login?next=${encodeURIComponent(req.originalUrl)}`);
}

export function requireAdmin(req, res, next) {
  if (req.session?.user && req.session.user.role === 'admin') {
    return next();
  }
  return res.status(403).render('errors/403', {
    title: 'Access Denied',
    message: 'Administrator privilege required to perform this operation.'
  });
}

export function requireGuide(req, res, next) {
  if (req.session?.user && req.session.user.role === 'guide') {
    return next();
  }
  return res.status(403).render('errors/403', {
    title: 'Access Denied',
    message: 'Guide access required.'
  });
}

export function requireAdminOrGuide(req, res, next) {
  if (req.session?.user && ['admin', 'guide'].includes(req.session.user.role)) {
    return next();
  }
  return res.status(403).render('errors/403', {
    title: 'Access Denied'
  });
}
