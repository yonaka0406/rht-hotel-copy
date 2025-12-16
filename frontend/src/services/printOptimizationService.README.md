# Print Optimization Service

The Print Optimization Service provides a comprehensive solution for CSS-based PDF generation using the browser's native print functionality. This service is designed to replace backend PDF generation with a more efficient, client-side approach.

## Features

- **Browser Compatibility Detection**: Automatically detects browser support for print features
- **Print Mode Lifecycle Management**: Handles activation and deactivation of print-optimized styles
- **Chart Optimization**: Automatically optimizes ECharts instances for print rendering
- **Fallback Mechanisms**: Graceful degradation to backend PDF generation when needed
- **Error Handling**: Comprehensive error handling with user-friendly fallback options
- **Style Management**: Dynamic injection and removal of print-specific CSS styles

## Quick Start

```javascript
import printOptimizationService from '@/services/printOptimizationService.js';

// Setup fallback for when print mode fails
printOptimizationService.setFallbackCallback((reason, error) => {
  console.warn('Print failed, using backend fallback:', reason);
  // Call your existing backend PDF generation method
});

// Activate print mode and trigger print dialog
async function downloadPdf() {
  try {
    const activated = await printOptimizationService.activatePrintMode({
      hideElements: ['.no-print', 'nav', 'button'],
      optimizeCharts: true,
      injectStyles: true
    });
    
    if (activated) {
      await printOptimizationService.triggerPrint();
    }
  } catch (error) {
    console.error('Print error:', error);
  }
}
```

## API Reference

### Core Methods

#### `activatePrintMode(options)`
Activates print mode with specified optimizations.

**Parameters:**
- `options` (Object): Configuration options
  - `hideElements` (Array): CSS selectors for elements to hide during print
  - `optimizeCharts` (Boolean): Whether to optimize charts for print (default: true)
  - `injectStyles` (Boolean): Whether to inject print-specific styles (default: true)
  - `timeout` (Number): Timeout for print mode activation (default: 5000ms)

**Returns:** `Promise<boolean>` - True if activated successfully, false if fallback was used

#### `deactivatePrintMode()`
Deactivates print mode and restores original state.

#### `triggerPrint()`
Triggers the browser's print dialog.

**Returns:** `Promise<boolean>` - True if print dialog was triggered successfully

### Browser Support

#### `checkBrowserPrintSupport()`
Checks if the current browser supports print functionality.

**Returns:** `boolean` - True if browser supports print features

#### `getBrowserCompatibility()`
Gets detailed browser compatibility information.

**Returns:** `Object` - Browser support details including:
- `printAPI`: Whether window.print() is available
- `printMediaQueries`: Whether print media queries are supported
- `cssPageBreak`: Whether CSS page-break properties are supported
- `browserName`: Detected browser name
- `version`: Browser version
- `isSupported`: Overall support status

### Error Handling

#### `setFallbackCallback(callback)`
Sets a callback function to handle fallback scenarios.

**Parameters:**
- `callback` (Function): Function called when fallback is needed
  - `reason` (String): Reason for fallback
  - `error` (Error): Optional error object

### Status and Cleanup

#### `getStatus()`
Gets current service status.

**Returns:** `Object` - Status information including:
- `isPrintModeActive`: Whether print mode is currently active
- `printStylesInjected`: Whether print styles are injected
- `browserSupport`: Browser compatibility information
- `hasFallbackCallback`: Whether a fallback callback is set

#### `destroy()`
Cleans up resources and event listeners.

## Configuration Options

### Hide Elements
Specify CSS selectors for elements that should be hidden during print:

```javascript
const options = {
  hideElements: [
    '.no-print',        // Elements with no-print class
    '.print-hidden',    // Elements with print-hidden class
    'nav',              // Navigation elements
    '.sidebar',         // Sidebar elements
    'button:not(.print-keep)', // Buttons except those with print-keep class
    '.p-button:not(.print-keep)' // PrimeVue buttons except print-keep
  ]
};
```

### Chart Optimization
When enabled, the service will:
- Disable animations on ECharts instances
- Set charts to static state for print
- Add print-specific CSS classes to chart containers

### Print Styles
The service automatically injects comprehensive print styles including:
- Page layout optimizations
- Chart sizing and positioning
- Table formatting
- Typography adjustments
- Page break controls

## Browser Support

### Supported Browsers
- **Chrome 60+**: Full support
- **Firefox 55+**: Full support  
- **Safari 11+**: Full support
- **Edge 79+**: Full support

### Fallback Behavior
When browser support is insufficient, the service will:
1. Log a warning message
2. Call the configured fallback callback
3. Return `false` from activation methods
4. Allow your application to use backend PDF generation

## Integration Examples

### Vue 3 Composition API

```javascript
import { ref } from 'vue';
import printOptimizationService from '@/services/printOptimizationService.js';

export function usePrintOptimization() {
  const isDownloading = ref(false);
  
  // Setup fallback
  printOptimizationService.setFallbackCallback((reason) => {
    console.warn('Using backend fallback:', reason);
    // Call existing backend method
  });

  const downloadPdf = async () => {
    isDownloading.value = true;
    try {
      const activated = await printOptimizationService.activatePrintMode({
        hideElements: ['.no-print', 'nav'],
        optimizeCharts: true
      });
      
      if (activated) {
        await printOptimizationService.triggerPrint();
      }
    } finally {
      isDownloading.value = false;
    }
  };

  return { downloadPdf, isDownloading };
}
```

### Replacing Backend PDF Generation

```javascript
// Before: Backend PDF generation
async function downloadPdfOld() {
  const response = await api.generatePdf(reportData);
  downloadBlob(response.data, 'report.pdf');
}

// After: Print optimization with fallback
async function downloadPdfNew() {
  const printService = printOptimizationService;
  
  // Set fallback to old method
  printService.setFallbackCallback(() => {
    downloadPdfOld(); // Use existing backend method as fallback
  });
  
  // Try print optimization first
  const activated = await printService.activatePrintMode();
  if (activated) {
    await printService.triggerPrint();
  }
}
```

## Testing

The service includes comprehensive unit tests covering:
- Browser compatibility detection
- Print mode activation/deactivation
- Error handling and fallback mechanisms
- Style injection and cleanup
- Event listener management

Run tests with:
```bash
npm test -- printOptimizationService.test.js
```

## Performance Benefits

Using print optimization instead of backend PDF generation provides:

- **Reduced Server Load**: PDF generation happens on the client
- **Faster Response Times**: No server processing or network transfer
- **Better Scalability**: Unlimited concurrent PDF generation
- **Offline Capability**: Works without server connection
- **Consistent Styling**: Automatic synchronization between web and print styles

## Troubleshooting

### Common Issues

1. **Print dialog doesn't appear**
   - Check browser compatibility with `checkBrowserPrintSupport()`
   - Ensure popup blockers aren't preventing the print dialog
   - Verify that `window.print()` is available

2. **Charts not rendering correctly**
   - Ensure ECharts instances are properly initialized
   - Check that chart containers have appropriate CSS classes
   - Verify that animations are disabled for print

3. **Styles not applied**
   - Check that print media queries are supported
   - Verify that style injection is enabled
   - Ensure CSS selectors are valid

### Debug Information

Use `getStatus()` to get detailed information about the service state:

```javascript
const status = printOptimizationService.getStatus();
console.log('Service status:', status);
```

### Logging

The service provides detailed console logging for debugging:
- Info messages for successful operations
- Warning messages for fallback scenarios  
- Error messages for failures

Set your browser console to show all log levels to see detailed operation information.