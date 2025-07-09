# Hotel Management System - Frontend

## Overview

This directory contains the frontend application for the Hotel Management System. It is a single-page application (SPA) built with Vue.js and Vite, providing a user interface for interacting with the backend API to manage hotel operations.

## Technologies Used

*   **Vue.js (v3):** A progressive JavaScript framework for building user interfaces.
*   **Vite:** A fast build tool and development server for modern web projects.
*   **PrimeVue (v4.3.2+):** A comprehensive UI component library for Vue.js.
*   **@primeuix/themes:** Theming library for PrimeVue, ensuring a consistent look and feel.
*   **primeicons:** Icon library specifically designed for PrimeVue components.
*   **Tailwind CSS (v4.1.8+):** A utility-first CSS framework for rapid UI development.
*   **PrimeVue & Tailwind CSS Interplay:** PrimeVue is used as the primary component library, providing a rich set of pre-built UI elements. Tailwind CSS is utilized for utility-first styling, allowing for rapid customization and fine-tuning of the appearance of components and layouts.
*   **Axios:** A promise-based HTTP client for making API requests.
*   **Socket.io-client:** Client-side library for real-time communication with the backend Socket.io server.
*   **ECharts (v5.6.0+) & vue-echarts (v7.0.3+):** A powerful charting and visualization library, along with its Vue integration component.
*   **Papaparse:** A fast and powerful CSV (Comma Separated Values) parser, used for client-side data import.
*   **Vue Router:** For client-side routing and navigation within the SPA.
*   **uuid:** For generating unique identifiers (UUIDs) on the client-side.
*   **State Management:** Utilizes Vue's built-in reactivity and Composition API features (custom composable stores like `composables/useUserStore.js`) for managing application state.

## Setup and Installation

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Variables:**
    *   Create a `.env` file in the `frontend` directory (i.e., `frontend/.env`) by copying `frontend/.env.example` if it exists, or creating it manually.
    *   These variables are crucial for connecting the frontend to the backend services. They are grouped by their purpose:

        **API and Socket URLs:**
        *   `VITE_API_BASE_URL`: The base URL for the backend API (e.g., `http://localhost:3000/api`). This is used by Axios to make requests to the correct API endpoints.
        *   `VITE_SOCKET_URL`: The URL for the backend Socket.io server (e.g., `http://localhost:3000`). This is used by the Socket.io client to establish a real-time connection. It might be the same as the API's base URL (excluding `/api`) if served from the same host and port, or a different URL if the socket server is separate.
    *   Example `frontend/.env` file:
        ```dotenv
        VITE_API_BASE_URL=http://localhost:3000/api
        VITE_SOCKET_URL=http://localhost:3000
        ```
4.  **Start the development server:**
    ```bash
    npm run dev
    ```
    This will typically start the application on `http://localhost:5173`.
5.  **Build for production:**
    ```bash
    npm run build
    ```
    This command compiles and minifies the application into the `dist` directory. This `dist` directory contains static assets (HTML, CSS, JavaScript) that can be deployed to any static web hosting service (like Netlify, Vercel, GitHub Pages) or served by a backend server (e.g., Node.js/Express, Apache, Nginx).

## Project Structure

The frontend codebase is organized as follows:

*   **`public/`**: Contains static assets that are copied directly to the root of the `dist` directory on build (e.g., `favicon.ico`, images).
*   **`src/`**: Contains the main source code for the Vue application.
    *   **`assets/`**: Static assets processed by Vite (e.g., images, global styles).
    *   **`components/`**: Reusable Vue components used across different pages.
    *   **`composables/`**: Vue Composition API functions, used for state management (e.g., `useUserStore.js`, `useHotelStore.js`) and reusable logic.
        *   **`useWaitlistStore.js`** ✅ **NEW** - State management for waitlist functionality including entry creation, management, and notifications.
    *   **`pages/`**: Vue components that represent different pages or views of the application, organized by feature (e.g., `Admin`, `CRM`, `MainPage`, `Reporting`).
        *   **`Admin/ManageWaitList.vue`** ✅ **NEW** - Comprehensive waitlist management interface with filtering, pagination, and bulk operations.
        *   **`MainPage/components/Dialogs/WaitlistDialog.vue`** ✅ **NEW** - Modal dialog for creating and editing waitlist entries with client selection and preference settings.
        *   **`MainPage/components/WaitlistDisplayModal.vue`** ✅ **NEW** - Modal for displaying waitlist entries with real-time vacancy checking and action buttons.
    *   **`components/ReservationClientConfirmation.vue`** ✅ **NEW** - Public-facing confirmation page for waitlist token-based reservations with full reservation creation flow.
    *   **`router/`**: Contains the Vue Router configuration (`index.js`), defining the application's routes.
    *   **`App.vue`**: The root Vue component of the application.
    *   **`main.js`**: The entry point of the application, where Vue is initialized, along with plugins and the root component.
    *   **`style.css`**: Global stylesheets.
*   **`index.html`**: The main HTML file that serves as the entry point for the SPA.
*   **`vite.config.js`**: Configuration file for Vite.
*   **`package.json`**: Lists project dependencies and npm scripts for the frontend.
*   **`postcss.config.js`**: Configuration for PostCSS, often used with Tailwind CSS.

## Key Features Implemented by Frontend

This frontend application enables users to interact with the following core features of the Hotel Management System:

*   **User Authentication:** Secure user login, registration, password management, and potentially Google Sign-In integration.
*   **Dashboard:** An overview of key hotel metrics and activities.
*   **Hotel Configuration:** Management of hotel-specific details, settings, room types, rate plans, and addons.
*   **Reservation Management:** Tools for creating, viewing, modifying, and canceling guest reservations, possibly including a calendar view.
*   **Client Relationship Management (CRM):** Functionalities for managing guest profiles, communication history, and preferences.
*   **Billing and Invoicing:** Generation and management of guest invoices based on stays, plans, and addons.
*   **Reporting & Analytics:** Visualization of hotel operational data, occupancy, revenue, and guest statistics using charts (via ECharts).
*   **User Administration:** Management of system user accounts, roles, and permissions (for admin users).
*   **Waitlist Management:** ✅ **IMPLEMENTED** - Comprehensive waitlist system including:
    *   **Entry Creation**: Modal dialog for adding guests to waitlist with preferences (smoking/non-smoking, room types, communication preferences)
    *   **Management Interface**: Admin panel for viewing, filtering, and managing waitlist entries
    *   **Real-time Vacancy Checking**: Automatic checking of room availability for waitlist entries
    *   **Manual Notifications**: Staff can send availability notifications to waitlist guests
    *   **Status Management**: Track waitlist entry status (waiting, notified, confirmed, expired, cancelled)
    *   **Integration**: Seamless integration with existing reservation and client management systems
    *   **Public Confirmation**: Token-based public confirmation page for guests to confirm their waitlist reservations
    *   **Email Integration**: Waitlist-specific email templates and sending functionality
    *   **Background Jobs**: Basic expiration job for past check-in dates
    *   ❌ **NOT YET IMPLEMENTED**: Automatic notifications when rooms become available, real-time WebSocket updates, advanced filtering, bulk operations
*   **Data Import:** Client-side processing of imported data, such as CSV files for various records (using Papaparse), and potentially interaction with backend Excel import/export.
*   **Real-time Updates:** Display of live updates for relevant data through Socket.io (e.g., new reservations, notifications).

## OTA (TL-Lincoln) Integration Management

The frontend includes an administration section for managing the integration with the TL-Lincoln channel manager. This interface can typically be found under an "OTA Management" or similar section in the admin panel.

Key management features include:

*   **Transaction Monitoring:** Viewing a log of recent XML requests and responses exchanged with TL-Lincoln, including their status (success/error).
*   **Manual XML Operations:** Ability to select a hotel, fetch specific XML request templates, manually input or modify parameters, and send the XML request directly to TL-Lincoln. This is useful for testing or specific manual interventions.
*   **Master Data Management:**
    *   **Room Master (ネット室マスター):** Interface to view and manage the mapping of local hotel room types to TL-Lincoln's room type codes (interacts with `otaRoomMaster.vue`).
    *   **Plan Master (プランマスター):** Interface to view and manage the mapping of local rate plans to TL-Lincoln's plan codes (interacts with `otaPlanMaster.vue`).
*   **Inventory Adjustment (在庫調整):** Tools to manage and synchronize room inventory/availability with TL-Lincoln (interacts with `otaInventory.vue`).

These functionalities are primarily managed through the `ManageOTA.vue` page, which dynamically loads components like `otaRoomMaster.vue`, `otaPlanMaster.vue`, and `otaInventory.vue`. The `useXMLStore.js` composable handles state and communication with the backend API for these OTA operations.

## Waitlist System Frontend Implementation ✅ NEW

### Core Components

1. **WaitlistDialog.vue**: Modal dialog for creating waitlist entries
   * Client selection with autocomplete search
   * Hotel and room type selection
   * Date range picker with validation
   * Guest count and room count inputs
   * Smoking preference selection (any/smoking/non-smoking)
   * Communication preference (email/phone)
   * Contact information fields
   * Notes and additional preferences

2. **ManageWaitList.vue**: Admin interface for waitlist management
   * DataTable with server-side pagination and filtering
   * Status-based filtering and sorting
   * Date range filtering
   * Hotel-specific and multi-hotel views
   * Action buttons for each entry (view details, send notification, cancel)
   * Real-time vacancy checking
   * Export functionality

3. **WaitlistDisplayModal.vue**: Quick view modal for waitlist entries
   * Compact display of waitlist entries
   * Real-time vacancy status
   * Quick action buttons
   * Status badges with appropriate styling

4. **ReservationClientConfirmation.vue**: Public confirmation page for waitlist tokens
   * Token validation and expiry checking
   * Reservation details display
   * Real-time vacancy checking
   * Confirmation and cancellation actions
   * Success/error state handling
   * Auto-close functionality after cancellation

### State Management

The `useWaitlistStore.js` composable provides:
* Reactive state management for waitlist entries
* API communication for CRUD operations
* Loading and error state handling
* Pagination and filtering logic
* Toast notifications for user feedback

### Integration Points

* **Reservation Creation**: Waitlist dialog accessible from reservation creation when rooms are unavailable
* **Top Menu**: Waitlist badge showing count of actionable entries
* **Admin Panel**: Dedicated waitlist management section
* **Client Management**: Integration with existing client selection and creation

## UI Guidelines and Key Behaviors

This section outlines important UI/UX conventions and specific behaviors implemented in the frontend.

### Language
*   **Language:** All user-facing UI text *must* be in Japanese. This includes labels, button text, table headers, placeholders, titles, and all messages (confirmations, errors, notifications). This applies to all new and modified components.

### User Permissions Indicator
*   **User Permissions Indicator:** Users with read-only access (i.e., lacking full CRUD permissions, specifically if their `logged_user.value[0]?.permissions?.crud_ok` flag is `false`) will see a red '閲覧者' (Viewer) tag next to their name in the top menu bar. This provides a persistent visual cue of their restricted access. Additionally, such users will be prevented from accessing reservation creation functions (e.g., via calendar or direct navigation), typically receiving a 'Permission Error' notification.

### Charting
*   **Charting:** ECharts is the standard library for all data visualizations. Avoid using other charting libraries to maintain consistency.

### Key Component Usage
*   **Key Component Usage:** Refer to `instructions.md` for specific guidelines on using PrimeVue components like `<FloatLabel>`, `<Select>`, `<DatePicker>`, form layouts with Tailwind CSS, and dialogs.

### Waitlist-Specific UI Guidelines ✅ NEW
*   **Status Badges**: Use consistent color coding for waitlist status (info for waiting, success for notified/confirmed, danger for expired/cancelled)
*   **Vacancy Indicators**: Show real-time availability status with appropriate visual indicators
*   **Action Buttons**: Provide clear, contextual actions for each waitlist entry
*   **Form Validation**: Comprehensive validation for waitlist entry creation with user-friendly error messages
*   **Responsive Design**: Ensure waitlist interfaces work well on mobile devices

## Development Guidelines and Best Practices

For detailed coding guidelines, component usage conventions, specific patterns to follow (like `requestId` handling in the backend or UI component best practices in the frontend), and other essential best practices for this project, please consult the **`instructions.md`** file located in the root of this repository.

It is highly recommended that all developers familiarize themselves with the contents of `instructions.md` before starting new development tasks and refer back to it periodically.

## Waitlist Frontend Implementation Status

### ✅ Implemented Features:
1. **Entry Creation Dialog**: Complete modal for creating waitlist entries with all required fields
2. **Management Interface**: Full-featured admin panel for waitlist management
3. **State Management**: Comprehensive composable store for waitlist operations
4. **Real-time Updates**: Live vacancy checking and status updates
5. **Integration**: Seamless integration with existing reservation and client systems
6. **Responsive Design**: Mobile-friendly interfaces
7. **Accessibility**: Proper ARIA labels and keyboard navigation
8. **Error Handling**: User-friendly error messages and validation
9. **Public Confirmation Page**: Complete frontend page for token-based confirmations with reservation creation flow

### ❌ Not Yet Implemented Features:
1. **Real-time WebSocket Updates**: Live status changes via WebSocket
2. **Advanced Filtering**: More sophisticated search and filter options
3. **Bulk Operations**: Mass actions on multiple waitlist entries
4. **Export Enhancements**: Additional export formats and options

For comprehensive details about the waitlist implementation, including technical specifications and future roadmap, refer to the [Waitlist System Documentation](../README.md#waitlist-system-documentation) in the main README file.
```
