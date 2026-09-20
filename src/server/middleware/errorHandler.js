import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.join(__dirname, '../../../logs/app-error.log');

export function errorHandler(err, req, res, _next) {
  const msg = `[Apex Solutions Error] ${new Date().toISOString()} ${req.method} ${req.originalUrl}\n${err.stack || err.message || err}\n`;
  console.error(msg);
  try { fs.appendFileSync(logPath, msg); } catch (_) {}
  if (res.headersSent) return;

  const isAjax = req.xhr || (req.headers.accept && req.headers.accept.includes('json')) || req.path.startsWith('/api/');

  if (isAjax) {
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }

  res.status(500).render('errors/500', { title: 'Server Error' });
}
