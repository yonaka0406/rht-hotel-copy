# Print CSS Styles Documentation

This directory contains comprehensive CSS styles optimized for print media, specifically designed for the ReportingSingleMonthAllHotels component and general print usage.

## Files Overview

### `print-styles.css`
Main print stylesheet containing:
- Page setup and global print configuration
- Element visibility rules (hide/show for print)
- Typography and text optimization
- Layout and container optimization
- Card and panel styles for print
- Chart-specific print styles
- Table styles for print
- Page break control
- ReportingSingleMonthAllHotels specific styles

### `tailwind-print-utilities.css`
Extended Tailwind-style print utility classes:
- Print display utilities (`print:block`, `print:hidden`, etc.)
- Print spacing utilities (margin/padding with `print:` prefix)
- Print typography utilities (`print:text-lg`, `print:font-bold`, etc.)
- Print color utilities (`print:text-black`, `print:bg-white`, etc.)
- Print border utilities (`print:border`, `print:border-gray-300`, etc.)
- Print page break utilities (`print:break-inside-avoid`, etc.)
- Print flexbox and grid utilities
- Responsive print utilities for different paper sizes

### `print-styles.example.html`
Complete example showing how to use the print styles with the ReportingSingleMonthAllHotels component structure.

## Usage

### 1. Include the CSS Files

```html
<!-- In your HTML head or Vue component -->
<link rel="stylesheet" href="@/assets/css/print-styles.css">
<link rel="stylesheet" href="@/assets/css/tailwind-print-utilities.css">
```

Or in a Vue component:
```vue
<style>
@import '@/assets/css/print-styles.css';
@import '@/assets/css/tailwind-print-utilities.css';
</style>
```

### 2. Apply Print Classes to Elements

```html
<!-- Hide elements in print -->
<nav class="no-print">Navigation Menu</nav>
<button class="print:hidden">Interactive Button</button>

<!-- Show elements only in print -->
<div class="print-only">This appears only when printing</div>

<!-- Apply print-specific styling -->
<div class="print:text-center print:mb-4">
    <h1 class="print:text-2xl print:font-bold">Report Title</h1>
</div>

<!-- Chart containers with print optimization -->
<div class="chart-container print:break-inside-avoid print:mb-3">
    <!-- Your chart component here -->
</div>

<!-- KPI cards with print grid layout -->
<div class="print:grid print:grid-cols-2 print:gap-2">
    <div class="kpi-card print:border print:p-2">
        <h6 class="print:text-xs print:text-gray-600">ADR</h6>
        <div class="print:text-lg print:font-bold">¥12,500</div>
    </div>
</div>
```

### 3. Page Break Control

```html
<!-- Force page break before element -->
<div class="print:break-before-page">New Page Content</div>

<!-- Avoid page breaks inside element -->
<div class="print:break-inside-avoid">Keep Together</div>

<!-- Specific component page breaks -->
<div class="monthly-summary-section">Monthly Summary</div>
<div class="hotel-overview-section">Hotel Overview</div>
```

## Print Utility Classes Reference

### Display
- `print:block`, `print:inline`, `print:flex`, `print:grid`
- `print:hidden` - Hide element in print
- `print-only` - Show only in print (global class)
- `no-print` - Hide in print (global class)

### Spacing
- `print:m-{size}` - Margin (0, 1, 2, 3, 4, 5, 6, 8)
- `print:p-{size}` - Padding (0, 1, 2, 3, 4, 5, 6, 8)
- `print:mx-{size}`, `print:my-{size}` - Horizontal/vertical margins
- `print:px-{size}`, `print:py-{size}` - Horizontal/vertical padding

### Typography
- `print:text-{size}` - Font sizes (xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl)
- `print:font-{weight}` - Font weights (normal, medium, semibold, bold, extrabold)
- `print:text-{align}` - Text alignment (left, center, right, justify)

### Layout
- `print:w-{size}` - Width utilities including fractions (1/2, 1/3, 2/3, etc.)
- `print:h-{size}` - Height utilities
- `print:grid-cols-{n}` - Grid columns (1-12)
- `print:col-span-{n}` - Grid column span
- `print:gap-{size}` - Grid/flex gap

### Colors
- `print:text-{color}` - Text colors (black, white, gray-100 to gray-900)
- `print:bg-{color}` - Background colors
- `print:border-{color}` - Border colors

### Page Breaks
- `print:break-before-{type}` - Page break before (auto, avoid, page)
- `print:break-after-{type}` - Page break after (auto, avoid, page)
- `print:break-inside-{type}` - Page break inside (auto, avoid)

### Responsive Print
- `print:a4:{utility}` - A4 paper specific utilities
- `print:letter:{utility}` - Letter paper specific utilities
- `print:landscape:{utility}` - Landscape orientation utilities

## Component-Specific Classes

### ReportingSingleMonthAllHotels
- `.reporting-single-month-container` - Main container
- `.monthly-summary-panel` - Summary panel with avoid page break
- `.chart-layout-container` - Chart layout container
- `.revenue-chart-column` - Revenue chart column
- `.gauge-kpi-column` - Gauge and KPI column
- `.kpi-cards-grid` - KPI cards grid layout
- `.future-outlook-section` - Future outlook section
- `.hotel-overview-section` - Hotel overview section

### Charts
- `.chart-container` - General chart container
- `.revenue-chart-container` - Revenue chart specific
- `.occupancy-gauge-container` - Occupancy gauge specific
- `.hotel-sales-chart` - Hotel sales chart
- `.hotel-occupancy-chart` - Hotel occupancy chart

## Best Practices

### 1. Page Break Management
```html
<!-- Keep charts together -->
<div class="chart-container print:break-inside-avoid">
    <!-- Chart content -->
</div>

<!-- Start new sections on new pages when needed -->
<div class="section print:break-before-page">
    <!-- Section content -->
</div>
```

### 2. Layout Optimization
```html
<!-- Convert flex layouts to block for print -->
<div class="flex md:flex-row print:block">
    <div class="w-1/2 print:w-full print:mb-3">Column 1</div>
    <div class="w-1/2 print:w-full">Column 2</div>
</div>
```

### 3. Typography Scaling
```html
<!-- Responsive text sizing for print -->
<h1 class="text-3xl print:text-2xl print:a4:text-xl">Title</h1>
<p class="text-base print:text-sm print:a4:text-xs">Content</p>
```

### 4. Color Optimization
```html
<!-- Ensure good contrast for print -->
<div class="bg-blue-500 text-white print:bg-white print:text-black print:border">
    Content that needs good print contrast
</div>
```

## Testing Print Styles

### Browser Print Preview
1. Open the example HTML file in a browser
2. Press `Ctrl+P` (or `Cmd+P` on Mac)
3. Observe how the layout changes for print
4. Test different paper sizes and orientations

### Print CSS Debugging
```css
/* Add to temporarily debug print layouts */
.print-debug {
    border: 2px dashed red !important;
}

.print-debug::before {
    content: "DEBUG: " attr(class) !important;
    background: white !important;
    color: red !important;
}
```

### Vue Component Integration
```vue
<template>
  <div class="reporting-single-month-container">
    <!-- Use print classes throughout your template -->
    <div class="print:break-inside-avoid print:mb-4">
      <h2 class="print:text-lg print:font-bold">Section Title</h2>
      <!-- Content -->
    </div>
  </div>
</template>

<style>
@import '@/assets/css/print-styles.css';
@import '@/assets/css/tailwind-print-utilities.css';
</style>
```

## Performance Considerations

- Print styles are only loaded when printing (within `@media print`)
- Use `!important` declarations to ensure print styles override screen styles
- Minimize complex selectors for better print performance
- Test with large datasets to ensure print performance remains good

## Browser Compatibility

These print styles are tested and optimized for:
- **Chrome 60+**: Full support
- **Firefox 55+**: Full support
- **Safari 11+**: Full support
- **Edge 79+**: Full support

## Troubleshooting

### Common Issues

1. **Styles not applying in print**
   - Ensure CSS files are properly imported
   - Check that `@media print` is not nested inside other media queries
   - Verify `!important` declarations are present

2. **Page breaks not working**
   - Some browsers have limited page-break support
   - Use both old (`page-break-*`) and new (`break-*`) properties
   - Test in different browsers

3. **Charts not rendering correctly**
   - Ensure chart containers have `print:break-inside-avoid`
   - Check that chart dimensions are appropriate for print
   - Verify chart optimization is applied before printing

4. **Layout issues in print**
   - Use `print:block` to override complex layouts
   - Apply `print:w-full` to ensure full width usage
   - Test with different paper sizes and orientations