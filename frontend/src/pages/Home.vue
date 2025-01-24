<template>
  <div class="home flex justify-center items-center min-h-screen">
    <Card>
      <template #title>
        <h1 class="not-found-title text-4xl text-gray-800">Welcome to the Home Page</h1>
      </template>
      <template #content>
        <div v-if="loading" class="loading-container flex justify-center items-center">
          <ProgressSpinner style="width: 50px; height: 50px;" />          
        </div>
        <p v-else-if="error" class="error text-red-600">{{ error }}</p>
        <p v-else class="text-gray-700">{{ message }}</p>
        <Button 
          v-if="!loading" 
          label="Reload" 
          icon="pi pi-refresh" 
          class="p-button-outlined mt-4" 
          @click="reloadData" />

        <!-- Link to Admin page -->
        <div class="mt-6">
          <router-link to="/admin" class="text-blue-600 hover:text-blue-800">Go to Admin Dashboard</router-link>
        </div>
      </template>
    </Card>
  </div>
</template>

<script>
import Card from 'primevue/card';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner'; // Import ProgressSpinner
import { ref } from 'vue';

export default {
  name: "Home",
  components: {
    Card,
    Button,
    ProgressSpinner, // Register ProgressSpinner
  },
  setup() {
    const message = ref(""); // Store the message from the API
    const loading = ref(true); // Track loading state
    const error = ref(null); // Store any error messages

    // Fetch data from the API
    const fetchData = async () => {
      try {
        const response = await fetch("/api/message");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        message.value = data.message;
      } catch (err) {
        error.value = "Failed to fetch message from the API.";
        console.error(err);
      } finally {
        loading.value = false;
      }
    };

    // Call fetchData on component mount
    fetchData();

    // Reload data on button click
    const reloadData = () => {
      loading.value = true;
      error.value = null;
      fetchData();
    };

    return {
      message,
      loading,
      error,
      reloadData
    };
  }
};
</script>
