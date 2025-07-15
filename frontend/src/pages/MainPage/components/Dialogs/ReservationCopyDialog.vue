<template>
  <div>
    <div class="mb-4">
      
      <ClientAutoCompleteWithStore
        v-model="selectedClient"
        label="複製先の予約者を検索"
        optionLabel="name"
        class="mt-6"
      />
      <FloatLabel class="mt-6">
        <Select
          id="move-room"
          v-model="targetRoom"
          :options="filteredRooms"
          optionLabel="label"
          showClear
          fluid
        />
        <label for="move-room">部屋を追加</label>
      </FloatLabel>
    </div>
    <div class="flex justify-end gap-2 mt-6">
      <Button label="キャンセル" icon="pi pi-times" severity="secondary" outlined @click="$emit('close')" />
      <Button label="複製" icon="pi pi-copy" severity="success" :disabled="!selectedClient" @click="copyReservation" />
    </div>
  </div>
</template>

<script setup>
  // Vue
  import { ref, computed, onMounted } from 'vue';
  import ClientAutoCompleteWithStore from '@/components/ClientAutoCompleteWithStore.vue';

  const props = defineProps({
    reservation_id: { type: String, required: true }
  });

  // Primevue
  import { Button, Select, FloatLabel } from 'primevue';

  // Stores  
  import { useReservationStore } from '@/composables/useReservationStore';
  const { fetchAvailableRooms } = useReservationStore();  

  const selectedClient = ref(null);
  const targetRoom = ref(null);

</script> 