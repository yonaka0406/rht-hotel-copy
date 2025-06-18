# Hotel Management System - Frontend

## Overview

This directory contains the frontend application for the Hotel Management System. It is a single-page application (SPA) built with Vue.js and Vite, providing a user interface for interacting with the backend API to manage hotel operations.

## Technologies Used

*   **Vue.js (v3):** A progressive JavaScript framework for building user interfaces.
*   **Vite:** A fast build tool and development server for modern web projects.
*   **PrimeVue:** A comprehensive UI component library for Vue.js.
*   **@primeuix/themes:** Theming library for PrimeVue, ensuring a consistent look and feel.
*   **primeicons:** Icon library specifically designed for PrimeVue components.
*   **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
*   **PrimeVue & Tailwind CSS Interplay:** PrimeVue is used as the primary component library, providing a rich set of pre-built UI elements. Tailwind CSS is utilized for utility-first styling, allowing for rapid customization and fine-tuning of the appearance of components and layouts.
*   **Axios:** A promise-based HTTP client for making API requests.
*   **Socket.io-client:** Client-side library for real-time communication with the backend Socket.io server.
*   **ECharts & vue-echarts:** A powerful charting and visualization library, along with its Vue integration component.
*   **Papaparse:** A fast and powerful CSV (Comma Separated Values) parser, used for client-side data import.
*   **Vue Router:** For client-side routing and navigation within the SPA.
*   **uuid:** For generating unique identifiers (UUIDs) on the client-side.
*   **State Management (Pinia):** The application uses Pinia for state management, as indicated by the composable store structure (e.g., `composables/useUserStore.js`).

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
    *   **`composables/`**: Vue Composition API functions. This is where Pinia stores (e.g., `useUserStore.js`, `useHotelStore.js`) are typically defined, providing a centralized state management solution. Also used for other reusable logic.
    *   **`pages/`**: Vue components that represent different pages or views of the application, organized by feature (e.g., `Admin`, `CRM`, `MainPage`, `Reporting`).
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
```
