export function requireAuth(req, res, next) {
  if (req.session?.user) return next();
  return res.redirect(`/auth/login?next=${encodeURIComponent(req.originalUrl)}`);
}

export function requireAdmin(req, res, next) {
  if (req.session?.user && (req.session.user.role === 'admin' || req.session.user.role === 'superadmin')) {
    return next();
  }
  return res.status(403).render('errors/403', {
    title: 'Access Denied',
    message: 'Administrator privilege required to perform this operation.'
  });
}

