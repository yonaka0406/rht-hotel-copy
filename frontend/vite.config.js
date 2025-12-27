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
    minify: 'esbuild', // Enable minification to reduce file size
    sourcemap: false, // Disable source maps to save memory
    
    // Rollup options for further memory optimization
    rollupOptions: {
      output: {
        // Reduce chunk size to lower memory pressure
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('echarts') || id.includes('vue-echarts')) {
              return 'stats';
            }
            if (id.includes('vue') || id.includes('vue-router') || id.includes('pinia')) {
              return 'vendor';
            }
            if (id.includes('primevue') || id.includes('primeicons')) {
              return 'ui';
            }
            return 'vendor';
          }
        }
      }
    },
    
    // Reduce concurrent processing
    target: 'es2015', // Use older target for simpler transforms
  },
});
