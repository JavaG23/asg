# Food Donation Coordination App

A Progressive Web App (PWA) designed for nonprofit food donation coordination. This application enables volunteer drivers to efficiently collect donated food from residential addresses and bring it to a central food pantry.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JavaG23/asg)

Thanks to Vercel for their support of open-source software.

## Features

### For Administrators
- **Route Management**: Upload and manage pickup routes via CSV import
- **Driver Assignment**: Assign and reassign drivers to specific routes
- **Route Visualization**: View all routes and driver locations on an interactive map
- **Real-time Tracking**: Monitor driver progress and pickup status
- **User Management**: Manage users with multiple roles (admin, driver, donor, volunteer)
- **Bulk Operations**: Select and delete multiple users at once
- **990 Reports**: Generate periodic reports for tax filing with donor lists and volunteer counts
- **Event Day Reports**: Aggregate stats across multiple event days with CSV export
- **Change Log**: Audit trail of all data modifications

### For Drivers
- **Mobile-Optimized Interface**: Easy-to-use interface designed for use while driving
- **Turn-by-Turn Navigation**: Integrated Google Maps navigation to each address
- **Delivery Logging**: Quick and simple delivery confirmation at each stop
- **Progress Tracking**: Visual progress bar showing route completion
- **Offline Support**: Core features work without internet connection

## Getting Started

### For Drivers

1. **Access the App**: Visit the app URL provided by your organization
2. **Login**: Use your organization email to sign in
3. **View Your Route**: See all assigned addresses for the day
4. **Start Deliveries**:
   - Tap on an address to see details
   - Use "Navigate" to get turn-by-turn directions
   - Mark deliveries as complete at each stop
5. **Track Progress**: Monitor your completion percentage in real-time

### For Administrators

1. **Login**: Access the admin dashboard with your administrator account
2. **Upload Routes**:
   - Go to **Routes** > **Import Routes**
   - Select the event date
   - Choose route type (Pickup or Bag Delivery)
   - Upload your CSV file
   - Review and confirm the import
3. **Upload Drivers**:
   - Go to **People** > **Import Volunteers**
   - Upload your volunteer list CSV
   - Send password setup emails to new drivers
4. **Manage Routes**:
   - View all routes in the dashboard
   - Click a route to see details and edit
   - Assign/reassign drivers as needed
   - Enter weight when routes are complete
5. **Monitor Progress**: Track pickup progress across all routes
6. **Help**: Access full documentation at **Help** in the sidebar

## CSV File Formats

### Route CSV
Flexible column naming is supported:
```csv
Route #,Address,City,State,Zip,Driver Email,Driver Name,Special Instructions,Donor Name,Donor Email,Donor Phone
Route 1,123 Main St,Fairfax,VA,22030,john@email.com,John Smith,Ring doorbell,Acme Foods,contact@acme.com,703-555-0001
Route 1,456 Oak Ave,Fairfax,VA,22030,john@email.com,John Smith,,Bob Smith,bob@email.com,
Route 2,789 Pine Rd,Chantilly,VA,20151,jane@email.com,Jane Doe,,,,
```

**Optional columns:** Driver email, donor name/email/phone, special instructions

### Volunteer CSV
```csv
First Name,Last Name,Volunteer Email,Mobile Phone Number,Route,Home Street,Home City,Home State,Home Zip
John,Smith,john@email.com,703-555-1234,1,100 Driver Lane,Fairfax,VA,22030
Jane,Doe,jane@email.com,703-555-5678,2,200 Volunteer Ave,Chantilly,VA,20151
```

**Optional columns:** Home address fields (used for route assignment map)

**Note:** Driver email is optional - routes can be imported without drivers assigned.

## System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for initial load and navigation
- For best experience on mobile: iOS 12+ or Android 8+

## Installation as PWA

### On Mobile (iOS/Android)
1. Open the app in your mobile browser
2. Tap the browser menu (⋮ or share icon)
3. Select "Add to Home Screen"
4. The app will now work like a native app

### On Desktop
1. Open the app in Chrome or Edge
2. Click the install icon in the address bar
3. Click "Install"

## Support

For technical support or questions, contact your organization administrator.

## Privacy & Data

This application:
- Uses your location only for navigation purposes
- Stores delivery data securely
- Does not share personal information with third parties
- Complies with nonprofit data handling standards

## Deployment & Configuration

### Vercel Cron Jobs

The app uses Vercel Cron Jobs to send automated pickup reminders to donors. To set this up:

1. **Deploy to Vercel**: The `vercel.json` file is already configured with the cron schedule

2. **Set Environment Variables** in Vercel Dashboard:
   ```
   CRON_SECRET=your-secure-random-string
   ENABLE_EMAIL_REMINDERS=true
   ```

3. **Generate a CRON_SECRET**:
   ```bash
   openssl rand -hex 32
   ```

4. **Verify Cron Setup**:
   - Go to your Vercel project dashboard
   - Navigate to **Settings** > **Cron Jobs**
   - You should see `/api/cron/pickup-reminders` scheduled for `0 8 * * *` (daily at 8 AM UTC)

### Cron Job Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| Pickup Reminders | Daily 8 AM UTC | Sends reminders to donors based on their preference (24h or 48h before pickup) |

### Email Reminders (Disabled by Default)

For safety during testing, email reminders are **disabled by default**. To enable:

1. Set `ENABLE_EMAIL_REMINDERS=true` in your environment variables
2. Ensure `RESEND_API_KEY` is configured for email sending
3. Verify `NEXTAUTH_URL` is set to your production URL

**Warning**: Do not enable reminders until you have verified:
- All test/sample data has been removed from the database
- Real donor email addresses are in the system
- You are ready for production use

## Technology

Built with:
- Next.js 14 (React Framework)
- Google Maps API for navigation
- PWA technology for offline support
- Prisma for database management
- Vercel Cron Jobs for scheduled tasks
