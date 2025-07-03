# Frontend Folder Structure and Code Organization Recommendations

This document outlines recommendations for improving the frontend folder structure, state management, component organization, asset handling, and testing strategy for the Vue.js application.

## 1. State Management

**Current Setup:**
*   No external state library (Pinia/Vuex).
*   State is managed via custom composable "stores" (e.g., `useUserStore.js`) using module-level Vue refs for shared reactive state.
*   These custom stores currently make direct API calls using `fetch` and manage auth tokens individually.

**Recommendations:**

*   **A. Integrate `useApi.js` into Custom Stores (High Priority):**
    *   Refactor all custom store composables (e.g., `useUserStore.js`, `useCRMStore.js`) to utilize the existing `frontend/src/composables/useApi.js` for API interactions.
    *   **Benefits:**
        *   Centralized API request logic.
        *   Consistent `isLoading` and `error` reactive state management per request.
        *   Uniform `AuthError` handling (automatic toast notifications, redirection to login).
        *   Reduces code duplication and improves adherence to the DRY (Don't Repeat Yourself) principle.

*   **B. Consider Pinia for Long-Term Growth (Strategic):**
    *   For applications expected to grow significantly in complexity or team size, evaluate migrating to Pinia.
    *   **Benefits:**
        *   Official Vue.js state management library with strong ecosystem support.
        *   Excellent Vue DevTools integration for easier debugging.
        *   Clear, established patterns for defining stores, state, getters, and actions.
        *   Improved modularity and testability of state logic.

## 2. Component Organization

**Current Setup:**
*   Global reusable components directory `frontend/src/components/` is underutilized (only contains `WorkInProgress.vue`).
*   Feature-specific components are co-located within `pages/FeatureName/components/` (e.g., `frontend/src/pages/CRM/components/`).

**Recommendations:**

*   **A. Develop the Global `frontend/src/components/` Directory:**
    *   Actively identify and extract generic, reusable components from feature-specific folders or new components into this directory.
    *   Create subdirectories for clarity:
        *   `frontend/src/components/ui/`: For generic, presentational UI elements (e.g., custom buttons not from PrimeVue, modals, specialized card layouts, form input wrappers).
        *   `frontend/src/components/layouts/`: For components defining page structures or common layout sections (e.g., `SidebarLayout.vue`, `PageWrapper.vue`).
        *   `frontend/src/components/shared/`: For components encapsulating shared business logic or data display elements used across multiple features (e.g., a `UserSelectorDropdown.vue`, `AddressDisplayCard.vue`).

*   **B. Review and Refactor Feature-Specific Components:**
    *   Continue using `pages/FeatureName/components/` for components tightly coupled to that specific feature.
    *   Regularly review these components to identify candidates for promotion to the global `src/components/` subdirectories if they prove to be more broadly applicable.

## 3. Styling Strategy

**Current Setup:**
*   Tailwind CSS is the primary utility-first styling framework.
*   PrimeVue is used for UI components, with configuration for Tailwind compatibility.
*   A global `frontend/src/style.css` handles font imports, base HTML element styling (e.g., `:root`, `body`), default styles for some elements (`h1`, `button`), and a few custom classes (e.g., `.card`).

**Recommendations:**

*   **A. Prefer Tailwind for Element Styling:**
    *   For styling common HTML elements, favor using Tailwind utility classes directly in components or using `@apply` within Vue component `<style>` tags (preferably scoped) over defining extensive global styles in `style.css`.
    *   The existing global `button` style is a reasonable baseline, but variations should be achieved with Tailwind classes or component-specific styles to maintain Tailwind's utility-first approach.

*   **B. Consider a Tailwind Plugin for Custom Base Styles/Themes:**
    *   If more complex base styling or custom component themes are needed that should align with Tailwind's design tokens (e.g., spacing, colors), consider creating a custom Tailwind plugin.

## 4. Asset Management

**Current Setup:**
*   `frontend/public/` is used for the favicon (`logo-favi.png` referenced in `index.html`) and other static assets (`crm.svg`, `house.svg`, `logo.jpg`).
*   `frontend/src/assets/` contains `logo-favi.png` (potentially a duplicate or different version), `logo-simple.png`, and `vue.svg`.
*   `api/public/` also contains copies of `crm.svg` and `house.svg`.

**Recommendations:**

*   **A. Clarify `frontend/src/assets/logo-favi.png` Usage:**
    *   Investigate if `frontend/src/assets/logo-favi.png` is actively used in any Vue components.
    *   If it's identical to `frontend/public/logo-favi.png` and used in components, this is acceptable (though one source could be preferred).
    *   If it's unused, remove it from `frontend/src/assets/`.
    *   If it's a different image (e.g., a higher-resolution version for in-app display), consider renaming it for clarity (e.g., `logo-app.png`).

*   **B. Consolidate Frontend Assets & Decouple from API Assets:**
    *   Ensure all static assets primarily used by the frontend (like `crm.svg`, `house.svg`) are sourced from within the `frontend` project:
        *   Use `frontend/src/assets/` for assets that should be processed by Vite (e.g., get hashed filenames for caching, be optimized, or inlined). These are typically imported into JS/Vue files.
        *   Use `frontend/public/` for assets that must remain untouched, have fixed paths, or are directly linked in `index.html`.
    *   Avoid the frontend directly referencing assets from the `api/public/` directory. If the API also needs these assets, it can keep its copies, but the frontend should rely on its own versions for better decoupling and independent updates.

## 5. Automated Testing (High Priority)

**Current Setup:**
*   No evidence of an automated testing framework (unit, integration, or E2E) or test files for the frontend application.

**Recommendations:**

*   **A. Implement Unit Testing:**
    *   Adopt **Vitest** as the testing framework (integrates well with Vite).
    *   Use **Vue Test Utils** for mounting and interacting with Vue components.
    *   **Prioritize testing:**
        *   Utility functions (`frontend/src/utils/`).
        *   Composables (`frontend/src/composables/`), especially custom stores and `useApi.js`.
        *   Individual Vue components (props, events, slots, conditional rendering).
    *   **Structure:** Co-locate test files with the code they test (e.g., `MyComponent.spec.js` next to `MyComponent.vue`) or use a central `frontend/src/tests/unit/` directory.

*   **B. Implement Component Interaction/Integration Testing:**
    *   Test how components interact with each other and with stores/composables.

*   **C. Consider End-to-End (E2E) Testing:**
    *   For testing critical user flows through the application, evaluate tools like **Cypress** or **Playwright**.
    *   Cover paths like login, main feature operations, and form submissions.

*   **Benefits of Testing:**
    *   Significantly improves code quality and reliability.
    *   Facilitates safer refactoring and reduces the risk of regressions.
    *   Acts as living documentation for how components and functions are intended to behave.

## 6. General Documentation

*   Consider adding a `README.md` within `frontend/src/` or key subdirectories (e.g., `composables/`, `components/`) to document:
    *   The overall architecture and reasoning behind structural choices.
    *   Conventions for creating new components, stores, or utilities.
    *   Instructions for running tests (once implemented).
    *   This helps with team onboarding and long-term maintainability.

By addressing these areas, the frontend codebase can become more robust, maintainable, scalable, and easier for developers to work with.
