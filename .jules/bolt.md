## 2026-02-02 - Extracting Grid Cells for Performance
**Learning:** In large grid components like `ReservationsCalendar.vue`, inline rendering logic with multiple $O(N)$ searches per cell causes severe performance degradation as the date range or room count grows. Consolidating all flags (isFirst, isLast, status icons) into a single pre-calculated Map lookup significantly reduces script execution time during render.
**Action:** Always extract complex grid cells into dedicated components and pass pre-calculated data via props to leverage Vue's reactivity optimization and maintain O(1) lookup speeds within the render loop.

## 2026-02-02 - Optimizing Database Operations in Reservation Split
**Learning:** The reservation split operation previously executed multiple independent queries for each room involved in the split to move associated payments. This created an N+1 query pattern that scaled poorly with the number of rooms. By utilizing `FILTER` clauses in a single aggregate query and the `ANY($1::uuid[])` operator in `UPDATE` statements, the operation now executes a constant number of queries regardless of room count.
**Action:** Use PostgreSQL's `FILTER (WHERE ...)` and `ANY(...)` to batch multiple conditional updates into single efficient transactions.

## 2026-02-02 - Server-side Search for Large Datasets
**Learning:** Pre-loading thousands of client records on component mount for an `AutoComplete` component causes significant main-thread blocking (~seconds for 5000+ records) and high memory consumption. Moving to a server-side search pattern reduces the initial component payload and initialization time to near-zero.
**Action:** Avoid bulk fetching lists for autocomplete/search components; implement and use server-side search with reasonable limits.

## 2026-02-02 - Identifying and Resolving N+1 Database Patterns
**Learning:** Sequential database queries within loops (e.g., during reservation split operations) create significant overhead as the number of entities (rooms/days) increases. Leveraging PostgreSQL aggregate functions with `FILTER` clauses and batch update operators like `ANY` allows for a constant number of queries regardless of operation scale.
**Action:** Use batched updates and conditional aggregation to eliminate loop-dependent database round-trips.

## 2026-02-02 - Server-side Search vs. Bulk Pre-loading
**Learning:** Pre-loading large datasets (5000+ records) for client-side filtering causes noticeable UI lag and high memory usage. Transitioning to a server-side search pattern with a standard paginated route ensures the UI remains responsive and scales gracefully with data growth.
**Action:** Replace bulk-fetch patterns with server-side search queries using reasonable result limits.

## 2026-02-02 - Aggregating Dashboard Metrics on the Server
**Learning:** Computing dashboard statistics (like counts and distributions) on the frontend by processing a full dump of the database (e.g., 5000+ clients) is highly inefficient and creates a bottleneck during initial load. Implementing a specialized `/stats` API endpoint that uses PostgreSQL aggregate functions moves the computation to the database and reduces the payload from megabytes to bytes.
**Action:** Always prefer server-side aggregation for dashboard metrics over client-side processing of large raw datasets.

## 2026-02-02 - Server-side Duplication Detection for Performance
**Learning:** Finding duplicate client records by transferring all 5,000+ records to the frontend and running an O(N²) or O(N log N) comparison in the browser causes the UI to freeze and memory usage to spike. Moving the duplication logic to the backend using an O(N log N) prefix-sorting algorithm reduces the data transfer to only the clusters of candidates and keeps the main thread free.
**Action:** Implement heavy data-processing algorithms like duplication detection on the backend and expose the results via specialized endpoints.

## 2026-02-02 - Implementing Lazy Loading for Massive DataTables
**Learning:** Even with server-side sorting and searching, rendering a list of 5,000+ items at once (or trying to fetch them all) in a DataTable can overwhelm the browser and the backend. Using PrimeVue's `lazy` mode to fetch only the current page (e.g., 10-50 rows) and total count from the server ensures consistent performance regardless of total dataset size (e.g., 20,000+ records).
**Action:** Use `lazy` loading for all primary list views expected to grow beyond 500 records.

## 2026-02-02 - Using v-memo for High-Frequency Grid Rendering
**Learning:** In large grids where mouse-over effects (row/column highlighting) trigger frequent re-renders, the entire grid template is often re-evaluated, leading to UI stuttering. Applying `v-memo` to the grid rows allows Vue to skip re-rendering rows that haven't changed their data, highlight state, or view mode, keeping the main thread free for smooth interactions.
**Action:** Use `v-memo` on rows in large calendar or grid components, specifically targeting data and visual state dependencies.

## 2026-02-02 - Optimizing Accounting Views with LATERAL Unpivot
**Learning:** Using `UNION ALL` to aggregate different columns (like debit/credit amounts) from the same large table in a view causes the database to perform multiple full scans. Replacing `UNION ALL` with `CROSS JOIN LATERAL` allows the database to read each row once and "unpivot" it in memory, significantly reducing I/O and improving view query performance.
**Action:** Prefer `CROSS JOIN LATERAL` for unpivoting data from a single table over `UNION ALL` of multiple scans.
## 2026-02-07 - [Search Query Optimization]
**Learning:** Using a CTE to pre-filter matching clients allows leveraging GIN trigram indexes once per scan and then joining the results, which is significantly more efficient than repeating the same ILIKE conditions across multiple UNIONed queries. This reduced the number of redundant JOINs to heavy master tables.
**Action:** Always prefer CTE-based filtering for multi-table searches that involve expensive text matching on multiple possible links (main client, secondary guests, payments).
