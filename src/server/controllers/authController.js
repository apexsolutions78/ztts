import { findUserByEmail, createAuthCode, verifyAuthCode, cleanupExpiredCodes, logAuditAction } from '../models/index.js';
import { hashPassword } from '../config/db.js';
import { sendEmail, buildAuthCodeEmail } from '../services/emailService.js';

function getAdminLoginView(next) {
  return (next || '').startsWith('/admin') ? 'auth/admin-login' : 'auth/login';
}

function getAdminLoginTitle(next) {
  return (next || '').startsWith('/admin') ? 'Operator Login' : 'Operations Login';
}

export async function getLogin(req, res) {
  if (req.session?.user) return res.redirect(req.session.user.role === 'guide' ? '/guide' : '/admin');
  const next = req.query.next || '/admin';
  const view = getAdminLoginView(next);
  res.render(view, {
    title: getAdminLoginTitle(next),
    next,
    error: null,
    step: 'email',
    email: '',
    message: null
  });
}

export async function postLogin(req, res) {
  const { email, password, next } = req.body;
  const targetRedirect = next || '/admin';
  const view = getAdminLoginView(targetRedirect);
  const title = getAdminLoginTitle(targetRedirect);

  if (!email) {
    return res.status(400).render(view, {
      title, next: targetRedirect,
      error: 'Email is required.', step: 'email', email: '', message: null
    });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    await logAuditAction({ action: 'LOGIN_FAILED', entity_type: 'auth', details: `No user: ${email}`, ip_address: req.ip });
    return res.status(401).render(view, {
      title, next: targetRedirect,
      error: 'No account found with this email.', step: 'email', email, message: null
    });
  }

  // If user has a password and password was submitted — password login
  if (user.password_hash && password) {
    const inputHash = hashPassword(password);
    if (user.password_hash === inputHash) {
      req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      await logAuditAction({ user_id: user.id, user_name: user.name, action: 'LOGIN', entity_type: 'auth', details: `${user.name} logged in via password` });
      if (user.role === 'guide') return res.redirect('/guide');
      return res.redirect(targetRedirect);
    }
    return res.status(401).render(view, {
      title, next: targetRedirect,
      error: 'Invalid password.', step: 'password', email, message: null
    });
  }

  // If user has a password but no password submitted — show password step
  if (user.password_hash && !password) {
    return res.render(view, {
      title, next: targetRedirect,
      error: null, step: 'password', email, message: null
    });
  }

  // User has NO password — send auth code
  await cleanupExpiredCodes();
  const { code } = await createAuthCode({ email, purpose: 'login' });

  try {
    await sendEmail({ to: email, ...buildAuthCodeEmail({ email, code, purpose: 'login' }) });
  } catch (e) {
    console.error('[Auth] Email send failed:', e.message);
  }

  res.render(view, {
    title, next: targetRedirect,
    error: null, step: 'code', email,
    message: `Code sent to ${email}`
  });
}

export async function postVerify(req, res) {
  const { email, code, next } = req.body;
  const targetRedirect = next || '/admin';
  const view = getAdminLoginView(targetRedirect);
  const title = getAdminLoginTitle(targetRedirect);

  if (!email || !code) {
    return res.status(400).render(view, {
      title, next: targetRedirect,
      error: 'Code is required.', step: 'code', email: email || '', message: null
    });
  }

  const record = await verifyAuthCode(email, code);
  if (!record) {
    return res.status(401).render(view, {
      title, next: targetRedirect,
      error: 'Invalid or expired code.', step: 'code', email, message: null
    });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).render(view, {
      title, next: targetRedirect,
      error: 'Account not found.', step: 'email', email, message: null
    });
  }

  // If user already has password, just log in
  if (user.password_hash) {
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    await logAuditAction({ user_id: user.id, user_name: user.name, action: 'LOGIN', entity_type: 'auth', details: `${user.name} logged in via code` });
    if (user.role === 'guide') return res.redirect('/guide');
    return res.redirect(targetRedirect);
  }

  // User has no password — show password creation step
  res.render(view, {
    title, next: targetRedirect,
    error: null, step: 'create-password', email, code,
    message: 'Verified! Create a password for your account.'
  });
}

export async function postCreatePassword(req, res) {
  const { email, code, password, confirm_password, next } = req.body;
  const targetRedirect = next || '/admin';
  const view = getAdminLoginView(targetRedirect);
  const title = getAdminLoginTitle(targetRedirect);

  if (!password || password.length < 6) {
    return res.status(400).render(view, {
      title, next: targetRedirect,
      error: 'Password must be at least 6 characters.', step: 'create-password', email, code, message: null
    });
  }

  if (password !== confirm_password) {
    return res.status(400).render(view, {
      title, next: targetRedirect,
      error: 'Passwords do not match.', step: 'create-password', email, code, message: null
    });
  }

  // Verify the code is still valid
  const record = await verifyAuthCode(email, code);
  if (!record) {
    return res.status(401).render(view, {
      title, next: targetRedirect,
      error: 'Code expired. Please request a new one.', step: 'email', email, message: null
    });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    return res.status(401).render(view, {
      title, next: targetRedirect,
      error: 'Account not found.', step: 'email', email, message: null
    });
  }

  // Set the password
  const { pool, isUsingMySQL } = await import('../config/db.js');
  const passwordHash = hashPassword(password);
  if (isUsingMySQL()) {
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);
  } else {
    user.password_hash = passwordHash;
  }

  // Log in
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  await logAuditAction({ user_id: user.id, user_name: user.name, action: 'LOGIN', entity_type: 'auth', details: `${user.name} created password and logged in` });

  if (user.role === 'guide') return res.redirect('/guide');
  return res.redirect(targetRedirect);
}

export async function postLogout(req, res) {
  const user = req.session?.user;
  if (user) {
    await logAuditAction({ user_id: user.id, user_name: user.name, action: 'LOGOUT', entity_type: 'auth', details: `${user.name} logged out`, ip_address: req.ip });
  }
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
}
