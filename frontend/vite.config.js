/* global process */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    process.env.ANALYZE ? visualizer({ open: true }) : undefined,
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'), // Alias for cleaner imports
      'vue': 'vue/dist/vue.esm-bundler.js', // Alias for Vue runtime compilation
    },
  },
  server: {
    proxy: {
      // Proxy API requests to the Node.js backend in development
      '/api': {
        target: 'http://localhost:5000', // Your backend server during development
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    /*outDir: '../api/public', // backend's public folder*/
    outDir: 'dist',
    emptyOutDir: true, // Clears the directory before building

    // Memory optimization for low-RAM VPS builds
    minify: 'esbuild', // Disable minification to reduce memory usage
    sourcemap: false, // Disable source maps to save memory
    cssMinify: true,

    // Rollup options for further memory optimization
    rollupOptions: {
      output: {
        // Break down large vendor chunks to stay under the 500kB limit and reduce memory pressure
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Split ECharts further
            if (id.includes('echarts')) {
              if (id.includes('echarts/lib/chart')) return 'echarts-charts';
              if (id.includes('echarts/lib/component')) return 'echarts-components';
              return 'echarts-core';
            }
            if (id.includes('zrender')) {
              return 'zrender';
            }
            // Split PrimeVue further
            if (id.includes('primevue')) {
              if (id.includes('datatable') || id.includes('column')) {
                return 'ui-tables';
              }
              if (id.includes('datepicker') || id.includes('select') || id.includes('multiselect') || id.includes('input') || id.includes('autocomplete')) {
                return 'ui-forms';
              }
              // Further split ui-base to stay under 500kB
              if (id.includes('primevue/button') || id.includes('primevue/menu') || id.includes('primevue/dialog') || id.includes('primevue/toast')) {
                return 'ui-base-1';
              }
              return 'ui-base-2';
            }
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vue-core';
            }
            return 'vendor'; // Everything else
          }
        }
      }
    },

    // Reduce concurrent processing
    target: 'es2015', // Use older target for simpler transforms
  },
});
