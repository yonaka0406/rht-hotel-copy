<template>
  <Dialog v-model:visible="showDialog" header="予約を複製"
    :style="{ width: '50vw', 'max-height': '80vh', 'overflow-y': 'auto' }" modal>
    <div v-if="!loading && availableRooms.length === 0" class="flex flex-col items-center justify-center p-4">
      <i class="pi pi-inbox text-5xl text-gray-400 mb-4" aria-hidden="true"></i>
      <p class="text-lg text-gray-600">この期間に利用可能な部屋はありません。</p>
      <Button label="閉じる" @click="closeDialog" class="mt-4" aria-label="閉じる" />
    </div>
    <div v-else>
      <div class="mb-4">
        <ClientAutoCompleteWithStore
          v-model="selectedClient"
          label="複製先の予約者を検索"
          optionLabel="name"
          class="mt-6"
          aria-label="複製先の予約者を検索"
          ref="firstInput"
        />
        <FloatLabel class="mt-6">
          <MultiSelect
            id="move-room"
            v-model="targetRooms"
            :options="availableRooms"
            optionLabel="label"
            fluid
            aria-label="部屋を追加"
          />
          <label for="move-room">部屋を追加</label>
        </FloatLabel>
      </div>

      <!-- Room Mapping Table -->
      <div v-if="targetRooms.length > 0 && originalRooms.length > 0" class="mt-6">
        <h3 class="text-lg font-semibold mb-3">部屋設定の複製元を選択</h3>
        <DataTable :value="roomMappings" class="p-datatable-sm" aria-label="部屋マッピングテーブル">
          <Column field="newRoom" header="新しい部屋" style="width: 25%">
            <template #body="slotProps">
              <span class="font-medium">{{ slotProps.data.newRoomLabel }}</span>
            </template>
          </Column>
          <Column field="originalRoom" header="複製元の部屋" style="width: 75%">
            <template #body="slotProps">
              <Select
                v-model="slotProps.data.originalRoomId"
                :options="originalRooms"
                optionLabel="label"
                optionValue="value"
                placeholder="複製元を選択"
                class="w-full"
                @change="updateRoomMapping(slotProps.data)"
                aria-label="複製元の部屋を選択"
              />
            </template>
          </Column>

        </DataTable>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <Button label="キャンセル" icon="pi pi-times" severity="secondary" outlined @click="closeDialog" aria-label="キャンセル" />
        <Button 
          label="複製" 
          icon="pi pi-copy" 
          severity="success" 
          :disabled="!selectedClient || targetRooms.length === 0 || !isMappingComplete" 
          @click="copyReservation" 
          aria-label="予約を複製"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup>
  // Vue
  import { ref, onMounted, computed, watch, nextTick } from 'vue';
  import { useRouter } from 'vue-router';
  import ClientAutoCompleteWithStore from '@/components/ClientAutoCompleteWithStore.vue';
  import { useToast } from 'primevue/usetoast';

  const props = defineProps({
    reservation_id: { type: String, required: true },
    hotel_id: { type: String, required: true },
    visible: {
        type: Boolean,
        default: false,
    }
  });

  const emit = defineEmits(['update:visible']);

  // Primevue
  import { Button, MultiSelect, FloatLabel, DataTable, Column, Select, Dialog } from 'primevue';

  // Stores
  import { useReservationStore } from '@/composables/useReservationStore';
  const { fetchReservationForCopy, availableRoomsForCopy, copyReservation: copyReservationAction, reservationDetails } = useReservationStore();

  const router = useRouter();
  const toast = useToast();
  const selectedClient = ref(null);
  const targetRooms = ref([]);
  const loading = ref(true);
  const roomMappings = ref([]);
  const firstInput = ref(null);

  const showDialog = ref(props.visible);

  watch(() => props.visible, (newValue) => {
      showDialog.value = newValue;
  });

  watch(showDialog, (newValue) => {
      emit('update:visible', newValue);
  });

  const closeDialog = () => {
      showDialog.value = false;
  };

  const availableRooms = computed(() => {
    return availableRoomsForCopy.value.map(room => ({
      label: `${room.room_number} - ${room.room_type_name} (${room.capacity}) ${room.smoking ? ' 🚬' : ''} (${room.floor}階)`,
      value: room.room_id,
    }));
  });

  // Get original rooms from the reservation details
  const originalRooms = computed(() => {
    if (!reservationDetails.value?.reservation) return [];
    
    // Group by room_id to get unique rooms
    const roomGroups = {};
    reservationDetails.value.reservation.forEach(detail => {
      if (!roomGroups[detail.room_id]) {
        roomGroups[detail.room_id] = {
          room_id: detail.room_id,
          room_number: detail.room_number,
          room_type_name: detail.room_type_name,
          plan_name: detail.plan_name,
          addons_count: detail.reservation_addons?.length || 0,
          details: []
        };
      }
      roomGroups[detail.room_id].details.push(detail);
    });

    return Object.values(roomGroups).map(room => ({
      label: `${room.room_number} - ${room.room_type_name}${room.plan_name ? ` (${room.plan_name})` : ''}${room.addons_count > 0 ? ` +${room.addons_count}個のオプション` : ''}`,
      value: room.room_id,
      planInfo: room.plan_name ? `${room.plan_name}${room.addons_count > 0 ? ` +${room.addons_count}個のオプション` : ''}` : 'プランなし'
    }));
  });

  // Check if all mappings are complete
  const isMappingComplete = computed(() => {
    return roomMappings.value.length > 0 && 
           roomMappings.value.every(mapping => mapping.originalRoomId !== null);
  });

  // Update room mappings when target rooms change
  watch(targetRooms, (newTargetRooms) => {
    roomMappings.value = newTargetRooms.map(room => {
      const existingMapping = roomMappings.value.find(m => m.newRoomId === room.value);
      let defaultOriginalRoomId = existingMapping?.originalRoomId || (originalRooms.value.length > 0 ? originalRooms.value[0].value : null);
      let defaultPlanInfo = existingMapping?.planInfo || null;

      if (defaultOriginalRoomId && !defaultPlanInfo) {
        const selectedOriginalRoom = originalRooms.value.find(r => r.value === defaultOriginalRoomId);
        if (selectedOriginalRoom) {
          defaultPlanInfo = selectedOriginalRoom.planInfo;
        }
      }

      return {
        newRoomId: room.value,
        newRoomLabel: room.label,
        originalRoomId: defaultOriginalRoomId,
        planInfo: defaultPlanInfo
      };
    });
  });

  // Update plan info when original room is selected
  const updateRoomMapping = (mapping) => {
    const selectedOriginalRoom = originalRooms.value.find(room => room.value === mapping.originalRoomId);
    if (selectedOriginalRoom) {
      mapping.planInfo = selectedOriginalRoom.planInfo;
    }
  };

  onMounted(async () => {
    // Only fetch reservation data if the dialog is visible
    if (props.visible) {
      try {
        await fetchReservationForCopy(props.reservation_id, props.hotel_id);
        await nextTick();
        // Set focus to the first input (client autocomplete) when dialog opens
        if (firstInput.value && firstInput.value.$el && firstInput.value.$el.querySelector('input')) {
          firstInput.value.$el.querySelector('input').focus();
        }
      } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '予約情報の取得に失敗しました。', life: 3000 });
      } finally {
        loading.value = false;
      }
    }
  });

  // Watch for changes in props.visible to trigger data fetching
  watch(() => props.visible, async (newVal) => {
    if (newVal) {
      loading.value = true;
      try {
        await fetchReservationForCopy(props.reservation_id, props.hotel_id);
        await nextTick();
        if (firstInput.value && firstInput.value.$el && firstInput.value.$el.querySelector('input')) {
          firstInput.value.$el.querySelector('input').focus();
        }
      } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '予約情報の取得に失敗しました。', life: 3000 });
      } finally {
        loading.value = false;
      }
    }
  });

  const copyReservation = async () => {
    try {
      // Create room mapping for backend
      const roomMapping = roomMappings.value.map(mapping => ({
        new_room_id: mapping.newRoomId,
        original_room_id: mapping.originalRoomId
      }));

      const result = await copyReservationAction(props.reservation_id, selectedClient.value.id, roomMapping);
      // console.log('copyReservation result:', result);
      
      // Redirect to the new reservation edit page
      if (result && result.reservation && result.reservation.id) {
        router.push({ name: 'ReservationEdit', params: { reservation_id: result.reservation.id } });
      }
      toast.add({ severity: 'success', summary: '成功', detail: '予約が正常に複製されました。', life: 3000 });
      emit('update:visible', false);
    } catch (error) {
      toast.add({ severity: 'error', summary: 'エラー', detail: '予約の複製中にエラーが発生しました。', life: 3000 });
    }
  };
</script>
