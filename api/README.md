# Hotel Management System API

## Overview

This directory contains the backend API for the Hotel Management System. It is a Node.js application built with the Express.js framework, responsible for handling business logic, data storage, and communication with the frontend application and external services.

## Technologies Used

*   **Node.js:** JavaScript runtime environment.
*   **Express.js:** Web application framework for Node.js.
*   **PostgreSQL:** Primary relational database.
*   **Redis:** In-memory data store, likely used for caching or session management.
*   **JSON Web Tokens (JWT):** For securing API endpoints and user authentication.
*   **bcryptjs:** For password hashing.
*   **nodemailer:** For sending emails (e.g., notifications, password resets).
*   **googleapis:** Node.js client library for Google APIs (used for Google Sign-In and potentially Google Sheets integration).
*   **Puppeteer:** Headless Chrome Node.js API, likely used for generating PDF invoices or reports.
*   **Socket.io:** For enabling real-time, bidirectional communication between web clients and servers.
*   **Kuroshiro:** Japanese language library for converting Kanji/Hiragana to Romaji, indicating Japanese language support.
*   **xml2js & soap:** Libraries for XML parsing and SOAP client requests, used for Online Travel Agency (OTA) integration.

## Setup and Installation

1.  **Navigate to the API directory:**
    ```bash
    cd api
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Database Setup:**
    *   Ensure you have a running PostgreSQL instance.
    *   Create a database for the application.
    *   Execute the necessary SQL scripts located in the `api` directory to set up the schema:
        *   `sql.sql` (main schema)
        *   `sql_logs.sql` (logging tables)
        *   `sql_triggers.sql` (database triggers)
4.  **Environment Variables:**
    *   Create a `.env` file in the `api` directory (i.e., `api/.env`).
    *   Add the following environment variables, adjusting values as necessary:
        *   `DB_USER`: PostgreSQL username
        *   `DB_HOST`: PostgreSQL host (e.g., `localhost`)
        *   `DB_DATABASE`: PostgreSQL database name
        *   `DB_PASSWORD`: PostgreSQL password
        *   `DB_PORT`: PostgreSQL port (e.g., `5432`)
        *   `JWT_SECRET`: Secret key for signing JWTs
        *   `REFRESH_TOKEN_SECRET`: Secret key for refresh tokens
        *   `EMAIL_HOST`: SMTP server host for sending emails
        *   `EMAIL_PORT`: SMTP server port
        *   `EMAIL_USER`: SMTP username
        *   `EMAIL_PASS`: SMTP password
        *   `GOOGLE_CLIENT_ID`: Google OAuth Client ID
        *   `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
        *   `GOOGLE_REDIRECT_URI`: Google OAuth Redirect URI (e.g., `http://localhost:3000/api/auth/google/callback`)
        *   `REDIS_HOST`: Redis host (e.g., `localhost`)
        *   `REDIS_PORT`: Redis port (e.g., `6379`)
        *   `API_BASE_URL`: Base URL for the API (e.g., `http://localhost:3000/api`)
        *   `FRONTEND_URL`: Base URL for the frontend application (e.g., `http://localhost:5173`)
    *   Refer to `config/database.js`, `config/oauth.js`, `config/redis.js`, and `utils/emailUtils.js` for more context on these variables.
5.  **Start the server:**
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
*   **`/middleware`**: Contains custom middleware functions (e.g., for authentication).
*   **`/models`**: Defines the database schemas/models and includes logic for interacting with the database (data access layer).
*   **`/ota`**: Contains specific logic for Online Travel Agency (OTA) XML integration, including its own routes, controller, and model for handling XML-based communication.
*   **`/public`**: Static assets served by the API.
*   **`/routes`**: Defines the API endpoints and maps them to the appropriate controllers.
*   **`/services`**: Contains business logic that is shared across controllers (e.g., session management).
*   **`/utils`**: Utility functions used throughout the application (e.g., for email, JWT handling, Japanese text processing).

## Key Files

*   **`index.js`**: The main entry point for the API application.
*   **`package.json`**: Lists project dependencies and npm scripts.
*   **`LOGIN_WITH_GOOGLE.md`**: Provides specific instructions and details for setting up and using the "Login with Google" functionality.
*   **`sql.sql`, `sql_logs.sql`, `sql_triggers.sql`**: SQL scripts for database initialization.

## Online Travel Agency (OTA) Integration

The `api/ota/` directory is dedicated to integrating with Online Travel Agencies. This typically involves:
*   Receiving and processing XML requests from OTAs.
*   Sending XML responses back to OTAs.
*   Managing hotel inventory, rates, and availability through these XML interfaces.
The `xmlController.js`, `xmlModel.js`, and `xmlRoutes.js` files within this directory manage these operations.
