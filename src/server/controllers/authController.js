import { findUserByEmail, logAuditAction } from '../models/index.js';
import { hashPassword } from '../config/db.js';

export async function getLogin(req, res) {
  if (req.session?.user) return res.redirect('/admin');
  res.render('auth/login', {
    title: 'Operations Login',
    next: req.query.next || '/admin',
    error: null
  });
}

export async function postLogin(req, res) {
  const { email, password, next } = req.body;
  const targetRedirect = next || '/admin';

  if (!email || !password) {
    return res.status(400).render('auth/login', {
      title: 'Operations Login',
      next: targetRedirect,
      error: 'Please enter both email and password.'
    });
  }

  const user = await findUserByEmail(email);
  if (!user) {
    await logAuditAction({ action: 'LOGIN_FAILED', entity_type: 'auth', details: `Failed login attempt for: ${email}`, ip_address: req.ip });
    return res.status(401).render('auth/login', {
      title: 'Operations Login',
      next: targetRedirect,
      error: 'Invalid credentials. User account not found.'
    });
  }

  const inputHash = hashPassword(password);
  if (user.password_hash !== inputHash) {
    await logAuditAction({ user_id: user.id, user_name: user.name, action: 'LOGIN_FAILED', entity_type: 'auth', details: `Wrong password for: ${email}`, ip_address: req.ip });
    return res.status(401).render('auth/login', {
      title: 'Operations Login',
      next: targetRedirect,
      error: 'Invalid credentials. Password incorrect.'
    });
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  await logAuditAction({ user_id: user.id, user_name: user.name, action: 'LOGIN', entity_type: 'auth', details: `${user.name} logged in`, ip_address: req.ip });

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
