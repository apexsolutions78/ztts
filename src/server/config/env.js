import dotenv from 'dotenv';

dotenv.config({ override: false });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',



  port: Number.parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASS || ''
  },
  sessionSecret: process.env.SESSION_SECRET || 'dev-only-change-me',
  logFile: process.env.LOG_FILE || './logs/app.log',

  email: {
    host: process.env.SMTP_HOST || '',
    port: Number.parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Zahabia Travel & Tourism <noreply@zahabiatravel.com>'
  },

  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || ''
  }
};
