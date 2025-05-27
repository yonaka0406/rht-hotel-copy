import axios from 'axios';
import { useAuthStore } from '@/stores/auth'; // Adjust path as necessary

// Get API base URL from environment variables, fallback to /api
// Ensure your Vite .env file has VITE_API_BASE_URL=http://localhost:3000 (or your backend URL)
// If your backend is on a different domain, you'll need to handle CORS.
// If backend and frontend are served from the same domain, '/api' might be sufficient if you proxy.
// For the backend created in previous steps, it runs on port 3000.
// If the Vue app is on a different port (e.g., 5173), direct calls like http://localhost:3000/auth/google are needed.
// For API calls made by this apiClient, if the backend is on a different origin,
// VITE_API_BASE_URL should be the full backend URL (e.g., http://localhost:3000).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // This code runs before the request is sent
    // It's okay to define and use the store here, as Pinia stores are singletons after init.
    // However, ensure Pinia is initialized before any API calls are made.
    // In main.js, Pinia should be set up, and authStore.checkAuth() called.
    try {
      const authStore = useAuthStore(); // Get the store instance
      const token = authStore.getToken;  // Use the getter

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
        // This might happen if Pinia is not initialized yet when the interceptor is first accessed.
        // Or if useAuthStore() is called outside a setup function or component context without Pinia being active.
        // It's generally safer if Pinia is fully initialized in main.js before any routing or API calls.
        console.warn('Auth store not available yet for API client interceptor or error accessing token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor for global error handling, e.g., 401 for logout
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Unauthorized or token expired
      try {
        const authStore = useAuthStore();
        console.warn('API request returned 401, logging out.');
        authStore.logout(); // Redirects to login via the store's logout action
      } catch (storeError) {
        console.error('Error accessing auth store for 401 logout:', storeError);
        // Fallback if store is not accessible
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_info');
        window.location.href = '/login'; // Force redirect
      }
    }
    return Promise.reject(error);
  }
);


export default apiClient;

// Example usage in a component:
// import apiClient from '@/services/api';
//
// async function fetchData() {
//   try {
//     const response = await apiClient.get('/protected-data');
//     console.log(response.data);
//   } catch (error) {
//     console.error('Error fetching data:', error);
//   }
// }
