<template>
  <Button
    icon="pi pi-google"
    label="Login with Google"
    class="p-button-danger p-button-raised"
    @click="handleGoogleLogin"
  />
</template>

<script setup>
import Button from 'primevue/button'; // Assuming PrimeVue is globally registered or imported as needed

// Get backend OAuth URL from environment variables or fallback
// Ensure your Vite .env file has VITE_BACKEND_URL=http://localhost:3000 (or your backend URL)
// If not set, it defaults to '/auth/google' assuming same-origin or proxied setup.
const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || ''; // e.g., http://localhost:3000

const handleGoogleLogin = () => {
  // The backend endpoint to initiate Google OAuth
  const googleAuthUrl = `${backendBaseUrl}/auth/google`;
  window.location.href = googleAuthUrl;
};
</script>

<style scoped>
/* Add any specific styles for the button if needed */
.p-button-danger {
  /* Example: customize if PrimeVue theme needs override */
}
</style>

<!--
Integration into an existing Login page (e.g., src/views/LoginPage.vue):

<template>
  <div class="login-page">
    <h2>Login</h2>
    <p>Please login to continue.</p>
    <LoginButton />
    <hr />
    <form @submit.prevent="handleLocalLogin">
      <div>
        <label for="email">Email:</label>
        <InputText id="email" v.model="email" type="email" />
      </div>
      <div>
        <label for="password">Password:</label>
        <InputText id="password" v.model="password" type="password" />
      </div>
      <Button type="submit" label="Login with Email" />
    </form>
  </div>
</template>

<script setup>
import LoginButton from '@/components/LoginButton.vue'; // Adjust path
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { ref } from 'vue';

const email = ref('');
const password = ref('');

const handleLocalLogin = () => {
  // Your local login logic
  console.log('Attempting local login with:', email.value, password.value);
};
</script>

<style scoped>
.login-page {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.login-page div {
  margin-bottom: 15px;
}
.login-page label {
  display: block;
  margin-bottom: 5px;
}
hr {
  margin: 20px 0;
}
</style>
-->
