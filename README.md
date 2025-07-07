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
  - ❌ **NOT YET IMPLEMENTED**: Automatic notifications when rooms become available
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

For comprehensive details about the waitlist feature implementation, refer to: `WAITLIST_STRATEGY.md`

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

For comprehensive details about the waitlist feature implementation, including current status and future roadmap:

-   [Waitlist Strategy](./WAITLIST_STRATEGY.md)

## Development Guidelines and Best Practices

For detailed coding guidelines, component usage conventions, specific patterns to follow (like `requestId` handling in the backend or UI component best practices in the frontend), and other essential best practices for this project, please consult the **`instructions.md`** file located in the root of this repository.

It is highly recommended that all developers familiarize themselves with the contents of `instructions.md` before starting new development tasks and refer back to it periodically.

## Contributing

[Details to be added by project maintainers]

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
