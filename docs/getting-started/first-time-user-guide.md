# First-Time User Guide

Welcome to the WeHub.work Hotel Management System! This guide provides a comprehensive orientation for new users, helping you understand the system's capabilities and navigate common workflows.

## Table of Contents

- [System Overview](#system-overview)
- [Getting Started](#getting-started)
- [User Interface Overview](#user-interface-overview)
- [Core Features](#core-features)
- [Common Workflows](#common-workflows)
- [User Roles and Permissions](#user-roles-and-permissions)
- [Tips and Best Practices](#tips-and-best-practices)
- [Getting Help](#getting-help)

## System Overview

### What is the WeHub.work Hotel Management System?

The WeHub.work Hotel Management System is a comprehensive property management solution designed to streamline hotel operations. It provides tools for:

- **Reservation Management**: Handle bookings, check-ins, and check-outs
- **Client Management**: Maintain guest profiles and communication history
- **Billing & Invoicing**: Manage pricing, plans, and automated invoicing
- **Waitlist System**: Track and notify guests on waiting lists
- **Reporting & Analytics**: Generate insights on occupancy, revenue, and operations
- **Integration**: Connect with OTA platforms and payment systems

### System Architecture

The system consists of:
- **Web-based Interface**: Access from any modern browser
- **Real-time Updates**: Live notifications and data synchronization
- **Multi-hotel Support**: Manage multiple properties from one system
- **Role-based Access**: Different permission levels for different users

### Technology Stack

Built with modern, reliable technologies:
- **Frontend**: Vue.js with PrimeVue components
- **Backend**: Node.js with Express
- **Database**: PostgreSQL for data integrity
- **Real-time**: Socket.io for live updates

## Getting Started

### First Login

1. **Access the System**
   - Open your web browser
   - Navigate to your system URL (e.g., https://yourdomain.com)
   - You should see the login page

2. **Enter Credentials**
   - Email: Your assigned email address
   - Password: Your initial password (you'll be prompted to change it)

3. **Change Your Password**
   - On first login, you'll be required to set a new password
   - Choose a strong password (minimum 8 characters, mix of letters, numbers, and symbols)
   - Confirm your new password

4. **Complete Your Profile**
   - Navigate to your profile settings (usually in the top-right menu)
   - Add your full name, contact information, and preferences
   - Upload a profile picture (optional)

### System Requirements

To use the system effectively, ensure you have:

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Internet Connection**: Stable broadband connection
- **Screen Resolution**: 1366x768 minimum (1920x1080 recommended)
- **JavaScript**: Enabled in your browser

### Browser Compatibility

The system works best with:
- Google Chrome (recommended)
- Mozilla Firefox
- Safari (macOS)
- Microsoft Edge

**Note**: Internet Explorer is not supported.

## User Interface Overview

### Main Navigation

The system interface consists of several key areas:

#### Top Navigation Bar
- **Logo/Home**: Click to return to dashboard
- **Hotel Selector**: Switch between properties (if managing multiple hotels)
- **Notifications**: Bell icon shows system notifications
- **User Menu**: Access profile, settings, and logout

#### Side Navigation Menu
Main sections accessible from the left sidebar:

- **ダッシュボード (Dashboard)**: Overview and key metrics
- **予約 (Reservations)**: Booking management
- **顧客 (Clients)**: Guest information and CRM
- **請求 (Billing)**: Invoices and payments
- **待機リスト (Waitlist)**: Guest waiting list
- **レポート (Reports)**: Analytics and insights
- **設定 (Settings)**: System configuration

#### Main Content Area
- Displays the current page content
- Tables, forms, and visualizations appear here
- Breadcrumb navigation shows your current location

#### Status Bar (Bottom)
- Connection status indicator
- Last sync time
- System notifications

### Dashboard Overview

The dashboard provides at-a-glance information:

#### Key Metrics Cards
- **Today's Arrivals**: Guests checking in today
- **Today's Departures**: Guests checking out today
- **Current Occupancy**: Rooms occupied vs. available
- **Revenue Today**: Today's earnings

#### Quick Actions
- Create New Reservation
- Add New Client
- Generate Report
- View Waitlist

#### Recent Activity
- Latest reservations
- Recent check-ins/check-outs
- Pending tasks
- System notifications

#### Charts and Visualizations
- Occupancy trends
- Revenue graphs
- Booking sources
- Guest demographics

## Core Features

### 1. Reservation Management

#### Creating a Reservation

1. **Navigate to Reservations**
   - Click "予約" in the side menu
   - Click "新規予約" (New Reservation) button

2. **Enter Guest Information**
   - Select existing client or create new
   - Enter guest name, contact details
   - Add special requests or notes

3. **Select Dates and Room**
   - Choose check-in and check-out dates
   - Select room type and specific room
   - View availability calendar

4. **Configure Pricing**
   - Select rate plan
   - Add any addons or extras
   - Review total price
   - Apply discounts if applicable

5. **Confirm and Save**
   - Review all details
   - Click "保存" (Save) to create reservation
   - System generates confirmation number

#### Managing Existing Reservations

- **View**: Click on any reservation to see details
- **Edit**: Click "編集" (Edit) to modify reservation
- **Cancel**: Use "キャンセル" (Cancel) with cancellation reason
- **Check-in**: Mark guest as checked in
- **Check-out**: Process departure and final billing

#### Calendar View

- **Month View**: See all reservations for the month
- **Week View**: Detailed weekly schedule
- **Day View**: Hour-by-hour breakdown
- **Room View**: See occupancy by room

### 2. Client Management

#### Client Profiles

Each client profile contains:
- **Basic Information**: Name, contact details, address
- **Reservation History**: Past and upcoming stays
- **Preferences**: Room preferences, special requests
- **Communication Log**: Notes and correspondence
- **Loyalty Status**: Points, tier, rewards

#### Adding a New Client

1. Navigate to "顧客" (Clients)
2. Click "新規顧客" (New Client)
3. Fill in required fields:
   - Name (Kanji, Kana, or Romaji)
   - Email address
   - Phone number
   - Address (optional)
4. Add preferences and notes
5. Save the profile

#### Searching for Clients

- Use the search bar to find clients by:
  - Name
  - Email
  - Phone number
  - Reservation number
- Apply filters for advanced search
- Sort results by various criteria

### 3. Billing and Invoicing

#### Creating an Invoice

1. Navigate to "請求" (Billing)
2. Select reservation or client
3. Review charges:
   - Room charges
   - Addons and extras
   - Taxes and fees
4. Apply payments
5. Generate and send invoice

#### Payment Processing

- **Cash**: Record cash payments
- **Credit Card**: Process card payments
- **Bank Transfer**: Record bank transfers
- **Split Payments**: Divide payment across methods

#### Financial Reports

- Daily revenue reports
- Monthly financial summaries
- Payment method breakdown
- Outstanding balances

### 4. Waitlist Management

#### Adding to Waitlist

1. Navigate to "待機リスト" (Waitlist)
2. Click "追加" (Add)
3. Enter guest information
4. Specify desired dates and room type
5. Set notification preferences
6. Save to waitlist

#### Managing Waitlist

- View all waitlist entries
- Filter by date range or room type
- Notify guests when rooms become available
- Convert waitlist entry to reservation
- Remove from waitlist

### 5. Reporting and Analytics

#### Available Reports

- **Occupancy Reports**: Room utilization over time
- **Revenue Reports**: Financial performance
- **Guest Reports**: Demographics and behavior
- **Booking Source Reports**: Channel performance
- **Operational Reports**: Staff performance, maintenance

#### Generating Reports

1. Navigate to "レポート" (Reports)
2. Select report type
3. Choose date range
4. Apply filters (hotel, room type, etc.)
5. Click "生成" (Generate)
6. View, print, or export report

#### Exporting Data

Reports can be exported in:
- PDF format (for printing)
- Excel format (for analysis)
- CSV format (for data import)

## Common Workflows

### Workflow 1: Processing a Walk-in Guest

1. **Create Quick Reservation**
   - Click "新規予約" (New Reservation)
   - Select "Walk-in" as booking source

2. **Guest Information**
   - Search for existing client or create new
   - Enter required information quickly

3. **Room Assignment**
   - Check available rooms
   - Assign appropriate room
   - Confirm rate

4. **Check-in**
   - Collect payment or deposit
   - Issue room key
   - Mark as checked in

5. **Provide Information**
   - Give guest hotel information
   - Explain amenities and services
   - Note any special requests

### Workflow 2: Daily Check-in Process

1. **Review Today's Arrivals**
   - Open dashboard
   - Check "Today's Arrivals" section
   - Print arrival list if needed

2. **Prepare Rooms**
   - Verify rooms are ready
   - Check housekeeping status
   - Prepare welcome amenities

3. **Process Each Check-in**
   - Greet guest
   - Verify reservation details
   - Collect payment if needed
   - Assign room and provide key
   - Mark as checked in

4. **Update System**
   - Confirm all arrivals are processed
   - Note any issues or special requests
   - Update room status

### Workflow 3: Daily Check-out Process

1. **Review Today's Departures**
   - Check "Today's Departures" list
   - Prepare final invoices
   - Note any early/late checkouts

2. **Process Each Check-out**
   - Review guest's charges
   - Process final payment
   - Collect room key
   - Thank guest and request feedback

3. **Update Room Status**
   - Mark room as vacant/dirty
   - Notify housekeeping
   - Check for damages or issues

4. **Complete Billing**
   - Finalize invoice
   - Send receipt to guest
   - Update financial records

### Workflow 4: Handling a Reservation Change

1. **Locate Reservation**
   - Search by guest name or confirmation number
   - Open reservation details

2. **Assess Change Request**
   - Understand what needs to change
   - Check availability for new dates/room
   - Calculate any price differences

3. **Modify Reservation**
   - Update dates, room, or guest count
   - Adjust pricing if needed
   - Add notes about the change

4. **Confirm Changes**
   - Review updated reservation
   - Send confirmation to guest
   - Update calendar and availability

### Workflow 5: Monthly Closing Process

1. **Generate Financial Reports**
   - Run monthly revenue report
   - Review payment summaries
   - Check for outstanding balances

2. **Reconcile Accounts**
   - Match payments to invoices
   - Verify all transactions
   - Note any discrepancies

3. **Review Operational Metrics**
   - Occupancy rates
   - Average daily rate (ADR)
   - Revenue per available room (RevPAR)

4. **Archive and Backup**
   - Export monthly data
   - Create backup
   - Archive completed reservations

## User Roles and Permissions

### Administrator
**Full system access including:**
- All reservation operations
- Client management
- Billing and financial reports
- System configuration
- User management
- Integration settings

### Manager
**Operational management access:**
- Create and modify reservations
- Manage clients
- Process billing
- Generate reports
- View analytics
- Cannot modify system settings

### Front Desk Staff
**Daily operations access:**
- Create reservations
- Check-in/check-out guests
- View client information
- Process payments
- Limited reporting

### Viewer (閲覧者)
**Read-only access:**
- View reservations
- View client information
- View reports
- Cannot create or modify data
- Indicated by red "閲覧者" tag next to name

### Understanding Your Permissions

Your permission level is indicated by:
- Available menu items (restricted items are hidden)
- Button availability (disabled buttons appear grayed out)
- "閲覧者" tag if you have read-only access

If you need additional permissions, contact your system administrator.

## Tips and Best Practices

### Data Entry Best Practices

1. **Be Consistent**
   - Use standard formats for names (e.g., Last Name, First Name)
   - Enter phone numbers in consistent format
   - Use proper capitalization

2. **Be Complete**
   - Fill in all required fields
   - Add notes for special requests
   - Include contact information

3. **Be Accurate**
   - Double-check dates and times
   - Verify guest information
   - Confirm pricing before saving

### Efficiency Tips

1. **Use Keyboard Shortcuts**
   - Tab to move between fields
   - Enter to submit forms
   - Esc to close dialogs

2. **Leverage Search**
   - Use search instead of scrolling
   - Apply filters to narrow results
   - Save common search criteria

3. **Utilize Quick Actions**
   - Dashboard quick action buttons
   - Right-click context menus
   - Bulk operations for multiple items

### Data Security

1. **Protect Your Credentials**
   - Never share your password
   - Log out when leaving your workstation
   - Use a strong, unique password

2. **Handle Guest Data Carefully**
   - Only access information you need
   - Don't share guest details unnecessarily
   - Follow privacy regulations

3. **Regular Backups**
   - System automatically backs up data
   - Export important reports regularly
   - Keep local copies of critical information

### Communication Best Practices

1. **Use Notes Effectively**
   - Add clear, concise notes to reservations
   - Document guest requests and preferences
   - Note any issues or special circumstances

2. **Keep Clients Informed**
   - Send confirmation emails
   - Notify of any changes
   - Follow up after stay

3. **Internal Communication**
   - Use system notes for staff communication
   - Tag urgent items
   - Document handoffs between shifts

## Getting Help

### In-System Help

- **Tooltips**: Hover over icons for quick help
- **Help Icons**: Click "?" icons for contextual help
- **Status Messages**: Read system messages carefully

### Documentation

- **User Manual**: Comprehensive guide (this document)
- **Feature Documentation**: Detailed feature guides in [Features](../features/README.md)
- **API Documentation**: For integrations in [API Docs](../api/README.md)
- **Video Tutorials**: Available in training section

### Troubleshooting

Common issues and solutions:

#### Can't Log In
- Verify your email and password
- Check Caps Lock is off
- Try password reset if needed
- Contact administrator if problem persists

#### Page Not Loading
- Refresh the browser (F5)
- Clear browser cache
- Check internet connection
- Try a different browser

#### Data Not Saving
- Check all required fields are filled
- Look for error messages
- Verify you have permission to save
- Try again or contact support

#### Can't Find a Reservation
- Check spelling of guest name
- Try searching by confirmation number
- Verify you're looking at correct date range
- Check if reservation was cancelled

### Support Channels

- **System Administrator**: For account and permission issues
- **Technical Support**: For system errors and bugs
- **Training Team**: For feature questions and best practices
- **Documentation**: [Troubleshooting Guide](../deployment/troubleshooting.md)

### Feedback and Suggestions

We welcome your feedback:
- Report bugs through the system
- Suggest features or improvements
- Share workflow ideas
- Participate in user surveys

## Next Steps

### Continue Learning

1. **Explore Features**
   - Try creating a test reservation
   - Browse client profiles
   - Generate sample reports
   - Experiment with different views

2. **Review Documentation**
   - [Feature Documentation](../features/README.md) - Detailed feature guides
   - [System Architecture](../architecture/system-overview.md) - Technical overview
   - [API Documentation](../api/README.md) - Integration information

3. **Practice Common Workflows**
   - Walk through check-in process
   - Practice creating reservations
   - Try generating reports
   - Explore calendar views

### Training Resources

- **Video Tutorials**: Step-by-step feature demonstrations
- **Interactive Training**: Hands-on practice environment
- **Quick Reference Guides**: Printable workflow checklists
- **FAQ**: Frequently asked questions and answers

### Stay Updated

- **Release Notes**: Check for new features and updates
- **System Announcements**: Read important notifications
- **Training Sessions**: Attend periodic training updates
- **User Community**: Connect with other users

## Conclusion

Congratulations on completing the first-time user guide! You now have a solid foundation for using the WeHub.work Hotel Management System effectively.

Remember:
- Take time to explore the system
- Don't hesitate to ask for help
- Practice makes perfect
- Provide feedback to help us improve

Welcome to the WeHub.work family!

---

*For additional support and resources, visit our [Documentation Hub](../README.md) or contact your system administrator.*
