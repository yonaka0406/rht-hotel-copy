<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <div class="text-center">
      <!-- Illustration or Icon -->
      <i class="pi pi-spinner pi-spin text-blue-500 text-6xl mb-6"></i>

      <!-- Title -->
      <h1 class="text-2xl font-semibold text-gray-700">
        Work in Progress 🚧
      </h1>

      <!-- Description -->
      <p class="text-gray-500 mt-4">
        We're building something amazing here. Please check back later!
      </p>

      <!-- Back Button -->
      <button class="mt-6 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition"
        @click="goBack">
        Go Back
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  router.back();
};
</script>

<style>
/* Add any custom styles if needed */
</style>