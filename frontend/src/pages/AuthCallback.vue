<template>
  <div class="flex justify-center items-center min-h-screen bg-gray-100">
    <ProgressSpinner 
      style="width: 50px; height: 50px" 
      strokeWidth="8" 
      fill="transparent" 
      animationDuration=".5s" 
      aria-label="Loading" 
    />
  </div>
</template>

<script setup>
  // Vue
  import { onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router';
  const route = useRoute();
  const router = useRouter();

  // Primevue
  import ProgressSpinner from 'primevue/progressspinner';

  // Lifecycle hook that runs after the component is mounted
  onMounted(() => {
    // Retrieve token and error from the URL query parameters
    const token = route.query.token;
    const error = route.query.error;

    if (token) {      
      localStorage.setItem('authToken', String(token));
      
      // Redirect the user to the home page or dashboard
      router.push('/');       
    } else {
      // If there's an error or no token, log the error
      console.error('Authentication failed:', error || 'No token received.');
      
      // Redirect the user to the login page with an error indicator      
      router.push('/login?error=google_auth_failed');      
    }
  });

</script>
