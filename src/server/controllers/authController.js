import { findUserByEmail, createAuthCode, verifyAuthCode, cleanupExpiredCodes, logAuditAction } from '../models/index.js';
import { sendEmail, buildAuthCodeEmail } from '../services/emailService.js';

export async function getLogin(req, res) {
  if (req.session?.user) return res.redirect(req.session.user.role === 'guide' ? '/guide' : '/admin');
  res.render('auth/login', {
    title: 'Operations Login',
    next: req.query.next || '/admin',
    error: null,
    step: 'email',
    email: '',
    message: null
  });
}

export async function postLogin(req, res) {
  const { email, next } = req.body;
  const targetRedirect = next || '/admin';

  if (!email) {
    return res.status(400).render('auth/login', {
      title: 'Operations Login', next: targetRedirect,
      error: 'Email is required.', step: 'email', email: '', message: null
    });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    await logAuditAction({ action: 'LOGIN_FAILED', entity_type: 'auth', details: `No user: ${email}`, ip_address: req.ip });
    return res.status(401).render('auth/login', {
      title: 'Operations Login', next: targetRedirect,
      error: 'No account found with this email.', step: 'email', email, message: null
    });
  }

  await cleanupExpiredCodes();
  const { code } = await createAuthCode({ email, purpose: 'login' });

  try {
    await sendEmail({ to: email, ...buildAuthCodeEmail({ email, code, purpose: 'login' }) });
  } catch (e) {
    console.error('[Auth] Email send failed:', e.message);
  }

  res.render('auth/login', {
    title: 'Operations Login', next: targetRedirect,
    error: null, step: 'code', email,
    message: `Code sent to ${email}`
  });
}

export async function postVerify(req, res) {
  const { email, code, next } = req.body;
  const targetRedirect = next || '/admin';

  if (!email || !code) {
    return res.status(400).render('auth/login', {
      title: 'Operations Login', next: targetRedirect,
      error: 'Code is required.', step: 'code', email: email || '', message: null
    });
  }

  const record = await verifyAuthCode(email, code);
  if (!record) {
    return res.status(401).render('auth/login', {
      title: 'Operations Login', next: targetRedirect,
      error: 'Invalid or expired code.', step: 'code', email, message: null
    });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).render('auth/login', {
      title: 'Operations Login', next: targetRedirect,
      error: 'Account not found.', step: 'email', email, message: null
    });
  }

  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  await logAuditAction({ user_id: user.id, user_name: user.name, action: 'LOGIN', entity_type: 'auth', details: `${user.name} logged in via code` });

  if (user.role === 'guide') return res.redirect('/guide');
  return res.redirect(targetRedirect);
}

export async function postLogout(req, res) {
  const user = req.session?.user;
  if (user) {
    await logAuditAction({ user_id: user.id, user_name: user.name, action: 'LOGOUT', entity_type: 'auth', details: `${user.name} logged out`, ip_address: req.ip });
  }
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
}
