# Hotel Management System - Frontend

## Overview

This directory contains the frontend application for the Hotel Management System. It is a single-page application (SPA) built with Vue.js and Vite, providing a user interface for interacting with the backend API to manage hotel operations.

## Technologies Used

*   **Vue.js (v3):** A progressive JavaScript framework for building user interfaces.
*   **Vite:** A fast build tool and development server for modern web projects.
*   **PrimeVue:** A comprehensive UI component library for Vue.js.
*   **Tailwind CSS:** A utility-first CSS framework for rapid UI development.
*   **Axios:** A promise-based HTTP client for making API requests.
*   **Socket.io-client:** Client-side library for real-time communication with the backend Socket.io server.
*   **ECharts:** A powerful charting and visualization library.
*   **Papaparse:** A fast and powerful CSV (Comma Separated Values) parser, likely used for data import functionalities.
*   **Vue Router:** For client-side routing and navigation within the SPA.
*   **Pinia (assumed, based on `composables/use*Store.js`):** Vue Store pattern, likely used for state management. (If not Pinia, then Vuex or custom composables for state).

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
    *   Create a `.env` file in the `frontend` directory (i.e., `frontend/.env`).
    *   Add the following environment variable:
        *   `VITE_API_BASE_URL`: The base URL for the backend API (e.g., `http://localhost:3000/api`). This is used by Axios to make requests to the correct API endpoint.
    *   Example `frontend/.env` file:
        ```
        VITE_API_BASE_URL=http://localhost:3000/api
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
    This command compiles and minifies the application for deployment into the `dist` directory.

## Project Structure

The frontend codebase is organized as follows:

*   **`public/`**: Contains static assets that are copied directly to the root of the `dist` directory on build (e.g., `favicon.ico`, images).
*   **`src/`**: Contains the main source code for the Vue application.
    *   **`assets/`**: Static assets processed by Vite (e.g., images, global styles).
    *   **`components/`**: Reusable Vue components used across different pages.
    *   **`composables/`**: Vue Composition API functions, often used for state management (e.g., `useUserStore.js`, `useHotelStore.js`) and reusable logic. These suggest a Pinia-like pattern or custom state management.
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

*   User login, registration, and password management.
*   Dashboard for hotel overview.
*   Management of hotel settings, rooms, rates, and plans.
*   Reservation creation, modification, and tracking.
*   Client relationship management (CRM) features.
*   Billing and invoicing.
*   Reporting and data visualization (using ECharts).
*   User and role administration.
*   Data import capabilities (likely using Papaparse for CSVs).
```
