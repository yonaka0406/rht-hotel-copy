# Hotel Management System

## Project Overview

This project is a comprehensive Hotel Management System designed to streamline various aspects of hotel operations. It includes a backend API for managing data and a frontend interface for user interaction. The system supports functionalities from reservations and client management to billing and reporting, with additional capabilities like OTA (Online Travel Agency) integration.

## Features

* **User Authentication & Authorization:** Secure login (including Google OAuth) and role-based access control, likely using JWT and bcryptjs.
* **Hotel Configuration/Management:** Management of hotel-specific details, settings, and room configurations.
* **Reservation Management:** Creating, viewing, modifying, and canceling guest reservations.
* **Client Relationship Management (CRM):** Tools for managing client information, preferences, and interaction history.
* **Billing, Plans, Addons, and Invoicing:** Handling of pricing plans, service addons, rates, and generation of invoices (Puppeteer might be used for PDF generation).
* **Reporting & Analytics:** Generation of reports for various aspects of hotel operations (e.g., occupancy, revenue, guest statistics).
* **User Management & Roles:** Administering user accounts, roles, and permissions within the system.
* **Data Import:** Functionality to import data, likely including CSV import using Papaparse.
* **OTA XML Integration:** Support for communication with Online Travel Agencies via XML (using xml2js and soap).
* **Real-time Updates:** Utilizes Socket.io for real-time communication between frontend and backend (e.g., for notifications or live data updates).
* **Email Notifications:** Integration with nodemailer for sending email notifications (e.g., booking confirmations, password resets).
* **Japanese Language Support:** Presence of Kuroshiro indicates support for Japanese text processing (e.g., converting Kanji to Hiragana/Romaji).
* **Logging:** System and audit logging capabilities (evident from `sql_logs.sql`).
* **Settings Management:** Configuration options for various system parameters.

## Technologies Used

**Backend (API):**
* Node.js
* Express.js
* PostgreSQL
* Redis
* JSON Web Tokens (JWT)
* bcryptjs
* nodemailer
* googleapis (for Google Authentication, Google Sheets API)
* Puppeteer (for PDF generation, e.g., invoices)
* Socket.io
* Kuroshiro (Japanese language processing)
* xml2js, soap (for OTA XML integration)

**Frontend:**
* Vue.js
* Vite
* PrimeVue (UI Component Library)
* Tailwind CSS (Utility-first CSS framework)
* Axios (HTTP client)
* socket.io-client (Real-time communication)
* ECharts (Charting library)
* Papaparse (CSV parsing client-side)

## Setup and Installation

**Prerequisites:**
* Node.js (which includes npm)
* PostgreSQL
* Redis (Ensure a Redis server is running)

**Backend (API):**
1. Navigate to the `api` directory: `cd api`
2. Install dependencies: `npm install`
3. Set up the PostgreSQL database:
    * Create a PostgreSQL database (e.g., `hotel_system_db`).
    * Connect to your database and execute the SQL scripts located in the `api` directory (or a dedicated `postgres` directory if applicable) in the following order:
        * `sql.sql` (for main schema and tables)
        * `sql_logs.sql` (for logging tables)
        * `sql_triggers.sql` (for database triggers)
4. Configure environment variables:
    * Create a `.env` file in the `api` directory by copying or renaming `.env.example` if it exists.
    * Populate the `.env` file with necessary environment variables, including:
        * `DB_USER`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD`, `DB_PORT`
        * `JWT_SECRET`
        * `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` (for nodemailer)
        * Google API credentials (client ID, client secret, redirect URIs for Google OAuth and any Google Sheets integration)
        * `REDIS_HOST`, `REDIS_PORT`
        * `SERVER_PORT` (e.g., 3000)
5. Start the backend server: `npm start` (for production/daemon) or `npm run dev` (for development with Nodemon, if configured).

**Frontend:**
1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Configure environment variables:
    * Create a `.env` file in the `frontend` directory (e.g., by copying `.env.example` if provided).
    * Set the `VITE_API_BASE_URL` variable to point to your backend API (e.g., `VITE_API_BASE_URL=http://localhost:3000/api`).
    * Set `VITE_SOCKET_URL` if different from the API base URL (e.g. `VITE_SOCKET_URL=http://localhost:3000`).
4. Build the frontend (for production deployment): `npm run build`
5. Start the frontend development server: `npm run dev` (usually accessible at `http://localhost:5173`).

## Usage

Once both the backend API and the frontend application are running:

1.  **Access the application:** Open your web browser and navigate to the address where the frontend is being served (typically `http://localhost:5173` when using `npm run dev` for the frontend).
2.  **Login:** Use the login page to authenticate. The system may offer standard credentials login and/or Google login.
3.  **Navigate Features:** Explore the different sections of the application, such as hotel configuration, reservations, client management, billing, and reports.

## API Documentation

General API endpoint structures and functionalities can be inferred by examining the route definitions in the `api/routes/` directory. Each file in this directory typically corresponds to a major feature or resource.

For specific instructions on setting up and using Google login, refer to the guide: `api/LOGIN_WITH_GOOGLE.md`.

## Project Structure

*   `/api`: Contains the backend Node.js Express application, including routes, controllers, models, services, and configuration.
*   `/frontend`: Contains the Vue.js frontend application, including components, views, store (Vuex/Pinia), and assets.
*   `/apache`: Likely contains Apache web server configuration files for deploying the application in a production environment using Apache as a reverse proxy or for serving static files.
*   `/postgres`: Contains scripts and configuration related to PostgreSQL database backups, and possibly initial schema or utility scripts. The main schema scripts (`sql.sql`, etc.) are typically found within the `/api` directory or a sub-directory there for easier access during backend setup.
*   `ecosystem.config.js`: Configuration file for PM2, a process manager for Node.js applications. This helps in managing and keeping the backend application alive in production.
*   `package.json`: Root level `package.json` file. It might be used for managing workspace dependencies (e.g., using Yarn workspaces or Lerna) or for defining top-level scripts that coordinate both frontend and backend tasks (e.g., a concurrent start script or deployment scripts).

## Contributing

(Details on contributing to the project can be added here, e.g., coding standards, pull request process.)

## License

(Specify the project license here, e.g., MIT, Apache 2.0.)
