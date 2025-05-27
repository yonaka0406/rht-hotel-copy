import { defineStore } from 'pinia';
import { jwtDecode } from 'jwt-decode'; // Corrected import name
import router from '@/router'; // Assuming router is in src/router/index.js

// Helper to get API base URL from environment variables or fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';


export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('jwt_token') || null,
    user: JSON.parse(localStorage.getItem('user_info')) || null,
    isAuthenticated: !!localStorage.getItem('jwt_token'),
    returnUrl: null, // To store the URL the user was trying to access
  }),
  getters: {
    getToken: (state) => state.token,
    currentUser: (state) => state.user,
    isUserAuthenticated: (state) => state.isAuthenticated,
  },
  actions: {
    async login(token) {
      try {
        localStorage.setItem('jwt_token', token);
        const decodedToken = jwtDecode(token);
        // You can extract more user details from decodedToken if they exist
        // For example: roles, permissions etc.
        const userData = {
          id: decodedToken.userId,
          email: decodedToken.email,
          name: decodedToken.name,
          role_id: decodedToken.role_id,
          // Add any other relevant fields from the JWT payload
        };
        localStorage.setItem('user_info', JSON.stringify(userData));

        this.token = token;
        this.user = userData;
        this.isAuthenticated = true;

        console.log('User logged in:', this.user);

        // Redirect to the stored return URL or dashboard
        const redirectPath = this.returnUrl || '/dashboard';
        this.returnUrl = null; // Clear the return URL
        router.push(redirectPath);

      } catch (error) {
        console.error('Failed to decode token or login:', error);
        // Potentially handle corrupted token by logging out
        this.logout();
      }
    },
    logout() {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_info');
      this.token = null;
      this.user = null;
      this.isAuthenticated = false;
      console.log('User logged out');
      router.push('/login'); // Or your login page route
    },
    checkAuth() {
      const token = localStorage.getItem('jwt_token');
      if (token) {
        try {
          const decodedToken = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          if (decodedToken.exp < currentTime) {
            console.warn('Token expired, logging out.');
            this.logout();
          } else {
            this.token = token;
            this.user = JSON.parse(localStorage.getItem('user_info')); // Assume user_info is stored correctly
            this.isAuthenticated = true;
            console.log('User authentication checked, still valid.');
          }
        } catch (error) {
          console.error('Failed to decode token during auth check:', error);
          this.logout(); // Token might be invalid or corrupted
        }
      } else {
        this.isAuthenticated = false; // Ensure consistent state if no token
      }
    },
    // Action to set the return URL (e.g., before redirecting to login)
    setReturnUrl(url) {
      this.returnUrl = url;
    },

    // Example: Fetch more user details from backend if needed
    // async fetchUserProfile() {
    //   if (!this.token) return;
    //   try {
    //     // Assuming you have an apiClient instance configured
    //     // import apiClient from '@/services/api';
    //     // const response = await apiClient.get(`${API_BASE_URL}/users/me`); // Your endpoint to get user profile
    //     // this.user = { ...this.user, ...response.data }; // Merge with existing user data
    //     // localStorage.setItem('user_info', JSON.stringify(this.user));
    //     console.log('User profile updated from server');
    //   } catch (error) {
    //     console.error('Failed to fetch user profile:', error);
    //     // Handle error, maybe token is invalid -> logout
    //     if (error.response && error.response.status === 401) {
    //       this.logout();
    //     }
    //   }
    // }
  },
});

// Initialize Pinia and call checkAuth in main.js
// Example for main.js:
// import { createApp } from 'vue'
// import { createPinia } from 'pinia'
// import App from './App.vue'
// import router from './router'
//
// const app = createApp(App)
// const pinia = createPinia()
// app.use(pinia)
// app.use(router)
//
// // Initialize auth state from localStorage
// const authStore = useAuthStore(); // Needs to be called after pinia is used by app
// authStore.checkAuth();
//
// app.mount('#app')
