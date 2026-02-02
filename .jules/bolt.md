## 2025-05-22 - Extracting Grid Cells for Performance
**Learning:** In large grid components like `ReservationsCalendar.vue`, inline rendering logic with multiple $O(N)$ searches per cell causes severe performance degradation as the date range or room count grows. Consolidating all flags (isFirst, isLast, status icons) into a single pre-calculated Map lookup significantly reduces script execution time during render.
**Action:** Always extract complex grid cells into dedicated components and pass pre-calculated data via props to leverage Vue's reactivity optimization and maintain O(1) lookup speeds within the render loop.

## 2025-05-23 - Optimizing Database Operations in Reservation Split
**Learning:** The reservation split operation previously executed multiple independent queries for each room involved in the split to move associated payments. This created an N+1 query pattern that scaled poorly with the number of rooms. By utilizing `FILTER` clauses in a single aggregate query and the `ANY($1::uuid[])` operator in `UPDATE` statements, the operation now executes a constant number of queries regardless of room count.
**Action:** Use PostgreSQL's `FILTER (WHERE ...)` and `ANY(...)` to batch multiple conditional updates into single efficient transactions.

## 2025-05-23 - Server-side Search for Large Datasets
**Learning:** Pre-loading thousands of client records on component mount for an `AutoComplete` component causes significant main-thread blocking (~seconds for 5000+ records) and high memory consumption. Moving to a server-side search pattern reduces the initial component payload and initialization time to near-zero.
**Action:** Avoid bulk fetching lists for autocomplete/search components; implement and use server-side search with reasonable limits.

## 2025-05-23 - Identifying and Resolving N+1 Database Patterns
**Learning:** Sequential database queries within loops (e.g., during reservation split operations) create significant overhead as the number of entities (rooms/days) increases. Leveraging PostgreSQL aggregate functions with `FILTER` clauses and batch update operators like `ANY` allows for a constant number of queries regardless of operation scale.
**Action:** Use batched updates and conditional aggregation to eliminate loop-dependent database round-trips.

## 2025-05-23 - Server-side Search vs. Bulk Pre-loading
**Learning:** Pre-loading large datasets (5000+ records) for client-side filtering causes noticeable UI lag and high memory usage. Transitioning to a server-side search pattern with a standard paginated route ensures the UI remains responsive and scales gracefully with data growth.
**Action:** Replace bulk-fetch patterns with server-side search queries using reasonable result limits.
