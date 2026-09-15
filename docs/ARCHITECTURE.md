# Apex Solutions Architecture

Apex Solutions is an Express + EJS application backed by MySQL for Zahabia Travel & Tourism. The server owns HTML routes, JSON API routes, sessions, and access to local file storage.

## Request flow

1. Express loads environment configuration and middleware.
2. Requests are logged with Morgan and parsed as JSON or form data.
3. The MySQL pool is attached to `req.db`.
4. Session state is exposed to EJS as `user`.
5. Route groups handle auth, admin, customer portal, and APIs.
6. Errors pass through the central error handler.

## Auth strategy

M0 includes a placeholder session login so the admin shell can be exercised. M3 replaces it with password-hash verification against `users`, role checks, secure cookies, and production session storage. Customer access remains token-based through `/t/:token`.

## Deployment

Build locally, push to Git, pull over SSH on DirectAdmin, install production dependencies with `npm ci --omit=dev`, apply migrations, and run with PM2 or systemd behind HTTPS.
