# Zahabia Travel & Tourism — Apex Solutions
## Session Log: M0 through M7
### Date: September 14–15, 2026

---

## Session Overview

**Project:** Zahabia Travel & Tourism — Air Ticketing & Tour Management Platform
**Stack:** Node.js (ESM) + Express 4.21 + EJS + MySQL2 + Vanilla CSS
**Platform Name:** Apex Solutions (rebranded from TripPortal)

---

## M0 — Foundation (Pre-existing)

- Node.js ESM project with Express, EJS, MySQL pool, dotenv, sessions, Morgan logging
- `/health`, `/api`, `/auth/login`, `/admin`, token portal routes
- Starter views, CSS, environment template, architecture docs, README
- Migration marker (`0001_initial_schema.sql`)

## M1 — Core Domain (Pre-existing)

- Full MySQL schema: `users`, `customers`, `flight_bookings`, `tour_packages`, `tour_bookings`, `portal_tokens`, `payments`
- CRUD models for all entities with MySQL + in-memory fallback
- Controllers and routes for flights, tours, customers, finance, portal
- Dashboard with revenue metrics

## M2 — Enterprise Features (Pre-existing)

- `audit_logs` table with action/entity/details tracking
- Invoice breakdown columns (`base_fare`, `tax_amount`, `agency_fee`) on payments
- Audit logging on key actions (CREATE_BOOKING, ISSUE_TICKET)

## M3 — Auth & Security (Pre-existing)

- Session-based authentication with PBKDF2 password hashing
- Role-based middleware (`requireAuth`, `requireAdmin`)
- Admin/agent seed users

## M4 — Exchange Rates (Pre-existing)

- `exchange_rates` table with USD, AED, EUR, GBP, SAR, PKR
- Currency middleware for session-based currency switching
- Multi-currency formatting in all views

## M5 — Notifications (Built This Session)

### New Files
- `src/server/services/emailService.js` — Nodemailer SMTP integration + branded HTML email templates
- `src/server/services/whatsAppService.js` — WhatsApp Business API integration + message builders
- `src/server/controllers/notificationController.js` — Send email/WhatsApp, fetch notification history
- `src/server/routes/notifications.js` — `POST /admin/flights/:id/notify/email`, `POST /admin/flights/:id/notify/whatsapp`, `GET /admin/flights/:id/notifications`

### Modified Files
- `src/server/config/env.js` — Added `email` (SMTP) and `whatsapp` (API) config
- `.env.example` — Added SMTP and WhatsApp env vars
- `src/server/app.js` — Mounted notification routes
- `src/server/controllers/flightController.js` — Auto-send Email + WhatsApp on ticket issue
- `src/client/views/admin/flights/show.ejs` — Send Email/WhatsApp buttons + notification history panel

### Dependency Added
- `nodemailer` ^6.9.0

---

## M6 — CRUD Completion & Data Integrity (Built This Session)

### New Files
- `src/server/controllers/userController.js` — User CRUD (list, create, edit, delete)
- `src/server/routes/users.js` — User management routes
- `src/client/views/admin/flights/edit.ejs` — Flight booking edit form
- `src/client/views/admin/customers/edit.ejs` — Customer profile edit form
- `src/client/views/admin/tours/edit.ejs` — Tour package edit form
- `src/client/views/admin/users/index.ejs` — User list with management
- `src/client/views/admin/users/new.ejs` — Create new user form
- `src/client/views/admin/users/edit.ejs` — Edit user form

### Modified Files — Models (`src/server/models/index.js`)
- `updateFlightBooking()` — Update flight booking details
- `deleteFlightBooking()` — Remove flight booking
- `updateTourPackage()` — Update tour package details
- `deleteTourPackage()` — Remove tour package
- `cancelTourBooking()` — Cancel a tour reservation
- `findTourBookingById()` — Get single tour booking with joins
- `getTourBookingsByCustomerId()` — Get all tour bookings for a customer
- `updateCustomer()` — Update customer profile
- `deleteCustomer()` — Remove customer
- `getAllUsers()` — List all users (without password hashes)
- `updateUser()` — Update user details/role/password
- `deleteUser()` — Remove user account

### Modified Files — Controllers
- `flightController.js` — Added `getEditFlightForm`, `postUpdateFlight`, `postDeleteFlight`
- `customerController.js` — Added `getEditCustomerForm`, `postUpdateCustomer`, `postDeleteCustomer`, tour booking history on profile
- `tourController.js` — Added `getEditTourForm`, `postUpdateTour`, `postDeleteTour`, `postCancelTourBooking`, auto-invoice + auto-notifications on booking
- `authController.js` — Added audit logging on login, logout, and failed login attempts
- `portalController.js` — Added token expiry validation

### Modified Files — Routes
- `routes/flights.js` — Added `/:id/edit` (GET+POST), `/:id/delete`
- `routes/customers.js` — Added `/:id/edit` (GET+POST), `/:id/delete`
- `routes/tours.js` — Added `/:id/edit` (GET+POST), `/:id/delete`, `/bookings/:id/cancel`

### Modified Files — Views
- `flights/index.ejs` — Added Edit button in Actions column
- `flights/show.ejs` — Added Edit/Delete buttons
- `customers/index.ejs` — Added Edit button
- `customers/show.ejs` — Added Edit/Delete buttons + tour booking history table
- `tours/index.ejs` — Added Edit/Delete on packages, Cancel button on bookings
- `tours/show.ejs` — Added Edit/Delete buttons
- `layout.ejs` — Added "Users" nav link for admin role

### App Configuration
- `app.js` — Mounted `/admin/users` routes (admin-only)

---

## Branding — Rebrand from TripPortal to Apex Solutions (Built This Session)

### Files Changed
- `package.json` — `"name": "apex-solutions"`, updated description
- `README.md` — Title changed to "Apex Solutions – Zahabia Travel & Tourism"
- `src/server/app.js` — Console log → `Apex Solutions running on ...`
- `src/server/config/db.js` — Console warn → `[Apex Solutions DB]`
- `src/server/controllers/apiController.js` — API name → `Zahabia Travel & Tourism – Apex Solutions API`
- `tests/app.test.js` — Updated test assertion for API name
- `src/client/views/layout.ejs` — Title, footer updated
- `src/client/views/errors/placeholder.ejs` — Title updated
- `src/client/views/errors/404.ejs` — Title updated
- `src/client/views/errors/403.ejs` — Title updated
- `docs/ARCHITECTURE.md` — "Apex Solutions Architecture"
- `docs/DB_SCHEMA.md` — "Apex Solutions Database Schema"

---

## M7 — Dashboard Analytics, Search & Reporting (Built This Session)

### Modified Files — Controllers
- `financeController.js` — Added query param filtering (search, type, date_from, date_to), filtered stats calculation
- `auditController.js` — Added query param filtering (search, action, user_name, date_from, date_to), unique action/user lists for dropdowns
- `customerController.js` — Added search filter across all customer fields

### Modified Files — Views
- `dashboard.ejs` — Added tour bookings table, CSS-based revenue breakdown bar chart, revenue comparison section
- `finance/index.ejs` — Added filter form (search, type dropdown, date range), filtered results summary bar
- `audit/index.ejs` — Added filter form (search, action dropdown, operator dropdown, date range)
- `customers/index.ejs` — Added search box (name, passport, nationality, email, phone)

---

## UI/UX Fixes (Built This Session)

### Default Currency
- Changed from USD to PKR in `middleware/currency.js`
- PKR is now the first option in all currency dropdowns

### Responsive Navbar
- Added hamburger menu (☰) for mobile (≤860px)
- Shorter nav labels: "Customers CRM" → "Customers", "Audit Trail" → "Audit", "⚙ Exchange Rates" → "Rates"
- Tighter spacing, smaller fonts for laptop screens
- User name hidden on narrow screens (role pill + sign out only)
- Flexbox wrapping prevents overlapping

### Mobile Responsive
- Full-width dropdown nav on mobile with larger touch targets
- Currency switcher goes full-width on mobile
- Cards, tables, forms scale down with breakpoints (860px, 480px)
- E-Ticket view stacks vertically on mobile
- Portal header wraps gracefully on small screens

### CSS Changes (`src/client/public/css/app.css`)
- Added `.hamburger` button styles
- Added `.nav-right` container for currency + user badge
- Added `.currency-switcher` class
- Added `.nav-links.open` toggle for mobile menu
- Added responsive breakpoints: 1100px, 860px, 480px
- Added responsive rules for `.app-container`, `.card`, `.ticket-wrapper`, `.ticket-grid`, `.flight-route`, `.data-table`, `.form-row`, `.btn`
- Portal view (`portal/view.ejs`) also updated for responsive layout

### Layout Changes (`src/client/views/layout.ejs`)
- Restructured navbar with hamburger button + `nav-right` container
- Currency dropdown restructured with label
- PKR as default/first currency option
- Portal view updated with responsive header

---

## Environment Configuration

### `.env.example` (updated)
```
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=tripportal
DB_USER=tripportal
DB_PASS=change-me
SESSION_SECRET=replace-with-a-long-random-secret
LOG_FILE=./logs/app.log

# SMTP / Email Notifications
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Zahabia Travel & Tourism <noreply@zahabiatravel.com>

# WhatsApp Business API
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

---

## Test Results

All 9 tests passing consistently throughout the session:

```
✔ GET /health returns status ok with database engine info
✔ GET /api returns API information
✔ GET /api/stats returns live platform analytics
✔ GET /t/demo-token-hamdan-ek2021?currency=AED converts currency dynamically to AED
✔ GET /admin/settings/rates redirects unauthenticated users to login
✔ GET /admin/flights/export/csv redirects unauthenticated users to login
✔ GET /admin/finance/export/csv redirects unauthenticated users to login
✔ POST /auth/login authenticates user and sets session cookie
✔ GET /auth/login renders operator login page
```

---

## Milestone Status

| # | Milestone | Status | Date |
|---|-----------|--------|------|
| M0 | Foundation | ✅ Complete | Pre-existing |
| M1 | Core Domain | ✅ Complete | Pre-existing |
| M2 | Enterprise Features | ✅ Complete | Pre-existing |
| M3 | Auth & Security | ✅ Complete | Pre-existing |
| M4 | Exchange Rates | ✅ Complete | Pre-existing |
| M5 | Notifications (Email + WhatsApp) | ✅ Complete | Sep 15, 2026 |
| M6 | CRUD Completion & Data Integrity | ✅ Complete | Sep 15, 2026 |
| M7 | Dashboard Analytics & Search | ✅ Complete | Sep 15, 2026 |

---

## Statistics

- **Files Created:** 12
- **Files Modified:** 25+
- **New Dependencies:** 1 (nodemailer)
- **New Model Functions:** 12
- **New Controller Functions:** 18
- **New Routes:** 10
- **New Views:** 8
- **CSS Responsive Breakpoints:** 3 (1100px, 860px, 480px)

---

## M8 — PDF Generation, File Upload, Public Homepage & Error Handling
### Date: September 15, 2026

### New Files
- `src/server/services/pdfService.js` — PDFKit e-ticket + invoice generators
- `src/server/middleware/upload.js` — Multer config for tour images (5MB, jpg/png/webp/gif)
- `src/server/controllers/homeController.js` — Public homepage controller
- `src/server/routes/home.js` — Public homepage route
- `src/client/views/home/index.ejs` — Landing page template (hero, features, tour showcase, CTA)
- `src/client/views/errors/500.ejs` — Server error page
- `src/client/public/robots.txt`

### Dependencies Added
- `pdfkit` — PDF generation
- `multer` — File upload handling

### Features
- **E-Ticket PDF**: `GET /admin/flights/:id/pdf` — branded A4 PDF with flight route, passenger details, barcode
- **Invoice PDF**: `GET /admin/finance/:id/pdf` — tax invoice with line items, payment status
- **Tour image upload**: `multer` middleware — file upload on create/edit forms
- **Public landing page**: `GET /` — hero section, features grid, tour package showcase, CTA
- **Error handler**: Detects AJAX vs page — JSON for API, rendered `500.ejs` for page requests
- **Static assets**: Favicon in all templates, `robots.txt`, `uploads/` directory served

### Bug Fix
- Dashboard `dashboard.ejs` had `<%= %>` EJS tags inside template literal body of `<%- include() %>` — EJS parser confused inner `%>` as closing the outer `<%-`. Converted to `${...}` template literal syntax. Moved `flightPct`/`tourPct`/`maxRev` calculations to controller.

---

## M9 — AI Travel Assistant (Chatbot)
### Date: September 15, 2026

### New Files
- `src/server/services/aiRouter.js` — Smart query routing to free AI models
- `src/server/controllers/chatController.js` — Chat endpoint + database context builder
- `src/server/routes/chat.js` — Chat routes
- `src/client/views/admin/chat/index.ejs` — Chat UI view
- `src/client/public/js/chat.js` — External chat JavaScript (avoids EJS template literal issues)

### Dependencies Added
- `ollama` — Local Ollama integration
- `axios` — HTTP client for Groq/Gemini/HuggingFace APIs

### Features
- **Intent classification**: visa, travel planning, flight status, booking, weather, general
- **Multi-provider AI routing**:
  - **Groq** (primary): `qwen/qwen3.8-27b` (complex), `allam-2-7b` (fast)
  - **Gemini** (fallback): `gemini-1.5-flash` via free API
  - **Ollama** (local fallback): `mistral:7b`, `llama3.2:3b`
  - **HuggingFace** (last resort): `Mistral-7B-Instruct-v0.3`
- **Database context injection**: AI has access to real customer, flight, tour, and financial data
- **Chat UI**: Typing indicator, spinner on Send button, quick action buttons, message history
- **Audit logging**: Every AI interaction recorded in audit trail

### Database Context Injection
The chat controller builds live database context per query:
- Customer questions → Name, passport, nationality, phone, email
- Flight questions → PNR, airline, route, dates, price, ticket status
- Tour questions → Package name, destination, duration, price
- Finance questions → Revenue, invoices, payment methods
- General questions → Dashboard stats overview

### Environment Variables Added
```
GEMINI_API_KEY=
GROQ_API_KEY=
HF_API_KEY=
```

### Bug Fixes (M9)
1. **ESM import hoisting**: API keys read at module load time (before dotenv.config()). Fixed by reading `process.env` lazily inside functions.
2. **Ollama import crash**: `new Ollama()` at module top level crashed if Ollama not running. Fixed with dynamic `await import('ollama')` inside function.
3. **EJS template literal broke inline JS**: `\*\*` became `*` (making regex into JS comment), `\n` became actual newline. Fixed by moving JS to external file `/static/js/chat.js`.
4. **Browser cache**: Added `Cache-Control: no-store` header to prevent stale HTML being served.
5. **Groq model names**: Initial models (`llama-3.1-8b-instant`) not available. Discovered working models via API: `qwen/qwen3.8-27b`, `allam-2-7b`, `groq/compound-mini`.
6. **Groq context limit**: `groq/compound-mini` has tiny context window (413 error with full prompts). Switched to `qwen/qwen3.8-27b`.

---

## Updated Statistics

| # | Milestone | Status | Date |
|---|-----------|--------|------|
| M0 | Foundation | ✅ Complete | Pre-existing |
| M1 | Core Domain | ✅ Complete | Pre-existing |
| M2 | Enterprise Features | ✅ Complete | Pre-existing |
| M3 | Auth & Security | ✅ Complete | Pre-existing |
| M4 | Exchange Rates | ✅ Complete | Pre-existing |
| M5 | Notifications | ✅ Complete | Sep 15, 2026 |
| M6 | CRUD Completion | ✅ Complete | Sep 15, 2026 |
| M7 | Dashboard Analytics | ✅ Complete | Sep 15, 2026 |
| M8 | PDF, Upload, Homepage, Errors | ✅ Complete | Sep 15, 2026 |
| M9 | AI Travel Assistant | ✅ Complete | Sep 15, 2026 |

### Cumulative Statistics
- **Files Created:** 22+
- **Files Modified:** 30+
- **Dependencies Added:** 5 (nodemailer, pdfkit, multer, ollama, axios)
- **New Model Functions:** 12
- **New Controller Functions:** 22
- **New Routes:** 13
- **New Views:** 11
- **CSS Responsive Breakpoints:** 3 (1100px, 860px, 480px)
- **External JS Files:** 1 (chat.js)
- **AI Providers:** 4 (Groq, Gemini, Ollama, HuggingFace)

---

## M10 — Advanced Payment System (Split Payments & Multiple Methods)
### Date: September 15, 2026

### New Files
- `migrations/0006_payments_upgrade.sql` — DB migration adding `payment_reference`, `notes`, `recorded_by` columns; expanding `payment_method` and `payment_status` enums
- `src/server/controllers/paymentController.js` — Payment CRUD API (get summary, add, update, void)
- `src/server/routes/payments.js` — Payment API routes mounted at `/admin/payments`
- `src/server/services/qrService.js` — QR code generation service (SVG + DataURL)

### Dependencies Added
- `qrcode` — Server-side QR code generation

### Database Changes
- `payments` table: Added `payment_reference VARCHAR(100)`, `notes TEXT`, `recorded_by INT`
- `payment_method` enum expanded: `cash`, `bank_transfer`, `cheque`, `credit_card`, `debit_card`, `online`, `other`
- `payment_status` enum: `paid`, `pending`, `partial`, `refunded`, `voided`

### New Model Functions (`src/server/models/index.js`)
- `getPaymentsByBooking(booking_type, booking_id)` — Fetch all payments for a booking
- `getBookingTotalAmount(booking_type, booking_id)` — Get total amount from flight_bookings or tour_bookings
- `getBookingPaymentSummary(booking_type, booking_id)` — Full summary: totalAmount, totalPaid, pendingAmount, balance, isFullyPaid, paymentCount, payments[]
- `addPayment({...})` — Insert payment with auto-generated invoice_no, transaction_id, base_fare/tax_amount/agency_fee breakdown
- `updatePayment(id, updates)` — Update payment fields
- `deletePayment(id)` — Void/delete a payment

### API Endpoints
- `GET /admin/payments/:type/:id/summary` — Payment summary for a booking
- `POST /admin/payments/:type/:id/record` — Record a new payment
- `PUT /admin/payments/record/:paymentId` — Update a payment
- `DELETE /admin/payments/record/:paymentId` — Void a payment

### Payment Management UI
- **Flight show page** (`admin/flights/show.ejs`): Full payment management section with summary cards (Total, Paid, Balance Due, Status), add payment form with method/reference/notes, payment history table with void buttons
- **Flight booking form** (`admin/flights/new.ejs`): Optional initial payment with method selection, reference, and notes
- **Tour booking form** (`admin/tours/show.ejs`): Same payment options during tour reservation

### Route Architecture Fix
- Original routes used `/:type/:id/payments` which conflicted with `/payments/:paymentId` DELETE route
- Renamed to `/:type/:id/summary` (GET), `/:type/:id/record` (POST), `/record/:paymentId` (PUT/DELETE)
- Frontend fetch URLs updated to match

### Auto-Invoice Removal
- Removed auto-invoice creation from both flight and tour booking controllers
- Operators now choose to record payment during booking or skip (Record Later option)

### Notifications Fix
- `notificationController.js`: Added graceful error handling for email/WhatsApp failures (doesn't crash booking flow)
- `emailService.js`: Fixed SMTP empty string check with `.trim()` to prevent `SMTP_SECURE` parse error

---

## QR Code Feature
### Date: September 15, 2026

### New Files
- `src/server/services/qrService.js` — QR code generation using `qrcode` npm package

### New API Endpoint
- `GET /t/:token/qr` — Returns SVG QR code image for any portal link (cached 24h)

### QR Code Display Locations
- **Customer portal view** (`portal/view.ejs`): Barcode replaced with QR + token verification section
- **Admin flight show** (`admin/flights/show.ejs`): QR code auto-populates on page load if token exists; also appears in Share Portal Link box
- **E-Ticket PDF** (`pdfService.js`): Barcode replaced with embedded QR code linking to portal

### Implementation
- Server generates SVG QR codes via `QRCode.toString(url, { type: 'svg' })`
- Portal URL encoded: `https://ztts.apexsol.pk/t/{token}`
- SVG served with `Content-Type: image/svg+xml` and 24h cache header
- PDF uses `QRCode.toDataURL()` for inline image embedding
- `findPortalTokenByFlightBooking(id)` model function to look up existing tokens

### Barcode Removal
- Removed fake CSS barcode-lines from admin flight show page
- Removed fake barcode from customer portal view
- Replaced with QR codes in all three locations (admin, portal, PDF)

---

## Currency-Aware Forms
### Date: September 15, 2026

### Problem
- All booking forms showed amounts in hardcoded USD ($ USD) regardless of the active currency selector at the top of the page
- Payment forms and summary cards also displayed USD-only amounts

### Solution
- Added currency conversion to all booking and payment forms
- Amounts entered in local currency (PKR, AED, etc.) are converted to USD before saving
- All display amounts converted from USD to active currency for display

### Modified Files
- `src/server/controllers/flightController.js` — `getNewFlightForm` and `viewFlightDetail` now pass `activeCurrency` and `exchangeRates` to templates; `postCreateFlight` uses `total_amount_usd` and `pay_amount_usd` hidden fields
- `src/server/controllers/tourController.js` — `viewTourDetail` passes currency data; `postBookTour` uses `pay_amount_usd`
- `src/client/views/admin/flights/new.ejs` — Labels show active currency symbol, exchange rate displayed, JavaScript converts amounts on form submit
- `src/client/views/admin/flights/show.ejs` — Payment form, summary cards, and payment history all display in active currency; `fmtLocal()` function for conversion
- `src/client/views/admin/tours/show.ejs` — Package price and payment form show active currency; JavaScript converts payment amount on submit

### Currency Conversion Flow
1. User selects currency at top of page → stored in session
2. Currency middleware sets `res.locals.activeCurrency` and `res.locals.exchangeRates`
3. Forms show labels like "Total Ticket Amount (Rs PKR)" with exchange rate note
4. Hidden fields (`total_amount_usd`, `pay_amount_usd`) populated via JavaScript on submit
5. Server receives USD amounts and stores them in the database
6. Display functions convert USD back to active currency using exchange rates

### EJS Template Literal Fix
- **Problem**: Used `<%= %>` and `<%- %>` EJS tags inside template literal (`body: \`...\``) that was inside `<%- include() %>`. EJS parser got confused by nested tags.
- **Fix**: Replaced all inner EJS tags with `${}` JavaScript template literal syntax in `flights/new.ejs`, `flights/show.ejs`, `tours/show.ejs`

---

## Enhanced Invoice PDF
### Date: September 15, 2026

### Problem
- Invoice showed no customer details — just generic "Air Ticket" and fake tax breakdown (88%/8%/4% of total)
- No booking reference, route, or dates on the invoice

### Solution — Invoice PDF Now Includes
- **Header**: Zahabia Travel & Tourism + TAX INVOICE
- **Invoice info**: Invoice number, date, payment method
- **Bill To section**: Customer name, passport, email, phone (in shaded box)
- **Booking Details section**: Service type, PNR/reference, airline/tour name, route/destination, departure/travel date
- **Line items**: Only shows base fare, taxes, agency fee if they were actually provided (not auto-calculated)
- **Total amount** with payment status badge (paid/partial/unpaid)
- **Transaction ID** reference

### Invoice Breakdown Fix
- **Before**: `addPayment` auto-calculated base_fare (88%), tax (8%), agency_fee (4%) — fake placeholder values
- **Now**: Payment form has optional "Invoice Breakdown" section with Base Fare, Taxes, Agency Fee inputs
- Operator enters actual values; if left blank, invoice shows just total amount
- `addPayment` model stores provided values or NULL

---

## Customer Financial Ledger
### Date: September 15, 2026

### New Files
- `src/client/views/admin/customers/ledger.ejs` — Customer ledger view

### New Model Functions
- `getCustomerLedger(customerId)` — Returns customer info, all bookings with paid/balance calc, all payments, totals
- `findPortalTokenByFlightBooking(flightBookingId)` — Look up portal token by booking ID

### New Route
- `GET /admin/customers/:id/ledger` — Customer financial ledger page

### Ledger Page Features
- **Customer info card**: Name, email, phone, passport, customer since date
- **Summary cards**: Total Bookings, Total Booking Value, Total Paid, Outstanding Balance
- **Bookings table**: Type (Flight/Tour), reference, route/destination, date, total, paid, balance, status (Paid/Partial/Unpaid)
- **Payment history table**: Date, invoice number, service, reference, method, amount, status
- Accessible via "Financial Ledger" button on customer profile page

### Finance Ledger Table Updated
- Now shows **Customer Name** and **Service Details** (airline/route/tour name) instead of just tax breakdown columns

---

## Deployment — DirectAdmin Production Server
### Date: September 15, 2026

### Server Configuration
- **Host:** DirectAdmin with NodeJS Selector (Node 22)
- **URL:** https://ztts.apexsol.pk
- **DB:** MySQL `apexsolp_ztts` / user `apexsolp_ztts` / host `localhost`
- **Git:** https://github.com/apexsolutions78/ztts.git
- **App root:** `/home/apexsolp/domains/ztts.apexsol.pk/public_html`

### Critical Fixes During Deployment
1. **MySQL activation**: `checkDatabase()` was never called at startup — app used in-memory fallback. Fixed by adding `checkDatabase()` call before `app.listen()`.
2. **Trust proxy**: Added `app.set('trust proxy', 1)` for Passenger reverse proxy to fix session/cookie issues.
3. **SMTP configuration**: `SMTP_SECURE=false` required for port 587 (was `true` causing connection failure).
4. **Login session fix**: `req.session.user` not persisting — resolved by trust proxy setting.
5. **EJS syntax fix**: Portal view had raw JS template literal (`${tourBooking.total_travelers}`) inside EJS template — fixed to use EJS tags.
6. **Route conflicts**: Payment API routes renamed to avoid path parameter conflicts with DELETE routes.
7. **npm install required**: New `qrcode` package caused 503 on deploy until `npm install` was run on server.
8. **EJS nested tags**: `<%= %>` inside template literal inside `<%- include() %>` broke parser. Fixed with `${}` syntax.

### Brand Assets
- GIF/WebP logo files at project root served via `/brand` static route
- Animated airplane logo used throughout
- White background on hero section for logo compatibility

---

## Updated Statistics

| # | Milestone | Status | Date |
|---|-----------|--------|------|
| M0 | Foundation | ✅ Complete | Pre-existing |
| M1 | Core Domain | ✅ Complete | Pre-existing |
| M2 | Enterprise Features | ✅ Complete | Pre-existing |
| M3 | Auth & Security | ✅ Complete | Pre-existing |
| M4 | Exchange Rates | ✅ Complete | Pre-existing |
| M5 | Notifications | ✅ Complete | Sep 15, 2026 |
| M6 | CRUD Completion | ✅ Complete | Sep 15, 2026 |
| M7 | Dashboard Analytics | ✅ Complete | Sep 15, 2026 |
| M8 | PDF, Upload, Homepage, Errors | ✅ Complete | Sep 15, 2026 |
| M9 | AI Travel Assistant | ✅ Complete | Sep 15, 2026 |
| M10 | Advanced Payment System | ✅ Complete | Sep 15, 2026 |

### Cumulative Statistics
- **Files Created:** 28+
- **Files Modified:** 45+
- **Dependencies Added:** 6 (nodemailer, pdfkit, multer, ollama, axios, qrcode)
- **New Model Functions:** 20
- **New Controller Functions:** 28
- **New Routes:** 17
- **New Views:** 12
- **New Services:** 7 (emailService, whatsAppService, pdfService, aiRouter, qrService, upload middleware, currency middleware)
- **CSS Responsive Breakpoints:** 3 (1100px, 860px, 480px)
- **External JS Files:** 1 (chat.js)
- **AI Providers:** 4 (Groq, Gemini, Ollama, HuggingFace)
- **Payment Methods:** 7 (cash, bank_transfer, cheque, credit_card, debit_card, online, other)
- **Currencies Supported:** 6 (USD, PKR, AED, EUR, GBP, SAR)

---

## Git Commits (This Session)
1. `a8264f2` — fix: payment API routes, response data mapping, and invoice breakdown
2. `de01282` — feat: QR code generation for customer portal links
3. `29de26a` — feat: currency-aware forms for flight and tour booking creation
4. `7420ffa` — fix: EJS tags inside template literals causing 500 errors
5. `fe6a9ae` — fix: auto-populate QR code on flight show page load if token exists
6. `421fbc1` — feat: replace barcodes with QR codes across all views and PDF
7. `0026b41` — feat: customer ledger + enhanced invoice PDF with full details
8. `688b9c5` — fix: invoice breakdown uses actual values, not auto-calculated percentages

---

## Current Issues / Next Steps

### Resolved This Session
- ✅ Payment API routes fixed (path conflicts)
- ✅ QR codes replace barcodes everywhere
- ✅ Currency-aware forms for booking and payment
- ✅ Invoice PDF shows customer details, booking info, actual breakdown
- ✅ Customer financial ledger page
- ✅ EJS template literal parsing errors fixed
- ✅ 503/500 errors from missing npm packages and nested EJS tags

### Potential Enhancements
- Tour booking detail page (admin side) — Individual tour bookings don't have a show/edit page
- Customer portal for tour bookings — Share QR code from admin tour booking list
- Payment receipt PDF generation (separate from invoice)
- Refund/partial payment workflows
- Multi-payment split UI (pay half cash, half card on same booking)
