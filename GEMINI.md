# Gemini Context: RHT Hotel Management System

This document provides essential context for the Gemini AI assistant to effectively understand and contribute to this project. It has been populated by reviewing the project's root, API, and frontend README files, as well as the `instructions.md` development guidelines.

## 1. Project Overview

RHT Hotel is a comprehensive hotel property management system designed to streamline hotel operations. It follows a three-tier architecture pattern with a clear separation of concerns between the presentation (Vue.js frontend), application (Node.js API), and data (PostgreSQL) layers.

## 2. Key Features

- **Reservation & Client Management (CRM):** Full booking lifecycle and customer management.
- **Waitlist System:** Manages guest waitlists with token-based confirmation.
- **Billing & Invoicing:** Flexible pricing, plans, and automated invoice generation (PDF via Puppeteer).
- **Reporting & Analytics:** Data visualization using ECharts.
- **User Management:** Role-based access control (RBAC) with JWT authentication and Google OAuth.
- **OTA Integration:** XML/SOAP communication with the TL-Lincoln channel manager.
- **Real-time Updates:** Live notifications via Socket.io.
- **Japanese Language Support:** Text processing and conversion using Kuroshiro & wanakana.

## 3. Technology Stack

- **Backend (API):
  - **Runtime:** Node.js / Express.js
  - **Database:** PostgreSQL
  - **Caching/Sessions:** Redis, `connect-pg-simple`
  - **Authentication:** `jsonwebtoken` (JWT), `bcryptjs`, `google-auth-library`
  - **File Handling:** `multer` (uploads), `puppeteer` (PDFs), `exceljs` (Excel/CSV)
  - **API Comms:** `socket.io`, `xml2js`, `soap`
  - **Utilities:** `winston` (logging), `nodemailer` (email), `pg-format`, `sharp`

- **Frontend (Client):
  - **Framework:** Vue.js 3 with Composition API
  - **UI Library:** PrimeVue (`^4.3.2`) with `@primeuix/themes`
  - **Styling:** Tailwind CSS (`^4.1.8`)
  - **Build Tool:** Vite
  - **State Management:** Vue Composables (e.g., `useUserStore.js`)
  - **HTTP Client:** Axios
  - **Charting:** ECharts (`^5.6.0`) with `vue-echarts`
  - **Utilities:** `socket.io-client`, `papaparse` (CSV parsing)

- **DevOps & Infrastructure:**
  - **Containerization:** Docker, Docker Compose
  - **Process Management:** PM2 (production), Nodemon (development)

## 4. Development Guidelines & Conventions

*This is a summary of `instructions.md`. Refer to that file for full details.*

- **UI Language:** All user-facing text in the frontend **must be in Japanese**.
- **Backend `requestId`:** The `requestId` from `req.requestId` **must** be passed as the first argument to all model functions to select the correct database pool (e.g., `model.fetchData(req.requestId, ...)`).
- **Input Validation:** Use the helper functions in `api/utils/validationUtils.js` (e.g., `validateNumericParam`, `validateUuidParam`) in controllers for consistent request validation.
- **Form Layout:** Use Tailwind CSS grid (`grid grid-cols-12`) for form layouts. Use PrimeVue's `<FloatLabel>` for inputs and ensure components use `class="w-full"` or the `fluid` prop to fill grid cells.
- **Component Selection:** Use `<Select>` for dropdowns and `<DatePicker>` for dates (not `<Dropdown>` or `<Calendar>`).
- **Confirmation Dialogs:** Use `useConfirm()` with `acceptProps` and `rejectProps` for styling all confirmation dialogs.
- **Client Name Display:** Display client names in the order of `name_kanji`, `name_kana`, `name` (using `COALESCE` in SQL).
- **Read-Only UI:** Users without `crud_ok` permissions will see a red '閲覧者' tag in the UI and will be blocked from creating reservations.

## 5. Setup & Environment

### Backend (`api/.env`)
Create an `api/.env` file with the following variables:

- **Database:** `DB_USER`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD`, `DB_PORT`
- **JWT:** `JWT_SECRET`, `REFRESH_TOKEN_SECRET`
- **Session:** `SESSION_SECRET`
- **Email:** `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`
- **Google OAuth:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- **Redis:** `REDIS_HOST`, `REDIS_PORT`
- **URLs:** `FRONTEND_URL` (for CORS)
- **TL-Lincoln OTA:** `XML_SYSTEM_ID`, `XML_REQUEST_URL`

### Frontend (`frontend/.env`)
Create a `frontend/.env` file with the following variables:

- `VITE_API_BASE_URL`: Base URL for the backend API (e.g., `http://localhost:3000/api`).
- `VITE_SOCKET_URL`: URL for the Socket.io server (e.g., `http://localhost:3000`).

## 6. Running the Application

### 1. Database Setup
- Ensure PostgreSQL is running.
- Execute the migration scripts in `api/migrations/` **in numerical order** (001 to 014).

### 2. Backend
```bash
cd api
npm install
npm run dev # For development with Nodemon
# npm start # For production
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## 7. Available Scripts

- **`api/`**
  - `npm run dev`: Starts the backend with Nodemon for auto-restarts.
  - `npm start`: Starts the backend for production.
- **`frontend/`**
  - `npm run dev`: Starts the Vite development server.
  - `npm run build`: Builds the frontend for production into the `/dist` folder.
  - `npm test`: Runs frontend tests with Vitest.
- **`root/`**
  - `npm run validate-docs`: Runs all documentation validation scripts.

## 8. Database Access

To connect to the PostgreSQL database container using `docker-compose`, you can use the `psql` command.

### Connecting as the `postgres` superuser

The `postgres` user is the default superuser. You can connect to the `wehub` database using:

```bash
docker-compose exec db psql -U postgres -d wehub
```

### Connecting as the `rhtsys_user` application user

The `rhtsys_user` is the application-specific user created during database initialization. You can connect to the `wehub` database using:

```bash
docker-compose exec db psql -U rhtsys_user -d wehub
```

## 9. Database Query Optimization Workflow

A common workflow for optimizing database queries involves the following steps:

1.  **Connect to the Docker DB Container:** Use `docker-compose exec db psql -U postgres -d wehub` (or `rhtsys_user`) to connect to the PostgreSQL database running in the Docker container.
2.  **Run `EXPLAIN ANALYZE`:** Execute the SQL query with `EXPLAIN ANALYZE` prepended to understand its execution plan and identify performance bottlenecks.
3.  **Analyze and Optimize:** Based on the `EXPLAIN ANALYZE` output, identify areas for optimization (e.g., missing indexes, inefficient joins, filter pushdown). Modify the query or database schema as needed.
4.  **Re-run `EXPLAIN ANALYZE`:** After making changes, run `EXPLAIN ANALYZE` again on the modified query to verify the impact of the optimizations.
5.  **Iterate:** Repeat steps 3 and 4 until the desired performance is achieved.
6.  **Consolidate Indexes into Migration File:** After identifying and creating new indexes for optimization, consolidate all `CREATE INDEX` statements into a new, numbered SQL migration file (e.g., `api/migrations/015_new_indexes.sql`). This ensures that all index changes are version-controlled and applied consistently across environments.

## 10. User Assistance

*   **Providing IDs:** If the model requires example IDs (e.g., UUIDs for database queries), the user can provide them upon request.

## 11. Frontend Development Guidelines

To ensure the frontend codebase remains scalable and maintainable, follow these conventions.

### Component & Page Structure

Adopt a feature-based approach for organizing pages and their components. For any page that requires its own set of child components, create a dedicated directory.

-   **Global Components (`/src/components`):** This directory is for generic components that are reused across multiple, unrelated pages (e.g., `AppButton.vue`, `ConfirmationDialog.vue`).
-   **Page-Specific Components (`/src/pages/[PageName]/components`):** Create a directory for each page. Inside, create a `components` subdirectory for components that are *only* used by that page.

**Example Structure:**
```
frontend/src/
├── components/      # Shared/Global components
│   └── AppHeader.vue
└── pages/
    └── Reservations/
        ├── components/  # Components ONLY for Reservations
        │   └── ReservationList.vue
        └── ReservationsPage.vue
```

### File Size

-   **Aim for conciseness:** Strive to keep most files, especially Vue components, **under 300 lines**.
-   **Refactor when necessary:** A file exceeding 400-500 lines is a strong indicator that it has too many responsibilities and should be refactored.
    -   **Component Splitting:** Break large templates into smaller, logical child components.
    -   **Composable Extraction:** Move complex business logic from `<script setup>` into reusable composable functions (e.g., `src/composables/useReservations.js`).

**Note:** If you encounter issues with password prompts, ensure your `api/.env` file (or environment variables) correctly sets `POSTGRES_PASSWORD`. By default, it's `password`.