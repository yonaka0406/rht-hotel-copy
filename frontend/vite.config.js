import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    process.env.ANALYZE ? visualizer({ open: true }) : undefined,
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Alias for cleaner imports
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
    sourcemap: false, // Disable sourcemaps in production to save memory
    
    // Memory optimization settings
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    
    rollupOptions: {
      // Optimize chunking to reduce memory usage
      output: {
        manualChunks: {
          // Split Vue and core dependencies
          vue: ['vue', 'vue-router'],
          // Split ECharts separately (memory intensive)
          echarts: ['echarts', 'vue-echarts', 'zrender'],
          // Split PrimeVue UI components
          primevue: ['primevue', '@primevue/forms', '@primeuix/themes', 'primeicons'],
          // Split utility libraries
          utils: ['axios', 'papaparse', 'uuid', 'socket.io-client'],
        },
        // Reduce chunk size
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop().replace('.js', '') : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        }
      },
      
      // Memory management during build
      onwarn(warning, warn) {
        // Suppress certain warnings that don't affect functionality
        if (warning.code === 'LARGE_BUNDLE') return;
        warn(warning);
      }
    },
    
    // Terser options for better memory management
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 1, // Reduce passes to save memory
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    },
    
    // Target modern browsers to reduce polyfill overhead
    target: 'es2020',
    
    // Reduce CSS optimization complexity
    cssCodeSplit: true,
    cssMinify: true,
  },
  
  // Optimize dependency handling
  optimizeDeps: {
    include: ['vue', 'vue-router', 'axios'],
    exclude: ['echarts', 'vue-echarts'], // Let ECharts load dynamically
  },
});