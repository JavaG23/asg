# Volunteer Portal Build-Out — Master Guide (#65)

Goal: give volunteers a Bloomerang-Volunteer-style experience (the org's current
platform for the Dulles South Food Pantry profile) and give admins the missing
tools to publish volunteer opportunities. This guide is the master reference;
sub-guides are listed at the bottom.

## What we're mimicking (Bloomerang Volunteer)

When a volunteer logs in they see **opportunity cards** (Self-reported Service
Hours, Birthday Bags, Distribution, etc.). Each card has:
- a description + image of the opportunity type
- a **Contact Manager** button (message the opportunity's manager)
- a **View Opportunities** button (see and sign up for upcoming shifts)

Volunteers choose which opportunity types appear in their portal (during
onboarding or from their profile). Admins define recurring schedules
(opportunity type + weekdays + time + volunteers needed) that publish shifts.

## Architecture

### Data model (prisma/schema.prisma — "#65" section)
| Model | Purpose |
|---|---|
| `OpportunityType` | One Bloomerang-style card: name, slug, description, imageUrl, managerName/Email, `isSelfReported`, active, sortOrder |
| `RecurringShiftTemplate` | Repeating schedule: opportunity type, frequency (weekly/biweekly/monthly), daysOfWeek (JSON `[2,4]`), start/end time, location, spotsNeeded, start/end date, `generateDaysAhead` window |
| `UserOpportunityPreference` | Which types a volunteer wants shown. **Zero rows = show all active types** (opt-out model so existing volunteers need no setup) |
| `VolunteerShift` (extended) | New nullable `opportunityTypeId` + `templateId`. Existing shifts keep working (null type = generic shift) |

`isSelfReported` types (e.g. Self-reported Service Hours) have no shifts —
their card routes to the existing hour log (`/volunteer/hours`, clock in/out).

### Migration: APPLIED (2026-07-08, user-authorized)
`npx prisma db push` has been run (all changes were additive) and
`scripts/seed-opportunity-types.ts` seeded the 8 opportunity types. The seed
is idempotent (upserts by slug) — safe to re-run after content edits.

### Reused from bapol-pwa (reference clone at `..\bapol-pwa`)
- **Calendar**: `bapol-pwa/app/calendar/page.tsx` — custom React month-grid +
  list views + quick-filter chips (no calendar library). Ported in simplified
  form to `app/volunteer/opportunities/page.tsx` (map/near-me/friends features
  dropped). If richer behavior is wanted later (localStorage filter
  persistence, tips banner, infinite scroll), lift it from the bapol file.
- **My Events tab pattern**: `bapol-pwa/app/my-events/page.tsx` → tabs on
  `app/volunteer/my-opportunities/page.tsx` (Signed Up / Available).
- Note: bapol has **no recurring-event support** — `RecurringShiftTemplate` +
  `lib/services/recurring-shifts.ts` are net-new here.

### New/changed files
**Volunteer-facing**
- `app/volunteer/my-opportunities/page.tsx` — opportunity cards + Signed Up/Available tabs
- `app/volunteer/opportunities/page.tsx` — calendar (month/list + type filter chips)
- `app/volunteer/profile/page.tsx` — added "My Opportunities" preferences section
- `app/volunteer/dashboard/page.tsx` — quick actions now link to the new pages
- `components/volunteer/OpportunityCard.tsx` — card + Contact Manager modal
- `components/volunteer/OpportunityPreferences.tsx` — type toggles (profile + future onboarding)
- `app/api/volunteer/opportunity-types/route.ts` — GET types+prefs / PUT prefs
- `app/api/volunteer/opportunities/route.ts` — calendar feed (respects prefs, type filter)
- `app/api/volunteer/contact-manager/route.ts` — POST message → manager email

**Admin**
- `app/admin/volunteers/page.tsx` — hub: Opportunity Types CRUD + Recurring Schedules + "Generate Upcoming Shifts"
- `app/api/admin/opportunity-types/route.ts` + `[id]/route.ts` — CRUD (delete = deactivate if used)
- `app/api/admin/recurring-shifts/route.ts` + `[id]/route.ts` + `generate/route.ts`
- `app/admin/layout.tsx` — nav: added **Volunteers**, restored **Shifts**

**Shared**
- `lib/auth/guards.ts` — `requireAdmin()` / `requireVolunteer()` (replaces the copy-pasted session check; migrate old routes opportunistically)
- `lib/services/recurring-shifts.ts` — idempotent template→shift expansion
- `lib/services/email.ts` — added `sendContactOpportunityManagerEmail` (Resend, reply-to volunteer)
- `scripts/seed-opportunity-types.ts` — seed cards; **paste Bloomerang descriptions here**

### Signup flow (unchanged core)
Signup/cancel/approve reuse the existing `VolunteerSignup` endpoints
(`/api/volunteer/shifts/[id]/signup`, `/cancel`) and admin approval at
`/admin/shifts/[id]`. The new pages are alternative front-ends over the same
shift model, so the clock in/out and hour-log features keep working.

## Content ingestion (per opportunity type)
For each Bloomerang opportunity the admin pastes the page source; we extract:
1. **Name** → `OpportunityType.name` (slug auto-derived)
2. **Description text** → `description` (rendered with line breaks on the card)
3. **Image** → download to `public/opportunities/<slug>.jpg`, set `imageUrl`
4. **Manager name/email** → `managerName` / `managerEmail`
Add each as an entry in `scripts/seed-opportunity-types.ts` (upserts by slug —
safe to re-run) or enter directly in Admin → Volunteers → New Opportunity Type.

## Remaining work (see NEW_TODO.md #65 for status)
- Volunteer onboarding: public volunteer application page (mirror
  `app/donor/signup`) that includes the `OpportunityPreferences` picker;
  `PendingOnboarding` already supports `type: 'volunteer'` on the backend.
- Wire generation as a daily cron (`vercel.json`, mirror
  `/api/cron/pickup-reminders` with `CRON_SECRET`).
- Fix the known "Failed to fetch shifts" issue on `/admin/shifts` (page is back
  in the nav).
- Update `docs/volunteer-guide.md` and `docs/admin-guide.md` after the feature
  stabilizes.

## Design decision: admin IA & Driver Routes as an opportunity type (65j)

**Vision (user, 2026-07-08):** The volunteer portal is the umbrella for ALL
volunteers — drivers, onsite, distribution, etc. In the admin dashboard:
- **Volunteers** = volunteer management: entering opportunities of every type,
  assigning shifts and routes.
- **Routes** = the workflow for entering specific routes; entered routes become
  opportunities under a "Driver Routes" opportunity type.
- **Shifts** = either folded into Volunteers, or a unified view of all
  scheduled/assigned opportunities, sortable by type and editable.

**Settled design (user decisions 2026-07-08):**
1. **Separate data, unified presentation.** Keep `Route` and `VolunteerShift`
   as separate models — routes are too rich (stops, geocoding, delivery logs,
   CSV import) to force into the shift model. The bridge is a **synced shift**:
   when an admin creates routes for date D in the Routes workflow, the system
   auto-creates/updates ONE Driver Routes VolunteerShift for D with
   `spotsNeeded` = number of routes on that date. (Route already has `date`,
   `driverId?`, `status`, `startedAt` — no Route schema change needed.)
2. **Signup → assignment flow:** volunteers sign up for the Driver Routes
   opportunity like any shift. The admin then assigns each signed-up driver a
   specific route (`Route.driverId`, existing assignment UI). Once assigned,
   the volunteer's My Opportunities entry deep-links to that route in the
   driver portal (visible only if the user has the driver role and the route
   is assigned to them).
3. **Driver hours auto-log:** completing a route creates a `VolunteerHourLog`
   entry automatically (clockIn = `Route.startedAt`, clockOut = completion
   timestamp, linked notes referencing the route), so drivers' volunteer-hour
   totals include driving.
4. **Generalize `OpportunityType.isSelfReported` into `kind`:**
   `'shifts' | 'routes' | 'self-reported'` (schema change — bundle with the
   deferred migration; do in plan mode). The Driver Routes type is seeded and
   system-managed: not deletable, no manual shift creation, no recurring
   schedules — its shifts come only from the Routes sync.
5. **Admin nav:** drop **Shifts** from top-level nav; the Volunteers hub gains
   a third tab, **Scheduled Opportunities**, absorbing the current
   /admin/shifts list with an opportunity-type filter. Driver-route rows there
   are summaries linking to /admin/routes for editing. **Routes** stays
   top-level — it remains the entry point for creating driver-route
   opportunities.

**Additional schema gaps found during content ingestion (65b, 2026-07-08).**
All are additive/nullable — bundle into the single 65j schema pass rather than
migrating piecemeal:
1. Multiple *self-reported* opportunity types exist (Self Reported Volunteer
   Hours, Birthday Bags) sharing one hour-logging mechanism but tracked
   separately for reporting. `VolunteerHourLog` has no `opportunityTypeId`, so
   we can't tell which self-reported opportunity a logged hour belongs to.
   Add nullable `opportunityTypeId` + a picker in the Log Hours flow.
2. "Limited Onsite Volunteer Opportunities" caps volunteers at 1 concurrent
   sign-up across all its shifts — distinct from per-shift `spotsNeeded`
   capacity. Need a per-type concurrent-signup cap (e.g.
   `OpportunityType.maxConcurrentSignups Int?`, null = unlimited) enforced in
   the shift signup API (`/api/volunteer/shifts/[id]/signup`) by counting the
   user's active signups across all shifts of that type.
3. `OpportunityType` has no `managerPhone` — Limited Onsite is the first
   ingested opportunity to show a phone number (703-507-2795 x0). Add nullable
   `managerPhone`, surfaced next to managerEmail on the card/contact modal.
4. **"Food Drive Signup" and "Kit Packing Donations" don't fit the shift /
   self-reported binary at all.** Both are community-partner *registrations*:
   the partner submits contact info + a planned delivery date, does the work
   off-site over time, then drops off the donation — at which point time is
   "submitted as volunteer hours" and the org explicitly offers to "verify"
   those hours. Currently seeded with `isSelfReported: true` as a stopgap,
   which silently drops the one new thing these types actually need (planned-
   date capture) and exposes a further gap: `VolunteerHourLog` has no
   verified/approved field, so "we're happy to verify service hours" has
   nowhere to go. **Recommend a third `kind: 'registration'`** in the 65j
   pass: a short contact-info + planned-date form (could reuse
   `PendingOnboarding`-style intake) feeding a `VolunteerHourLog` with an
   added `verified Boolean @default(false)` that admins flip once confirmed.

**Driver Routes content ingested (65b, 2026-07-08)** — seeded in
`scripts/seed-opportunity-types.ts` as a normal type for now (harmless no-op
until 65j adds `kind`/sync). Confirms the plan and adds two details:
- Manager: Andi Huppert, volunteer@dsfp.org, 703-507-2795 x0 (same contact as
  Limited Onsite).
- "Please take no more than 2 Saturday routes" — a day-of-week-scoped cap,
  a different shape than the flat `maxConcurrentSignups` cap already needed
  for Limited Onsite. **Decision: treat as informational card text only**
  (honor system, like the age-restriction bullets on the onsite types) —
  not planned for system enforcement; too narrow a rule to justify a generic
  mechanism.
- Per-route requirements ("some routes need a van/SUV, others require lifting
  up to 40 lbs, noted on the route signup") live at the individual-route
  level in Bloomerang. `Route` has no fields for this today — optional future
  enhancement, not required for the 65j MVP sync.

**Remaining sub-questions (resolve during 65j planning):**
- Restrict Driver Routes signups to users with the driver role, or allow any
  volunteer (with admin vetting at assignment time)?
- When routes are added/removed for a date that already has signups, how do
  spots reconcile (esp. shrinking below approved count)?
- Completion timestamp for hours: `weighedAt`, status→completed transition, or
  admin-entered?

## Sub-guides (to be written with their tasks)
1. **Opportunity content ingestion guide** — how to turn a pasted Bloomerang page into a seed entry (65b)
2. **Volunteer onboarding guide** — application form + approval + preference selection flow (65f)
3. **Recurring schedules admin guide** — end-user doc for admins (65h, folds into docs/admin-guide.md)

## Verification (after migration)
1. `npx tsx scripts/seed-opportunity-types.ts` then log in as an admin →
   Volunteers: create a weekly schedule (Tue/Thu 09:00-12:00, 4 volunteers) →
   "Generate Upcoming Shifts" → confirm shifts appear under /admin/shifts.
2. Log in as a volunteer → My Opportunities: cards render, Contact Manager
   sends (check Resend logs), Signed Up/Available tabs work, signup →
   pending/waitlist logic matches the old shifts page.
3. Opportunities calendar: month dots + chips filter, list view signup.
4. Profile: toggle a type off → its shifts disappear from the calendar feed.
