export function errorHandler(err, req, res, _next) {
  console.error('[Apex Solutions Error]', err.message || err);
  if (res.headersSent) return;

  const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('json')) || req.path.startsWith('/api/');

  if (isAjax) {
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }

  res.status(500).render('errors/500', { title: 'Server Error' });
}
