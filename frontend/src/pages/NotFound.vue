<template>
  <div class="not-found flex justify-center items-center min-h-screen text-center flex-col bg-gray-100 dark:bg-gray-900">
    <Card class="bg-white dark:bg-gray-800 dark:border-gray-700 dark:shadow-gray-900/50">
      <template #title>
        <h1 class="text-4xl text-primary dark:text-gray-200">404</h1>
      </template>
      <template #content>
        <div class="card-body p-4">
          <p class="text-lg text-gray-600 dark:text-gray-300 mb-4">探しているページは存在しません。</p>
          <Button label="ホームに戻る" icon="pi pi-home" class="p-button-outlined dark:!text-gray-200 dark:!border-gray-400" @click="goHome" />
        </div>
      </template>      
    </Card>
  </div>
</template>

<script>
import Card from 'primevue/card';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

export default {
  name: "NotFound",
  components: {
    Card,
    Button,
  },
  setup() {
    const router = useRouter();
    const goHome = () => {
      router.push('/');
    };

    return { goHome };
  },
};
</script>
