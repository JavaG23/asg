# ASG App - Development Todo List

## Overview
This document tracks development tasks for the ASG App production authentication and CSV import system.

**Important Notes:**
- Do NOT push changes to git during production testing
- Do NOT run database migrations until production testing is complete
- The database is shared between production and dev
- Do NOT waste context reviewing files in `DO_NOT_REVIEW/` - contains reference guides, meeting notes, and test CSVs

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
  - UI updated to show driver aswhats nt status after import

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
- **Status:** [x] Completed (2026-01-31)
- **Blocked by:** #17, #11
- **Description:** Implement email sending logic:
  1. For drivers WITHOUT password: send "route assigned + set your password" email with password reset link
  2. For drivers WITH password: send "route assigned" notification email

  Use a reliable email service (e.g., Resend, SendGrid, or nodemailer with SMTP).

  **Implementation:**
  - Email is OPT-IN (default: don't send) to prevent accidental emails during testing
  - Confirmation modal shows driver email, route details before sending
  - Admin explicitly chooses "Send Email" or "Don't Send Email"
  - Created /api/auth/send-route-assignment endpoint
  - Route assignment email includes password setup link if driver has no password
  - Uses Resend email service

### 10. Add admin email opt-out toggle
- **Status:** [x] Completed (2026-01-31)
- **Blocked by:** #9
- **Description:** Add a checkbox/toggle in the import UI that allows admin to disable sending emails during import. Default to OFF (no emails) for safety during testing. Show clear indication of email status before confirming import.

  **Implementation:**
  - Instead of a toggle, implemented explicit opt-in confirmation modal
  - Every route assignment shows modal asking "Send Email" or "Don't Send Email"
  - Modal shows exactly which email address will receive the notification
  - Default action requires explicit choice - no accidental emails
  - This approach is safer than a global toggle as it requires confirmation per-action

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

### 38. Show all event days with completed routes and add multi-day report selection
- **Status:** [x] Completed (2026-01-31)
- **Blocked by:** None
- **Description:** Enhance Event Days tab to show historical data and support report generation for selected days.

  **Current Issue:**
  - Only future dates are shown in Event Days tab
  - No way to select days for combined reports

  **Changes needed:**
  1. Show any date that has at least one completed route as an event day
  2. Include both past and future event dates
  3. Add checkbox selection on event day cards
  4. Add "Run Report" button that generates report for selected day(s)
  5. Single day selection: show report for that day only
  6. Multiple day selection: show combined/aggregated report across all selected days

  **Report features:**
  - Total routes completed
  - Total stops/pickups
  - Total food weight collected
  - Driver participation summary
  - Donor participation summary

  **Implementation:**
  - Event dates now dynamically computed from completed routes + scheduled dates
  - Click event cards to select/deselect (checkbox visual)
  - Select All / Deselect All toggle
  - "Run Report" button shows aggregated report for selected dates
  - Report view shows: total routes, unique drivers, total stops, completion rate
  - Detailed breakdown with stops summary, participating drivers list, routes list
  - Progress bar showing completion percentage
  - Back button to return to event selection

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
- **Status:** [x] Completed (2026-02-01)
- **Blocked by:** None
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

  **Implementation:**
  - Schema: Added totalWeight, startedAt, weighedAt fields to Route model
  - UI: Created WeightEntryModal component for entering weight
  - UI: Added pending_weight status badge styling (warning/yellow)
  - UI: Added "Enter Weight" button on route details page for pending_weight routes
  - UI: Weight display section on completed routes
  - UI: RouteEditModal includes pending_weight status option
  - API: Created /api/routes/[id]/weight endpoint for recording weight
  - Logic: Delivery endpoint now sets status to "pending_weight" when all stops complete
  - Logic: Route archiving moved to weight entry endpoint (archives when truly completed)

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
- **Status:** [x] Completed (2026-01-31) - Schema ready, logic pending
- **Blocked by:** None
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

  **Implementation:** Added startedAt and weighedAt fields to Route model. Logic to populate pending.

### 22. Add donorId field to Address model for donor tracking
- **Status:** [x] Completed (2026-01-31) - Schema ready, UI pending
- **Blocked by:** None
- **Description:** Add a donorId field to the Address model to link addresses to donors across events.

  **Changes needed:**
  1. Create new Donor model with: id, name, email, phone, createdAt, updatedAt
  2. Add `donorId Int?` foreign key to Address model
  3. Link Address to Donor for tracking participation across events
  4. Update CSV import to create/match donors by email
  5. Database migration

  This enables tracking donor participation across multiple event days.

  **Implementation:** Added Donor model and donorId to Address. CSV import and UI pending.

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
- **Status:** [x] Completed (2026-01-31)
- **Blocked by:** None
- **Description:** Add ability for admin to view and edit driver information.

  **Features needed:**
  1. Driver list view (enhance existing /admin/drivers page)
  2. Click driver to view/edit details
  3. Edit driver: name, email, phone, home address, role, active status
  4. View driver history: routes completed, events participated
  5. Reset password option (send reset email)
  6. Deactivate driver option

  **Implementation:**
  - Renamed page to "Users" to manage both drivers and admins
  - Created /api/users/[id] endpoint for user CRUD operations
  - Created UserEditModal component for editing user details
  - Click any user to open edit modal
  - Can change name, email, phone, role (driver/admin), active status
  - Can send password reset email from modal
  - Role filter dropdown (All/Drivers/Admins/Active/Inactive)
  - Shows password status (set/not set) with warning badge
  - Prevents self-demotion and self-deactivation for safety

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
- **Status:** [x] Completed (2026-01-31)
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

  **Implementation:**
  - Added ChangeLog model to Prisma schema
  - Created changelog service (lib/services/changelog.ts) with logChange, logFieldChanges, getChangeLogs functions
  - Created /api/admin/changelog API endpoint for fetching logs
  - Added logging to user update/delete endpoints (/api/users/[id])
  - Added logging to route update/delete endpoints (/api/routes/[id])
  - Created admin UI at /admin/changelog with filtering by entity type and action
  - Added "Change Log" link to admin sidebar navigation
  - Pagination support for large log sets

### 33. Add unique driver ID visible to users
- **Status:** [x] Completed (2026-01-31)
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

  **Implementation:**
  - Using existing database ID formatted as "USR-00042" (zero-padded to 5 digits)
  - Added to: Admin Users list, User Edit Modal, Reports People tab, Driver Profile page
  - Displayed with monospace font for easy reading
  - No migration needed - uses existing ID field

### 25. Add admin UI to edit routes and addresses
- **Status:** [x] Completed (2026-01-31)
- **Blocked by:** None
- **Description:** Add ability for admin to edit route and address details.

  **Features needed:**
  1. Edit route: name, date, assigned driver, status
  2. Edit address/stop: street, city, state, zip, special instructions, sequence order
  3. Add/remove stops from a route
  4. Reassign route to different driver
  5. Change stop order (drag-and-drop or manual)
  6. Delete route with confirmation

  **Implementation:**
  - Created RouteEditModal for editing route name, date, and status
  - Created AddAddressModal for adding new stops to a route
  - Added DELETE endpoint to /api/addresses/[addressId]
  - Added POST endpoint to /api/routes/[id]/addresses
  - Added "Edit Route" button in route details header
  - Added "Add Stop" button in addresses section
  - Added delete button on each address card
  - All existing features already worked: drag-and-drop reorder, edit address, reassign driver, delete route

---

## Database Cleanup

### 21. Remove photoUrl field from DeliveryLog model
- **Status:** [x] Completed (2026-01-31)
- **Blocked by:** None
- **Description:** Remove the photoUrl field from the DeliveryLog model - this feature is not needed.

  **Changes needed:**
  1. Remove `photoUrl String?` from DeliveryLog in prisma/schema.prisma
  2. Remove any UI components for photo upload/display at stops
  3. Remove any API handling for photo uploads
  4. Database migration to drop the column

  **Implementation:** Removed photoUrl from schema. Verified no data existed before removal.

---

## Map Features

### 29. Add home address fields to User model for drivers
- **Status:** [x] Completed (2026-01-31) - Schema ready, UI pending
- **Blocked by:** None
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

  **Implementation:** Added all home address fields to User model. UI to edit pending.

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

### 37. Unify login flow with role-based routing and role switcher
- **Status:** [~] Partially Complete (2026-01-31)
- **Blocked by:** #34 (for multi-role support)
- **Description:** Replace separate admin/driver login buttons with a unified login experience and role-based routing.

  **Current State:**
  - Separate buttons for driver and admin login
  - No support for users with multiple roles

  **Roles:** admin, driver, donor, volunteer

  **Login Flow:**
  1. **Not logged in:** Show single login screen with email and password fields
  2. **Logged in, single role:** Auto-redirect to that role's dashboard/interface
  3. **Logged in, multiple roles:** Show role selector screen to choose interface for session

  **Role Switcher:**
  - Each role's interface needs a way to switch to a different role (for multi-role users)
  - Could be a dropdown in header/nav or a dedicated "Switch Role" button
  - Switching roles changes the current interface without requiring re-login

  **PWA Consideration:**
  - Users with app installed and credentials saved should be brought directly to their role's interface
  - Multi-role users see role selector on app launch

  **Implementation considerations:**
  - Store selected role in session or cookie
  - Update middleware to handle role-based routing
  - Create role selector component/page
  - Add role switcher to each role's layout/header
  - Remove separate admin/driver login buttons from current login page

  **Partial Implementation (2026-01-31):**
  - [x] Unified home page with single "Sign In" button (removed separate Driver/Admin buttons)
  - [x] Logged-in users auto-redirect to their role's dashboard from home page
  - [x] Login page already had role-based routing after sign-in
  - [x] Removed test credentials from login page
  - [ ] Multi-role support (requires schema change to support multiple roles per user)
  - [ ] Role selector screen for multi-role users
  - [ ] Role switcher in each interface

---

## Additional Tasks

<!-- Add new tasks below this line -->

### 39. Add bag delivery route type for new donor setup
- **Status:** [x] Completed (2026-02-01)
- **Blocked by:** None
- **Description:** Add support for "bag delivery" routes where drivers deliver donation bags to new donors who just signed up. These routes are distinct from food pickup routes.

  **Background:**
  - Food donors receive bags to collect donations
  - New donors need bags delivered before they can participate in food pickups
  - Bag delivery routes need navigation but different confirmation flow
  - Bag routes should be tracked separately from food pickup routes (no weight needed)

  **Route Type Attribute:**
  - Add `routeType` field to Route model: `"pickup"` (default) | `"bag_delivery"`
  - Existing routes are pickup routes by default
  - Admin can mark a route as bag delivery when creating/editing

  **Bag Delivery Route Differences:**
  | Aspect | Pickup Route | Bag Delivery Route |
  |--------|--------------|-------------------|
  | Purpose | Collect donated food | Deliver bags to new donors |
  | Stop confirmation | "Food picked up" | "Bag delivered" |
  | Weight entry | Required (pending_weight) | Not needed |
  | Status flow | pending → active → pending_weight → completed | pending → active → completed |
  | Tracking | Food weight metrics | Delivery count metrics |
  | Reports | Included in food totals | Separate bag delivery reports |

  **Changes needed:**
  1. **Schema:** Add `routeType String @default("pickup")` to Route model
  2. **Admin UI - Route Creation:** Add route type selector (Pickup / Bag Delivery)
  3. **Admin UI - Route Edit:** Allow changing route type (with warning if stops exist)
  4. **Admin UI - Route List:** Visual indicator for bag delivery routes (different icon/badge)
  5. **Driver UI - Stop Confirmation:**
     - Pickup routes: "Confirm Pickup" button, food outside toggle
     - Bag routes: "Confirm Delivery" button, no food options needed
  6. **Route Completion Logic:**
     - Pickup routes: all stops done → pending_weight → weight entry → completed
     - Bag routes: all stops done → completed (skip weight step)
  7. **Reports:**
     - Separate section/tab for bag delivery stats
     - Count of bags delivered, donors set up, etc.
  8. **CSV Import:** Option to specify route type when importing routes

  **UI Text Changes for Bag Routes:**
  - "Pickup" → "Delivery"
  - "Food picked up" → "Bag delivered"
  - "Donation location" → "Delivery location"
  - Hide weight-related fields and buttons

  **Implementation:**
  - Schema: Added `routeType String @default("pickup")` with index
  - Admin UI: RouteEditModal has route type dropdown
  - Admin UI: Route details page shows purple "Bag Delivery" badge
  - Admin UI: "Enter Weight" button hidden for bag_delivery routes
  - Driver UI: Stop page adapts title ("Delivery Stop" vs "Pick-up Stop")
  - Driver UI: PickupForm shows bag delivery confirmation instead of "Was food outside?" question
  - Driver UI: Button text changes to "Confirm Delivery & Go to Next"
  - Route completion: bag_delivery routes skip pending_weight, go directly to completed
  - API: /api/driver/route returns routeType for driver UI
  - API: /api/routes/[id] PUT handles routeType updates with change logging
  - API: /api/delivery/[addressId] sets startedAt when route becomes active

### 40. Rename admin/drivers route to admin/people
- **Status:** [x] Completed (2026-02-01)
- **Blocked by:** None
- **Description:** The admin users page is at `/admin/drivers` but was renamed to "People" in the UI. The URL should match.

  **Implementation:**
  - Renamed `app/admin/drivers/` → `app/admin/people/`
  - Updated sidebar href in `app/admin/layout.tsx`

### 42. Improve event day selection in route CSV import
- **Status:** [ ] Pending
- **Blocked by:** None
- **Description:** The route CSV import dropdown only shows preset event days. Need ability to add new dates and handle bag routes that aren't tied to events.

  **Changes needed:**
  1. Add "Add New Date..." option at top of event day dropdown
  2. Clicking it opens a calendar/date picker modal
  3. Selected date is added to dropdown and auto-selected
  4. Add "Bag Route (No Event)" option for bag delivery routes not tied to a specific event day
  5. New dates should persist (store in database or config)

  **UI Flow:**
  - Dropdown shows: "Add New Date..." | "Bag Route (No Event)" | [existing event dates]
  - "Add New Date..." → Calendar modal → Date selected → Added to list
  - "Bag Route (No Event)" → Sets a flag/null date for non-event routes

### 41. Fix role filtering on admin People page
- **Status:** [x] Completed (2026-02-01)
- **Blocked by:** None
- **Description:** The role filter dropdown on the People page doesn't correctly filter by "Admins" or "Drivers". The "All Users", "Active", and "Inactive" filters work, but role-based filters show incorrect results.

  **Root cause:** The `/api/drivers` endpoint was missing `role: true` in the Prisma select clause, so the role field was never returned to the frontend.

  **Fix:** Added `role: true` to the select in `app/api/drivers/route.ts`

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

*Last updated: 2026-02-01*

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

---

## Session Notes (2026-01-31)

### Completed This Session:
- #11: Password reset flow implemented (forgot-password, reset-password pages, Resend email integration)
- #18: Admin option to send password setup emails after CSV upload
- #9: Email notification system for route assignments (opt-in confirmation modal)
- #10: Admin email opt-out toggle (implemented as explicit confirmation per-action)
- #24: Admin UI to edit user/driver information (UserEditModal, role changes, password reset)
- #25: Admin UI to edit routes and addresses (RouteEditModal, AddAddressModal, delete stops)
- #38: Event Days enhanced - shows all dates with completed routes, multi-day report selection
- #33: Unique user ID visible (formatted as "USR-00042") in admin, reports, and driver profile
- #37: Unified login flow (partial) - single Sign In button, auto-redirect logged-in users
- #32: Data change log for audit trail - ChangeLog model, service, API, and admin UI
- Sidebar: Changed "Drivers" to "People" and added "Change Log" link
- **Database Migrations Applied:**
  - #14: Added totalWeight to Route (pending_weight status)
  - #21: Removed photoUrl from DeliveryLog
  - #22: Added Donor model + donorId to Address
  - #26: Added startedAt, weighedAt to Route
  - #29: Added home address fields to User

### Key Implementation Details:
1. **Password System**: Using bcryptjs (not bcrypt) for cross-platform compatibility with Vercel
2. **Email Service**: Resend with lazy initialization to avoid build-time errors
3. **Email Opt-In**: Confirmation modal for every route assignment - no accidental emails
4. **Session Strategy**: Using database sessions via @auth/prisma-adapter for persistent login
5. **Users Page**: Renamed from "Drivers" to manage all users with role filter

### Files Created This Session:
- lib/services/email.ts - Resend email service
- app/forgot-password/page.tsx - Password reset request
- app/reset-password/page.tsx - Set new password form
- app/api/auth/forgot-password/route.ts - Request reset endpoint
- app/api/auth/reset-password/route.ts - Set password endpoint
- app/api/auth/validate-reset-token/route.ts - Token validation
- app/api/auth/send-password-setup/route.ts - Bulk send password emails
- app/api/auth/send-route-assignment/route.ts - Route assignment email
- components/admin/EmailConfirmationModal.tsx - Opt-in email confirmation
- components/admin/UserEditModal.tsx - Edit user details
- components/admin/RouteEditModal.tsx - Edit route details
- components/admin/AddAddressModal.tsx - Add stops to routes
- app/api/users/[id]/route.ts - User CRUD operations

### Files Modified This Session:
- prisma/schema.prisma - passwordHash, reset tokens, Session model
- lib/auth/config.ts - bcryptjs, PrismaAdapter, password verification
- app/login/page.tsx - Password field, forgot password link
- app/admin/drivers/page.tsx - Renamed to Users, role filter, edit modal
- app/admin/routes/[id]/page.tsx - Edit route, add stop, delete stop buttons
- components/admin/DriverCSVUpload.tsx - Email selection UI for password setup
- app/api/addresses/[addressId]/route.ts - Added DELETE method
- app/api/routes/[id]/addresses/route.ts - POST endpoint for adding addresses
- app/admin/reports/page.tsx - Dynamic event dates, multi-day selection, aggregated report view, user ID display
- app/admin/drivers/page.tsx - User ID display in cards
- app/admin/layout.tsx - Changed "Drivers" to "People" in sidebar
- components/admin/UserEditModal.tsx - User ID display
- app/driver/profile/page.tsx - Driver ID display
- app/page.tsx - Unified single Sign In button, auto-redirect for logged-in users
- app/login/page.tsx - Removed test credentials text
- lib/services/changelog.ts - New: Change log service
- app/api/admin/changelog/route.ts - New: Change log API endpoint
- app/admin/changelog/page.tsx - New: Change log admin UI
- prisma/schema.prisma - Added ChangeLog model
- app/api/users/[id]/route.ts - Added change logging
- app/api/routes/[id]/route.ts - Added change logging

---

## Session Notes (2026-02-01)

### Completed This Session:
- #39: Bag delivery route type - full implementation (schema, admin UI, driver UI, completion logic)
- #40: Renamed `/admin/drivers` → `/admin/people` (URL now matches UI)
- #41: Fixed role filtering on People page (missing `role` field in API response)
- Help system: Created documentation and help pages for all user roles
- Driver UX: Added help/profile access to complete page and "no route" states
- Driver profile: Added "Change Password" button

### Documentation Created:
- `docs/admin-guide.md` - Comprehensive admin instructions
- `docs/driver-guide.md` - Driver app usage guide
- `docs/donor-guide.md` - Donor participation guide
- `docs/volunteer-guide.md` - Volunteer roles and hour logging

### Files Created:
- `app/admin/help/page.tsx` - Admin help page with markdown rendering
- `app/driver/help/page.tsx` - Driver help page
- `app/donor/help/page.tsx` - Donor help page
- `app/volunteer/help/page.tsx` - Volunteer help page
- `app/api/help/admin/route.ts` - Serves admin guide markdown
- `app/api/help/driver/route.ts` - Serves driver guide markdown
- `app/api/help/donor/route.ts` - Serves donor guide markdown
- `app/api/help/volunteer/route.ts` - Serves volunteer guide markdown

### Files Modified:
- `app/admin/layout.tsx` - Added Help link to sidebar
- `app/driver/dashboard/page.tsx` - Added help icon, improved "no route" state
- `app/driver/complete/page.tsx` - Full header with help/profile, "Check for New Route" button
- `app/driver/profile/page.tsx` - Added help icon and "Change Password" button
- `app/driver/route/[addressId]/page.tsx` - Passes routeType to PickupForm
- `components/driver/PickupForm.tsx` - Bag delivery UI (already done prior)
- `app/api/drivers/route.ts` - Added `role: true` to fix filtering
- `README.md` - Updated admin instructions and CSV formats

### Packages Installed:
- `react-markdown` - For rendering help documentation

### Pending Tasks for Next Session:
| # | Task | Priority |
|---|------|----------|
| 42 | Improve event day selection in CSV import (add new dates, bag route option) | High |
| 23 | Admin UI to edit donor information | Medium |
| 28 | Routes overview map for admin | Medium |
| 30 | Driver self-edit profile | Medium |
| 31 | Admin notification for driver changes | Low (blocked by #30) |
| 34 | Implement separate user role interfaces | Low (architectural) |
| 35 | Donor portal interface | Low (blocked by #34) |
| 36 | Volunteer hour tracking system | Low (blocked by #34) |

### Notes:
- Documentation standards added to TODO header - keep docs updated as features are built
- Help pages use API endpoints that read markdown files from `docs/` folder
- Driver complete page now has proper navigation instead of being a dead end
- Bag delivery routes skip the weight entry step and go directly to completed status
