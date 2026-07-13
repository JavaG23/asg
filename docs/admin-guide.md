# ASG App - Administrator Guide

Welcome to the A Simple Gesture (ASG) App admin guide. This documentation covers all administrative tasks for managing food pickup routes and volunteers.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Uploading Routes](#uploading-routes)
3. [Uploading Drivers/Volunteers](#uploading-driversvolunteers)
4. [Managing Routes](#managing-routes)
5. [Managing Users](#managing-users)
6. [Managing Pickup Events](#managing-pickup-events)
7. [Donor Reminders](#donor-reminders)
8. [Volunteer Hours](#volunteer-hours)
9. [Event Day Workflow](#event-day-workflow)
10. [Reports](#reports)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Logging In
1. Go to the app URL and click **Sign In**
2. Enter your admin email address and password
3. You'll be directed to the Admin Dashboard

### Dashboard Overview
The dashboard shows:
- **Upcoming Events**: Next scheduled ASG event dates
- **Routes Summary**: Quick stats on routes (pending, active, completed)
- **Quick Actions**: Links to common tasks

### Navigation
Use the sidebar to access:
- **Dashboard**: Overview and quick actions
- **Routes**: Manage all routes
- **People**: Manage drivers, donors, and volunteers
- **Shifts**: Manage volunteer shifts at the distribution center
- **Pickup Events**: Schedule and manage donor pickup dates
- **Pending Changes**: Review and approve profile change requests
- **Reports**: View event reports, 990 reports, and volunteer hours
- **Change Log**: Audit trail of all changes
- **Help**: This documentation

---

## Uploading Routes

Routes are uploaded via CSV file before each event day.

### Step 1: Prepare Your CSV File

Your CSV should have these columns (flexible naming accepted):

| Column | Description | Required |
|--------|-------------|----------|
| Route # / route_name | Route identifier (e.g., "Route 1") | Yes |
| Address / pickup_address_firstline | Street address | Yes |
| City | City name | Yes |
| State | State abbreviation (e.g., "VA") | Yes |
| Zip / Zip Code | ZIP code | Yes |
| Driver Email | Email of assigned driver | No |
| Driver Name / First Name + Last Name | Driver's name | No |
| Special Instructions | Notes for the driver | No |
| Donor Name | Business or individual name | No |
| Donor Email | Contact email for follow-up | No |
| Donor Phone | Contact phone number | No |

**Example CSV:**
```csv
Route #,Address,City,State,Zip,Driver Email,Driver Name,Special Instructions,Donor Name,Donor Email
Route 1,123 Main St,Fairfax,VA,22030,john@email.com,John Smith,Ring doorbell,Acme Foods,contact@acme.com
Route 1,456 Oak Ave,Fairfax,VA,22030,john@email.com,John Smith,Food in garage,Bob Smith,bob@email.com
Route 2,789 Pine Rd,Chantilly,VA,20151,jane@email.com,Jane Doe,,,
```

### Step 2: Upload the CSV

1. Go to **Routes** in the sidebar
2. Click **Import Routes** button
3. **Select Event Date**: Choose the event date from the dropdown
4. **Select Route Type**:
   - **Food Pickup**: Standard routes for collecting donated food
   - **Bag Delivery**: Routes for delivering bags to new donors
5. Click **Choose File** and select your CSV
6. Review the preview showing what will be imported
7. Click **Import** to create the routes

### Step 3: Review Import Results

After import, you'll see:
- Number of routes created
- Number of addresses added
- Any warnings or errors (e.g., invalid addresses, unknown drivers)

### Common Issues

| Issue | Solution |
|-------|----------|
| "Unknown driver email" | Driver not in system - upload drivers first or assign manually |
| "Invalid address" | Check address format in CSV |
| "Duplicate route" | Route with same name already exists for this date |

---

## Uploading Drivers/Volunteers

Drivers can be uploaded in bulk from a volunteer list CSV.

### Step 1: Prepare Your CSV File

Your CSV should have these columns:

| Column | Description | Required |
|--------|-------------|----------|
| First Name | Driver's first name | Yes |
| Last Name | Driver's last name | Yes |
| Volunteer Email | Driver's email address | Yes |
| Mobile Phone Number | Phone number | No |
| Route | Assigned route number | No |
| Home Street | Driver's home street address | No |
| Home City | Driver's home city | No |
| Home State | Driver's home state | No |
| Home Zip | Driver's home ZIP code | No |

**Example CSV:**
```csv
First Name,Last Name,Volunteer Email,Mobile Phone Number,Route,Home Street,Home City,Home State,Home Zip
John,Smith,john@email.com,703-555-1234,1,100 Driver Lane,Fairfax,VA,22030
Jane,Doe,jane@email.com,703-555-5678,2,200 Volunteer Ave,Chantilly,VA,20151
```

**Note:** Home addresses are used in the Routes Overview Map to help assign drivers to routes near their homes.

### Step 2: Upload the CSV

1. Go to **People** in the sidebar
2. Click **Import Volunteers** button
3. Click **Choose File** and select your CSV
4. Review the preview
5. Click **Import**

### Step 3: Send Password Setup Emails

After import, drivers without passwords need to set them up:

1. Review the list of drivers showing **Needs Password** status
2. Check the boxes next to drivers who should receive setup emails
3. Click **Send Password Setup Emails**
4. Drivers will receive an email with a link to set their password

---

## Managing Routes

### Viewing Routes

1. Go to **Routes** in the sidebar
2. Use filters to find routes:
   - **Status**: Pending, Active, Pending Weight, Completed
   - **Date**: Filter by event date
   - **Driver**: Filter by assigned driver

### Editing a Route

1. Click on a route card to open route details
2. Click **Edit Route** button
3. You can change:
   - Route name
   - Route type (Pickup or Bag Delivery)
   - Event date
   - Status
4. Click **Save Changes**

### Assigning a Driver

1. Open route details
2. Click the driver dropdown
3. Select a driver from the list
4. Choose whether to send an email notification
5. The driver is now assigned

### Adding Stops to a Route

1. Open route details
2. Scroll to the Addresses section
3. Click **Add Stop**
4. Enter the address details
5. Click **Add Address**

### Removing Stops

1. Open route details
2. Find the stop you want to remove
3. Click the trash icon on the address card
4. Confirm deletion

### Reordering Stops

1. Open route details
2. Drag and drop address cards to reorder
3. Changes save automatically

### Entering Route Weight

When all stops on a pickup route are completed, it moves to **Pending Weight** status:

1. Open the route details
2. Click **Enter Weight** button
3. Enter the total weight of food collected (in pounds)
4. Click **Submit**
5. Route moves to **Completed** status

---

## Managing Users

### Viewing Users

1. Go to **People** in the sidebar
2. Use filters:
   - **All Users**: Everyone in the system
   - **Drivers**: Only driver accounts
   - **Admins**: Only admin accounts
   - **Active**: Only active accounts
   - **Inactive**: Deactivated accounts

### Editing a User

1. Click on a user card
2. Edit their information:
   - Name
   - Email
   - Phone
   - Roles (can have multiple: Admin, Driver, Donor, Volunteer)
   - Home address (for driver route assignment map)
   - Active status
3. Click **Save Changes**

### Multi-Role Users

Users can have multiple roles simultaneously:
- Check multiple role boxes when editing a user
- Multi-role users see a role selector after login
- They can switch between interfaces using "Switch Role" in their profile

### Sending Password Reset

1. Click on a user card
2. Click **Send Password Reset Email**
3. User receives email to set new password

### Deactivating a User

1. Click on a user card
2. Toggle **Active** to off
3. Click **Save Changes**
4. User can no longer log in

### Bulk Delete Users

1. In the People page, check the boxes next to users to select
2. Use **Select All** to select all visible users
3. Click **Delete Selected**
4. Choose:
   - **Deactivate**: Soft delete - users become inactive
   - **Permanently Delete**: Hard delete - removes from database
5. Deleted user data is backed up to the Change Log for potential recovery

---

## Managing Pickup Events

Pickup Events are scheduled dates when food donations are collected from donors.

### Creating Pickup Events

1. Go to **Pickup Events** in the sidebar
2. Click **Create Event**
3. Enter:
   - **Pickup Date**: The date of the food collection
   - **Opt-In Deadline** (optional): Last date donors can opt-in
   - **Description** (optional): Notes about this pickup date
4. Click **Create Event**

### Viewing Event Opt-Ins

Each event card shows:
- The pickup date
- Number of donors who have opted in
- Event status (upcoming, today, past)

### Deleting Events

1. Click the delete (trash) icon on an event card
2. Confirm deletion
3. **Note**: This will also remove all donor opt-ins for that date

---

## Donor Reminders

The app can automatically send email reminders to donors before their scheduled pickup dates.

### How Reminders Work

1. Donors opt-in to pickup events through their Donations Portal
2. When opting in, they choose a reminder preference:
   - **24 hours before**: Reminder sent the day before pickup
   - **48 hours before**: Reminder sent two days before pickup
   - **No reminder**: No automatic email sent
3. A cron job runs daily at 8 AM and sends reminders to eligible donors

### Reminder Status

Reminders are tracked to prevent duplicates:
- Once a reminder is sent, `reminderSentAt` is recorded
- Donors won't receive multiple reminders for the same event

### Enabling/Disabling Reminders

**Reminders are DISABLED by default** for safety during testing.

To enable reminders in production:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add or update: `ENABLE_EMAIL_REMINDERS=true`
4. Redeploy the application

**Important**: Only enable reminders when:
- All test/sample data has been removed
- Real donor information is in the database
- You are ready for production use

### Manual Reminder Testing

To test the reminder system without sending real emails:

1. Keep `ENABLE_EMAIL_REMINDERS` unset or set to `false`
2. The cron job will run but skip sending emails
3. Check the logs to verify the correct donors would be notified

---

## Volunteer Hours

Track volunteer time spent at the distribution center.

### Viewing Volunteer Hours

1. Go to **Reports** in the sidebar
2. Click the **Volunteer Hours** tab
3. Optionally filter by date range
4. Click **Generate Report**

### Report Contents

The Volunteer Hours report shows:
- **Total Hours**: Sum of all volunteer time
- **Unique Volunteers**: Number of different people who volunteered
- **Total Sessions**: Number of clock in/out sessions
- **Average Hours/Person**: Hours divided by unique volunteers

### Per-Volunteer Breakdown

The table shows each volunteer with:
- Name and email
- Total hours worked
- Number of sessions
- Role badges (Driver, Volunteer, or both)

### Exporting Data

Two export options are available:
- **Summary Report**: One row per volunteer with totals
- **Detailed Report**: Every clock in/out session with timestamps

---

## Event Day Workflow

### Before the Event

1. **Upload Routes**: Import route CSV with all pickup addresses
2. **Upload Drivers**: Import volunteer list CSV
3. **Assign Drivers**: Ensure all routes have drivers assigned
4. **Send Emails**: Send password setup emails to new drivers
5. **Verify**: Check dashboard shows all routes as "Pending"

### During the Event

1. Drivers mark routes as "Active" when they start
2. Monitor progress on the Dashboard
3. Handle any issues (route reassignment, address problems)
4. Routes move to "Pending Weight" when all stops complete

### After the Event

1. Drivers bring food to distribution center
2. **Enter Weights**: Enter total weight for each route
3. **Review Reports**: Generate event report
4. Routes are archived for historical records

---

## Reports

*Report tabs have been removed for People, places, Completed Routes, Volunteer Hours and 990 reporting. these reports can be accessed by adding #people, #places, #routes, #990 to admin/reports in the url.*

### Event Reports

1. Go to **Reports** in the sidebar
2. Click **Event Days** tab
3. Select one or more event dates by clicking the cards
4. Click **Run Report**

The report shows:
- Total routes and completion rate
- Total stops completed
- Total weight collected
- Food outside responses (yes/no counts)
- Driver notes from pickups
- List of participating drivers
- Route-by-route breakdown

Click **Export Report** to download the data as a CSV file.

### 990 Reports (Tax Filing)

Generate reports aligned with 990 tax filing requirements:

1. Go to **Reports** > **990 Reports** tab
2. Select period:
   - **Monthly**: Choose month and year
   - **Annual**: Choose year
   - **Custom**: Select date range
3. Click **Generate Report**

Report includes:
- Unique donor count with contact information
- In-kind contributions (total food weight)
- Volunteer count and participation
- Route completion statistics

**CSV Exports Available:**
- **Donor List**: Names, emails, addresses, donation dates
- **In-Kind Contributions**: Dates, routes, weights
- **Volunteer List**: Names, emails, routes completed

**Email Follow-up:**
- Select donors with emails using checkboxes
- Use **Select All with Email** for quick selection
- Plan for sending thank-you or reminder emails

### People Reports

View participation statistics for drivers including:
- Total routes completed
- Events participated
- Last active date

### Places Reports

View donation location statistics:
- Times donated
- Last donation date

---

## Troubleshooting

### Driver Can't Log In

1. Check user is **Active** in People
2. Verify email address is correct
3. Send password reset email
4. Check if driver is using correct email

### Route Not Showing for Driver

1. Verify driver is assigned to route
2. Check route status is **Pending** or **Active**
3. Check route date is today or in the future
4. Have driver refresh their app

### Import Errors

| Error | Solution |
|-------|----------|
| "File not recognized" | Ensure file is CSV format |
| "Missing required columns" | Check column headers match expected names |
| "Invalid email format" | Fix email addresses in CSV |

### Weight Entry Issues

- Weight must be entered for pickup routes (not bag delivery)
- Only routes in "Pending Weight" status show weight entry
- Enter weight as a number (no "lbs" suffix needed)

### Reminder Issues

| Issue | Solution |
|-------|----------|
| Reminders not sending | Check `ENABLE_EMAIL_REMINDERS=true` is set in environment variables |
| Duplicate reminders | Check `reminderSentAt` field - reminders only send once per opt-in |
| Wrong timing | Cron runs at 8 AM UTC - adjust for your timezone |
| Missing donors | Verify donors have opted in with 24h or 48h preference (not "none") |

### Volunteer Hours Issues

| Issue | Solution |
|-------|----------|
| Hours not showing | Volunteer needs to clock in/out via their portal |
| Missing sessions | Check the date range filter in the report |
| Wrong totals | Verify clock-out was recorded (look for "Active" status) |

---

## Quick Reference

### Route Status Flow

**Pickup Routes:**
```
Pending → Active → Pending Weight → Completed
```

**Bag Delivery Routes:**
```
Pending → Active → Completed
```

### Keyboard Shortcuts

- **/** - Focus search (when available)
- **Esc** - Close modal

### Contact Support

For technical issues, contact your system administrator or visit the project repository.

---

*Last updated: February 6, 2026*
