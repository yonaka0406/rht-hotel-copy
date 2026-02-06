## 2026-02-01 - [Modern Calendar View Implementation]

**Learning:** For dense, scrollable grid layouts like hotel calendars, sticky positioning is essential for maintaining context. Specifically, using `sticky top-0` inside absolutely-positioned reservation blocks keeps guest names visible while the user scrolls vertically through long stays. Additionally, avoiding `v-html` in custom tooltips prevents XSS risks when displaying user-generated data like guest names.
**Action:** Always favor structured Vue templates over `v-html` for tooltips, and utilize `fixed` positioning for tooltips in complex scrollable containers to avoid clipping issues.

## 2026-02-02 - [PrimeVue 4 FloatLabel Structure and Accessibility]

**Learning:** In PrimeVue 4, the `<FloatLabel>` component requires the input/component to be placed before the `<label>` for the floating animation and accessibility to work correctly. Additionally, ensuring every input has a unique `id` matching its label's `for` attribute is critical for screen reader support, even when using modern UI components.
**Action:** Always structure `<FloatLabel>` with the input first, then the label. Audit forms for duplicate or missing IDs to ensure full accessibility compliance.

## 2026-02-02 - [Unified Reservation Blocks with Indicator Strips]

**Learning:** In dense calendar grid views, merging consecutive reservation days into a single block improves visual clarity and allows for sticky headers (keeping guest names visible). To keep interactions date-aware without shifting the layout, use absolute-positioned overlay segments.
**Action:** Use unified blocks for consecutive stays and represent plan/status changes with a side indicator strip. Ensure segments are absolutely positioned to maintain grid alignment despite sticky headers.

## 2026-02-02 - [Segmented Coloring within Unified Blocks]

**Learning:** For unified reservation blocks, using a neutral background can feel "strange" if the rest of the calendar is colorful. A better strategy is to color each day segment with its specific plan color while using a darkened version for the indicator strip. This maintains the "one block" feel (via shared borders and sticky headers) while preserving the information density of plan-specific coloring.
**Action:** Use `getItemColor` for segment backgrounds and a `darkenColor` utility for the corresponding indicator strip segments. Ensure color priority matches the system legend (e.g., Hold and Employee statuses override plan colors).

## 2024-05-22 - Data Integrity Progress Visualization

**Learning:** For workflows involving data reconciliation (like matching detailed bills to accounting totals), providing a real-time "completion" progress bar and a "Matched" success badge significantly reduces mental load and provides immediate gratification. It turns a chore into a mini-game.
**Action:** Always look for "target totals" in data entry tasks and provide a visual indicator of how close the user is to reaching that target.

## 2024-05-22 - Accessibility in Narrow Containers

**Learning:** In PrimeVue 4, components like `DatePicker` or `InputNumber` within narrow `Dialog` or `Drawer` containers must use the `fluid` prop to ensure they are accessible and visually aligned across different screen sizes.
**Action:** Use `fluid` prop for all form inputs inside restricted-width containers to maintain consistent UX and touch-targets.

## 2026-02-03 - [Truncated Tax Calculation for Japanese Accounting]
**Learning:** In Japanese accounting practices, when calculating net prices from tax-inclusive totals, it is standard to calculate the tax portion first and truncate it (`floor`), then subtract this tax amount from the total to get the net price. This differs from simple rounding or floating-point division and must be consistently applied across frontend (Vue), backend (SQL/JS), and database schema (Generated Columns) to prevent penny-off discrepancies in invoices and receipts.
**Action:** Always use the formula `tax_amount = floor(total * rate / (1 + rate))` and `net_price = total - tax_amount` for Japanese tax-inclusive calculations. Ensure all layers (DB, API, UI) are synchronized with this logic.

## 2024-05-22 - [Keyboard Accessibility for Suggestion Cards]
**Learning:** For non-semantic interactive elements (like divs used as cards), adding `role="button"` and `tabindex="0"` is not enough. You must also implement keydown listeners for `Enter` and `Space` to ensure full parity with native button behavior. Additionally, items that are visually "disabled" (e.g., already registered) should be removed from the tab order using `tabindex="-1"` and have their interactions disabled to prevent confusion.
**Action:** Always pair `role="button"` with `@keydown.enter` and `@keydown.space.prevent`. Use `tabindex="-1"` for interactive elements that are in a disabled state.
