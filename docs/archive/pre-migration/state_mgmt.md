# Pinia State Management Migration Plan

## 1. Introduction

This document outlines the strategy and steps for migrating the frontend state management from the current Vue Composition API-based composable stores to Pinia. Pinia is the official state management library for Vue.js and offers several advantages for managing global application state.

## 2. Background and Rationale

The current state management system relies on custom composable functions (e.g., `useUserStore.js`, `useHotelStore.js`) located in `frontend/src/composables/`. Each composable typically exports reactive variables (`ref`, `computed`) and functions to manage a specific domain of the application's state.

While this approach leverages Vue's Composition API, migrating to Pinia will provide:

- **Centralized State:** A single source of truth for global state, making it easier to track and manage.
- **Devtools Integration:** Superior Vue Devtools integration for state inspection, time-travel debugging, and easier debugging.
- **Modularity and Organization:** Clearer separation of concerns by defining stores as independent modules. Pinia's structure is intuitive and well-documented.
- **Type Safety:** Enhanced TypeScript support for better autocompletion and compile-time error checking.
- **Plugin System:** Ability to extend Pinia's functionality with plugins (e.g., for local storage synchronization, advanced logging).
- **Server-Side Rendering (SSR) Support:** Robust support for SSR scenarios.
- **Simplified Store Usage:** Consistent API for accessing and modifying state across components.
- **Testability:** Pinia stores are generally easier to test in isolation.

## 3. Migration Strategy

The migration will be performed incrementally to minimize disruption and allow for thorough testing at each stage. The "Setup Store" syntax of Pinia will be used, as it aligns closely with the existing Composition API patterns, making the transition smoother.

**Key Steps:**

1.  **Installation:** Add Pinia as a project dependency.
2.  **Initialization:** Create a Pinia instance and provide it to the Vue application.
3.  **Store Creation:**
    *   Create a new `frontend/src/stores/` directory to house all Pinia stores.
    *   For each existing composable store, create a corresponding Pinia store file (e.g., `frontend/src/composables/useUserStore.js` will be migrated to `frontend/src/stores/userStore.js`).
4.  **Migration of Individual Stores:**
    *   Transfer the state logic (reactive variables using `ref`), computed properties (getters using `computed`), and functions (actions) from the old composable store to the new Pinia store.
    *   Ensure all reactive properties are correctly defined and returned from the Pinia store's setup function.
5.  **Component Refactoring:**
    *   Update components that previously used the composable store to import and use the new Pinia store.
    *   Utilize `storeToRefs` from Pinia where necessary to maintain reactivity when destructuring state properties.
6.  **Deletion of Old Stores:** Once a store is fully migrated and verified, delete the corresponding old composable store file from `frontend/src/composables/`.
7.  **Testing:** Thoroughly test the application after each store migration and comprehensively at the end of the entire process.

## 4. Detailed Migration Plan

The following steps will be executed:

1.  **Install Pinia:**
    ```bash
    cd frontend
    npm install pinia
    ```

2.  **Create `STATE_MGMT.md`:**
    - This document itself.

3.  **Initialize Pinia:**
    - In `frontend/src/main.js`:
        ```javascript
        import { createApp } from 'vue';
        import { createPinia } from 'pinia'; // Import Pinia
        import App from './App.vue';
        // ... other imports (router, etc.)

        const app = createApp(App);
        const pinia = createPinia(); // Create Pinia instance

        app.use(pinia); // Use Pinia
        // app.use(router); // etc.
        app.mount('#app');
        ```

4.  **Migrate `useUserStore` to a Pinia Store:**
    - Create `frontend/src/stores/userStore.js`.
    - Define the store:
        ```javascript
        import { ref, computed } from 'vue';
        import { defineStore } from 'pinia';

        export const useUserStore = defineStore('user', () => {
            // State from old useUserStore
            const users = ref([]);
            const logged_user = ref([]);

            // Actions from old useUserStore
            const fetchUsers = async () => { /* ... implementation ... */ };
            const fetchUser = async () => { /* ... implementation ... */ };
            const createUserCalendar = async () => { /* ... implementation ... */ };
            const triggerCalendarSyncStore = async () => { /* ... implementation ... */ };

            return {
                users,
                logged_user,
                fetchUsers,
                fetchUser,
                createUserCalendar,
                triggerCalendarSyncStore,
            };
        });
        ```
    - Update components using `useUserStore` to import from `frontend/src/stores/userStore.js`.

5.  **Migrate `useHotelStore` to a Pinia Store:**
    - Create `frontend/src/stores/hotelStore.js`.
    - Define the store similarly, moving state, computed properties (getters), and actions from `frontend/src/composables/useHotelStore.js`.
        ```javascript
        import { ref, computed } from 'vue';
        import { defineStore } from 'pinia';

        export const useHotelStore = defineStore('hotel', () => {
            // State
            const hotels = ref([]);
            const selectedHotel = ref(null);
            const selectedHotelId = ref(null);
            // ... other state properties

            // Getters (Computed)
            const selectedHotelRooms = computed(() => { /* ... */ });

            // Actions
            const fetchHotels = async () => { /* ... */ };
            const setHotelId = (id) => { /* ... */ };
            // ... other actions

            return {
                hotels,
                selectedHotel,
                selectedHotelId,
                selectedHotelRooms,
                // ... other state, getters, actions
                fetchHotels,
                setHotelId,
            };
        });
        ```
    - Update components using `useHotelStore`.

6.  **Refactor a Component to Use Pinia Store:**
    - Select a component (e.g., one using `useUserStore`).
    - Example component update:
        ```vue
        <script setup>
        import { storeToRefs } from 'pinia';
        import { useUserStore } from '@/stores/userStore'; // New path

        const userStore = useUserStore();
        const { logged_user, users } = storeToRefs(userStore); // For reactive state
        const { fetchUser } = userStore; // Actions can be destructured directly

        // ... component logic using logged_user, users, fetchUser ...
        </script>
        ```

7.  **Gradual Migration of Remaining Stores:**
    - Systematically migrate each store from `frontend/src/composables/` to `frontend/src/stores/`:
        - `useApi.js` (if it contains global state, otherwise assess if it needs to be a store)
        - `useBillingStore.js` -> `billingStore.js`
        - `useCRMStore.js` -> `crmStore.js`
        - `useClientStore.js` -> `clientStore.js`
        - `useImportStore.js` -> `importStore.js`
        - `useLogStore.js` -> `logStore.js`
        - `useMetricsStore.js` -> `metricsStore.js`
        - `usePlansStore.js` -> `plansStore.js`
        - `useProjectStore.js` -> `projectStore.js`
        - `useReportStore.js` -> `reportStore.js`
        - `useReservationStore.js` -> `reservationStore.js`
        - `useSettingsStore.js` -> `settingsStore.js`
        - `useXMLStore.js` -> `xmlStore.js`
    - For each migration:
        - Create the Pinia store file.
        - Transfer logic.
        - Update consuming components.
        - Delete the old composable file.

8.  **Testing and Verification:**
    - After migrating all stores, conduct thorough end-to-end testing of the application.
    - Verify:
        - State reactivity is preserved.
        - Data fetching and updates work as expected.
        - Actions correctly modify the state.
        - Getters (computed properties) compute values correctly.
        - No console errors related to state management.
        - Vue Devtools correctly display Pinia stores and their state.

9.  **Update Documentation (Optional but Recommended):**
    - Update any internal developer documentation or `README` files that refer to the old state management system.
    - Briefly explain how to use Pinia stores within the project.

## 5. Potential Challenges and Mitigation

-   **Reactivity Issues:** Ensure `storeToRefs` is used when destructuring state properties in components to maintain reactivity. Actions and getters typically don't need `storeToRefs`.
-   **Circular Dependencies:** While Pinia handles store composition well, be mindful of potential circular dependencies if stores import each other extensively. This is less common with Setup Stores.
-   **Testing Existing Tests:** If unit/integration tests exist for components that use the old stores, they will need to be updated to mock or provide Pinia stores.
-   **Complexity of `useApi.js`:** The `useApi.js` composable might require careful consideration. If it's purely a utility for API calls without managing global state, it might not need to become a Pinia store. If it does manage global state (e.g., loading indicators, global error messages), then it should be migrated.

## 6. Conclusion

Migrating to Pinia will modernize the state management in the frontend application, providing a more robust, maintainable, and developer-friendly solution. The incremental approach will help manage complexity and ensure a stable transition.
