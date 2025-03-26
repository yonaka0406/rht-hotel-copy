<template>
  <div>
    <Card>
      <template #content>
        <div class="flex items-center justify-between mb-2">
          <div class="justify-start">
            <span class="font-bold text-xl">新規予約</span>
          </div>
          <div class="flex items-center">
            <span class="mr-2">最適化モード</span>
            <ToggleButton v-model="showMinimal" onLabel="オン" offLabel="オフ" size="small" class="min-w-16" />
          </div>
        </div>
        <ReservationsNewMinimal v-if="showMinimal" />
        <ReservationsNewCombo v-else />
      </template>
    </Card>
    </div>
</template>

<script setup>
  // Vue
  import { ref } from 'vue';
  import ReservationsNewMinimal from '@/pages/MainPage/components/ReservationsNewMinimal.vue';
  import ReservationsNewCombo from '@/pages/MainPage/components/ReservationsNewCombo.vue';

  // Primevue
  import { Card, ToggleButton } from 'primevue';

  const showMinimal = ref(false);

  const toggleMinimal = () => {
    showMinimal.value = !showMinimal.value;
  };
</script>