<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :modal="true" header="部屋編集" :style="{ width: '60vw' }" class="p-fluid">
    <template #header>
      <div class="flex justify-between items-center w-full">
        <h2 class="text-lg font-bold">部屋編集</h2>
        <div>
          <Button label="順序リセット" icon="pi pi-refresh" @click="resetOrder" class="p-button-secondary p-button-sm mr-2" />
          <Button label="部屋追加" icon="pi pi-plus" @click="$emit('open-new-room-dialog')" class="p-button-sm" />
        </div>
      </div>
    </template>
    
    <Accordion :activeIndex="0">
      <AccordionPanel v-for="roomType in roomTypes" :key="roomType.id" :value="roomType.id">
        <AccordionHeader>
          部屋タイプ： {{ roomType.name }}
        </AccordionHeader>
        <AccordionContent>
          <DataTable :value="groupedRooms[roomType.id]" editMode="cell" class="p-datatable-sm" responsiveLayout="scroll" @cell-edit-complete="onCellEditComplete" v-model:selection="selectedRoom" selectionMode="single" dataKey="id" :reorderableRows="true" @row-reorder="onRowReorder">
            <Column rowReorder headerStyle="width: 3rem" />
            <Column field="room_number" header="部屋番号">
              <template #editor="slotProps">
                <InputText v-model="slotProps.data.room_number" />
              </template>
            </Column>
            <Column field="capacity" header="人数">
                <template #body="slotProps">
                    {{ slotProps.data.capacity }}
                </template>
              <template #editor="slotProps">
                <InputNumber v-model="slotProps.data.capacity" :min="1" />
              </template>
            </Column>
            <Column field="smoking" header="喫煙">
              <template #body="slotProps">
                <div class="flex items-center justify-center">
                  <Checkbox v-model="slotProps.data.smoking" binary @change="onCellEditComplete({ data: slotProps.data, field: 'smoking', newValue: slotProps.data.smoking })"/>
                </div>
              </template>
            </Column>
            <Column field="for_sale" header="販売用">
              <template #body="slotProps">
                <div class="flex items-center justify-center">
                  <Checkbox v-model="slotProps.data.for_sale" binary @change="onCellEditComplete({ data: slotProps.data, field: 'for_sale', newValue: slotProps.data.for_sale })"/>
                </div>
              </template>
            </Column>
          </DataTable>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>

    <template #footer>
      <Button label="保存" icon="pi pi-check" @click="saveChanges" class="p-button-success p-button-text p-button-sm" />
      <Button label="閉じる" icon="pi pi-times" @click="$emit('update:visible', false)" class="p-button-danger p-button-text p-button-sm" text />
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Checkbox from 'primevue/checkbox';
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import { useHotelStore } from '@/composables/useHotelStore';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

const props = defineProps({
  visible: Boolean,
  hotelId: Number,
  roomTypes: Array,
});

const emit = defineEmits(['update:visible', 'save', 'open-new-room-dialog']);

const { getRoomAssignmentOrder, updateRoomAssignmentOrder, updateRoom } = useHotelStore();
const localRooms = ref([]);
const selectedRoom = ref(null);

const groupedRooms = computed(() => {
  const groups = {};
  if (props.roomTypes) {
    props.roomTypes.forEach(rt => {
      groups[rt.id] = localRooms.value.filter(r => r.room_type_id === rt.id);
    });
  }
  return groups;
});

watch(() => props.visible, async (newValue) => {
  if (newValue && props.hotelId) {
    const order = await getRoomAssignmentOrder(props.hotelId);
    if (Array.isArray(order)) {
      localRooms.value = order.map(r => ({...r, changed: false}));
    } else {
      console.error("Received non-array response for room assignment order:", order);
      localRooms.value = [];
    }
  }
});

const refreshRooms = async () => {
  if (props.hotelId) {
    const order = await getRoomAssignmentOrder(props.hotelId);
    if (Array.isArray(order)) {
      localRooms.value = order.map(r => ({...r, changed: false}));
    } else {
      console.error("Received non-array response for room assignment order:", order);
      localRooms.value = [];
    }
  }
};

defineExpose({
  refreshRooms,
});

const onCellEditComplete = (event) => {
  const { data, newValue, field } = event;
  if (field) {
    data[field] = newValue;
    data.changed = true;
  }
};

const onRowReorder = (event) => {
  const reorderedRooms = event.value;
  const otherRooms = localRooms.value.filter(r => r.room_type_id !== reorderedRooms[0].room_type_id);
  localRooms.value = [...reorderedRooms, ...otherRooms];
  localRooms.value.forEach(room => room.changed = true);
};

const saveChanges = async () => {
  try {
    const changedRooms = localRooms.value.filter(room => room.changed);
    for (const room of changedRooms) {
      await updateRoom(room.room_id, {
        room_type_id: room.room_type_id,
        floor: room.floor,
        room_number: room.room_number,
        capacity: room.capacity,
        smoking: room.smoking,
        for_sale: room.for_sale,
        hotel_id: props.hotelId
      });
    }

    const orderToSave = localRooms.value.map((room, index) => ({
      room_id: room.room_id,
      assignment_priority: index + 1,
    }));
    await updateRoomAssignmentOrder(props.hotelId, orderToSave);
    
    toast.add({ severity: 'success', summary: '成功', detail: '部屋情報が更新されました。', life: 3000 });
    emit('save');
  } catch (error) {
    toast.add({ severity: 'error', summary: 'エラー', detail: '保存に失敗しました。', life: 3000 });
  }
};

const resetOrder = () => {
  localRooms.value.forEach(room => room.assignment_priority = null);
  localRooms.value.sort((a, b) => {
    if (a.floor !== b.floor) {
      return a.floor - b.floor;
    }
    return a.room_number.localeCompare(b.room_number);
  });
};
</script>
