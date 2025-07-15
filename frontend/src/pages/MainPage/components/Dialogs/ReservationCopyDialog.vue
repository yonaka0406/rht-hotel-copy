<template>
  <div>
    <div v-if="!loading && availableRooms.length === 0" class="flex flex-col items-center justify-center p-4">
      <i class="pi pi-inbox text-5xl text-gray-400 mb-4"></i>
      <p class="text-lg text-gray-600">この期間に利用可能な部屋はありません。</p>
      <Button label="閉じる" @click="$emit('close')" class="mt-4" />
    </div>
    <div v-else>
      <div class="mb-4">
        <ClientAutoCompleteWithStore
          v-model="selectedClient"
          label="複製先の予約者を検索"
          optionLabel="name"
          class="mt-6"
        />
        <FloatLabel class="mt-6">
          <MultiSelect
            id="move-room"
            v-model="targetRooms"
            :options="availableRooms"
            optionLabel="label"
            placeholder="部屋を選択"
            fluid
          />
          <label for="move-room">部屋を追加</label>
        </FloatLabel>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <Button label="キャンセル" icon="pi pi-times" severity="secondary" outlined @click="$emit('close')" />
        <Button label="複製" icon="pi pi-copy" severity="success" :disabled="!selectedClient || targetRooms.length === 0" @click="copyReservation" />
      </div>
    </div>
  </div>
</template>

<script setup>
  // Vue
  import { ref, onMounted, computed } from 'vue';
  import ClientAutoCompleteWithStore from '@/components/ClientAutoCompleteWithStore.vue';
  import { useToast } from 'primevue/usetoast';

  const props = defineProps({
    reservation_id: { type: String, required: true }
  });

  const emit = defineEmits(['close']);

  // Primevue
  import { Button, MultiSelect, FloatLabel } from 'primevue';

  // Stores
  import { useReservationStore } from '@/composables/useReservationStore';
  const { fetchReservationForCopy, availableRoomsForCopy, copyReservation: copyReservationAction } = useReservationStore();

  const toast = useToast();
  const selectedClient = ref(null);
  const targetRooms = ref([]);
  const loading = ref(true);

  const availableRooms = computed(() => {
    return availableRoomsForCopy.value.map(room => ({
      label: `${room.room_number} - ${room.room_type_name} (${room.capacity}) ${room.smoking ? ' 🚬' : ''} (${room.floor}階)`,
      value: room.room_id,
    }));
  });

  onMounted(async () => {
    try {
      await fetchReservationForCopy(props.reservation_id);
    } catch (error) {
      toast.add({ severity: 'error', summary: 'エラー', detail: '予約情報の取得に失敗しました。', life: 3000 });
    } finally {
      loading.value = false;
    }
  });

  const copyReservation = async () => {
    try {
      await copyReservationAction(props.reservation_id, selectedClient.value.id, targetRooms.value.map(r => r.value));
      toast.add({ severity: 'success', summary: '成功', detail: '予約が正常に複製されました。', life: 3000 });
      emit('close');
    } catch (error) {
      toast.add({ severity: 'error', summary: 'エラー', detail: '予約の複製中にエラーが発生しました。', life: 3000 });
    }
  };
</script>