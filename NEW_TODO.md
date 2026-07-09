# ASG App - Development Todo List

## Overview
This document tracks remaining development tasks for the ASG App.

**Important Notes:**
- Do NOT push changes to git during production testing
- Do NOT run database migrations until production testing is complete
- The database is shared between production and dev
- Do NOT waste context reviewing files in `DO_NOT_REVIEW/` - contains reference guides, meeting notes, and test CSVs

**Token Conservation:**
- When possible, use Grep to search for specific content rather than reading entire large files
- Keep responses concise — avoid over-explaining unless asked for detail
- When delegating simple tasks (searching, file reads, small edits) to subagents, prefer the haiku model to reduce cost and latency

**Documentation Standards:**
When implementing features, update the relevant documentation:
- `README.md` - Brief overview, CSV formats, getting started
- `docs/admin-guide.md` - Admin workflows, route/driver management, reports
- `docs/driver-guide.md` - Driver app usage, pickup process, troubleshooting
- `docs/donor-guide.md` - Donor instructions, donation guidelines
- `docs/volunteer-guide.md` - Volunteer roles, hour logging

Keep instructions **brief and action-oriented**:
- Use numbered steps for processes
- Use tables for comparisons/options
- Avoid unnecessary explanation - focus on "what to do"

---

## Task Status Legend
- [ ] Pending
- [x] Completed
- [~] In Progress
- [!] Blocked

---

## Incomplete Tasks

### 37. Unify login flow with role-based routing and role switcher
- **Status:** [x] Completed (2026-02-06)
- **Description:** Replace separate admin/driver login buttons with a unified login experience and role-based routing.

  **All completed:**
  - [x] Unified home page with single "Sign In" button
  - [x] Logged-in users auto-redirect to their role's dashboard
  - [x] Login page role-based routing after sign-in
  - [x] Removed test credentials from login page
  - [x] Multi-role support with boolean role fields
  - [x] Role selector screen for multi-role users (/select-role)
  - [x] Role switcher button in all 4 interfaces (admin sidebar, driver/donor/volunteer headers) — only visible for multi-role users

### 64. Review security suggestions from code review
- **Status:** [~] In Progress (2026-02-06)
- **Description:** Review the security and architectural suggestions in DO_NOT_REVIEW/code_review_advice.md and determine which should be implemented.

  **Security Issues Identified:**
  1. **Public API Endpoints (Critical):** ~~/api/donors and /api/import lack auth checks~~
     - Status: **FIXED** (2026-02-06) - Added auth + admin role checks to all 6 unprotected endpoints
     - Fixed: /api/import, /api/import/drivers, /api/donors, /api/donors/[id], /api/admin/pending-changes, /api/routes
  2. **Long JWT Expiration (Critical):** ~~Session maxAge set to 1 year~~
     - Status: **FIXED** (2026-02-06) - Reduced to 30 days
  3. **Client-Side Filtering:** Donors page fetches all data and filters client-side
     - Status: Low priority - acceptable for current scale
  4. **JSON as String:** pendingChanges stored as String instead of Json type
     - Status: Low priority - working as intended
  5. **Cascade Deletes:** onDelete: Cascade on Address model
     - Status: **Reviewed** (2026-02-06) - All cascade deletes are appropriate (Address→Route, Session→User, DonorEventOptIn→Donor/Event, VolunteerSignup→User/Shift, VolunteerHourLog→User)
  6. **Shared Prod/Dev Database:** Known limitation during testing phase
     - Status: Planned - separate environments for production
  7. ~~**Pre-existing type errors:** app/api/admin/inactive-donors/route.ts has 14 type errors~~
     - Status: **FIXED** (2026-02-06) - isActive → active field name corrected

  **Action Items:**
  - [x] Audit all API routes for auth protection
  - [x] Evaluate session expiration strategy (reduced to 30 days)
  - [x] Review cascade delete policies (all appropriate)
  - [x] Fix inactive-donors/route.ts type errors
  - [ ] Document security decisions made

### 65. Volunteer Portal Build-Out (Bloomerang-style)
- **Status:** [~] In Progress (2026-07-08)
- **Description:** Expand the volunteer portal from a shift clock to a Bloomerang-Volunteer-style experience (opportunity cards with description/image, Contact Manager, View Opportunities), a calendar of available opportunities (ported from bapol-pwa), a My Opportunities view, per-user opportunity preferences, and admin volunteer management (opportunity types + recurring schedules + volunteers needed). Master guide: `docs/volunteer-portal-buildout.md`. Reference clone: `..\bapol-pwa` (calendar: `app/calendar/page.tsx`, tabs: `app/my-events/page.tsx`).

  **⚠️ Migration deferred:** schema additions (OpportunityType, RecurringShiftTemplate, UserOpportunityPreference, 2 nullable VolunteerShift columns) are in `prisma/schema.prisma` but NOT migrated (shared prod/dev DB). New endpoints 500 until `npx prisma db push` runs post-production-testing. All changes additive.

  **65a. Data model + API + UI scaffold** 📘 covered by master guide
  - [x] Prisma models + `prisma generate` (no DB change)
  - [x] `lib/auth/guards.ts` (`requireAdmin`/`requireVolunteer` — reuse in new routes, migrate old ones opportunistically)
  - [x] Volunteer APIs: opportunity-types (GET/PUT prefs), opportunities feed, contact-manager
  - [x] Admin APIs: opportunity-types CRUD, recurring-shifts CRUD + generate
  - [x] `lib/services/recurring-shifts.ts` (idempotent generation)
  - [x] Pages: `/volunteer/my-opportunities`, `/volunteer/opportunities` (calendar), `/admin/volunteers`
  - [x] Components: `OpportunityCard`, `OpportunityPreferences` (wired into profile)
  - [x] Admin nav: added Volunteers, restored Shifts; volunteer dashboard quick actions
  - [x] `sendContactOpportunityManagerEmail` in `lib/services/email.ts`

  **65b. Opportunity type content ingestion** 📘 NEEDS SEPARATE GUIDE (docs/opportunity-content-guide.md)
  - [~] User pastes rendered Bloomerang content per opportunity (NOT page source — it's an Angular SPA shell; copy the visible card text or the card element's outerHTML from DevTools)
  - [x] "Unlimited Onsite Volunteer Opportunities" ingested (manager: Andi Huppert, volunteer@dsfp.org)
  - [x] "Self Reported Volunteer Hours" ingested (manager: Andi Huppert, volunteer@dsfp.org); "how to log hours" steps adapted for our UI instead of Bloomerang's
  - [x] "Birthday Bags" ingested (manager: Andi Huppert, defaulted to volunteer@dsfp.org — body text separately names info@dsfp.org for requests >10 bags, kept in description; switch managerEmail via admin edit modal if org wants Contact Manager routed to info@dsfp.org for this type instead). No shift signup on Bloomerang (assembled at home, hours self-logged) -> modeled isSelfReported: true.
  - [x] "Distribution" ingested (manager: Andi Huppert, volunteer@dsfp.org — shown directly on page this time). Confirmed as a distinct opportunity from Unlimited Onsite (has its own 18+/out-of-high-school age restriction and shift cadence note).
  - [x] "Limited Onsite Volunteer Opportunities" ingested — sibling of Unlimited Onsite with same house rules (minus the shoes bullet) plus a "no more than 1 sign-up at a time" per-volunteer cap. Also the first opportunity with a manager phone number (703-507-2795 x0).
  - **Two more schema gaps discovered:** (1) no way to enforce a max-concurrent-signups-per-opportunity-type limit (needed for Limited Onsite); (2) `OpportunityType` has no `managerPhone` field. Both are additive/nullable — bundle into the 65j schema pass with the earlier-discovered `VolunteerHourLog.opportunityTypeId` gap rather than three separate migrations.
  - [x] Card images COMPLETE (2026-07-08): all 8 cover/icon pairs verified by magic bytes (covers = JPEG despite `.unknown` extensions from Bloomerang, logos = PNG), renamed to `public/opportunities/<slug>-{cover.jpg,icon.png}`, and every seed `imageUrl` confirmed to resolve to a real file. `-icon` files staged but not yet rendered by any UI (card shows cover only).
  - [ ] Cleanup: `public/pics/` staging folder still holds the original uploads (now duplicated into public/opportunities/, ~2.7MB) — anything under public/ is web-served and would get committed; delete once confirmed no longer needed.
  - [x] "Food Drive Signup" ingested — ⚠️ DOESN'T FIT THE CURRENT MODEL. It's a registration (partner provides contact info + a planned delivery date) that later converts to self-reported/verified hours, not a fixed shift and not pure after-the-fact logging. Mapped to `isSelfReported: true` as a stopgap — the "schedule a delivery date" intake has NO UI, the card just opens generic Log Hours with no date capture. Also surfaces a 4th gap: `VolunteerHourLog` has no verified/approved concept, but Bloomerang explicitly offers to "verify service hours" for this type.
  - [x] "Kit Packing Donations" ingested — same registration shape as Food Drive Signup (off-site meal-kit packing events; contact info + planned delivery date; hours self-reported + verified after drop-off). Uses `info@dsfp.org` to register the event (distinct from `volunteer@dsfp.org` general contact) — kept in description, managerEmail still defaults to volunteer@dsfp.org. Same `isSelfReported` stopgap and same missing-verification gap as Food Drive Signup.
  - [x] "Driver Routes" content ingested (manager: Andi Huppert, volunteer@dsfp.org, 703-507-2795 x0) — seeded now as a normal type (harmless no-op with 0 shifts) pending 65j's `kind`/sync work. "No more than 2 Saturday routes" decided to stay informational-only text, not system-enforced (too narrow a rule for a generic mechanism — see guide).
  - [x] All 8 known Dulles South Food Pantry opportunities ingested: Self Reported Volunteer Hours, Unlimited Onsite, Limited Onsite, Birthday Bags, Distribution, Food Drive Signup, Kit Packing Donations, Driver Routes
  - [ ] Run seed after migration
  - **Design gap discovered (2026-07-08):** two self-reported-style types now exist (Self Reported Volunteer Hours, Birthday Bags) but `VolunteerHourLog` has no `opportunityTypeId` — logged hours can't be attributed to which self-reported opportunity they're for. Needs a nullable `opportunityTypeId` on `VolunteerHourLog` + an opportunity picker in the Log Hours UI. Bundle into 65j's schema pass (plan mode) rather than fixing ad hoc.
  - **65j must decide:** does "Food Drive Signup"/"Kit Packing Donations" get a proper `kind: 'registration'` (contact info + planned date form, converts to a verifiable hour log), or stay folded into `isSelfReported` as designed today? Recommend the former — the stopgap silently drops the one new thing these opportunities actually collect (a planned date) and the verification step Bloomerang explicitly offers.

  **65c. Run deferred migration + seed**
  - [x] DONE (2026-07-08, user-authorized): `npx prisma db push` applied (all additive — new tables + nullable columns) and `scripts/seed-opportunity-types.ts` seeded all 8 opportunity types (ids 1-8)
  - [x] Smoke-tested: dev server pages 200, new APIs return clean 401s unauthenticated (not 500s)
  - [ ] Walkthrough with real logins (admin + volunteer) per the guide's Verification section

  **65d. Calendar polish (port more from bapol as needed)**
  - [ ] localStorage filter persistence, dismissible tips banner (bapol patterns)
  - [ ] Decide fate of old `/volunteer/shifts` page (keep as "classic list" or redirect to calendar)

  **65e. Fix known issue: /admin/shifts "Failed to fetch shifts"** (page restored to nav by 65a)
  - [x] RESOLVED (2026-07-08): root cause confirmed on running app — the VolunteerShift tables were never migrated to the shared DB (page + API code were always correct). API now detects Prisma P2021/P2022 and shows an explicit "tables not migrated yet" 503. The page will start working as soon as 65c (deferred migration) runs; nothing else to fix.
  - [x] Migrated route to `requireAdmin()` guard
  - [x] Added opportunity-type dropdown to Create Shift modal (optional, "None (generic shift)" default) + type badge on shift cards; POST accepts `opportunityTypeId`
  - [x] Verified on running app: explicit 503 message displays as designed

  **65f. Volunteer onboarding flow** 📘 NEEDS SEPARATE GUIDE (docs/volunteer-onboarding-guide.md)
  - [ ] Public volunteer application page (mirror `app/donor/signup`) incl. `OpportunityPreferences` picker
  - [ ] `/api/volunteer/apply` route → `PendingOnboarding` type 'volunteer' (admin approval path already exists in pending-changes)
  - [ ] Save chosen preferences on approval

  **65g. Recurring generation cron**
  - [ ] Daily cron in `vercel.json` → wrap `generateShiftsFromTemplates()` with `CRON_SECRET` check (mirror `/api/cron/pickup-reminders`)

  **65h. Admin volunteer-management docs** 📘 NEEDS SEPARATE GUIDE (fold into docs/admin-guide.md)
  - [ ] Admin workflow: create opportunity types, recurring schedules, generate shifts, approve signups

  **65i. Volunteer end-user docs**
  - [ ] Update `docs/volunteer-guide.md`: opportunity cards, calendar, preferences, contact manager

  **65j. Admin IA redesign: Driver Routes as opportunity type** — [x] IMPLEMENTED (2026-07-08, plan-mode approved)
  - [x] Schema: `OpportunityType.kind` ('shifts'|'routes'|'self-reported'|'registration') replaces isSelfReported; + `maxConcurrentSignups`, `managerPhone`, `systemManaged`; `VolunteerHourLog` + opportunityTypeId/routeId/source/verified(+By/At); `VolunteerShift.spotsManuallySet`; `Route.completedAt`; new `OpportunityRegistration` model
  - [x] Routes sync (`lib/services/driver-routes-sync.ts`, non-fatal): hooks in route create (manual + CSV import) and delete; N routes on a date ↔ one Driver Routes shift with N spots — UNLESS admin pre-set the count (`spotsManuallySet`, e.g. "30 drivers next Saturday" before routes exist; create/edit such shifts in Scheduled Opportunities)
  - [x] Route completion → `completedAt` + auto VolunteerHourLog (clockIn=startedAt, verified, deduped by routeId) — hook in delivery all-stops-done branch (both route types)
  - [x] Signup gating: routes-kind requires driver role → non-drivers offered "Request Driver Access" (pendingChanges isDriver:true → existing /admin/pending-changes approval); per-type `maxConcurrentSignups` enforced (Limited Onsite = 1)
  - [x] Registrations (stored): volunteer Register modal (planned date + contact) → admin Registrations tab (confirm/complete/cancel)
  - [x] Manual hour logging: Add Hours modal on /volunteer/hours (opportunity picker, date, hours, comment; ?log=1&type= prefill) → admin Hour Logs tab with Verify
  - [x] My Opportunities: assigned driver-route entries show "View My Route" → /driver/dashboard (no per-route driver page — future enhancement)
  - [x] Admin: Shifts removed from nav; /admin/shifts redirects to Volunteers hub "Scheduled Opportunities" tab (type filter + create/edit modals); /admin/shifts/[id] detail kept for signup approval; type modal has kind/phone/cap fields; Driver Routes is system-managed (no delete, kind locked)
  - Deferred: per-route requirements (van/SUV, lifting) on Route; per-route driver page for deep links; "no more than 2 Saturday routes" stays honor-system text

---

## Future Tasks (Nice-to-Have)

### 35h. Add bulk "food not outside" notification for admins
- **Status:** [ ] Future
- **Description:** After routes complete, admin can send bulk notification to donors whose food was not outside.

### 35i. Add donor re-engagement feature
- **Status:** [ ] Future
- **Description:** Admin can contact past donors who haven't donated recently to check if they'd like to begin donating again.

### 36i. Update people reports to count drivers+volunteers as unique individuals
- **Status:** [ ] Future
- **Description:** A driver who also volunteers should be counted once in aggregate people reports, not twice.

### 36j. Add volunteer re-engagement feature
- **Status:** [ ] Future
- **Description:** Admin can contact past volunteers who haven't volunteered recently to check if they'd like to begin volunteering again.

---

## Known Issues

### Shifts page "Failed to fetch shifts" error
- **Status:** [ ] Pending
- **Description:** The Shifts and Pickup Events links have been commented out in `app/admin/layout.tsx` so they don't appear on the side menu. The shifts page shows a "Failed to fetch shifts" error that needs to be diagnosed and fixed.
- **Note:** Pickup events should primarily be created through the admin dashboard when routes are added. Routes assigned to an event day that doesn't yet exist should prompt admins to use the "Add new date" option in the dropdown.

---

## Current Login State

Login currently works with **email-only** (no password required). This is intentional during production testing.

**When ready to enforce passwords:**
1. Password system is already implemented (bcryptjs, reset flow, setup emails)
2. Currently users with null passwordHash are allowed through
3. To enforce: update the auth logic in `lib/auth/config.ts` to reject users without passwords
4. All drivers should have passwords set via the password setup email flow before enforcing

**Key Implementation Details:**
- **Password System:** Using bcryptjs (not bcrypt) for cross-platform compatibility with Vercel
- **Email Service:** Resend with lazy initialization to avoid build-time errors
- **Email Opt-In:** Confirmation modal for every route assignment - no accidental emails
- **Session Strategy:** Using database sessions via @auth/prisma-adapter for persistent login

---

## Notes & Decisions

- **CSV Upload Approach:** Two uploads: (1) VolunteerList.csv for drivers, (2) Route CSV for stops/addresses. Route CSV may or may not include driver assignments - system detects and handles both cases
- **Password Migration:** Existing users will have null passwordHash; they'll need to use password reset to set initial password
- **Email Default:** Email sending defaults to OFF to prevent accidental sends during testing
- **Route Status Flow:** `pending` -> `active` -> `pending_weight` -> `completed` (weight must be entered at distribution center before route is fully complete)
- **App Workflow Clarification:** This is a food PICKUP app, not delivery. Drivers collect donated food from residential locations and bring it to a central distribution center. UI terminology should reflect "donation/pickup" not "delivery"
- **Multi-Role Support:** Users have boolean fields (isAdmin, isDriver, isDonor, isVolunteer) and can have any combination
- **Event Dates:** PickupEvent table is the single source of truth for all event dates (no more hardcoded dates)
- **Timezone:** All date inputs parsed at noon UTC to avoid day-boundary issues
- **Reminders:** Disabled by default via ENABLE_EMAIL_REMINDERS env var

---

*Last updated: 2026-02-06*
