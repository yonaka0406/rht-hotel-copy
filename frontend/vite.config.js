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
    sourcemap: true, // or 'inline' to embed the source map in the output file
  },
});
