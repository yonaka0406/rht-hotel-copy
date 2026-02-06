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
                <InputText v-model="slotProps.data.room_number" fluid />
              </template>
            </Column>
            <Column field="capacity" header="人数">
                <template #body="slotProps">
                    {{ slotProps.data.capacity }}
                </template>
              <template #editor="slotProps">
                <InputNumber v-model="slotProps.data.capacity" :min="1" fluid />
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
            <Column field="has_wet_area" header="水回り">
              <template #body="slotProps">
                <div class="flex items-center justify-center">
                  <Checkbox v-model="slotProps.data.has_wet_area" binary @change="onCellEditComplete({ data: slotProps.data, field: 'has_wet_area', newValue: slotProps.data.has_wet_area })"/>
                </div>
              </template>
            </Column>
            <Column field="is_staff_room" header="スタッフ">
              <template #body="slotProps">
                <div class="flex items-center justify-center">
                  <Checkbox v-model="slotProps.data.is_staff_room" binary @change="onCellEditComplete({ data: slotProps.data, field: 'is_staff_room', newValue: slotProps.data.is_staff_room })"/>
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
  rooms: Array,
});

const emit = defineEmits(['update:visible', 'save', 'open-new-room-dialog']);

const { updateRoomAssignmentOrder, updateRoom } = useHotelStore();
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

watch(() => props.rooms, (newRooms) => {
  if (newRooms) {
    localRooms.value = newRooms.map(r => ({...r, changed: false})).sort((a, b) => {
      // Sort by assignment_priority if available, otherwise by room_number (or whatever default)
      if (a.assignment_priority !== null && b.assignment_priority !== null) {
        return a.assignment_priority - b.assignment_priority;
      }
      // If one has priority and other doesn't, prioritized comes first? Or last?
      // Usually undefined/null priority goes to the end.
      if (a.assignment_priority !== null) return -1;
      if (b.assignment_priority !== null) return 1;
      
      return 0; // Keep original order if both null
    });
  } else {
    localRooms.value = [];
  }
}, { immediate: true });

const onCellEditComplete = (event) => {
  const { data, newValue, field } = event;
  if (field) {
    data[field] = newValue;
    data.changed = true;
  }
};

const onRowReorder = (event) => {
  const reorderedRooms = event.value;
  // We need to update localRooms with the new order.
  // The event.value contains the new list for the *specific group* (room type).
  // We need to splice this back into localRooms or reconstruct localRooms.
  
  // Simple approach:
  // 1. Remove all rooms of this room type from localRooms.
  // 2. Insert the reordered rooms back (or just keep them separate in memory if we only cared about saving).
  // But localRooms is flat.
  
  const roomTypeId = reorderedRooms[0].room_type_id;
  const otherRooms = localRooms.value.filter(r => r.room_type_id !== roomTypeId);
  
  // Re-merge. The relative order of other groups doesn't matter much if we re-sort by priority globally later,
  // BUT for UI stability, we might want to keep them.
  // Actually, if we just append `otherRooms` it changes the visual order of groups in `localRooms` array, 
  // but `groupedRooms` computes based on ID so the UI groups won't break.
  
  localRooms.value = [...otherRooms, ...reorderedRooms];
  
  // Mark reordered rooms as changed? Or just mark that order changed.
  // The save function recalculates priority based on the flattened `localRooms` index (or we need to track global index).
  
  // Wait, if we split by group, `localRooms` order implies the global priority if we iterate `localRooms`.
  // If we just concatenated `[...otherRooms, ...reorderedRooms]`, the `reorderedRooms` are now at the END of `localRooms`.
  // This implies they might have lower priority than `otherRooms`. 
  
  // If we want to maintain "global" priority, we need to be careful.
  // However, usually priority is per-hotel. 
  // If the user reorders within a group, they probably only care about order within that group?
  // Or is the "Room Assignment Order" global for the hotel?
  // The `assignment_priority` is likely global or unique per room?
  // `rooms.assignment_priority` is an integer.
  
  // If I reorder within Group A, I want Group A items to stay roughly where they were relative to Group B?
  // Or maybe the UI implies specific order?
  // The UI shows Accordions. The order of Accordions is fixed by `roomTypes` iteration.
  // So visually, Group A is always before Group B (if sorted by room type name/ID).
  
  // So `localRooms` array order represents the `assignment_priority`.
  // If we put `reorderedRooms` at the end, they get highest priority numbers (lowest priority).
  
  // Better approach:
  // Find the indices of the rooms belonging to this group in `localRooms`.
  // Replace them with the reordered items.
  // But `localRooms` might be mixed if sort was unstable or if data came in mixed.
  // If we assume `localRooms` was sorted by priority initially.
  
  // Let's just map `localRooms` to update the ones that moved.
  // Actually, simpler: just update `localRooms` to be `[...others, ...reordered]` is fine IF we don't care about mixing types.
  // But if `assignment_priority` is used for something like "Room Assignment" (auto-assign), 
  // maybe we want rooms of Type A to be prioritized over Type B?
  // If so, the user would drag Type A rooms to the top. 
  // But the UI separates them into Accordions! You can't drag between accordions.
  
  // So the user can only reorder *within* a room type.
  // This implies the `assignment_priority` is relevant *within* that type?
  // OR, does the system auto-assign across types (upgrades)?
  
  // If the user cannot drag between types, then the relative order of types is fixed by... something else?
  // Or maybe `assignment_priority` should be managed globally?
  
  // If I assume `assignment_priority` is global:
  // When I reorder Group A, I probably just want to swap priorities *within* Group A items,
  // preserving the "slots" they occupied in the global list?
  // E.g. if global list is [A1, B1, A2, B2] (priorities 1, 2, 3, 4)
  // And I swap A1 and A2. New list: [A2, B1, A1, B2]? 
  // That swaps priorities 1 and 3.
  
  // This seems safest.
  // 1. Extract all rooms of this type from `localRooms`.
  // 2. Map the new order to the *original indices* of these rooms in `localRooms`.
  //    Wait, if the original indices were [0, 2] (A1, A2).
  //    Reordered is [A2, A1].
  //    We place A2 at index 0, A1 at index 2.
  
  const groupRoomsOldOrder = localRooms.value.filter(r => r.room_type_id === roomTypeId);
  // These items in `localRooms` likely sit in specific indices.
  // We need to find those indices.
  
  // Since `localRooms` might contain objects that are strictly equal to `groupRoomsOldOrder` elements:
  const indices = [];
  localRooms.value.forEach((r, i) => {
    if (r.room_type_id === roomTypeId) indices.push(i);
  });
  
  // indices should be same length as reorderedRooms
  if (indices.length !== reorderedRooms.length) {
    console.warn("Mismatch in reorder count");
    return;
  }
  
  // Now place reorderedRooms into localRooms at those indices
  reorderedRooms.forEach((room, idx) => {
    const targetIndex = indices[idx]; // The global index where the (idx)-th element of the group should go
    localRooms.value[targetIndex] = room;
    room.changed = true; // Mark as changed just in case
  });
  
  // Trigger update
  localRooms.value = [...localRooms.value];
};

const saveChanges = async () => {
  try {
    const changedRooms = localRooms.value.filter(room => room.changed);
    for (const room of changedRooms) {
      await updateRoom(room.id, { // Note: item.id from read.js mapped to room.id in ManageHotel.vue
        room_type_id: room.room_type_id,
        floor: room.floor,
        room_number: room.room_number,
        capacity: room.capacity,
        smoking: room.smoking,
        for_sale: room.for_sale,
        has_wet_area: room.has_wet_area,
        is_staff_room: room.is_staff_room,
        hotel_id: props.hotelId
      });
    }

    // Recalculate priority based on current localRooms order
    // (which we maintained carefully in onRowReorder)
    const orderToSave = localRooms.value.map((room, index) => ({
      id: room.id, // Note: updateRoomAssignmentOrder expects { id: room.id } logic in write.js? 
                   // Wait, write.js loop uses `room.id`.
      assignment_priority: index + 1,
    }));
    
    // Actually updateRoomAssignmentOrder in store/model expects array of rooms. 
    // And the model code iterates: `const room = rooms[i]; ... values = [..., room.id, ...]`
    // So we can just pass `localRooms.value`.
    
    await updateRoomAssignmentOrder(props.hotelId, localRooms.value);
    
    toast.add({ severity: 'success', summary: '成功', detail: '部屋情報が更新されました。', life: 3000 });
    emit('save');
  } catch (e) {
    console.error(e);
    toast.add({ severity: 'error', summary: 'エラー', detail: '保存に失敗しました。', life: 3000 });
  }
};

const resetOrder = () => {
  localRooms.value.sort((a, b) => {
    if (a.floor !== b.floor) {
      return a.floor - b.floor;
    }
    return a.room_number.localeCompare(b.room_number, undefined, { numeric: true, sensitivity: 'base' });
  });
  // Trigger reactivity
  localRooms.value = [...localRooms.value];
};
</script>
