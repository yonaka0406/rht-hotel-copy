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
