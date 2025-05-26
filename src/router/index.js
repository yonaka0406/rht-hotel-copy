import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth'; // Adjust path as per your project structure

// Import your page/view components
// Example: import HomeView from '../views/HomeView.vue';
import LoginPage from '../views/LoginPage.vue'; // Assuming you have a LoginPage.vue
import AuthCallback from '../views/AuthCallback.vue'; // Created in previous step
import DashboardPage from '../views/DashboardPage.vue'; // Example protected page

// Define routes
const routes = [
  {
    path: '/',
    name: 'Home',
    // component: HomeView, // Example: A public home page
    redirect: '/login', // Or redirect to dashboard if already logged in (see beforeEach)
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage, // Your existing login page where LoginButton.vue can be used
    meta: { requiresGuest: true }, // Only accessible if not authenticated
  },
  {
    path: '/auth/callback', // Path for the backend to redirect to
    name: 'AuthCallback',
    component: AuthCallback,
    // This route typically doesn't need requiresAuth or requiresGuest,
    // as its job is to process the token and then redirect.
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardPage, // A protected route
    meta: { requiresAuth: true }, // This meta field marks it as a protected route
  },
  // Add other routes here
  // {
  //   path: '/about',
  //   name: 'About',
  //   component: () => import('../views/AboutView.vue') // Lazy load example
  // }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // Vite specific BASE_URL
  routes,
});

// Navigation Guard
router.beforeEach((to, from, next) => {
  // Ensure Pinia store is initialized and accessible here.
  // This typically requires Pinia to be set up in main.js before the router.
  let authStore;
  try {
    authStore = useAuthStore();
  } catch (error) {
    // This can happen if the app is not fully initialized or if Pinia setup is incorrect.
    // For safety, redirect to login or show an error, but ideally, ensure Pinia is ready.
    console.error("Auth store not available during navigation guard:", error);
    // If critical routes are hit before Pinia is ready, this might be an issue.
    // Consider a loading state or ensuring Pinia is initialized early in main.js.
    // For now, if store is not ready and route requires auth, redirect to login.
    if (to.meta.requiresAuth) {
        next({ name: 'Login', query: { redirect: to.fullPath } });
        return;
    }
    next(); // Allow navigation for non-auth routes
    return;
  }


  // Check auth status (e.g., by checking for token validity if not using isAuthenticated directly from a getter)
  // For this example, we rely on the store's checkAuth() being called at app startup (in main.js).
  const isAuthenticated = authStore.isUserAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    // User is not authenticated and trying to access a protected route
    console.log(`Navigation blocked: ${to.path} requires auth. User not authenticated. Redirecting to login.`);
    // Store the path the user was trying to access, so we can redirect back after login
    authStore.setReturnUrl(to.fullPath);
    next({ name: 'Login' }); // Redirect to your login page
  } else if (to.meta.requiresGuest && isAuthenticated) {
    // User is authenticated and trying to access a guest-only route (e.g., login page)
    console.log(`Navigation blocked: ${to.path} is for guests. User authenticated. Redirecting to dashboard.`);
    next({ name: 'Dashboard' }); // Redirect to your main authenticated page (e.g., dashboard)
  } else {
    // Allow navigation
    next();
  }
});

export default router;

/*
Notes for main.js:

import { createApp } from 'vue'
import { createPinia } from 'pinia' // Import Pinia

import App from './App.vue'
import router from './router' // Your router file
import PrimeVue from 'primevue/config'; // Import PrimeVue
import Aura from '@primevue/themes/aura'; // Choose your theme

// Import PrimeVue components globally or locally as needed.
// Example: import Button from 'primevue/button';

import './assets/main.css'; // Your global styles, potentially Tailwind

const app = createApp(App);

const pinia = createPinia(); // Create Pinia instance
app.use(pinia); // Use Pinia BEFORE using the router if router guards use store

// Initialize auth state AFTER Pinia is used by the app
// but BEFORE the router is used if guards depend on auth state immediately.
// It's often placed here so that authStore is available to router guards.
import { useAuthStore } from './stores/auth'; // Adjust path
const authStore = useAuthStore();
authStore.checkAuth(); // Check for existing token and update state

app.use(router); // Use Vue Router

app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.app-dark', // Or your preferred dark mode selector
      cssLayer: false
    }
  }
}); // Use PrimeVue

// Example: Register a PrimeVue component globally
// app.component('Button', Button);

app.mount('#app');
*/

/*
Example LoginPage.vue (src/views/LoginPage.vue):

<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="p-8 bg-white shadow-lg rounded-lg text-center">
      <h1 class="text-2xl font-semibold mb-6">Login</h1>
      <p class="mb-6">Please choose a login method.</p>
      <LoginButton />
      <p class="mt-4 text-sm text-gray-600">
        (This is a demo. Local login form can be added here.)
      </p>
    </div>
  </div>
</template>

<script setup>
import LoginButton from '@/components/LoginButton.vue'; // Adjust path
</script>

<style scoped>
/* Tailwind CSS is assumed to be set up for utility classes */
</style>
*/

/*
Example DashboardPage.vue (src/views/DashboardPage.vue - Protected):

<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold mb-4">Dashboard</h1>
    <div v-if="authStore.isUserAuthenticated && authStore.currentUser" class="bg-white p-6 rounded-lg shadow-md">
      <p class="text-lg">Welcome, <span class="font-semibold">{{ authStore.currentUser.name }}</span>!</p>
      <p>Email: {{ authStore.currentUser.email }}</p>
      <p>User ID: {{ authStore.currentUser.id }}</p>
      <p>Role ID: {{ authStore.currentUser.role_id }}</p>
      <Button label="Logout" icon="pi pi-sign-out" class="p-button-warning mt-6" @click="handleLogout" />
    </div>
    <div v-else>
      <p>Loading user data or not authenticated...</p>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = () => {
  authStore.logout();
  // The logout action in the store should already redirect to /login.
  // If not, you can do it here: router.push('/login');
};
</script>

<style scoped>
/* Tailwind CSS is assumed to be set up */
</style>
*/
