<template>
  <div class="auth-callback-page">
    <div v-if="isLoading" class="loading-container">
      <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" fill="var(--surface-ground)" animationDuration=".5s" />
      <p>Authenticating, please wait...</p>
    </div>
    <div v-if="error" class="error-container">
      <Message severity="error" :closable="false">{{ errorMessage }}</Message>
      <Button label="Go to Login" @click="goToLogin" class="p-button-sm mt-4" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth'; // Adjust path as needed

import ProgressSpinner from 'primevue/progressspinner';
import Message from 'primevue/message';
import Button from 'primevue/button';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isLoading = ref(true);
const error = ref(false);
const errorMessage = ref('Authentication failed. Please try again.');

onMounted(async () => {
  const token = route.query.token;
  const errorParam = route.query.error; // Check for error param from backend

  if (errorParam) {
    errorMessage.value = `Authentication failed: ${errorParam}. Please try again.`;
    error.value = true;
    isLoading.value = false;
    return;
  }

  if (token && typeof token === 'string') {
    try {
      // The login action in the store handles localStorage, state update, and decoding
      await authStore.login(token); // login action is async if it involves API calls, but here it's mainly sync

      // Redirect to the stored return URL or dashboard
      // The login action itself now handles redirection.
      // If not, you would do it here:
      // const redirectPath = authStore.returnUrl || '/dashboard';
      // authStore.setReturnUrl(null); // Clear it after use
      // router.push(redirectPath);

    } catch (e) {
      console.error('Error processing token:', e);
      errorMessage.value = 'An error occurred while processing your login. Invalid token.';
      error.value = true;
      // Perform logout to clear any potentially corrupted state
      authStore.logout();
    } finally {
      isLoading.value = false;
    }
  } else {
    errorMessage.value = 'Authentication token not found. Please try logging in again.';
    error.value = true;
    isLoading.value = false;
  }
});

const goToLogin = () => {
  router.push('/login'); // Adjust if your login route is different
};
</script>

<style scoped>
.auth-callback-page {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh; /* Full viewport height */
  text-align: center;
  padding: 20px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem; /* Space between spinner/message and text/button */
}

.p-message {
  max-width: 400px;
}
.mt-4 {
  margin-top: 1rem; /* PrimeFlex utility or define locally */
}
</style>
