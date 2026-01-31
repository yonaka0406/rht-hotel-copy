## 2025-05-22 - Extracting Grid Cells for Performance
**Learning:** In large grid components like `ReservationsCalendar.vue`, inline rendering logic with multiple $O(N)$ searches per cell causes severe performance degradation as the date range or room count grows. Consolidating all flags (isFirst, isLast, status icons) into a single pre-calculated Map lookup significantly reduces script execution time during render.
**Action:** Always extract complex grid cells into dedicated components and pass pre-calculated data via props to leverage Vue's reactivity optimization and maintain O(1) lookup speeds within the render loop.

## 2025-05-23 - Efficient Prefix-Based Duplicate Search
**Learning:** For client duplication detection, $O(N^2)$ string comparisons for 10,000+ records can block the UI for several seconds. By sorting normalized search names and only checking forward for prefix matches, the complexity is reduced to $O(N \log N)$, making the operation nearly instantaneous even in the browser.
**Action:** Use sorting to optimize similarity/prefix searches in large datasets. Ensure calculations are triggered only after data loading is complete (`clientsIsLoading` watcher) to avoid redundant early-stage processing.
