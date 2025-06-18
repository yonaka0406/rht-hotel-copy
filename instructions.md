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

### 2.3. PostgreSQL JSON/JSONB Data Handling

*   **Guideline:** When inserting or updating `JSON` or `JSONB` columns in PostgreSQL using the `pg` (node-postgres) driver, it is generally more robust to explicitly stringify your JavaScript objects or arrays using `JSON.stringify()` *before* passing them as parameters to your database query.
    *   **Example:** If you have a JavaScript array `const dataArray = [{ id: 1, name: "Test" }];` intended for a `JSONB` column, pass `JSON.stringify(dataArray)` as the query parameter.
    *   **Rationale:** While `node-postgres` can often automatically convert JavaScript objects/arrays to the correct JSON string format, explicit stringification provides a more predictable and well-formed JSON string literal to the database, reducing the chances of syntax errors during insertion or updates (e.g., `json型に対する不正な入力構文`). This also makes debugging easier as you can log the exact JSON string being sent.
    *   Handle `null` values appropriately; if a field should be SQL `NULL`, ensure `null` (not the string `"null"`) is passed as the parameter value after stringification logic. For empty arrays you want to store as `[]`, pass `JSON.stringify([])`.

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

## 4. General

*   (More guidelines can be added here as they are identified)

---

*Please refer back to this document periodically and before starting new development tasks.*