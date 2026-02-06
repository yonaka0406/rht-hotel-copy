## 2024-05-22 - Data Integrity Progress Visualization
**Learning:** For workflows involving data reconciliation (like matching detailed bills to accounting totals), providing a real-time "completion" progress bar and a "Matched" success badge significantly reduces mental load and provides immediate gratification. It turns a chore into a mini-game.
**Action:** Always look for "target totals" in data entry tasks and provide a visual indicator of how close the user is to reaching that target.

## 2024-05-22 - Accessibility in Narrow Containers
**Learning:** In PrimeVue 4, components like `DatePicker` or `InputNumber` within narrow `Dialog` or `Drawer` containers must use the `fluid` prop to ensure they are accessible and visually aligned across different screen sizes.
**Action:** Use `fluid` prop for all form inputs inside restricted-width containers to maintain consistent UX and touch-targets.
