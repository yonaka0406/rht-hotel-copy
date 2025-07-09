# Hotel Management System

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Setup and Installation](#setup-and-installation)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Database Setup](#database-setup)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Project Overview

This project is a comprehensive Hotel Management System designed to streamline various aspects of hotel operations. It includes a backend API for managing data and a frontend interface for user interaction. The system supports functionalities from reservations and client management to billing and reporting, with additional capabilities like OTA (Online Travel Agency) integration and waitlist management.

## Features

* **User Authentication & Authorization:** Secure login (including Google OAuth) and role-based access control, utilizing JWT and bcryptjs for robust security.
* **Hotel Configuration/Management:** Comprehensive management of hotel-specific details, operational settings, and room configurations.
* **Reservation Management:** Creating, viewing, modifying, and canceling guest reservations, featuring a **Calendar View** for intuitive scheduling.
* **Client Relationship Management (CRM):** Advanced tools for managing client profiles, tracking communication logs, organizing clients into groups, and detecting duplicate entries.
* **Billing, Plans, Addons, and Invoicing:** Flexible handling of pricing plans, service addons, dynamic rates, and automated generation of invoices (utilizing Puppeteer for PDF creation).
* **Reporting & Analytics:** Generation of insightful reports for key hotel operations metrics, including occupancy rates, revenue streams, and guest statistics.
* **User Management & Roles:** Administering user accounts, defining roles, and managing permissions across the system.
* **Waitlist Management:** ✅ **IMPLEMENTED** - Comprehensive waitlist system for managing guest requests when rooms are unavailable, including:
  - Manual waitlist entry creation with client preferences (smoking/non-smoking, room types)
  - Real-time vacancy checking for waitlist entries
  - Manual notification system for staff to send availability offers
  - Token-based confirmation system with secure expiry
  - Waitlist management interface with filtering and pagination
  - Integration with existing client and reservation systems
  - Public confirmation page for token-based reservations with full reservation creation flow
  - Email integration with waitlist-specific templates
  - Background jobs for maintenance and expiration
  - ❌ **NOT YET IMPLEMENTED**: Automatic notifications when rooms become available, reservation integration, advanced matching logic, token cleanup, real-time WebSocket updates
* **Data Import/Export:**
    *   Functionality to import data from various sources, including **Financial Data Import** and **PMS Data Import**.
    *   Supports CSV import (using Papaparse client-side and fast-csv backend-side).
    *   Enables **Excel data import and export** capabilities (via `exceljs`).
* **File Uploads:** General purpose file upload functionality for various modules (e.g., attaching documents to client profiles) using `multer`.
* **OTA XML Integration:** Seamless communication with Online Travel Agencies via XML (leveraging `xml2js` and `soap`), including integration with the TL-Lincoln channel manager.
* **Real-time Updates:** Employs Socket.io for instant communication between the frontend and backend (e.g., for live notifications or dynamic data updates).
* **Email Notifications:** Integrated with nodemailer for automated email notifications such as booking confirmations and password resets.
* **Japanese Language Support:** Incorporates Kuroshiro for Japanese text processing, including conversion between Kanji, Hiragana, and Romaji.
* **Logging:** Comprehensive system and audit logging capabilities (as defined in `sql_logs.sql`).
* **Settings Management:** Centralized configuration options for various system parameters and operational preferences.

## Technologies Used

**Backend (API):**
* Node.js
* Express.js
* PostgreSQL
* Redis
* JSON Web Tokens (JWT)
* bcryptjs
* connect-pg-simple (for session store)
* exceljs (for Excel data import/export)
* express-session (for session management)
* express-validator (for input validation)
* fast-csv (for CSV parsing)
* google-auth-library (for Google OAuth)
* googleapis (for Google Sheets API, etc.)
* multer (for file uploads)
* nodemailer
* pg-format (for dynamic SQL queries)
* Puppeteer (for PDF generation, e.g., invoices)
* sharp (for image processing)
* Socket.io
* Kuroshiro (Japanese language processing)
* xml2js, soap (for OTA XML integration)
* uuid (for generating unique IDs)
* wanakana (Japanese romanization/kana conversion utilities)
* winston (for logging)

**Frontend:**
* Vue.js
* Vite
* PrimeVue (UI Component Library)
* @primeuix/themes (Theming for PrimeVue)
* primeicons (Icon library for PrimeVue)
* Tailwind CSS (Utility-first CSS framework)
* Axios (HTTP client)
* socket.io-client (Real-time communication)
* ECharts / vue-echarts (Charting library and its Vue wrapper)
* Papaparse (CSV parsing client-side)
* uuid (for generating unique IDs client-side)
* vue-router (for client-side routing)

## Setup and Installation

**Prerequisites:**
* Node.js (which includes npm)
* PostgreSQL
* Redis (Ensure a Redis server is running)

**Database Setup:**
1. Set up the PostgreSQL database:
    * Create a PostgreSQL database (e.g., `hotel_system_db`).
    * Connect to your database and execute the SQL migration scripts located in the `api/migrations/` directory.
    * These scripts should be executed in numerical order (e.g., `001_initial_schema.sql`, then `002_room_management.sql`, and so on).
    * The current set of migration files are:
        * `001_initial_schema.sql`
        * `002_room_management.sql`
        * `003_client_management.sql`
        * `004_plans_and_addons.sql`
        * `005_reservations.sql`
        * `006_billing.sql`
        * `007_ota_integration.sql`
        * `008_views.sql`
        * `009_financial_data.sql`
        * `010_logs_schema_and_functions.sql`
        * `011_custom_functions.sql`
        * `012_triggers.sql`
        * `013_waitlist.sql` ✅ **NEW** - Waitlist system database schema
    * Ad-hoc scripts for specific data cleanup or processing can be found in `api/adhoc_scripts/`. These are not part of the standard installation.
    * **Note:** The `api/LOGIN_WITH_GOOGLE.md` guide may refer to an additional `migration_script.sql` for Google Authentication specific database changes. This is now superseded by the numbered migration files. Ensure all necessary Google Auth fields are part of the `001_initial_schema.sql` or subsequent relevant migrations.

**Backend Setup (API):**
1. Navigate to the `api` directory: `cd api`
2. Install dependencies: `npm install`
3. Configure environment variables:
    * Create a `.env` file in the `api` directory by copying or renaming `.env.example` if it exists.
    * Populate the `.env` file with necessary environment variables, including:
        * `DB_USER`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD`, `DB_PORT`
        * `JWT_SECRET` (for signing JWTs)
        * `REFRESH_TOKEN_SECRET` (for signing refresh tokens)
        * `SESSION_SECRET` (for `express-session` and OAuth state)
        * `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` (for nodemailer)
        * `GOOGLE_CLIENT_ID` (Google OAuth Client ID)
        * `GOOGLE_CLIENT_SECRET` (Google OAuth Client Secret)
        * `GOOGLE_REDIRECT_URI` (Redirect URI configured in Google Cloud Console for OAuth)
        * `YOUR_WORKSPACE_DOMAIN` (Optional: Google Workspace domain for `hd` parameter in Google OAuth, e.g., `yourdomain.com`)
        * `REDIS_HOST`, `REDIS_PORT`
        * `SERVER_PORT` (e.g., 3000)
        * `API_BASE_URL` (e.g., `http://localhost:3000/api`)
        * `FRONTEND_URL` (e.g., `http://localhost:5173`)
4. Start the backend server: `npm start` (for production/daemon) or `npm run dev` (for development with Nodemon, if configured).

**Frontend Setup:**
1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Configure environment variables:
    * Create a `.env` file in the `frontend` directory (e.g., by copying `.env.example` if provided).
    * Set the `VITE_API_BASE_URL` variable to point to your backend API (e.g., `VITE_API_BASE_URL=http://localhost:3000/api`).
    * Set the `VITE_SOCKET_URL` variable to point to your backend's Socket.io server (e.g., `VITE_SOCKET_URL=http://localhost:3000`). This might be the same as your API base URL if sockets are served on the same port, or different if you have a dedicated socket server/port.
4. Build the frontend (for production deployment): `npm run build`
5. Start the frontend development server: `npm run dev` (usually accessible at `http://localhost:5173`).

## Usage

Once both the backend API and the frontend application are running:

1.  **Access the application:** Open your web browser and navigate to the address where the frontend is being served (typically `http://localhost:5173` when using `npm run dev` for the frontend).
2.  **Login:** Use the login page to authenticate. The system may offer standard credentials login and/or Google login.
3.  **Navigate Features:** Explore the different sections of the application, such as hotel configuration, reservations, client management, billing, reports, and waitlist management.

### Waitlist Feature Usage

The waitlist system is accessible through the main navigation and provides the following functionality:

1. **Creating Waitlist Entries**: When rooms are unavailable during reservation creation, users can add guests to a waitlist with their preferences.
2. **Managing Waitlist**: Staff can view, filter, and manage waitlist entries through the dedicated management interface.
3. **Manual Notifications**: Staff can manually send availability notifications to waitlist guests when rooms become available.
4. **Vacancy Checking**: The system can check real-time availability for waitlist entries to determine if offers can be made.

## API Documentation

General API endpoint structures and functionalities can be inferred by examining the route definitions in the `api/routes/` directory. Each file in this directory typically corresponds to a major feature or resource.

For more detailed information about the API, including setup, specific endpoints, and authentication mechanisms, please refer to the `api/README.md` file.

For specific instructions on setting up and using Google login, refer to the guide: `api/LOGIN_WITH_GOOGLE.md`.

For comprehensive details about the waitlist feature implementation, including technical specifications and implementation status, see the [Waitlist System Documentation](#waitlist-system-documentation) section below.

## Project Structure

*   `/api`: Contains the backend Node.js Express application. This includes routes, controllers, models, services, and configuration.
    *   `/api/migrations`: Contains SQL scripts for database schema setup and migrations. These should be run in numerical order.
    *   `/api/models/waitlist.js`: ✅ **NEW** - Waitlist data model and business logic
    *   `/api/controllers/waitlistController.js`: ✅ **NEW** - Waitlist API endpoints
    *   `/api/routes/waitlistRoutes.js`: ✅ **NEW** - Waitlist route definitions
    *   `/api/jobs/waitlistJob.js`: ✅ **NEW** - Background job for waitlist maintenance
*   `/frontend`: Contains the Vue.js frontend application, including components, views, store (e.g., Pinia), and assets.
    *   `/frontend/src/composables/useWaitlistStore.js`: ✅ **NEW** - Waitlist state management
    *   `/frontend/src/pages/Admin/ManageWaitList.vue`: ✅ **NEW** - Waitlist management interface
    *   `/frontend/src/pages/MainPage/components/Dialogs/WaitlistDialog.vue`: ✅ **NEW** - Waitlist entry creation dialog
    *   `/frontend/src/pages/MainPage/components/WaitlistDisplayModal.vue`: ✅ **NEW** - Waitlist display modal
*   `/apache`: Likely contains Apache web server configuration files for deploying the application, possibly as a reverse proxy.
*   `/postgres`: Primarily used for storing PostgreSQL database backups and related utility scripts. The main database schema scripts are located in `/api`.
*   `/scripts`: Contains miscellaneous utility scripts for development, deployment, or administrative tasks.
*   `ecosystem.config.js`: Configuration file for PM2, a Node.js process manager, used for managing the backend application in production.
*   `package.json`: Root level `package.json`. It may manage workspace dependencies or define top-level scripts for coordinating frontend/backend tasks.
*   **Note:** The root directory also contains several other `.md` files such as `data_aggregation_strategies_postgresql.md`, `key_reservation_metrics_recommendations.md`, `multi_hotel_presentation_strategy.md`, and `WAITLIST_STRATEGY.md` which may contain further design and architectural notes.

## Architecture and Design Documents

For more detailed information on the system's architecture, data aggregation strategies, key metric definitions, and multi-hotel presentation strategies, please refer to the following document:

-   [Architecture and Design](./ARCHITECTURE.md)

For comprehensive details about the waitlist feature implementation, including current status and future roadmap, see the [Waitlist System Documentation](#waitlist-system-documentation) section below.

## Development Guidelines and Best Practices

For detailed coding guidelines, component usage conventions, specific patterns to follow (like `requestId` handling in the backend or UI component best practices in the frontend), and other essential best practices for this project, please consult the **`instructions.md`** file located in the root of this repository.

It is highly recommended that all developers familiarize themselves with the contents of `instructions.md` before starting new development tasks and refer back to it periodically.

## Contributing

[Details to be added by project maintainers]

## Waitlist System Documentation

### Overview

The waitlist system is a comprehensive feature designed to capture and convert unmet demand in the hotel management system. It allows hotels to maintain a list of guests interested in specific room types and dates when they are unavailable, and automatically notify them when rooms become available.

### Business Value

#### 1. Revenue Recovery
- **Problem**: Hotels lose potential revenue when fully booked rooms turn away interested customers, especially when specific room preferences (smoking vs. non-smoking, specific view, accessibility features) are unavailable.
- **Solution**: Waitlist captures demand that would otherwise be lost, converting it into bookings when cancellations occur or preferred room types become available.
- **Impact**: Studies show hotels can recover 15-25% of lost bookings through effective waitlist management.

#### 2. Enhanced Customer Experience
- **Proactive Communication**: Customers appreciate being notified of availability rather than having to repeatedly check.
- **Reduced Friction**: Seamless transition from "unavailable" to "book now" eliminates search restart.
- **Builds Loyalty**: Shows hotel values customer interest and specific preferences even when unable to immediately accommodate.
- **Accommodates Specific Needs**: Allows guests to wait for rooms that meet their specific requirements.

#### 3. Operational Efficiency
- **Automated Matching**: System automatically finds best waitlist candidates when rooms become available.
- **Staff Productivity**: Reduces manual work of tracking interested customers and making availability calls.
- **Data-Driven Insights**: Provides visibility into unmet demand patterns for capacity planning.

### Technical Implementation

#### Database Schema

The waitlist system uses a comprehensive database schema with the following key features:

```sql
-- Waitlist entries table with all required fields
CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id INTEGER,
    requested_check_in_date DATE NOT NULL,
    requested_check_out_date DATE NOT NULL,
    number_of_guests INTEGER NOT NULL CHECK (number_of_guests > 0),
    number_of_rooms INTEGER NOT NULL DEFAULT 1 CHECK (number_of_rooms > 0),
    status TEXT NOT NULL DEFAULT 'waiting' 
        CHECK (status IN ('waiting', 'notified', 'confirmed', 'expired', 'cancelled')),
    notes TEXT,
    confirmation_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    contact_email TEXT,
    contact_phone TEXT,
    communication_preference TEXT NOT NULL DEFAULT 'email' 
        CHECK (communication_preference IN ('email', 'phone')),
    preferred_smoking_status TEXT NOT NULL DEFAULT 'any' 
        CHECK (preferred_smoking_status IN ('any', 'smoking', 'non_smoking')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);
```

#### API Endpoints

The waitlist system provides the following API endpoints:

**Core Operations:**
- `POST /api/waitlist` - Create new waitlist entry
- `GET /api/waitlist/hotel/:hotelId` - List waitlist entries with filtering and pagination
- `PUT /api/waitlist/:id/cancel` - Cancel a waitlist entry

**Management:**
- `POST /api/waitlist/:id/manual-notify` - Send manual notification email
- `POST /api/waitlist/check-vacancy` - Check real-time availability

**Public Confirmation:**
- `GET /api/waitlist/confirm/:token` - Get confirmation details for a token
- `POST /api/waitlist/confirm/:token` - Confirm waitlist entry and create reservation

#### Frontend Components

**Core Components:**
1. **WaitlistDialog.vue** - Modal dialog for creating waitlist entries with client selection, preferences, and contact information
2. **ManageWaitList.vue** - Admin interface for waitlist management with filtering, pagination, and bulk operations
3. **WaitlistDisplayModal.vue** - Quick view modal for waitlist entries with real-time vacancy checking
4. **ReservationClientConfirmation.vue** - Public confirmation page for token-based reservations

**State Management:**
- `useWaitlistStore.js` - Comprehensive composable store for waitlist operations

### Implementation Status

#### ✅ Implemented Features:
1. **Database Schema**: Complete with all required tables, indexes, and constraints
2. **Core CRUD Operations**: Create, read, update, delete waitlist entries with proper validation
3. **Token-based Confirmation**: Secure confirmation system with crypto-generated tokens and expiry
4. **Manual Notifications**: Staff can manually send availability notifications via email
5. **Vacancy Checking**: Real-time availability checking for waitlist entry criteria
6. **Email Integration**: Waitlist-specific email templates and sending functionality
7. **Frontend UI**: Complete management interface, entry dialog, and display components
8. **Public Confirmation Page**: Frontend page for token-based confirmations with full reservation creation flow
9. **Authentication**: Proper middleware for both authenticated and public endpoints
10. **Background Jobs**: Basic expiration job for past check-in dates

#### ❌ Not Yet Implemented Features:
1. **Automatic Notifications**: Automatic triggering when rooms become available
2. **Reservation Integration**: Automatic waitlist processing when reservations are cancelled
3. **Advanced Matching Logic**: Complex date overlap and preference matching algorithms
4. **Token Cleanup**: Background job for expired notification tokens
5. **Real-time Updates**: WebSocket integration for live status changes
6. **Advanced Filtering**: More sophisticated search and filter options
7. **Bulk Operations**: Mass actions on multiple waitlist entries

### Security Considerations

#### Token Security
- Uses cryptographically secure random tokens
- Implements rate limiting on confirmation endpoints
- Includes CSRF protection for public confirmation pages
- Token expiry management with automatic cleanup

#### Data Privacy
- GDPR compliance for waitlist data
- Data retention policies
- Customer self-removal capabilities
- Comprehensive audit trail for all operations

### Performance Optimization

#### Database Optimization
- Partitioned waitlist_entries by hotel_id for large deployments
- Optimized indexes for common query patterns
- Connection pooling for background jobs
- Query result caching for hotel/room type lookups

#### Frontend Optimization
- Lazy loading for waitlist management page
- Debounced search and filtering
- Optimistic updates for better UX
- Responsive design for mobile compatibility

### Success Metrics

#### Business Metrics
- **Conversion Rate**: Percentage of waitlist entries that convert to bookings
- **Revenue Recovery**: Revenue generated from waitlist conversions
- **Customer Satisfaction**: Feedback scores on waitlist experience
- **Operational Efficiency**: Reduction in manual waitlist management time

#### Technical Metrics
- **Response Time**: API endpoint performance (< 200ms target)
- **Email Delivery**: Notification email success rate (> 99%)
- **System Uptime**: Availability during peak booking periods
- **Error Rate**: Application error frequency (< 0.1%)

### Future Roadmap

The next phase of development should focus on:
1. Implementing automatic notification triggers when rooms become available
2. Deep integration with the reservation cancellation system
3. Advanced matching algorithms for complex date overlap scenarios
4. Real-time WebSocket updates for live status changes
5. Enhanced filtering and bulk operation capabilities

## Security Considerations

### PostgreSQL DoS Mitigation with Fail2ban

Fail2ban is a service that monitors server logs for suspicious activity and temporarily bans IP addresses that exhibit malicious patterns, such as too many password failures. Configuring Fail2ban for PostgreSQL can help mitigate brute-force login attempts and other denial-of-service (DoS) attack vectors by blocking offending IPs.

Here's a basic example of how to configure a Fail2ban jail for PostgreSQL. Create or edit your `jail.local` file (usually in `/etc/fail2ban/jail.local`) and add the following:

```ini
[postgres]
enabled  = true
port     = 5432
filter   = postgres
logpath  = /var/log/postgresql/postgresql-%Y-%m-%d_*.log  # Adjust path as needed
maxretry = 5
bantime  = 3600  # Ban for 1 hour
findtime = 600   # Check logs for the past 10 minutes
```

**Explanation:**
*   `enabled = true`: Activates this jail.
*   `port = 5432`: Specifies the PostgreSQL port.
*   `filter = postgres`: Uses the predefined `postgres` filter, which should be available in your Fail2ban installation (usually in `/etc/fail2ban/filter.d/postgres.conf`). This filter contains the regular expressions to identify failed login attempts.
*   `logpath`: Points to the PostgreSQL log files. The exact path and naming convention might vary depending on your PostgreSQL version and operating system configuration. The example uses a common pattern for daily rotated logs.
*   `maxretry = 5`: Bans an IP after 5 failed attempts.
*   `bantime = 3600`: Bans the IP for 3600 seconds (1 hour).
*   `findtime = 600`: Considers failures within the last 600 seconds (10 minutes) for `maxretry`.

**Locating PostgreSQL Logs:**
The `logpath` in the configuration is crucial. Common locations for PostgreSQL logs include:
*   Debian/Ubuntu: `/var/log/postgresql/postgresql-X.Y-main.log` (where X.Y is the version) or `/var/log/postgresql/postgresql.log`.
*   Red Hat/CentOS/Fedora: `/var/lib/pgsql/data/pg_log/` or `/var/lib/pgsql/<version>/data/log/`.
*   Custom installations: The log location might be defined in your `postgresql.conf` file (look for `log_directory` and `log_filename`).

Always ensure PostgreSQL is configured to log connection attempts and errors. This is typically managed by settings like `log_connections`, `log_disconnections`, `log_hostname`, and `log_statement` in `postgresql.conf`.

## License

[Details to be added by project maintainers]
