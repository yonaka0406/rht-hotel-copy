# 0. Project Dependencies & Key Libraries

This section lists the versions of key libraries used in this project. Being aware of these versions can help in understanding available features and potential version-specific considerations.

*   **PrimeVue:** `^4.3.2`
*   **Tailwind CSS:** `^4.1.8`
*   **ECharts:** `^5.6.0` (with `vue-echarts: ^7.0.3`)

# 1. Project Coding Guidelines & Best Practices

This document outlines common issues, preferred patterns, and best practices to follow when developing new features or refactoring existing code in this project. Please review these guidelines before starting a new task.

## 2. Backend (Node.js / JavaScript)

### 2.1. Module Export Order

*   **Issue:** Defining functions or variables *after* `module.exports` has been assigned an object. This leads to those functions/variables not being correctly exported.
*   **Guideline:** Always ensure that all functions and variables intended for export are defined **before** the `module.exports = { ... };` statement.
    *   Alternatively, if building the `exports` object incrementally, assign properties directly:
        ```javascript
        // Correct incremental assignment
        exports.myFunction = function() { /* ... */ };
        exports.anotherFunction = function() { /* ... */ };
        ```
    *   But for clarity, defining all then exporting in one block is often preferred:
        ```javascript
        // Preferred: Define all, then export
        const myFunction = () => { /* ... */ };
        const anotherFunction = () => { /* ... */ };

        module.exports = {
          myFunction,
          anotherFunction
        };
        ```

### 2.2. Database `requestId` Handling

*   **Context:** Our database connection pooling relies on a `requestId` for context (e.g., logging, specific pool selection).
*   **Issue:** Forgetting to pass `requestId` from controllers to model functions, or model functions not using the received `requestId` with `getPool()`. This results in "RequestId is required to select the correct database pool" errors.
*   **Guideline:**
    1.  **Controllers:** Ensure `req.requestId` (available in Express request objects via middleware) is passed as the **first argument** to any model function that interacts with the database.
        ```javascript
        // Example in a controller:
        // const data = await someModel.fetchData(req.requestId, otherParams);
        ```
    2.  **Models:** Ensure model functions accept `requestId` as their first parameter and use it when calling `getPool()`.
        ```javascript
        // Example in a model:
        // async function fetchData(requestId, otherParams) {
        //   const pool = getPool(requestId);
        //   // ... use pool ...
        // }
        ```

### 2.3. Database Client for Background Jobs

*   **Context:** When database operations are needed outside of the standard Express request-response cycle (e.g., in background jobs, cron tasks, or standalone scripts), the `requestId` used for context-aware pool selection (`getPool(requestId)`) is not available.
*   **Guideline:** For such scenarios, you must explicitly choose the database pool:
    *   For tasks intended to run against the **production** database, use `require('../config/database').getProdPool().connect()`.
    *   For tasks intended for the **development** database (e.g., local scripts, testing utilities), use `require('../config/database').getDevPool().connect()`.
*   **Example (`loyaltyTierJob.js`):**
    ```javascript
    // api/jobs/loyaltyTierJob.js
    const db = require('../config/database');
    // ...
    const assignLoyaltyTiers = async () => {
        console.log('Starting loyalty tier assignment job...');
        // Correctly get a client from the production pool
        const client = await db.getProdPool().connect();

        try {
            await client.query('BEGIN');
            // ... rest of the job logic
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in loyalty tier assignment job:', error);
        } finally {
            // ... ensure client.release() and other cleanup
            client.release();
        }
    };
    ```
*   **Important:** Always ensure the client is released (`client.release()`) in a `finally` block to return it to the pool.

### 2.4. Input Validation Utilities

To ensure robust and consistent input validation in API controllers, a set of helper functions is available in `api/utils/validationUtils.js`. These should be used at the beginning of controller functions to validate request parameters (from `req.params`, `req.query`, or `req.body`).

**Available Helper Functions:**

*   `validateNumericParam(idString, paramName)`:
    *   Validates if `idString` is a positive integer.
    *   `paramName` is used in the error message (e.g., 'Hotel ID', 'User ID').
    *   Throws an error if invalid, otherwise returns the numeric ID.
    *   Example: `const hotelId = validateNumericParam(req.params.hid, 'Hotel ID');`

*   `validateUuidParam(uuidString, paramName)`:
    *   Validates if `uuidString` is a valid UUID.
    *   Throws an error if invalid, otherwise returns the UUID string.
    *   Example: `const reservationId = validateUuidParam(req.params.id, 'Reservation ID');`

*   `validateDateStringParam(dateString, paramName)`:
    *   Validates if `dateString` is a valid date in 'YYYY-MM-DD' format and represents a real calendar date.
    *   Throws an error if invalid, otherwise returns the date string.
    *   Example: `const startDate = validateDateStringParam(req.query.sdate, 'Start Date');`

*   `validateNonEmptyStringParam(str, paramName)`:
    *   Validates if `str` is not undefined, null, empty, or only whitespace.
    *   Throws an error if invalid, otherwise returns the trimmed string.
    *   Example: `const clientName = validateNonEmptyStringParam(req.body.name, 'Client Name');`

*   `validateIntegerParam(intString, paramName)`:
    *   Validates if `intString` is a valid integer (positive, negative, or zero). Checks for empty/null/undefined, `isNaN`, and ensures the string strictly represents a whole integer (no decimals or trailing non-numeric characters).
    *   `paramName` is used in error messages.
    *   Throws an error if invalid, otherwise returns the numeric integer.
    *   Example: `const totalRooms = validateIntegerParam(req.body.total_rooms, 'Total Rooms');`

**Usage in Controllers:**

```javascript
const { validateNumericParam, validateDateStringParam } = require('../utils/validationUtils');

// Inside an async controller function:
// ...
let numericHotelId;
let validatedStartDate;
try {
  numericHotelId = validateNumericParam(req.params.hotelId, 'Hotel ID');
  validatedStartDate = validateDateStringParam(req.query.startDate, 'Start Date');
  // ... other validations
} catch (error) {
  // console.error(`Validation error: ${error.message}`); // Optional: for server logs
  return res.status(400).json({ error: error.message });
}

// Proceed with controller logic using numericHotelId, validatedStartDate, etc.
// ...
```
This approach centralizes validation logic, making controllers cleaner and ensuring consistent error responses (HTTP 400 for validation failures).


## 3. Frontend (Vue.js / PrimeVue)

### 3.1. UI Language

*   **Guideline:** All user-facing UI text must be in **Japanese**. This includes:
    *   Labels for input fields
    *   Button text
    *   Table headers
    *   Placeholder texts (where applicable)
    *   Titles and headings
    *   Confirmation messages, error messages, toast notifications
    *   Any static text content visible to the user.
    *   This guideline applies to all newly created UI components and any existing components undergoing modification.

### 3.2. Input Fields & Forms

*   **Component Choice:** Prefer using PrimeVue's `<FloatLabel>` for input fields over simple `<label>` tags where appropriate.
    *   **Structure:**
        ```html
        <FloatLabel class="mt-6"> <!-- Example with suggested margin -->
          <label for="inputId">入力ラベル (Japanese Label)</label>
          <InputText id="inputId" v-model="value" />
        </FloatLabel>
        ```
    *   Ensure the `id` on the input matches the `for` attribute on the label.
    *   Remove placeholder text from inputs like `<InputText>` if the floating label makes it redundant. Placeholders on components like `<AutoComplete>` or `<Select>` that indicate "no selection" or provide search hints can be retained.
    *   For numeric inputs like `<InputNumber>`, especially when used with `mode="currency"` and `<FloatLabel>`, relying on a textual `placeholder` prop might not provide the best user experience (as it can conflict with formatting or `FloatLabel`'s own behavior). Consider setting a default numeric value (e.g., `0`) instead, which will be displayed in the component's formatted style (e.g., "¥0").
*   **Spacing:** When using `<FloatLabel>`, apply a top margin for spacing, e.g., by wrapping it or applying a class like `mt-6` (Tailwind example for margin-top: 1.5rem) or equivalent if it improves layout, especially in dense forms. This should be applied contextually.
*   **Form Layout:** 
    *   Prefer using **Tailwind CSS's grid system** (e.g., `class="grid grid-cols-12 gap-4"` for the container, and `class="col-span-6"` for elements spanning half the width) for structuring forms. Avoid PrimeVue's `p-formgrid` and `p-field` layout classes, and prefer Tailwind utilities over PrimeFlex (e.g., `p-grid`, `p-col-*`) for new layouts or when refactoring. This approach provides more direct control and consistency with Tailwind's utility-first methodology.
    *   When placing PrimeVue input components (like `<InputText>`, `<DatePicker>`, etc.) within Tailwind CSS grid cells (e.g., a `col-span-X` element), ensure they expand to the full width of the cell. Use the `fluid` prop on the PrimeVue component if it's supported. If a component does not support the `fluid` prop (e.g., `<InputNumber>`), apply the Tailwind utility class `class="w-full"` directly to the component or a closely wrapping element to achieve the same effect.
*   **Reusable Add/Edit Forms in Dialogs:**
    *   For CRUD operations, consider creating a single form component (e.g., `ProjectFormDialog.vue`) that can handle both 'add' and 'edit' modes. This component is typically designed to be displayed within a PrimeVue `<Dialog>`.
    *   Use a prop (e.g., `projectToEdit: Object | null`) to pass existing data to the form for 'edit' mode. The component should then use a `watch` or `watchEffect` on this prop to pre-fill its internal form field refs when the dialog becomes visible for editing.
    *   The form should manage an internal `mode` (e.g., a `computed` property based on the presence of `projectToEdit.id`).
    *   The form's submit handler should differentiate based on this `mode` to call the appropriate 'create' or 'update' store action/API endpoint.
    *   The form component should `emit` events (e.g., `close-dialog`, `data-saved`) to communicate back to its parent (which manages the Dialog).

### 3.3. Charting Library

*   **Guideline:** For data visualization and charts, the preferred library is **ECharts**. Avoid using PrimeVue Charts to ensure consistency and leverage the comprehensive features of ECharts.

### 3.4. Template Comments

*   **Guideline:** Proper commenting in Vue templates is crucial for readability and avoiding syntax errors.
    *   Use standard HTML-style comments: `<!-- Your comment here -->`.
    *   Place comments on separate lines for clarity, especially for multi-line explanations or when commenting out blocks of code. Avoid appending comments to the end of a code line if it makes the line overly long or harder to read.
    *   Do **not** use non-standard comment syntax within the template body (e.g., `{/* ... */}` or `// ...` directly in HTML sections), as this can break template parsing and lead to unexpected behavior or errors.
    *   Ensure comments are not placed where they could interfere with HTML attribute parsing or component functionality (e.g., do not place them inside a `class="..."` attribute string).
    *   Incorrect comments can inadvertently break features like PrimeVue's `FloatLabel` or other component behaviors that rely on precise DOM structure or attribute interpretation.

### 3.5. Common PrimeVue Components

*   **Dropdown Component:** For dropdown selection lists, use PrimeVue's `<Select>` component (imported as `import Select from 'primevue/select';`). Note that `<Dropdown>` may be a name used in older PrimeVue versions or other libraries, but for this project (PrimeVue 4+), `<Select>` is the standard component.
*   **Date Component:** For date selection, use PrimeVue's `<DatePicker>` component (imported as `import DatePicker from 'primevue/datepicker';`). Avoid using the older `<Calendar>` component, as it is deprecated in PrimeVue v4+.
*   **`<Tag>`**: Use `<Tag>` components for displaying discrete pieces of information, keywords, or items from a list in a visually distinct and compact way (e.g., showing multiple selected hotel names from an array within a DataTable cell).

*   **`<SplitButton>`**: For DataTables or lists requiring multiple actions per row (like Edit, Delete, View Details), `<SplitButton>` offers a good UX by providing a primary action button and grouping secondary actions in a dropdown menu, saving space.

*   **`<Dialog>`**: Employ modal `<Dialog>` components for focused tasks like forms (e.g., for creating or editing data) or displaying detailed information without navigating away from the current page. Control visibility using `v-model:visible`.

*   **`ConfirmDialog` (via `useConfirm`)**: For destructive actions (e.g., deletion), always use PrimeVue's `useConfirm()` service along with the `<ConfirmDialog />` component to show styled confirmation prompts. This is preferable to the browser's native `confirm()` for better UX and consistency. Configure messages, headers, icons, and button labels as needed.
*   **DataTable Column Filtering (Frontend Setup with PrimeVue)**:
    *   To enable column-specific filtering in a lazy-loaded PrimeVue `<DataTable>`:
        1.  Initialize a `filters` ref in your script setup (e.g., `const filters = ref({ /* initial filter structure */ });`).
        2.  Bind this to the DataTable: `v-model:filters="filters"`.
        3.  Set `filterDisplay="menu"` (or `"row"`) on the `<DataTable>`.
        4.  For each filterable `<Column>`, add `:showFilterMenu="true"` (or appropriate props for row filtering).
        5.  Provide a `<template #filter="{filterModel, filterCallback}">` for each column to define the filter input (e.g., `InputText`, `Calendar`, `Dropdown`, `InputNumber`). Bind the filter input to `filterModel.value` and trigger `filterCallback()` on input/change/enter.
        6.  Handle the DataTable's `@filter` event to call your data loading function, passing the updated `filters.value`.
        7.  Your backend data fetching logic will then need to receive these filter parameters and apply them to the database query.
        8.  Consider using `stateStorage="session"` and `stateKey` on the DataTable for filter persistence.
    *   **Note on `filterMatchModeOptions` with `filterDisplay="menu"`:**
        *   When using `filterDisplay="menu"`, providing a custom (and potentially very short) list of options to a column's `:filterMatchModeOptions` prop has occasionally led to internal TypeErrors (e.g., `Cannot read properties of undefined (reading '0')` in `onMenuMatchModeChange`).
        *   If such errors occur, consider removing `:filterMatchModeOptions` from the problematic column. This allows PrimeVue to use its full default set of match modes for that column's data type. The desired default `matchMode` can still be set in the main `filters` ref.
        *   Alternatively, ensure that if `filterMatchModeOptions` is used, it provides a list that is well-handled by PrimeVue's internal components (e.g., typically two or more options). Thorough testing is advised for custom, short lists of match modes with menu-based filtering.

### 3.6. User Permissions and UI Behavior

This section details how user permissions affect the user interface and what users can expect based on their access level.

*   **Global Read-Only Indicator:**
    *   If a user does not possess full CRUD (Create, Read, Update, Delete) capabilities, specifically if their `logged_user.value[0]?.permissions?.crud_ok` flag is `false`, a "閲覧者" (Viewer/Browser) text will be displayed.
    *   This text appears in a small, red tag (rendered via a `<small>` HTML tag with red styling) directly next to the user's name within the greeting message (e.g., "こんにちは、User Name <small style='color: red;'>閲覧者</small>") in the top menu bar.
    *   This provides an immediate and persistent visual cue to the user regarding their restricted access level across the application.

*   **Conditional Access to Reservation Creation:**
    *   Users lacking the `crud_ok` permission are prevented from initiating the creation of new reservations. This restriction is enforced in the following ways:
        *   **Calendar View:** When attempting to create a new reservation from the calendar interface (e.g., by double-clicking an empty cell, which would normally open a new reservation form), users without `crud_ok` permission will instead see a toast notification. This message will typically state "権限エラー" (Permission Error) with details like "予約作成の権限がありません。" (You do not have permission to create reservations.). The reservation creation drawer/modal will not open.
        *   **New Reservation Page:** If a user without `crud_ok` permission navigates directly to the dedicated "New Reservation" page (usually found at a route like `/reservations/new`), the page will not display the standard reservation creation form. Instead, it will show an access error message. This message will typically be within a card titled "アクセスエラー" (Access Error) and state "予約作成の権限がありません。" (You do not have permission to create reservations.), often with a suggestion to contact an administrator.

### 3.6. Hotel Store (`useHotelStore.js`) Behavior

*   **`selectedHotelId` Persistence:** The `selectedHotelId` within the `useHotelStore` is persisted to `localStorage` (under the key `wehub_selectedHotelId_v1`). This means the user's last selected hotel will be remembered across page loads and sessions.
    *   The store handles initialization from `localStorage`, validation against available hotels, and updates to `localStorage` when the ID changes.
    *   Components relying on `selectedHotelId` should expect it to be potentially pre-populated from `localStorage` on initialization.

### 3.7. Client Name Display Order

*   **Guideline:** When displaying client names, the preferred order of fields from the `clients` table is:
    1.  `name_kanji` (Kanji name)
    2.  `name_kana` (Katakana/Hiragana name)
    3.  `name` (Default/Romaji name)
*   The first available non-null value from this list should be used for display. In SQL queries, this can typically be achieved using `COALESCE(c.name_kanji, c.name_kana, c.name)`.
*   This ensures that the most appropriate representation of the client's name is shown, prioritizing Japanese script versions when available.

## 4. General

*   (More guidelines can be added here as they are identified)

---

*Please refer back to this document periodically and before starting new development tasks.*