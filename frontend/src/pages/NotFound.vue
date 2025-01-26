<template>
  <div class="not-found flex justify-center items-center min-h-screen text-center flex-col">
    <Card>
      <template #title>
        <h1 class="text-4xl text-primary">404</h1>
      </template>
      <template #content>
        <div class="card-body p-4">
          <p class="text-lg text-gray-600 mb-4">探しているページは存在しません。</p>
          <Button label="Go back to Home" icon="pi pi-home" class="p-button-outlined" @click="goHome" />
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
