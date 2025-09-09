# Hotel Management System API

## Overview

This directory contains the backend API for the Hotel Management System. It is a Node.js application built with the Express.js framework, responsible for handling business logic, data storage, and communication with the frontend application and external services.

## Technologies Used

*   **Node.js:** JavaScript runtime environment.
*   **Express.js:** Web application framework for Node.js.
*   **PostgreSQL:** Primary relational database.
*   **Redis:** In-memory data store, used for caching and session management.
*   **JSON Web Tokens (JWT):** For securing API endpoints and user authentication.
*   **bcryptjs:** For password hashing.
*   **connect-pg-simple:** PostgreSQL session store for Express.
*   **exceljs:** For generating and parsing Excel (xlsx, csv) files.
*   **express-session:** For session management.
*   **express-validator:** For request data validation.
*   **fast-csv:** For parsing CSV files.
*   **google-auth-library:** Google Auth Library for Node.js, used for verifying Google ID tokens.
*   **googleapis:** Node.js client library for Google APIs (e.g., Google Sheets).
*   **multer:** Middleware for handling `multipart/form-data`, used for file uploads.
*   **nodemailer:** For sending emails (e.g., notifications, password resets).
*   **pg-format:** Used to safely create dynamic SQL queries for PostgreSQL.
*   **Puppeteer (v21.11.0):** Headless Chrome Node.js API, used for generating PDF invoices or reports. 
    * **Note:** This specific version is required due to memory constraints on the production VPS (4GB RAM). Newer versions may cause stability issues.
*   **sharp:** High performance Node.js image processing library.
*   **Socket.io:** For enabling real-time, bidirectional communication.
*   **Kuroshiro & wanakana:** Japanese language libraries for converting Kanji/Hiragana to Romaji and other Japanese text utilities.
*   **xml2js & soap:** Libraries for XML parsing and SOAP client requests, used for Online Travel Agency (OTA) integration.
*   **uuid:** For generating RFC4122 UUIDs.
*   **winston:** A multi-transport async logging library.

## Setup and Installation

1.  **Prerequisites:**
    *   Node.js (v14 or later)
    *   PostgreSQL (v12 or later)
    *   Redis (v6 or later)
    *   npm or yarn package manager

2.  **Supabase Setup (Windows):**
    ```powershell
    # Install Scoop (Windows package manager) if not already installed
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
    irm get.scoop.sh | iex

    # Install Supabase CLI
    scoop install supabase

    # Verify installation
    supabase --version

    # Login to your Supabase account
    supabase login

    # Link your project (replace <your-project-ref> with your actual project reference)
    supabase link --project-ref <your-project-ref>
    ```

3.  **Database Restoration:**
    ```powershell
    # Restore database from dump (replace placeholders with your actual values)
    pg_restore --clean --if-exists --no-owner --no-acl -d "<your-database-connection-string>" "docker-entrypoint-initdb.d\wehub-backup.dump"
    ```

4.  **Navigate to the API directory:**
    ```bash
    cd api
    ```
5.  **Install dependencies:**
    ```bash
    npm install
    ```
6.  **Database Setup:**
    *   Ensure you have a running PostgreSQL instance.
    *   Create a database for the application (e.g., `hotel_system_db`).
    *   Connect to your database and execute the SQL migration scripts located in the `api/migrations/` directory.
    *   These scripts **must be executed in numerical order** (e.g., `001_initial_schema.sql`, then `002_room_management.sql`, and so on, up to `013_waitlist.sql`).
    *   The ordered list of migration files is:
        1.  `001_initial_schema.sql` (Core user and hotel tables)
        2.  `002_room_management.sql` (Room types and rooms)
        3.  `003_client_management.sql` (Clients, CRM, projects, loyalty)
        4.  `004_plans_and_addons.sql` (Tax, plans, addons global and hotel-specific)
        5.  `005_reservations.sql` (Reservations, details, related tables)
        6.  `006_billing.sql` (Invoices, receipts)
        7.  `007_ota_integration.sql` (OTA specific tables like `sc_tl_rooms`, `xml_templates`)
        8.  `008_views.sql` (All database views)
        9.  `009_financial_data.sql` (Forecasting and accounting tables)
        10. `010_logs_schema_and_functions.sql` (Log tables and log trigger functions)
        11. `011_custom_functions.sql` (Custom SQL utility functions)
        12. `012_triggers.sql` (Attaches log triggers and other custom triggers)
        13. `013_waitlist.sql` ✅ **NEW** - Waitlist system database schema and functions
    *   **Note on Google Authentication:** The `LOGIN_WITH_GOOGLE.md` guide might mention a `migration_script.sql`. This is now superseded by the numbered migration files. Ensure all Google Auth related fields (e.g., in the `users` table) are correctly defined within `001_initial_schema.sql` or other relevant early migration files.
7.  **Environment Variables:**
    *   Create a `.env` file in the `api` directory (i.e., `api/.env`).
    *   Populate the `.env` file with the following variables, adjusting values as necessary. Refer to `config/database.js`, `config/oauth.js`, `config/redis.js`, `config/session.js`, and `utils/emailUtils.js` for more context on their usage.

        **Database:**
        *   `DB_USER`: PostgreSQL username
        *   `DB_HOST`: PostgreSQL host (e.g., `localhost`)
        *   `DB_DATABASE`: PostgreSQL database name
        *   `DB_PASSWORD`: PostgreSQL password
        *   `DB_PORT`: PostgreSQL port (e.g., `5432`)

        **JWT (JSON Web Tokens):**
        *   `JWT_SECRET`: Secret key for signing JWTs.
        *   `REFRESH_TOKEN_SECRET`: Secret key for signing refresh tokens.

        **Session Management:**
        *   `SESSION_SECRET`: Secret key for `express-session`, used for session management and OAuth state.

        **Email (Nodemailer):**
        *   `EMAIL_HOST`: SMTP server host for sending emails.
        *   `EMAIL_PORT`: SMTP server port.
        *   `EMAIL_USER`: SMTP username.
        *   `EMAIL_PASS`: SMTP password.

        **Google OAuth:**
        *   `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID from the Google Cloud Console.
        *   `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret from the Google Cloud Console.
        *   `GOOGLE_CALLBACK_URL`: The "Authorized redirect URI" you configured in Google Cloud Console for the OAuth client (e.g., `http://localhost:3000/api/auth/google/callback`). This is where Google redirects after successful authentication.
        *   `YOUR_WORKSPACE_DOMAIN`: Optional. If you wish to restrict Google Sign-In to a specific Google Workspace domain (e.g., `yourdomain.com`), provide it here. This value is used for the `hd` (hosted domain) parameter in the Google OAuth flow.

        **Redis:**
        *   `REDIS_HOST`: Redis server host (e.g., `localhost`).
        *   `REDIS_PORT`: Redis server port (e.g., `6379`).

        **API & Frontend URLs:**
        *   `API_BASE_URL`: The base URL for the API itself (e.g., `http://localhost:3000/api`). This is used for constructing self-referential URLs if needed.
        *   `FRONTEND_URL`: The base URL of the frontend application that will interact with this API (e.g., `http://localhost:5173`). This is used for CORS configuration and potentially in email links.

        **TL-Lincoln Integration (OTA):**
        *   `XML_SYSTEM_ID`: Your system's unique identifier provided by TL-Lincoln.
        *   `XML_REQUEST_URL`: The base URL for the TL-Lincoln API (e.g., `https://www.tl-lincoln.net/pmsservice/V1/`).
8.  **Start the server:**
    *   For development (with automatic restarts via Nodemon):
        ```bash
        npm run dev
        ```
    *   For production:
        ```bash
        npm start
        ```

## API Structure

The API codebase is organized into the following main directories:

*   **`/config`**: Contains configuration files for the database, OAuth, Redis, etc.
*   **`/controllers`**: Houses the controllers that handle incoming requests, interact with services/models, and send responses.
    *   **`waitlistController.js`** ✅ **NEW** - Handles waitlist-related API endpoints including entry creation, management, notifications, and confirmations.
*   **`/middleware`**: Contains custom middleware functions (e.g., for authentication).
    *   **`authMiddleware.js`** - Updated with waitlist token authentication for public confirmation endpoints.
*   **`/models`**: Defines the database schemas/models and includes logic for interacting with the database (data access layer).
    *   **`waitlist.js`** ✅ **NEW** - Waitlist data model with CRUD operations, token management, and business logic.
*   **`/ota`**: Contains specific logic for Online Travel Agency (OTA) XML integration, including its own routes, controller, and model for handling XML-based communication.
*   **`/public`**: Static assets served by the API.
*   **`/routes`**: Defines the API endpoints and maps them to the appropriate controllers.
    *   **`waitlistRoutes.js`** ✅ **NEW** - Waitlist API route definitions with proper authentication and authorization.
*   **`/services`**: Contains business logic that is shared across controllers (e.g., session management, specific business operations).
*   **`/utils`**: Utility functions used throughout the application. This includes helpers for email (`emailUtils.js`), JWT handling, Japanese text processing (Kuroshiro/wanakana), date formatting, and input validation.
    *   **Input Validation:** The `api/utils/validationUtils.js` module provides helper functions for robust and consistent validation of request parameters (e.g., numeric IDs, UUIDs, date strings). It is recommended to use these utilities in controllers to ensure data integrity and standardized error responses. For detailed usage, refer to `instructions.md`.
*   **`/jobs`**: Contains background job scripts for automated tasks.
    *   **`waitlistJob.js`** ✅ **NEW** - Background job for waitlist maintenance including expiration of past entries.

## Key Files

*   **`index.js`**: The main entry point for the API application.
*   **`package.json`**: Lists project dependencies and npm scripts.
*   **`LOGIN_WITH_GOOGLE.md`**: Provides specific instructions and details for setting up and using the "Login with Google" functionality (refer to migration scripts for schema setup).
*   **`/migrations`**: This directory now contains all SQL scripts for database initialization, replacing the older monolithic `sql.sql`, `sql_logs.sql`, and `sql_triggers.sql` files. Execute these scripts in numerical order.

## Waitlist System API Endpoints ✅ NEW

The waitlist system provides the following API endpoints:

### Core Waitlist Operations
*   **`POST /api/waitlist`** - Create a new waitlist entry (requires authentication and CRUD access)
*   **`GET /api/waitlist/hotel/:hotelId`** - List waitlist entries for a hotel with filtering and pagination (requires authentication)
*   **`POST /api/waitlist/hotel/:hotelId`** - Alternative endpoint for listing entries with POST body for complex filters

### Waitlist Management
*   **`POST /api/waitlist/:id/manual-notify`** - Send manual notification email to waitlist guest (requires authentication)
*   **`PUT /api/waitlist/:id/cancel`** - Cancel a waitlist entry (requires authentication)
*   **`PUT /api/waitlist/:id/cancel-token`** - Cancel a waitlist entry via waitlist token (public endpoint with token authentication)

### Public Confirmation Endpoints
*   **`GET /api/waitlist/confirm/:token`** - Get confirmation details for a waitlist token (public)
*   **`POST /api/waitlist/confirm/:token`** - Confirm waitlist entry and create reservation (public)

### Utility Endpoints
*   **`POST /api/waitlist/check-vacancy`** - Check real-time availability for waitlist entry criteria (public)

### Authentication
*   Most endpoints require standard JWT authentication via `authMiddleware`
*   CRUD operations require additional `authMiddlewareCRUDAccess` for permission checking
*   Public confirmation endpoints use `authMiddlewareWaitlistToken` for token-based authentication

## Online Travel Agency (OTA) Integration

The `api/ota/` directory is dedicated to integrating with Online Travel Agencies, specifically with the **TL-Lincoln** channel manager. This integration facilitates:
*   Automated fetching and processing of reservations from TL-Lincoln.
*   Real-time updates of inventory (room availability/stock) to TL-Lincoln.
*   Synchronization and mapping of room type master data (via `sc_tl_rooms` table) and plan master data (via `sc_tl_plans` table) with TL-Lincoln.
The `xmlController.js`, `xmlModel.js`, and `xmlRoutes.js` files within this directory manage these operations.

**Configuration for TL-Lincoln Integration:**

The following environment variables must be set in the `.env` file:
*   `XML_SYSTEM_ID`: Your system's unique identifier provided by TL-Lincoln.
*   `XML_REQUEST_URL`: The base URL for the TL-Lincoln API (e.g., `https://www.tl-lincoln.net/pmsservice/V1/`).

Hotel-specific credentials for TL-Lincoln (user ID and password) are stored in the `sc_user_info` database table. Each entry should be linked to the respective hotel and have the `name` field set to 'TL-リンカーン'.

The system utilizes XML templates stored in the `xml_templates` database table to construct requests sent to TL-Lincoln. These templates are populated with the necessary credentials and dynamic data at runtime.

## Development Guidelines and Best Practices

For detailed coding guidelines, component usage conventions, specific patterns to follow (like `requestId` handling in the backend or UI component best practices in the frontend), and other essential best practices for this project, please consult the **`instructions.md`** file located in the root of this repository.

It is highly recommended that all developers familiarize themselves with the contents of `instructions.md` before starting new development tasks and refer back to it periodically.

## Waitlist System Implementation Status

### ✅ Implemented Features:
1. **Database Schema**: Complete waitlist_entries table with all required fields, indexes, and constraints
2. **Core CRUD Operations**: Create, read, update, delete waitlist entries with proper validation
3. **Token-based Confirmation**: Secure confirmation system with crypto-generated tokens and expiry
4. **Manual Notifications**: Staff can manually send availability notifications via email
5. **Vacancy Checking**: Real-time availability checking for waitlist entry criteria
6. **Email Integration**: Waitlist-specific email templates and sending functionality
7. **Authentication**: Proper middleware for both authenticated and public endpoints
8. **Background Jobs**: Basic expiration job for past check-in dates

### ❌ Not Yet Implemented Features:
1. **Automatic Notifications**: Automatic triggering when rooms become available
2. **Reservation Integration**: Automatic waitlist processing when reservations are cancelled
3. **Advanced Matching Logic**: Complex date overlap and preference matching algorithms
4. **Token Cleanup**: Background job for expired notification tokens
5. **Real-time Updates**: WebSocket integration for live status changes

For comprehensive details about the waitlist implementation, including technical specifications and future roadmap, refer to the [Waitlist System Documentation](../README.md#waitlist-system-documentation) in the main README file.

## Troubleshooting

If you encounter issues during setup or operation, first check the following:
*   **Environment Variable Configuration:** Ensure all required environment variables in your `.env` file are correctly set for your specific environment. Pay close attention to database credentials, API keys, and service URLs.
*   **Service Availability:** Verify that essential services like PostgreSQL and Redis are running and accessible to the API.
*   **Logs:** Check the application logs for more specific error messages. If running in development mode (`npm run dev`), logs will typically appear in the console. For production deployments, check the configured log files or logging service.
*   **Database Schema:** Confirm that all SQL scripts (`001_initial_schema.sql` through `013_waitlist.sql`) have been executed successfully against your database.
*   **Port Conflicts:** Ensure the port specified for the API (`SERVER_PORT`, defaulting to the port used by `npm start` or `npm run dev` if not set) is not already in use by another application.
