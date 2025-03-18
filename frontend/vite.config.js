import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE');

  return {
    plugins: [vue(), tailwindcss()],
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
          target: env.VITE_BACKEND_URL || 'http://localhost:5000', // Uses env variable
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      /*outDir: '../api/public', // backend's public folder*/
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: true, 
    },
    define: {
      'process.env': env,
    },
  };

/*
export default defineConfig({
  plugins: [vue(), tailwindcss(),],
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
    outDir: 'dist',
    emptyOutDir: true, // Clears the directory before building
    sourcemap: true, // or 'inline' to embed the source map in the output file
  },
  */
});
