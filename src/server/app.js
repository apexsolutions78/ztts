import express from 'express';
import session from 'express-session';
import morgan from 'morgan';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { pool, checkDatabase, isUsingMySQL } from './config/db.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import flightRoutes from './routes/flights.js';
import tourRoutes from './routes/tours.js';
import customerRoutes from './routes/customers.js';
import financeRoutes from './routes/finance.js';
import auditRoutes from './routes/audit.js';
import settingsRoutes from './routes/settings.js';
import portalRoutes from './routes/portal.js';
import apiRoutes from './routes/api.js';
import notificationRoutes from './routes/notifications.js';
import userRoutes from './routes/users.js';
import homeRoutes from './routes/home.js';
import chatRoutes from './routes/chat.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';
import { currencyMiddleware } from './middleware/currency.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.set('trust proxy', 1);

const logDir = path.dirname(env.logFile);
if (env.logFile && logDir !== '.') fs.mkdirSync(logDir, { recursive: true });
const logStream = env.logFile ? fs.createWriteStream(env.logFile, { flags: 'a' }) : process.stdout;

app.use(morgan('combined', { stream: logStream }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static client assets and brand media files from workspace root
app.use('/static', express.static(path.join(__dirname, '../client/public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/brand', express.static(path.join(__dirname, '../../')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../client/views'));
app.use((req, _res, next) => { req.db = pool; next(); });
app.use(session({
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: env.appUrl.startsWith('https://'), httpOnly: true, maxAge: 86400000 }
}));
app.use(currencyMiddleware);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.appUrl = env.appUrl;
  res.locals.currentPath = req.path;
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  next();
});

app.get('/health', async (_req, res, next) => {
  try {
    const connected = await checkDatabase();
    res.json({ 
      status: 'ok', 
      db: connected ? 'connected' : 'memory_fallback',
      engine: isUsingMySQL() ? 'MySQL' : 'MemoryStore'
    });
  } catch (error) {
    next(error);
  }
});

app.use('/auth', authRoutes);
app.use('/admin', requireAuth, adminRoutes);
app.use('/admin/flights', requireAuth, flightRoutes);
app.use('/admin/tours', requireAuth, tourRoutes);
app.use('/admin/customers', requireAuth, customerRoutes);
app.use('/admin/finance', requireAuth, financeRoutes);
app.use('/admin/audit-logs', requireAdmin, auditRoutes);
app.use('/admin/settings', requireAdmin, settingsRoutes);
app.use('/admin/users', requireAdmin, userRoutes);
app.use('/t', portalRoutes);
app.use('/api', apiRoutes);
app.use('/admin', requireAuth, notificationRoutes);
app.use('/admin/chat', requireAuth, chatRoutes);

app.use('/', homeRoutes);
app.get('/', (_req, res) => res.redirect('/auth/login'));
app.use((_req, res) => res.status(404).render('errors/404', { title: 'Page Not Found' }));
app.use(errorHandler);


const isTestMode = process.env.NODE_ENV === 'test' || env.nodeEnv === 'test' || process.execArgv.includes('--test');

if (!isTestMode) {
  app.listen(env.port, () => console.log(`Apex Solutions running on ${env.appUrl}`));
}

export default app;


