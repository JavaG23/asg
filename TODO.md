# ASG App - Development Todo List

## Overview
This document tracks development tasks for the ASG App production authentication and CSV import system.

**Important Notes:**
- Do NOT push changes to git during production testing
- Do NOT run database migrations until production testing is complete
- The database is shared between production and dev
- Do NOT waste context reviewing files in `DO_NOT_REVIEW/` - contains reference guides, meeting notes, and test CSVs

---

## Task Status Legend
- [ ] Pending
- [x] Completed
- [~] In Progress
- [!] Blocked

---

## Authentication & Password System

### 1. Add passwordHash field to User model (schema only)
- **Status:** [~] Prepared (2026-01-30) - COMMENTED OUT until migration ready
- **Blocked by:** None
- **Description:** Add optional `passwordHash String?` field to the User model in prisma/schema.prisma. DO NOT run migrations yet - just prepare the schema. Migration will be run after production testing is complete.

  **Implementation:**
  - Field is COMMENTED OUT in schema.prisma (line 19) to allow login during production testing
  - Auth config has password verification code ready but commented out
  - When ready: uncomment in schema, run migration, uncomment in auth config
  - NOTE: Migration NOT yet applied to database

### 2. Install bcrypt for password hashing
- **Status:** [x] Completed (2026-01-30)
- **Blocked by:** None
- **Description:** Install bcrypt and @types/bcrypt packages for secure password hashing and verification.

### 3. Update auth logic to verify passwords
- **Status:** [x] Completed (2026-01-30)
- **Blocked by:** #1, #2
- **Description:** Modify lib/auth/config.ts authorize function to verify password against passwordHash using bcrypt.compare(). Handle case where user has no password set (for backwards compatibility during transition).

  **Implementation:**
  - Added bcrypt import to lib/auth/config.ts
  - If user has passwordHash, verify with bcrypt.compare()
  - If user has no passwordHash (null), allow login during transition period
  - Added logging for users who login without password (for tracking)
  - Email normalized to lowercase for consistent lookup
  - Inactive users are now rejected at login

### 11. Create password reset flow for drivers
- **Status:** [x] Completed (2026-01-31)
- **Blocked by:** None
- **Description:** Implement password reset functionality:
  1. Password reset request page
  2. Email with secure reset token/link
  3. Set new password page
  4. Token validation and password update

  This is needed for new drivers to set their initial password.

  **Implementation:**
  - Added Resend email service (lib/services/email.ts)
  - Created forgot-password page and API endpoint
  - Created reset-password page with token validation
  - Created validate-reset-token API endpoint
  - Added password field to login page with "Forgot password?" link
  - Secure token generation with 1-hour expiry
  - Updated Prisma schema with passwordHash, passwordResetToken, passwordResetTokenExpiry fields
  - Using bcryptjs for cross-platform password hashing

---

## CSV Import System

### 16. Add bulk driver upload from volunteer list CSV
- **Status:** [x] Completed (2026-01-30)
- **Blocked by:** None
- **Description:** Add upload field for VolunteerList.csv to bulk import drivers.

  **CSV format (VolunteerList.csv):**
  - Route (number) - assigned route
  - First Name, Last Name
  - Volunteer Email
  - Mobile Phone Number
  - Shift Drop Off Time
  - Scheduled Roles

  **On upload:**
  1. Parse CSV and validate format
  2. For each row, check if driver exists (by email)
  3. If exists, update info and route assignment
  4. If new, create driver account (with null password)
  5. Assign driver to route based on Route column
  6. Display summary: X new drivers, Y updated, Z errors

### 17. Check driver account/password status after upload
- **Status:** [x] Completed (2026-01-30)
- **Blocked by:** #16, #1
- **Description:** After bulk driver upload, check each driver's account status:

  1. Has account with password set → Ready
  2. Has account without password → Needs password setup
  3. New account created → Needs password setup

  Display status in admin UI showing:
  - List of drivers needing password setup
  - List of drivers ready to go
  - Count summary

  **Implementation:**
  - Each driver in import results now includes `hasPassword` field
  - API returns `driversWithPassword` and `driversWithoutPassword` counts
  - UI shows password status badge (Ready/Needs Password) for each driver
  - Summary section shows total counts for ready vs needs setup
  - Warning displayed if any drivers need password setup

### 18. Add admin option to send password setup emails
- **Status:** [x] Completed (2026-01-31)
- **Blocked by:** #17, #11
- **Description:** After driver upload and status check, provide admin with option to send password setup emails:

  1. Show list of drivers needing password setup
  2. Checkbox to select which drivers to email (or "Select All")
  3. Toggle to enable/disable sending (default OFF for testing)
  4. "Send Password Setup Emails" button
  5. Email contains link to set initial password
  6. Show confirmation of emails sent

  **Implementation:**
  - Added email selection UI to DriverCSVUpload component
  - Drivers without passwords shown with checkboxes for selection
  - "Select All" / "Deselect All" toggle
  - Created /api/auth/send-password-setup endpoint for bulk email sending
  - Uses same password reset email flow with 7-day expiry for setup links
  - Shows success/failure results after sending

### 19. Add route CSV upload with driver detection
- **Status:** [x] Completed (2026-01-30)
- **Blocked by:** None
- **Description:** Update route CSV upload to detect if drivers are assigned:

  1. Parse uploaded route CSV
  2. Check if driver_email column exists and is populated
  3. If driver column exists:
     - Validate driver emails exist in system
     - Show warnings for unknown driver emails
  4. If no driver column:
     - Routes created without driver assignment
     - Flag routes as "needs driver assignment"
  5. After upload, show summary of routes and driver assignment status

  **Implementation:**
  - Added flexible column name support (Route #, route_name, pickup_addess_firstline, etc.)
  - Driver fields are now optional - routes can be created without drivers
  - Shows summary: X routes with drivers, Y routes need assignment
  - Warnings displayed for unknown driver emails
  - UI updated to show driver assignment status after import

### 20. Add manual driver assignment for unassigned routes
- **Status:** [x] Completed (2026-01-30)
- **Blocked by:** #16, #19
- **Description:** For routes without drivers assigned, provide UI to assign drivers:

  1. Show list of routes needing driver assignment
  2. Show dropdown of available drivers (from volunteer list)
  3. Allow admin to assign driver to each route
  4. Validate no driver is double-assigned (unless intentional)
  5. Save assignments and update route status

  **Implementation:**
  - Added "Needs Driver" filter option in route list dropdown
  - Routes without drivers show warning icon and "Needs Driver" label
  - Each unassigned route has an inline dropdown to select and assign a driver
  - Drivers are loaded from API and displayed in dropdown
  - Assigning a driver immediately updates the route

---

## Email Notification System

### 9. Create email notification system for route assignments
- **Status:** [ ] Pending
- **Blocked by:** #17, #11
- **Description:** Implement email sending logic:
  1. For drivers WITHOUT password: send "route assigned + set your password" email with password reset link
  2. For drivers WITH password: send "route assigned" notification email

  Use a reliable email service (e.g., Resend, SendGrid, or nodemailer with SMTP).

### 10. Add admin email opt-out toggle
- **Status:** [ ] Pending
- **Blocked by:** #9
- **Description:** Add a checkbox/toggle in the import UI that allows admin to disable sending emails during import. Default to OFF (no emails) for safety during testing. Show clear indication of email status before confirming import.

---

## Event Days & Date Management

### 12. Add date selection for driver/route CSV uploads
- **Status:** [x] Completed (2026-01-30)
- **Blocked by:** #16, #19
- **Description:** When uploading driver list or route list CSV, add a date picker to select which event date the upload is for. The selected date should be associated with all routes/drivers from that upload.

  **Upcoming Event Dates:**
  - February 7, 2026
  - April 18, 2026
  - June 6, 2026
  - October 3, 2026
  - August 8, 2027

  **Implementation:**
  - Added event date dropdown to Route CSV upload component
  - Admin must select an event date before importing routes
  - Routes are created with the selected event date
  - Note: Drivers are not date-tagged since they're reusable across events

### 13. Add "Event Days" tab to reports
- **Status:** [x] Completed (2026-01-30)
- **Blocked by:** None
- **Description:** Add a new first tab in reports called "Event Days". Each card represents an event date and shows a report of all routes and drivers for that particular day. This provides a consolidated view of each delivery event.

  Current tabs shift: Event Days (new) | People | Places | Completed Routes

### 27. Display upcoming event dates on admin dashboard
- **Status:** [x] Completed (2026-01-30)
- **Blocked by:** None
- **Description:** Add a section to the admin dashboard showing upcoming ASG event dates prominently.

  **Client request:** "Home Screen - List the ASG Dates"

  **Features:**
  1. Show upcoming event dates on admin dashboard (not just in reports)
  2. Display dates: February 7, April 18, June 6, October 3 (2026), August 8 (2027)
  3. Show which dates have routes/drivers uploaded
  4. Quick status indicator for each event (ready, needs drivers, needs routes, etc.)
  5. Consider making dates clickable to go to that event's details

---

## Route Workflow

### 14. Add "pending weight" status to route workflow
- **Status:** [ ] Pending
- **Blocked by:** None (but requires DB migration - defer until after testing)
- **Description:** Update route workflow: when all stops are completed, route status changes to "pending_weight" instead of "completed". Admin must enter the total food weight before route is marked as "completed".

  **Changes needed:**
  1. Add "pending_weight" to route status options in database/schema
  2. Update route status dropdowns in /admin/routes and /admin/dashboard to include "pending weight"
  3. Add "pending weight" tag styling on route cards (similar to other status tags)
  4. Add "Enter Weight" button next to Export and Delete buttons on route cards (both routes page and dashboard)
  5. Update logic: when all stops complete -> set status to "pending_weight" (not "completed")
  6. Create weight entry modal/form for admin to input total route weight
  7. After weight entered -> transition to "completed" status
  8. Store weight value on Route model (new field: `totalWeight Float?`)

  **Updated Route Status Flow:**
  `pending` -> `active` -> `pending_weight` -> `completed`

---

## UI & Cosmetic

### 15. Update terminology from "delivery" to "donation/pickup"
- **Status:** [x] Completed (2026-01-30)
- **Blocked by:** None
- **Description:** The app workflow is food PICKUP (donations) not delivery. Drivers pick up donated food from locations and bring it to the distribution center.

  **Known changes:**
  - admin/reports Places tab: "Times delivered" -> "Times Donated"

  **Audit needed:**
  - Search codebase for "deliver" references (delivered, delivery, delivering)
  - Review user-facing text for incorrect terminology
  - Update labels, headings, button text, tooltips where appropriate
  - Keep technical names (DeliveryLog model, etc.) unchanged - focus on UI text only

  **Correct terminology:**
  | Instead of | Use |
  |------------|-----|
  | Delivery | Pickup / Collection |
  | Delivered | Donated / Picked up |
  | Delivery location | Donation location / Pickup location |

  Note: Stops are places DONATING food, not receiving it.

---

## Data Models & Tracking

### 26. Add route timing fields for metrics tracking
- **Status:** [ ] Pending
- **Blocked by:** None (but requires DB migration - defer until after testing)
- **Description:** Add timing fields to Route model for tracking route duration and weigh-in time.

  **New fields on Route:**
  - `startedAt DateTime?` - When driver started the route
  - `weighedAt DateTime?` - When food was weighed at distribution center

  **Logic:**
  1. Set startedAt when driver clicks "Start Route" (status changes to active)
  2. Set weighedAt when admin enters the weight (along with totalWeight)

  **Metrics enabled:**
  - Route time = weighedAt - startedAt (total time including weigh-in)
  - Pickup time = last DeliveryLog.completedAt - startedAt (time on road)
  - Both metrics available for comparison

### 22. Add donorId field to Address model for donor tracking
- **Status:** [ ] Pending
- **Blocked by:** None (but requires DB migration - defer until after testing)
- **Description:** Add a donorId field to the Address model to link addresses to donors across events.

  **Changes needed:**
  1. Create new Donor model with: id, name, email, phone, createdAt, updatedAt
  2. Add `donorId Int?` foreign key to Address model
  3. Link Address to Donor for tracking participation across events
  4. Update CSV import to create/match donors by email
  5. Database migration

  This enables tracking donor participation across multiple event days.

---

## Admin Edit Functionality

### 23. Add admin UI to edit donor information
- **Status:** [ ] Pending
- **Blocked by:** #22
- **Description:** Add ability for admin to view and edit donor information.

  **Features needed:**
  1. Donor list view (in reports or separate section)
  2. Click donor to view details
  3. Edit donor: name, email, phone, address
  4. View donor history: which events they participated in
  5. Search/filter donors
  6. Deactivate/remove donor option

### 24. Add admin UI to edit driver information
- **Status:** [ ] Pending
- **Blocked by:** None
- **Description:** Add ability for admin to view and edit driver information.

  **Features needed:**
  1. Driver list view (enhance existing /admin/drivers page)
  2. Click driver to view/edit details
  3. Edit driver: name, email, phone, home address, role, active status
  4. View driver history: routes completed, events participated
  5. Reset password option (send reset email)
  6. Deactivate driver option

### 30. Add driver self-edit profile from driver dashboard
- **Status:** [ ] Pending
- **Blocked by:** #29 (needs home address fields)
- **Description:** Allow drivers to edit their own profile information from the driver dashboard.

  **Editable fields:**
  - Phone number
  - Home address (street, city, state, zip)
  - Password (update/change)

  **NOT editable by driver:**
  - Route-specific info
  - Role
  - Driver ID (system-assigned, immutable)

  **Approval Flow:**
  - All changes require admin approval before taking effect
  - Reason: Need to sync changes with Bloomerang database
  - Driver sees "pending approval" status after submitting changes
  - Changes logged to data change log (#32)

### 31. Add admin notification when driver changes their data
- **Status:** [ ] Pending
- **Blocked by:** #30, #32
- **Description:** Notify admins when a driver submits profile changes for review.

  **Notification type:** In-app only (for now)

  **Features:**
  - Notification badge/indicator in admin dashboard
  - List of pending driver change requests
  - Show: driver name, what changed, old value → new value, timestamp
  - Admin can approve or reject changes
  - Approved changes update the database and should be synced to Bloomerang

### 32. Add data change log for tracking database modifications
- **Status:** [ ] Pending
- **Blocked by:** None
- **Description:** Create an audit log system to track all data changes in the database.

  **Log entries should capture:**
  - Timestamp
  - User who made the change (driver ID, admin ID, or "system")
  - Entity type (driver, route, address, donor, etc.)
  - Entity ID
  - Field changed
  - Old value → New value
  - Change status (pending, approved, rejected, auto-applied)

  **Use cases:**
  - Driver profile changes awaiting approval
  - Admin edits to any data
  - CSV imports
  - Any data modifications for audit purposes

  **Admin UI:**
  - View change log in admin panel
  - Filter by entity type, date range, status
  - Search by driver/user

### 33. Add unique driver ID visible to users
- **Status:** [ ] Pending
- **Blocked by:** None
- **Description:** Add a human-readable driver ID that persists even if driver changes their email/phone/name.

  **Options:**
  1. Use existing database `id` but display it formatted (e.g., "DRV-00042")
  2. Add new `driverCode String @unique` field with auto-generated value

  **Display locations:**
  - Driver profile page
  - Admin driver list
  - Reports

  **Purpose:**
  - Identify drivers even after they change personal info
  - Reference ID for Bloomerang sync

### 25. Add admin UI to edit routes and addresses
- **Status:** [ ] Pending
- **Blocked by:** None
- **Description:** Add ability for admin to edit route and address details.

  **Features needed:**
  1. Edit route: name, date, assigned driver, status
  2. Edit address/stop: street, city, state, zip, special instructions, sequence order
  3. Add/remove stops from a route
  4. Reassign route to different driver
  5. Change stop order (drag-and-drop or manual)
  6. Delete route with confirmation

---

## Database Cleanup

### 21. Remove photoUrl field from DeliveryLog model
- **Status:** [ ] Pending
- **Blocked by:** None (but requires DB migration - defer until after testing)
- **Description:** Remove the photoUrl field from the DeliveryLog model - this feature is not needed.

  **Changes needed:**
  1. Remove `photoUrl String?` from DeliveryLog in prisma/schema.prisma
  2. Remove any UI components for photo upload/display at stops
  3. Remove any API handling for photo uploads
  4. Database migration to drop the column

---

## Map Features

### 29. Add home address fields to User model for drivers
- **Status:** [ ] Pending
- **Blocked by:** None (requires DB migration - defer until after testing)
- **Description:** Add home address fields to the User model so driver locations can be shown on the routes overview map.

  **New fields on User:**
  - `homeStreet String?`
  - `homeCity String?`
  - `homeState String?`
  - `homeZip String?`
  - `homeLatitude Float?`
  - `homeLongitude Float?`

  **Usage:**
  - Displayed on routes overview map (#28) to help assign drivers to routes near their homes
  - Can be populated from volunteer CSV upload or manually edited

### 28. Add routes overview map feature for admin
- **Status:** [ ] Pending
- **Blocked by:** #29 (needs driver home addresses)
- **Description:** Add a map overview feature to view all routes and drivers on a single map.

  **Purpose:**
  Visualize all stops and driver home locations to assign drivers to routes closer to their homes.

  **Location:**
  - Map icon next to the dropdown menu in admin routes page
  - Clicking opens a full map modal/page

  **Route Selection:**
  - Use existing checkboxes in admin/dashboard route list to select which routes appear on map
  - Existing dropdown filter narrows route types
  - Map icon appears next to dropdown; clicking opens map with checked routes

  **Map Features:**
  1. Display all stops from selected/checked routes only
  2. Routes should be numbered or color-coded to distinguish them
  3. Show home addresses of all current drivers with different pin/icon
  4. Tooltips on driver address icons showing driver name

  **Driver Selection Panel:**
  - "Add Driver" dropdown in map window showing all available drivers
  - Checkbox next to each driver name for multi-select
  - If driver has address shown on map → checkbox is checked
  - If unassigned driver is checked → add their address to map
  - If driver has route assigned → checkbox checked and grayed out

  **Driver Assignment Options:**
  1. Click on driver address icon on map → select route to assign from popup/menu
  2. OR: List of routes shown with dropdown of all drivers to assign/reassign

  **Technical Notes:**
  - Integrate with existing Google Maps API
  - Similar pattern to existing route map feature

  **SUGGESTION:** Consider alternative UX approaches:
  - Drag-and-drop drivers onto routes
  - Split-panel view with routes list and map side-by-side
  - Color-code driver pins to match their assigned route

---

## User Roles & Interfaces

### 34. Implement separate user role interfaces
- **Status:** [ ] Pending
- **Blocked by:** None
- **Description:** Create distinct interfaces and UX for different user categories. Each role has different needs and should have a tailored experience.

  **Current Roles:**
  1. **Admin** - Full system access, manage routes/drivers/events, view reports
  2. **Driver** - View assigned routes, mark stops complete, navigate to pickups

  **Planned Roles:**
  3. **Donor** - Interface for food donors (businesses/individuals donating food)
     - View upcoming pickup dates
     - Confirm donation availability
     - Update contact/address info
     - View donation history
  4. **Volunteer** - General volunteers (non-drivers) for hour tracking
     - Log volunteer hours
     - View scheduled shifts
     - Track total hours contributed
     - Sign up for available shifts

  **Implementation considerations:**
  - Add `role` field to User model (enum: ADMIN, DRIVER, DONOR, VOLUNTEER)
  - Role-based routing after login (redirect to appropriate dashboard)
  - Separate layouts/navigation for each role
  - Permission guards on API routes
  - Users may have multiple roles (e.g., volunteer who also drives)

### 35. Add Donor portal interface
- **Status:** [ ] Pending
- **Blocked by:** #34, #22 (donor model)
- **Description:** Create a dedicated interface for food donors.

  **Features:**
  - Donor login/authentication
  - Dashboard showing upcoming pickup dates
  - Confirm/cancel donation for upcoming events
  - Update business/contact information
  - View past donation history
  - Special instructions for drivers (access codes, loading dock, etc.)

### 36. Add Volunteer hour tracking system
- **Status:** [ ] Pending
- **Blocked by:** #34
- **Description:** Create a system for volunteers to log and track their hours.

  **Features:**
  - Volunteer login/authentication
  - Clock in/out functionality
  - Manual hour entry with approval workflow
  - View personal hour history
  - Admin view of all volunteer hours
  - Export hours report (for volunteer recognition, grants, etc.)
  - Shift signup for upcoming events

  **New models needed:**
  - VolunteerShift (date, startTime, endTime, role, maxVolunteers)
  - VolunteerHourLog (userId, shiftId, clockIn, clockOut, status, approvedBy)

---

## Additional Tasks

<!-- Add new tasks below this line -->

---

## Completed Tasks

<!-- Move completed tasks here with completion date -->

---

## Notes & Decisions

- **CSV Upload Approach:** Two uploads: (1) VolunteerList.csv for drivers, (2) Route CSV for stops/addresses. Route CSV may or may not include driver assignments - system detects and handles both cases
- **Password Migration:** Existing users will have null passwordHash; they'll need to use password reset to set initial password
- **Email Default:** Email sending defaults to OFF to prevent accidental sends during testing
- **Route Status Flow:** `pending` -> `active` -> `pending_weight` -> `completed` (weight must be entered at distribution center before route is fully complete)
- **App Workflow Clarification:** This is a food PICKUP app, not delivery. Drivers collect donated food from residential locations and bring it to a central distribution center. UI terminology should reflect "donation/pickup" not "delivery"

---

*Last updated: 2026-01-30*

---

## Session Notes (2026-01-30)

### Completed This Session:
- #1: passwordHash field added to schema (NOT migrated yet)
- #3: Auth logic updated for password verification
- #12: Event date selection for route CSV uploads
- #17: Driver password status display after upload
- #19: Route CSV with flexible columns and optional drivers
- #20: Manual driver assignment UI

### IMPORTANT - Before Next Session:
1. **Password Feature Status**: The `passwordHash` field is COMMENTED OUT in schema.prisma to allow login during production testing. When ready to enable passwords:
   ```bash
   # 1. Uncomment passwordHash in prisma/schema.prisma
   # 2. Run migration:
   npx prisma migrate dev --name add_password_hash
   # 3. Uncomment bcrypt import and password check in lib/auth/config.ts
   # 4. Update hasPassword in lib/services/csv-parser.ts to use !!driver.passwordHash
   ```

2. **Current Login State**: Login works with email-only (no password required). This is intentional during production testing.

3. **Next Priority Tasks**:
   - #11: Password reset flow (needed for drivers to set passwords)
   - #18: Admin option to send password setup emails
   - #14: Pending weight status (requires migration)

### Files Modified This Session:
- prisma/schema.prisma - added passwordHash field
- lib/auth/config.ts - bcrypt password verification
- lib/services/csv-parser.ts - flexible columns, password status tracking
- components/admin/CSVUpload.tsx - event date picker, driver status display
- components/admin/DriverCSVUpload.tsx - password status badges
- components/admin/RouteList.tsx - driver assignment dropdown
- app/api/import/route.ts - event date parameter
- app/api/import/drivers/route.ts - password status in response
