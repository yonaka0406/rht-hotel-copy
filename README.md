# Hotel Management System

## Project Overview

This project is a comprehensive Hotel Management System designed to streamline various aspects of hotel operations. It includes a backend API for managing data and a frontend interface for user interaction. The system appears to support functionalities from reservations and client management to billing and reporting, with additional capabilities like OTA (Online Travel Agency) integration.

## Features

* **User Authentication & Authorization:** Secure login and role-based access control.
* **Hotel Configuration:** Management of hotel-specific details and settings.
* **Reservation Management:** Creating, viewing, and managing guest reservations.
* **Client Relationship Management (CRM):** Tools for managing client information and interactions.
* **Billing & Invoicing:** Handling of plans, addons, rates, and generation of invoices.
* **Reporting & Analytics:** Generation of reports for various aspects of hotel operations.
* **User Management:** Administering user accounts and roles.
* **Data Import:** Functionality to import data, possibly from external sources.
* **OTA XML Integration:** Support for communication with Online Travel Agencies via XML.
* **Real-time Updates:** Likely uses Socket.io for real-time communication between frontend and backend.
* **Email Notifications:** Integration with nodemailer suggests email-based notifications.
* **Japanese Language Support:** Presence of Kuroshiro indicates support for Japanese text processing.

## Technologies Used

**Backend (API):**
* Node.js
* Express.js
* PostgreSQL
* Redis
* JSON Web Tokens (JWT)
* bcryptjs
* nodemailer
* Google APIs (Authentication, Sheets)
* Puppeteer
* Socket.io
* Kuroshiro (Japanese language processing)
* xml2js, soap (for OTA XML integration)

**Frontend:**
* Vue.js
* Vite
* PrimeVue
* Tailwind CSS
* Axios
* Socket.io-client
* ECharts
* Papaparse (CSV parsing)

## Setup and Installation

**Prerequisites:**
* Node.js (which includes npm)
* PostgreSQL

**Backend (API):**
1. Navigate to the `api` directory: `cd api`
2. Install dependencies: `npm install`
3. Set up the PostgreSQL database:
    * Create a database.
    * Execute the SQL scripts (`sql.sql`, `sql_logs.sql`, `sql_triggers.sql`) to create the necessary tables and procedures.
4. Configure environment variables:
    * Create a `.env` file in the `api` directory.
    * Add necessary environment variables (e.g., database connection details, JWT secret, email credentials, Google API keys). Refer to `api/config/database.js` and other config files for potential variables.
5. Start the backend server: `npm start` or `npm run dev` (for development with Nodemon).

**Frontend:**
1. Navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Configure environment variables (if any, typically for API endpoint):
    * Create a `.env` file in the `frontend` directory if needed (e.g., `VITE_API_BASE_URL`).
4. Build the frontend (optional, for production): `npm run build`
5. Start the frontend development server: `npm run dev`

## Usage

Once both the backend API and the frontend application are running:

1.  **Access the application:** Open your web browser and navigate to the address where the frontend is being served (usually `http://localhost:5173` if using Vite's default).
2.  **Login:** Use the login credentials to access the system.
3.  **Navigate Features:** Explore the different sections of the application, such as hotel management, reservations, CRM, billing, and reports.

The specific API endpoints can be explored by looking at the route definitions in `api/routes/`.
