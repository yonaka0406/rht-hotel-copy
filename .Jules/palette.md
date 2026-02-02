## 2025-05-22 - [Unified Reservation Blocks with Indicator Strips]
**Learning:** In dense calendar grid views, merging consecutive reservation days into a single block improves visual clarity and allows for sticky headers (keeping guest names visible). To keep interactions date-aware without shifting the layout, use absolute-positioned overlay segments.
**Action:** Use unified blocks for consecutive stays and represent plan/status changes with a side indicator strip. Ensure segments are absolutely positioned to maintain grid alignment despite sticky headers.

## 2025-05-22 - [Segmented Coloring within Unified Blocks]
**Learning:** For unified reservation blocks, using a neutral background can feel "strange" if the rest of the calendar is colorful. A better strategy is to color each day segment with its specific plan color while using a darkened version for the indicator strip. This maintains the "one block" feel (via shared borders and sticky headers) while preserving the information density of plan-specific coloring.
**Action:** Use `getItemColor` for segment backgrounds and a `darkenColor` utility for the corresponding indicator strip segments. Ensure color priority matches the system legend (e.g., Hold and Employee statuses override plan colors).
