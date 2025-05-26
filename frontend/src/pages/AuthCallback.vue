<template>
  <div class="flex justify-center items-center min-h-screen">
    <ProgressSpinner />
    <p class="ml-2">Logging you in...</p>
  </div>
</template>

<script>
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ProgressSpinner from 'primevue/progressspinner'; // Corrected import

export default {
  name: 'AuthCallback',
  components: {
    ProgressSpinner
  },
  setup() {
    const route = useRoute();
    const router = useRouter();

    onMounted(() => {
      const token = route.query.token;
      const error = route.query.error;

      if (token) {
        localStorage.setItem('authToken', token);
        // Optionally, you could verify the token or fetch user profile here
        router.push('/'); // Redirect to home/dashboard
      } else {
        console.error('Authentication failed:', error || 'No token received.');
        // Redirect to login with an error query param or show a message
        router.push('/login?error=google_auth_failed');
      }
    });

    return {};
  }
}
</script>
