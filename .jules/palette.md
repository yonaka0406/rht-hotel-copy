## 2026-02-01 - [Modern Calendar View Implementation]
**Learning:** For dense, scrollable grid layouts like hotel calendars, sticky positioning is essential for maintaining context. Specifically, using `sticky top-0` inside absolutely-positioned reservation blocks keeps guest names visible while the user scrolls vertically through long stays. Additionally, avoiding `v-html` in custom tooltips prevents XSS risks when displaying user-generated data like guest names.
**Action:** Always favor structured Vue templates over `v-html` for tooltips, and utilize `fixed` positioning for tooltips in complex scrollable containers to avoid clipping issues.

## 2026-02-02 - [PrimeVue 4 FloatLabel Structure and Accessibility]
**Learning:** In PrimeVue 4, the `<FloatLabel>` component requires the input/component to be placed before the `<label>` for the floating animation and accessibility to work correctly. Additionally, ensuring every input has a unique `id` matching its label's `for` attribute is critical for screen reader support, even when using modern UI components.
**Action:** Always structure `<FloatLabel>` with the input first, then the label. Audit forms for duplicate or missing IDs to ensure full accessibility compliance.
