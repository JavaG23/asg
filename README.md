# Food Delivery Coordination App

A Progressive Web App (PWA) designed for nonprofit food delivery coordination. This application enables volunteer drivers to efficiently collect food from residential addresses and deliver to a central food pantry.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/JavaG23/asg)

Thanks to Vercel for their support of open-source software.

## Features

### For Administrators
- **Route Management**: Upload and manage delivery routes via CSV import
- **Driver Assignment**: Assign and reassign drivers to specific routes
- **Route Visualization**: View all routes and addresses on an interactive map
- **Real-time Tracking**: Monitor driver progress and delivery status

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
Route #,Address,City,State,Zip,Driver Email,Driver Name,Special Instructions
Route 1,123 Main St,Fairfax,VA,22030,john@email.com,John Smith,Ring doorbell
Route 1,456 Oak Ave,Fairfax,VA,22030,john@email.com,John Smith,
Route 2,789 Pine Rd,Chantilly,VA,20151,jane@email.com,Jane Doe,
```

### Volunteer CSV
```csv
First Name,Last Name,Volunteer Email,Mobile Phone Number,Route
John,Smith,john@email.com,703-555-1234,1
Jane,Doe,jane@email.com,703-555-5678,2
```

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

## Technology

Built with:
- Next.js 14 (React Framework)
- Google Maps API for navigation
- PWA technology for offline support
- Prisma for database management
