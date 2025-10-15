<template>
  <div class="p-4">
    <Panel header="ホテル編集">
      <DataTable :value="hotels" class="p-datatable-sm" responsiveLayout="scroll">
        <Column field="formal_name" header="正式名称"></Column>
        <Column field="name" header="名称"></Column>
        <Column field="email" header="メールアドレス"></Column>
        <Column field="phone_number" header="電話番号"></Column>
        <Column header="操作">
          <template #body="slotProps">
            <Button icon="pi pi-pencil" class="p-button-text p-button-sm" @click="selectHotelData(slotProps.data)"
              v-tooltip="'ホテル編集'" />
            <Button icon="pi pi-tag" class="p-button-text p-button-sm" @click="editRoomTypes(slotProps.data)"
              v-tooltip="'部屋タイプ編集'" />
            <Button icon="pi pi-eye" class="p-button-text p-button-sm" @click="editRooms(slotProps.data)"
              v-tooltip="'部屋表示'" />
          </template>
        </Column>
      </DataTable>
    </Panel>
  </div>

  <ManageHotelEditDialog
    v-model:visible="dialogVisible"
    :selectedHotel="selectedHotel"
    @hotel-updated="onHotelUpdated"
  />

  <Dialog v-model:visible="roomTypesDialogVisible" :modal="true" header="部屋タイプ編集" :style="{ width: '600px' }"
    class="p-fluid">
    <template #header>
      <h2 class="text-lg font-bold ">部屋タイプ編集</h2>
      <Button label="部屋タイプ追加" icon="pi pi-plus" @click="openRoomTypeDialog" class="p-button-sm m-2" />
    </template>
    <p>保存する前に必ず ENTER キーまたは TAB キーを押して変更を確認してください。</p><br />
    <DataTable ref="roomTypesDataTable" :value="roomTypes" editable editMode="cell" class="p-datatable-sm"
      responsiveLayout="scroll" @cell-edit-complete="onCellEditComplete">
      <Column field="name" header="名称">
        <template #editor="slotProps">
          <InputText v-model="slotProps.data.name" />
        </template>
      </Column>
      <Column field="description" header="詳細">
        <template #editor="slotProps">
          <Textarea v-model="slotProps.data.description" autoResize />
        </template>
      </Column>
    </DataTable>
    <template #footer>
      <Button label="保存" icon="pi pi-check" @click="saveRoomTypes" class="p-button-success p-button-text p-button-sm" />
      <Button label="閉じる" icon="pi pi-times" @click="roomTypesDialogVisible = false"
        class="p-button-danger p-button-text p-button-sm" />
    </template>
  </Dialog>

  <Dialog v-model:visible="roomTypeDialog" :modal="true" header="部屋タイプ追加" :style="{ width: '450px' }" class="p-fluid">
    <div class="flex flex-col gap-4">
      <div class="flex flex-col">
        <label for="name" class="font-medium mb-2 block">部屋タイプ名 *</label>
        <InputText id="name" v-model="newRoomType.name" required autofocus fluid />
      </div>

      <div class="flex flex-col">
        <label for="description" class="font-medium mb-2 block">詳細</label>
        <Textarea id="description" v-model="newRoomType.description" rows="3" autoResize fluid />
      </div>

    </div>

    <template #footer>
      <Button label="追加" icon="pi pi-plus" @click="saveRoomType" class="p-button-success p-button-text p-button-sm" />
      <Button label="閉じる" icon="pi pi-times" @click="roomTypeDialog = false"
        class="p-button-danger p-button-text p-button-sm" />
    </template>
  </Dialog>

  <ManageHotelRoomsDialog
    ref="roomsDialogRef"
    v-model:visible="roomsDialogVisible"
    :hotelId="selectedHotel?.id"
    :rooms="rooms"
    :roomTypes="roomTypes"
    @save="saveRoomChanges"
    @open-new-room-dialog="openRoomDialog"
  />

  <ManageHotelAddRoomDialog
    v-model:visible="roomDialog"
    :room-types="roomTypes"
    @save="saveRoom"
  />
</template>

<script setup>
// Vue
import { ref, reactive, onMounted } from 'vue';

// Stores
import { useHotelStore } from '@/composables/useHotelStore';
const { hotels, fetchHotels } = useHotelStore();

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { Panel, Dialog, Card, DataTable, Column, FloatLabel, Textarea, InputText, InputNumber, DatePicker, InputMask, Checkbox, Select, Button, Accordion, AccordionPanel, AccordionHeader, AccordionContent, Divider } from 'primevue';

// Components
import ManageHotelEditDialog from './components/ManageHotelEditDialog.vue';
import ManageHotelRoomsDialog from './components/ManageHotelRoomsDialog.vue';
import ManageHotelAddRoomDialog from './components/ManageHotelAddRoomDialog.vue';

const authToken = localStorage.getItem('authToken');

// Functions
function onCellEditComplete(event) {
  const { data, newValue, field } = event;
  if (field) {
    data[field] = newValue;
    data.changed = true;
  }
}

// Hotels
const dialogVisible = ref(false);
const selectedHotel = ref(null);

const selectHotelData = async (hotel) => {
  selectedHotel.value = { ...hotel };
  dialogVisible.value = true;
};

const onHotelUpdated = async () => {
  await fetchHotels();
  toast.add({ severity: 'success', summary: '成功', detail: 'ホテル更新されました。', life: 3000 });
};

// Rooms
const roomTypes = ref([]);
const newRoomType = reactive({
  name: '',
  description: ''
});
const rooms = ref([]);
const roomTypesDialogVisible = ref(false);
const roomTypeDialog = ref(false);
const roomsDialogVisible = ref(false);
const roomDialog = ref(false);
const roomsDialogRef = ref(null);

const openRoomDialog = () => {
  roomDialog.value = true;
};

const saveRoom = async (newRoom) => {
  try {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...newRoom,
        hotel_id: selectedHotel.value.id
      }),
    });

    if (response.ok) {
      toast.add({
        severity: 'success',
        summary: '成功',
        detail: '部屋作成されました。',
        life: 3000
      });
      roomDialog.value = false;
      await fetchRoomTypes();
      if (roomsDialogRef.value) {
        roomsDialogRef.value.refreshRooms();
      }
    } else {
      toast.add({ severity: 'error', summary: 'エラー', detail: '部屋の作成に失敗しました', life: 3000 });
    }
  } catch (error) {
    console.error('部屋作成エラー:', error);
    toast.add({ severity: 'error', summary: 'エラー', detail: '部屋の作成に失敗しました', life: 3000 });
  }
};

const fetchRoomTypes = async () => {
  try {
    const response = await fetch(`/api/hotel-rooms/${selectedHotel.value.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    if (!response.ok) {
      throw new Error('部屋タイプの取得に失敗しました');
    }

    const data = await response.json();

    const roomTypesMap = new Map();
    const roomsList = [];

    data.forEach((item) => {
      if (!roomTypesMap.has(item.room_type_id)) {
        roomTypesMap.set(item.room_type_id, {
          id: item.room_type_id,
          name: item.room_type_name,
          description: item.room_type_description,
        });
      }
      const room = {
        id: item.room_id,
        room_number: item.room_number,
        floor: item.room_floor,
        capacity: item.room_capacity,
        smoking: item.room_smoking_idc,
        for_sale: item.room_for_sale_idc,
        has_wet_area: item.room_has_wet_area_idc,
        room_type_id: item.room_type_id,
      };
      roomsList.push(room);
    });

    roomTypes.value = Array.from(roomTypesMap.values());
    rooms.value = roomsList;
  } catch (error) {
    console.error('部屋タイプ取得エラー:', error);
    toast.add({ severity: 'error', summary: 'エラー', detail: '部屋タイプの取得に失敗しました', life: 3000 });
  }
};
const editRooms = async (hotel) => {
  try {
    selectedHotel.value = { ...hotel };
    await fetchRoomTypes(hotel.id);
    roomsDialogVisible.value = true;
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '部屋の取得に失敗しました',
      life: 3000
    });
  }
};
const saveRoomChanges = async () => {
  await fetchRoomTypes();
  roomsDialogVisible.value = false;
  toast.add({
    severity: 'success',
    summary: '成功',
    detail: '部屋更新されました。',
    life: 3000
  });
};
const editRoomTypes = async (hotel) => {
  try {
    selectedHotel.value = { ...hotel };
    await fetchRoomTypes(hotel.id);
    roomTypesDialogVisible.value = true;
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '部屋の取得に失敗しました',
      life: 3000
    });
  }
};
const saveRoomTypes = async () => {
  try {
    const nameSet = new Set();
    for (const roomType of roomTypes.value) {
      if (nameSet.has(roomType.name)) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '部屋タイプ名はユニークである必要があります。', life: 3000 });
        return;
      }
      nameSet.add(roomType.name);
    }
    const changedRoomTypes = roomTypes.value.filter(roomType => roomType.changed);
    for (const roomType of changedRoomTypes) {
      if (roomType.changed) {
        const response = await fetch(`/api/room-type/${roomType.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: roomType.name,
            description: roomType.description,
            hotel_id: selectedHotel.value.id
          }),
        });
        if (response.status !== 200) {
          console.error(`部屋タイプ ${roomType.name} の更新に失敗しました`);
        }
      }
    }
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: '部屋タイプ更新されました。',
      life: 3000
    });
    roomTypesDialogVisible.value = false;
  } catch (error) {
    console.error('部屋タイプ更新エラー:', error);
  }
};
const openRoomTypeDialog = () => {
  Object.assign(newRoomType, {
    name: '',
    description: ''
  });
  roomTypesDialogVisible.value = false;
  roomTypeDialog.value = true;
};
const saveRoomType = async () => {
  const nameSet = new Set();
  for (const roomType of roomTypes.value) {
    nameSet.add(roomType.name);
    if (nameSet.has(newRoomType.name)) {
      toast.add({ severity: 'error', summary: 'エラー', detail: '部屋タイプ名はユニークである必要があります。', life: 3000 });
      return;
    }
  }

  try {
    const response = await fetch('/api/room-types', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newRoomType.name,
        description: newRoomType.description,
        hotel_id: selectedHotel.value.id
      }),
    });

    if (response.ok) {
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: '部屋タイプ作成されました。',
        life: 3000
      });
      roomTypeDialog.value = false;
      await fetchRoomTypes();
      roomTypesDialogVisible.value = true;
    } else {
      toast.add({ severity: 'error', summary: 'エラー', detail: '部屋タイプの作成に失敗しました', life: 3000 });
    }
  } catch (error) {
    console.error('部屋タイプ作成エラー:', error);
    toast.add({ severity: 'error', summary: 'エラー', detail: '部屋タイプの作成に失敗しました', life: 3000 });
  }
};


onMounted(async () => {
  await fetchHotels();
});
</script>

<style scoped>
/* Add any specific styles for the ManageHotel page here */
</style>