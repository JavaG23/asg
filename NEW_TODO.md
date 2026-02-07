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
- **Status:** [~] Partially Complete (2026-01-31)
- **Description:** Replace separate admin/driver login buttons with a unified login experience and role-based routing.

  **Completed:**
  - [x] Unified home page with single "Sign In" button
  - [x] Logged-in users auto-redirect to their role's dashboard
  - [x] Login page role-based routing after sign-in
  - [x] Removed test credentials from login page
  - [x] Multi-role support with boolean role fields
  - [x] Role selector screen for multi-role users (/select-role)

  **Remaining:**
  - [ ] Role switcher widget in each interface's header/nav (currently users must go to profile to switch)

### 64. Review security suggestions from code review
- **Status:** [ ] Pending
- **Description:** Review the security and architectural suggestions in DO_NOT_REVIEW/code_review_advice.md and determine which should be implemented.

  **Security Issues Identified:**
  1. **Public API Endpoints (Critical):** /api/donors and /api/import lack auth checks
     - Status: Needs review - may already be protected by middleware
  2. **Long JWT Expiration (Critical):** Session maxAge set to 1 year
     - Status: Needs evaluation - using database sessions may mitigate this
  3. **Client-Side Filtering:** Donors page fetches all data and filters client-side
     - Status: Low priority - acceptable for current scale
  4. **JSON as String:** pendingChanges stored as String instead of Json type
     - Status: Low priority - working as intended
  5. **Cascade Deletes:** onDelete: Cascade on Address model
     - Status: Needs review - may be intentional behavior
  6. **Shared Prod/Dev Database:** Known limitation during testing phase
     - Status: Planned - separate environments for production

  **Action Items:**
  - [ ] Audit all API routes for auth protection
  - [ ] Evaluate session expiration strategy
  - [ ] Review cascade delete policies
  - [ ] Document security decisions made

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
