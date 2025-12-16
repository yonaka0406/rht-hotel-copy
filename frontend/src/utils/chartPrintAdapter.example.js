/**
 * Example usage of ChartPrintAdapter
 * This file demonstrates how to use the chart print optimization adapter
 * with ECharts instances for print-friendly PDF generation
 */

import chartPrintAdapter, { ChartPrintAdapter } from './chartPrintAdapter.js';

/**
 * Example: Basic chart optimization for print
 */
export async function basicChartOptimization() {
  // Assume you have ECharts instances
  const chartInstance1 = window.echarts.getInstanceByDom(document.getElementById('chart1'));
  const chartInstance2 = window.echarts.getInstanceByDom(document.getElementById('chart2'));
  
  if (chartInstance1 && chartInstance2) {
    // Optimize multiple charts for print
    const success = await chartPrintAdapter.preparePrintCharts([chartInstance1, chartInstance2]);
    
    if (success) {
      console.log('Charts optimized for print');
      
      // Trigger print dialog
      window.print();
      
      // Restore original states after print
      chartPrintAdapter.restoreOriginalStates([chartInstance1, chartInstance2]);
    } else {
      console.warn('Chart optimization failed');
    }
  }
}

/**
 * Example: Single chart optimization with custom adapter
 */
export async function singleChartOptimization() {
  // Create a custom adapter instance
  const adapter = new ChartPrintAdapter();
  
  // Get chart instance
  const chartInstance = window.echarts.getInstanceByDom(document.getElementById('myChart'));
  
  if (chartInstance) {
    try {
      // Optimize single chart
      const optimized = await adapter.optimizeChartForPrint(chartInstance);
      
      if (optimized) {
        console.log('Chart optimized for print');
        
        // Check optimization status
        const status = adapter.getStatus();
        console.log('Optimization status:', status);
        
        // Get print color scheme
        const colorScheme = adapter.getPrintColorScheme();
        console.log('Print colors:', colorScheme);
        
        // Trigger print
        window.print();
        
        // Restore after print
        adapter.restoreOriginalStates([chartInstance]);
      }
    } catch (error) {
      console.error('Chart optimization error:', error);
    } finally {
      // Clean up
      adapter.destroy();
    }
  }
}

/**
 * Example: Chart size optimization
 */
export function optimizeChartSizes() {
  const containerDimensions = {
    width: 1200,
    height: 800
  };
  
  // Calculate optimal print dimensions
  const optimized = chartPrintAdapter.optimizeChartSizes(containerDimensions);
  
  console.log('Original dimensions:', containerDimensions);
  console.log('Optimized for print:', optimized);
  
  return optimized;
}

/**
 * Example: Integration with Vue component
 */
export function useChartPrintOptimization() {
  const optimizeChartsForPrint = async (chartRefs) => {
    try {
      // Get ECharts instances from Vue refs
      const chartInstances = chartRefs
        .map(ref => ref.value?.chart || ref.value?.getEchartsInstance?.())
        .filter(instance => instance);
      
      if (chartInstances.length === 0) {
        console.warn('No chart instances found');
        return false;
      }
      
      // Optimize all charts
      const success = await chartPrintAdapter.preparePrintCharts(chartInstances);
      
      if (success) {
        console.log(`Optimized ${chartInstances.length} charts for print`);
        return chartInstances;
      } else {
        console.warn('Chart optimization failed');
        return false;
      }
    } catch (error) {
      console.error('Error optimizing charts:', error);
      return false;
    }
  };
  
  const restoreCharts = (chartInstances) => {
    if (chartInstances && Array.isArray(chartInstances)) {
      chartPrintAdapter.restoreOriginalStates(chartInstances);
      console.log('Charts restored to original state');
    }
  };
  
  const getOptimizationStatus = () => {
    return chartPrintAdapter.getStatus();
  };
  
  return {
    optimizeChartsForPrint,
    restoreCharts,
    getOptimizationStatus
  };
}

/**
 * Example: Print workflow with chart optimization
 */
export async function printWorkflowWithCharts() {
  try {
    // Find all chart containers on the page
    const chartContainers = document.querySelectorAll('.echarts-container, [_echarts_instance_]');
    const chartInstances = [];
    
    // Get ECharts instances
    chartContainers.forEach(container => {
      const instance = container._echarts_instance_ || 
                      (window.echarts && window.echarts.getInstanceByDom(container));
      if (instance) {
        chartInstances.push(instance);
      }
    });
    
    if (chartInstances.length === 0) {
      console.log('No charts found, proceeding with regular print');
      window.print();
      return;
    }
    
    console.log(`Found ${chartInstances.length} charts to optimize`);
    
    // Optimize charts for print
    const optimized = await chartPrintAdapter.preparePrintCharts(chartInstances);
    
    if (optimized) {
      console.log('All charts optimized for print');
      
      // Add a small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Trigger print dialog
      window.print();
      
      // Set up event listener to restore charts after print
      const afterPrintHandler = () => {
        chartPrintAdapter.restoreOriginalStates(chartInstances);
        console.log('Charts restored after print');
        window.removeEventListener('afterprint', afterPrintHandler);
      };
      
      window.addEventListener('afterprint', afterPrintHandler);
      
    } else {
      console.warn('Chart optimization failed, using regular print');
      window.print();
    }
    
  } catch (error) {
    console.error('Error in print workflow:', error);
    // Fallback to regular print
    window.print();
  }
}

/**
 * Example: Color scheme customization
 */
export function customizeChartColors() {
  // Create custom adapter with modified colors
  const adapter = new ChartPrintAdapter();
  
  // Get current color scheme
  const currentColors = adapter.getPrintColorScheme();
  
  // You could modify the color scheme here if needed
  console.log('Current print color scheme:', currentColors);
  
  // Example of how you might customize colors
  const customColors = {
    ...currentColors,
    series: [
      '#000000', // Black
      '#333333', // Dark gray
      '#666666', // Medium gray
      '#999999'  // Light gray
    ]
  };
  
  console.log('Custom color scheme:', customColors);
  
  return customColors;
}

export default {
  basicChartOptimization,
  singleChartOptimization,
  optimizeChartSizes,
  useChartPrintOptimization,
  printWorkflowWithCharts,
  customizeChartColors
};