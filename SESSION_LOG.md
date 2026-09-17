# Zahabia Travel & Tourism - Session Log
## Date: September 17, 2026

---

## Session Summary

### Starting Point
- Project: `D:\WORK\TOURISM\Zahabia Travel & Tourism`
- Repo: `https://github.com/apexsolutions78/ztts.git` (branch: main)
- Production: `https://ztts.apexsol.pk`
- Last commit: `f137a6b` (currency fix)

### Features Implemented

---

## 1. Currency Fix (Commit: f137a6b)
**Problem:** Currency selector not working properly.
**Solution:** Updated controller to use `res.locals.formatPrice` instead of local formatting.

---

## 2. Flight Request Workflow (Commit: 12b67f8)
**Files:** `tourController.js`, `flightController.js`, views
**Features:**
- Customer submits flight request → pending status
- Admin email notification
- Confirmation page for customer
- Admin review page

---

## 3. Group Tour Admin Panel (Milestones A-E)

### Milestone A: Group Tour Draft Setup (Commit: aab4cad → 1a0c536)
**Migration:** `0009_group_tours.sql`, `0010_group_tours_fix.sql`
**Table:** `group_tours` with columns:
- `id`, `booking_id` (UNIQUE), `title`, `assigned_guide_user_id`
- `group_size_expected`, `start_at`, `end_at`
- `welcome_message`, `emergency_instructions`
- `status` (draft/finalized/active/completed/cancelled)
- `created_by`, `created_at`, `updated_at`

**Features:**
- Create group tour from booking
- Edit group details
- Delete group
- Guide assignment
- Status management

### Milestone B: Group Itinerary Milestones (Commit: 802c554)
**Migration:** `0011_group_milestones.sql`
**Table:** `group_milestones`:
- `id`, `group_tour_id`, `title`, `description`
- `sort_order`, `status` (pending/completed)
- `created_at`

**Features:**
- Add/edit/delete milestones
- Sort by order
- Read-only when group finalized

### Milestone C: Tour Finalization (Commit: a9f7ef0)
**Features:**
- "Finalize Group Tour" button (draft only)
- Status changes to `finalized`
- Milestones locked after finalization

### Milestone D: Milestone Completion Toggle (Commit: 16ded1d)
**Features:**
- Toggle milestone status (pending ↔ completed)
- Visual indicator (green Done / yellow Undo)
- Only when group is draft

### Milestone E: Group Tour Notifications (Commit: 9116135)
**Email:** `buildGroupTourNotificationEmail`
**Features:**
- Email on finalize to admin
- Email on status change to admin
- Non-blocking (errors don't break flow)

---

## 4. Tour Date Ranges (Commit: ab0297c → 54a9ef3)

### Migration: `0012_tour_date_ranges.sql`
**Table:** `tour_date_ranges`:
- `id`, `tour_package_id`, `label`
- `start_date`, `end_date`
- `max_capacity`, `current_bookings`
- `status` (open/full/cancelled)
- `created_at`

**FK:** `tour_bookings.tour_date_range_id` → `tour_date_ranges.id`

**Features:**
- Admin adds confirmed groups to tours
- Shows on tour detail, create, edit forms
- Customer selects date range when booking
- Shows remaining seats ("5 seats left" / "FULL")
- Capacity enforcement (blocks booking when full)
- `current_bookings` increments/decrements

---

## 5. Tour Booking Members Portal (Commit: 717f948)

### Migration: `0013_tour_booking_members.sql`
**Table:** `tour_booking_members`:
- `id`, `tour_booking_id`
- `full_name`, `passport_number`
- `nationality`, `phone`
- `created_at`

**New columns on `tour_bookings`:**
- `members_added` (default 0)
- `members_required` (default 1)

**Features:**
- Customer portal: `/t/:token/members`
- Progress bar showing members added
- Add member form (name, passport, nationality, phone)
- Remove member option
- Auto-confirm when all members added
- Email: "Complete Your Group" after booking
- Email: "Group Complete" when all members added
- Admin booking view shows member list

---

## All Commits

| Commit | Description |
|--------|-------------|
| `f137a6b` | fix: Currency selector working properly |
| `12b67f8` | feat: Flight request workflow |
| `aab4cad` | feat: Group tour admin panel (initial) |
| `1a0c536` | fix: Milestone 1 schema per spec |
| `802c554` | feat: Milestone B - Group Itinerary Milestones |
| `a9f7ef0` | feat: Tour Finalization - Milestone C |
| `16ded1d` | feat: Milestone Completion Toggle - Milestone D |
| `9116135` | feat: Group Tour Notifications - Milestone E |
| `ab0297c` | feat: Tour Date Ranges - Confirmed Groups |
| `54a9ef3` | feat: Date Ranges on Create/Edit Tour |
| `85beff1` | feat: Remaining Seats Display + Capacity Enforcement |
| `717f948` | feat: Tour Booking Members Portal |

---

## Migration Files Created

| File | Purpose |
|------|---------|
| `migrations/0009_group_tours.sql` | Group tours + group_members tables |
| `migrations/0010_group_tours_fix.sql` | Fix schema, drop group_members |
| `migrations/0011_group_milestones.sql` | Group milestones table |
| `migrations/0012_tour_date_ranges.sql` | Tour date ranges + FK on bookings |
| `migrations/0013_tour_booking_members.sql` | Booking members + tracking columns |

---

## Production Deployment Commands

### Migration 0010 (Group Tours Fix)
```bash
mysql -u apexsolp_ztts -p'FgTN2D5Xm2j6M4PhKD5A' apexsolp_ztts -e "ALTER TABLE group_tours DROP FOREIGN KEY IF EXISTS group_tours_ibfk_1; ALTER TABLE group_tours DROP FOREIGN KEY IF EXISTS group_tours_ibfk_2; ALTER TABLE group_tours CHANGE COLUMN tour_booking_id booking_id INT NOT NULL, CHANGE COLUMN group_name title VARCHAR(200) NOT NULL, CHANGE COLUMN guide_user_id assigned_guide_user_id INT; ALTER TABLE group_tours ADD COLUMN group_size_expected INT AFTER assigned_guide_user_id, ADD COLUMN start_at DATETIME AFTER group_size_expected, ADD COLUMN end_at DATETIME AFTER start_at, ADD COLUMN welcome_message TEXT AFTER end_at, ADD COLUMN emergency_instructions TEXT AFTER welcome_message; ALTER TABLE group_tours ADD UNIQUE INDEX idx_booking_id (booking_id); ALTER TABLE group_tours ADD CONSTRAINT fk_gt_booking FOREIGN KEY (booking_id) REFERENCES tour_bookings(id) ON DELETE CASCADE; ALTER TABLE group_tours ADD CONSTRAINT fk_gt_guide FOREIGN KEY (assigned_guide_user_id) REFERENCES users(id) ON DELETE SET NULL; DROP TABLE IF EXISTS group_members; INSERT IGNORE INTO schema_migrations (version) VALUES ('0010_group_tours_fix');"
```

### Migration 0011 (Group Milestones)
```bash
mysql -u apexsolp_ztts -p'FgTN2D5Xm2j6M4PhKD5A' apexsolp_ztts -e "CREATE TABLE IF NOT EXISTS group_milestones (id INT AUTO_INCREMENT PRIMARY KEY, group_tour_id INT NOT NULL, title VARCHAR(200) NOT NULL, description TEXT, sort_order INT DEFAULT 0, status ENUM('pending', 'completed') DEFAULT 'pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (group_tour_id) REFERENCES group_tours(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; INSERT IGNORE INTO schema_migrations (version) VALUES ('0011_group_milestones');"
```

### Migration 0012 (Tour Date Ranges)
```bash
mysql -u apexsolp_ztts -p'FgTN2D5Xm2j6M4PhKD5A' apexsolp_ztts -e "CREATE TABLE IF NOT EXISTS tour_date_ranges (id INT AUTO_INCREMENT PRIMARY KEY, tour_package_id INT NOT NULL, label VARCHAR(100) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, max_capacity INT DEFAULT NULL, current_bookings INT DEFAULT 0, status ENUM('open', 'full', 'cancelled') DEFAULT 'open', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (tour_package_id) REFERENCES tour_packages(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; ALTER TABLE tour_bookings ADD COLUMN tour_date_range_id INT NULL AFTER tour_package_id; ALTER TABLE tour_bookings ADD CONSTRAINT fk_tb_daterange FOREIGN KEY (tour_date_range_id) REFERENCES tour_date_ranges(id) ON DELETE SET NULL; INSERT IGNORE INTO schema_migrations (version) VALUES ('0012_tour_date_ranges');"
```

### Migration 0013 (Booking Members)
```bash
mysql -u apexsolp_ztts -p'FgTN2D5Xm2j6M4PhKD5A' apexsolp_ztts -e "CREATE TABLE IF NOT EXISTS tour_booking_members (id INT AUTO_INCREMENT PRIMARY KEY, tour_booking_id INT NOT NULL, full_name VARCHAR(150) NOT NULL, passport_number VARCHAR(50), nationality VARCHAR(80), phone VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (tour_booking_id) REFERENCES tour_bookings(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4; ALTER TABLE tour_bookings ADD COLUMN members_added INT DEFAULT 0 AFTER total_travelers; ALTER TABLE tour_bookings ADD COLUMN members_required INT DEFAULT 1 AFTER members_added; INSERT IGNORE INTO schema_migrations (version) VALUES ('0013_tour_booking_members');"
```

---

## Database Credentials
- **Host:** dwh1.apexsol.pk
- **User:** apexsolp_ztts
- **Password:** FgTN2D5Xm2j6M4PhKD5A
- **Database:** apexsolp_ztts
- **SSH:** `ssh apexsolp@dwh1.apexsol.pk`

---

## Rollback Commands

| Feature | Rollback Command |
|---------|------------------|
| Group Tours | `DROP TABLE IF EXISTS group_milestones, group_tours;` |
| Date Ranges | `DROP TABLE IF EXISTS tour_date_ranges;` |
| Booking Members | `DROP TABLE IF EXISTS tour_booking_members;` |

---

## Current Schema State

### Tables Added/Modified
1. `group_tours` - Group tour drafts
2. `group_milestones` - Itinerary milestones
3. `tour_date_ranges` - Confirmed departure groups
4. `tour_booking_members` - Individual traveler details
5. `tour_bookings` - Added `tour_date_range_id`, `members_added`, `members_required`

---

## Features NOT Implemented (Per User Scope)
- Customer-facing group portal (admin only)
- Real-time notifications
- Chat system
- Member invitations
- Custom domain / API gateway

---

# NEW SESSION — September 17, 2026 (Continued)

## Session Starting Point
- Last commit from previous session: `fa99a93` (audit fixes)
- Working on: Auth Code System + Guide RBAC + Member Portal Privacy

---

## 16. Auth Code System (Commit: 9e0d778)

### Problem
Password-based authentication for all users. No role separation between admin and guides.

### Solution
Replaced ALL password-based auth with email + 6-digit code flow.

### Migration 0014 (`migrations/0014_auth_codes.sql`)
```sql
CREATE TABLE IF NOT EXISTS auth_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  code VARCHAR(6) NOT NULL,
  purpose ENUM('login', 'register') NOT NULL DEFAULT 'login',
  target_role VARCHAR(20) DEFAULT NULL,
  extra_data JSON DEFAULT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auth_email (email),
  INDEX idx_auth_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Schema Changes
- `users.password_hash` → made nullable
- `customers.password_hash` → made nullable
- `users.role` ENUM → added `guide`
- Seeded agent deleted (will re-register via auth code)
- `admin@zahabiatravel.com` remains seeded with no password

### Flow
1. User enters email at `/auth/login` (admin/guide) or `/account/login` (customer)
2. System generates 6-digit code, sends via email
3. User enters code → verified → account created (if new) + logged in
4. Code valid for 30 minutes

### Files Changed
| File | Change |
|------|--------|
| `migrations/0014_auth_codes.sql` | NEW — auth_codes table + schema changes |
| `src/server/config/db.js` | Updated seed (agent removed, admin no password), added `auth_codes: []` |
| `src/server/models/index.js` | +3 functions: `createAuthCode`, `verifyAuthCode`, `peekAuthCode`, `cleanupExpiredCodes` |
| `src/server/services/emailService.js` | +`buildAuthCodeEmail` template |
| `src/server/controllers/authController.js` | REWRITTEN — email → code → verify flow |
| `src/server/controllers/customerAuthController.js` | REWRITTEN — email → code → verify/register flow |
| `src/server/routes/auth.js` | Added `POST /verify` |
| `src/server/routes/customerAuth.js` | Added `POST /auth`, `POST /verify`, removed `/register` |
| `src/client/views/auth/login.ejs` | REWRITTEN — two-step email → code form |
| `src/client/views/customer/login.ejs` | REWRITTEN — two-step with auto-registration |

---

## 17. Guide RBAC (Commit: 9e0d778)

### Problem
All admin/agent/staff users could see the full admin panel. No guide-specific permissions.

### Solution
Separate `/guide/*` routes for guides. Guides cannot see admin panel at all.

### Guide Permissions
| Action | Route |
|--------|-------|
| View assigned groups | `GET /guide` |
| View group detail | `GET /guide/group/:id` |
| Mark milestone ready | `POST /guide/group/:id/milestone/:milestoneId/confirm` |
| Message all members | `POST /guide/group/:id/message` |
| Create poll voting | `POST /guide/group/:id/poll` |
| Close poll | `POST /guide/group/:id/poll/:pollId/close` |
| Message admin | `POST /guide/group/:id/admin-message` |
| Share maps/details | `POST /guide/group/:id/share` |

### Migration 0015 (`migrations/0015_guide_messaging.sql`)
```sql
CREATE TABLE IF NOT EXISTS group_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_tour_id INT NOT NULL,
  sender_user_id INT NULL,
  sender_member_id INT NULL,
  sender_name VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  message_type ENUM('text', 'milestone', 'poll', 'share') DEFAULT 'text',
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_tour_id) REFERENCES group_tours(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guide_polls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_tour_id INT NOT NULL,
  created_by_user_id INT NOT NULL,
  question VARCHAR(500) NOT NULL,
  options JSON NOT NULL,
  status ENUM('active', 'closed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_tour_id) REFERENCES group_tours(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS guide_poll_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id INT NOT NULL,
  voter_member_id INT NULL,
  voter_name VARCHAR(150) NOT NULL,
  selected_option INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (poll_id) REFERENCES guide_polls(id) ON DELETE CASCADE
);
```

### Middleware Updates (`src/server/middleware/auth.js`)
- `requireAdmin` → now checks `role === 'admin'` only (removed superadmin)
- `requireGuide` → NEW — checks `role === 'guide'`
- `requireAdminOrGuide` → NEW — checks `['admin', 'guide']`

### Files Changed
| File | Change |
|------|--------|
| `migrations/0015_guide_messaging.sql` | NEW — 3 tables |
| `src/server/middleware/auth.js` | Updated + added `requireGuide`, `requireAdminOrGuide` |
| `src/server/routes/guide.js` | NEW — 8 routes with `requireAuth` + `requireGuide` |
| `src/server/controllers/guideController.js` | NEW — 8 functions |
| `src/client/views/guide/dashboard.ejs` | NEW — assigned groups list |
| `src/client/views/guide/group-detail.ejs` | NEW — members, milestones, messages, polls, share |
| `src/server/app.js` | Registered `/guide` routes |
| `src/client/views/layout.ejs` | Role-based nav (admin full sidebar, guide only "My Groups") |

### Model Functions Added
| Function | Purpose |
|----------|---------|
| `getGroupsByGuideUserId(userId)` | Groups assigned to this guide |
| `createGroupMessage(...)` | Send message to group |
| `getGroupMessages(groupTourId)` | Get all group messages |
| `createGuidePoll(...)` | Create poll |
| `getGuidePollsByGroup(groupTourId)` | Get polls for group |
| `castPollVote(...)` | Vote on poll |
| `getPollResults(pollId)` | Get vote counts |
| `closePoll(pollId)` | Close a poll |

---

## 18. Member Portal Privacy (Commit: 9e0d778)

### Problem
Anyone with a booking token could see all members. No per-member privacy.

### Solution
Each member gets unique `zm_` token. Members see only their own details. Group leader sees all.

### Migration 0016 (`migrations/0016_member_portal_privacy.sql`)
```sql
ALTER TABLE tour_booking_members ADD COLUMN portal_token VARCHAR(64) NULL;
ALTER TABLE tour_booking_members ADD COLUMN email VARCHAR(150) NULL AFTER phone;
ALTER TABLE tour_booking_members ADD UNIQUE INDEX idx_member_portal_token (portal_token);

ALTER TABLE tour_bookings ADD COLUMN group_leader_member_id INT NULL AFTER members_required;

CREATE INDEX idx_tour_booking_members_token ON tour_booking_members(portal_token);
```

### Behavior
| Who | Token Prefix | Sees |
|-----|-------------|------|
| Booking customer | `zhb_` | All members, full portal |
| Group leader (member) | `zm_` | All members |
| Regular member | `zm_` | Only self |

### Portal Routes
| Route | Purpose |
|-------|---------|
| `GET /t/member/:token` | Member-only portal view |
| `POST /t/:token/members/transfer-leader/:memberId` | Transfer leadership |

### Files Changed
| File | Change |
|------|--------|
| `migrations/0016_member_portal_privacy.sql` | NEW — ALTERs + indexes |
| `src/server/models/index.js` | +7 functions: `createMemberWithToken`, `findMemberByPortalToken`, `getBookingMembersForLeader`, `isGroupLeader`, `setGroupLeader`, `getGroupLeader`, `peekAuthCode` |
| `src/server/controllers/portalController.js` | +`viewMemberPortal`, +`postTransferLeadership`, updated `postAddMember` |
| `src/server/routes/portal.js` | Added `/member/:token`, `/transfer-leader/:memberId` |
| `src/client/views/portal/member-view.ejs` | NEW — individual member view |
| `src/client/views/portal/members.ejs` | Added leader badge, transfer button, email field |
| `src/server/services/emailService.js` | +`buildMemberPortalInviteEmail` |

### Model Functions Added
| Function | Purpose |
|----------|---------|
| `createMemberWithToken(...)` | Create member with unique `zm_` token |
| `findMemberByPortalToken(token)` | Lookup member by token |
| `getBookingMembersForLeader(tourBookingId)` | All members (for leader) |
| `isGroupLeader(tourBookingId, memberId)` | Check if member is leader |
| `setGroupLeader(tourBookingId, memberId)` | Set group leader |
| `getGroupLeader(tourBookingId)` | Get current leader |

---

## 19. Audit Fixes (Commit: fa99a93)

### Fix 1: cancelTourBooking memory branch
**Bug:** Memory branch didn't decrement `current_bookings` on date ranges when cancelling.
**Fix:** Added decrement logic in memory branch.

### Fix 2: booking.ejs formatPrice
**Bug:** Local `formatPrice` function in script block hardcoded USD.
**Fix:** Removed unused dead code (server-side EJS already uses correct `res.locals.formatPrice`).

### Fix 3: getDashboardStats recent lists
**Bug:** Recent flights/tours lists included cancelled bookings.
**Fix:** Filtered with `activeFlights`/`activeTourBookings` variables.

---

## Git Log (This Session)

| Commit | Description |
|--------|-------------|
| `fa99a93` | fix: Audit fixes — 3 bugs found and resolved |
| `9e0d778` | feat: Auth Code System + Guide RBAC + Member Portal Privacy |

---

## To Deploy

```bash
# 1. Pull latest
git stash && git pull

# 2. Run migrations (on production MySQL)
mysql -u apexsolp_ztts -p'FgTN2D5Xm2j6M4PhKD5A' apexsolp_ztts < migrations/0014_auth_codes.sql
mysql -u apexsolp_ztts -p'FgTN2D5Xm2j6M4PhKD5A' apexsolp_ztts < migrations/0015_guide_messaging.sql
mysql -u apexsolp_ztts -p'FgTN2D5Xm2j6M4PhKD5A' apexsolp_ztts < migrations/0016_member_portal_privacy.sql

# 3. Restart
pm2 restart all
```

---

## Database Credentials
- **Host:** dwh1.apexsol.pk
- **User:** apexsolp_ztts
- **Password:** FgTN2D5Xm2j6M4PhKD5A
- **Database:** apexsolp_ztts
- **SSH:** `ssh apexsolp@dwh1.apexsol.pk`

---

## Current Schema State (After All Migrations)

### Tables (18 total)
1. `schema_migrations`
2. `users` (role: admin/guide/agent/staff)
3. `customers`
4. `flight_bookings`
5. `tour_packages`
6. `tour_date_ranges`
7. `tour_bookings` (group_leader_member_id, tour_date_range_id, members_added, members_required)
8. `tour_booking_members` (portal_token, email)
9. `portal_tokens`
10. `payments`
11. `audit_logs`
12. `exchange_rates`
13. `notification_logs`
14. `group_tours`
15. `group_milestones`
16. `auth_codes`
17. `group_messages`
18. `guide_polls`
19. `guide_poll_votes`

---

## Complete File Inventory

### New Files (This Session)
| File | Purpose |
|------|---------|
| `migrations/0014_auth_codes.sql` | Auth codes table |
| `migrations/0015_guide_messaging.sql` | Guide messaging + polls |
| `migrations/0016_member_portal_privacy.sql` | Member tokens + leader |
| `src/server/routes/guide.js` | Guide portal routes |
| `src/server/controllers/guideController.js` | Guide portal logic |
| `src/client/views/guide/dashboard.ejs` | Guide dashboard |
| `src/client/views/guide/group-detail.ejs` | Guide group detail |
| `src/client/views/portal/member-view.ejs` | Member portal view |

### Modified Files (This Session)
| File | Changes |
|------|---------|
| `src/server/config/db.js` | Updated seed, added 4 arrays |
| `src/server/models/index.js` | +15 model functions |
| `src/server/middleware/auth.js` | +requireGuide, +requireAdminOrGuide |
| `src/server/controllers/authController.js` | REWRITTEN |
| `src/server/controllers/customerAuthController.js` | REWRITTEN |
| `src/server/controllers/portalController.js` | +viewMemberPortal, +transferLeadership |
| `src/server/routes/auth.js` | +POST /verify |
| `src/server/routes/customerAuth.js` | +POST /auth, +POST /verify |
| `src/server/routes/portal.js` | +/member/:token, +/transfer-leader |
| `src/server/services/emailService.js` | +buildAuthCodeEmail, +buildMemberPortalInviteEmail |
| `src/server/app.js` | Registered guide routes |
| `src/client/views/auth/login.ejs` | REWRITTEN (two-step) |
| `src/client/views/customer/login.ejs` | REWRITTEN (two-step) |
| `src/client/views/layout.ejs` | Role-based nav |
| `src/client/views/portal/members.ejs` | Leader badge, transfer, email field |

---

## Pending Items
- Location sharing feature — NOT YET IMPLEMENTED (user asked to "test location sharing" but feature doesn't exist)
- Production deployment of migrations 0014-0016
- SMTP configuration for auth code delivery
