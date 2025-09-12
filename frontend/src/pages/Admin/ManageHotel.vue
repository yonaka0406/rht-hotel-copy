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

  <Dialog v-model:visible="dialogVisible" :modal="true" header="ホテル編集" :style="{ width: '75vw' }" class="p-fluid">
    <Card>
      <template #content>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col">
            <label for="email" class="font-medium mb-2 block">正式名称</label>
            <InputText id="formal_name" v-model="selectedHotel.formal_name" required />
          </div>
          <div class="flex flex-col">
            <label for="email" class="font-medium mb-2 block">名称</label>
            <InputText id="name" v-model="selectedHotel.name" required />
          </div>
          <div class="flex flex-col">
            <label for="email" class="font-medium mb-2 block">メールアドレス</label>
            <InputText id="email" v-model="selectedHotel.email" required />
          </div>
          <div class="flex flex-col">
            <label for="phone_number" class="font-medium mb-2 block">電話番号</label>
            <InputMask id="phone_number" v-model="selectedHotel.phone_number" mask="(999) 999-9999" required />
          </div>
          <div class="flex flex-col">
            <label for="postal_code" class="font-medium mb-2 block">郵便番号</label>
            <InputText id="postal_code" v-model="selectedHotel.postal_code" />
          </div>
          <div class="flex flex-col">
            <label for="address" class="font-medium mb-2 block">住所</label>
            <InputText id="address" v-model="selectedHotel.address" />
          </div>
          <div class="flex flex-col">
            <div class="flex justify-between items-center mb-2">
              <label for="google_drive_url" class="font-medium flex items-center">
                <span class="p-inputgroup-addon">
                  <i class="pi pi-google mr-1"></i>
                </span>
                グーグルドライブURL
              </label>
              <Button icon="pi pi-external-link" @click="openGoogleDriveUrl"
                :disabled="!selectedHotel.google_drive_url" />
            </div>
            <div class="p-inputgroup">
              <InputText id="google_drive_url" v-model="selectedHotel.google_drive_url" fluid />
            </div>
          </div>
          <div class="flex flex-col">
            <label for="latitude" class="font-medium mb-2 block">緯度</label>
            <InputNumber id="latitude" v-model="selectedHotel.latitude" :minFractionDigits="6" />
          </div>
          <div class="flex flex-col">
            <label for="longitude" class="font-medium mb-2 block">経度</label>
            <InputNumber id="longitude" v-model="selectedHotel.longitude" :minFractionDigits="6" />
          </div>
          <div class="flex flex-col">
            <label for="facility_type" class="font-medium mb-2 block">施設区分</label>
            <InputText id="facility_type" v-model="selectedHotel.facility_type" disabled />
          </div>
          <div class="flex flex-col">
            <label for="open_date" class="font-medium mb-2 block">オープン日</label>
            <DatePicker id="open_date" v-model="selectedHotel.open_date" dateFormat="yy-mm-dd" disabled />
          </div>
          <div class="flex flex-col">
            <label for="sort_order" class="font-medium mb-2 block">表示順</label>
            <InputNumber id="sort_order" v-model="selectedHotel.sort_order" />
          </div>
        </div>
      </template>
    </Card>

    <Divider />

    <Card>
      <template #content>
        <h2 class="text-xl font-bold mb-2">御振込先情報</h2>

        <div class="grid grid-cols-12 gap-2 mb-4">
          <div class="col-span-3 mt-6">
            <FloatLabel>
              <InputText v-model="selectedHotel.bank_name" fluid />
              <label>銀行名</label>
            </FloatLabel>
          </div>
          <div class="col-span-3 mt-6">
            <FloatLabel>
              <InputText v-model="selectedHotel.bank_branch_name" fluid />
              <label>支店名</label>
            </FloatLabel>
          </div>
          <div class="col-span-2 mt-6">
            <FloatLabel>
              <InputText v-model="selectedHotel.bank_account_type" fluid />
              <label>口座種類</label>
            </FloatLabel>
          </div>
          <div class="col-span-3 mt-6">
            <FloatLabel>
              <InputText v-model="selectedHotel.bank_account_number" fluid />
              <label>口座番号</label>
            </FloatLabel>
          </div>
          <div class="col-span-6 mt-6">
            <FloatLabel>
              <InputText v-model="selectedHotel.bank_account_name" fluid />
              <label>口座名義</label>
            </FloatLabel>
          </div>

        </div>
      </template>
    </Card>

    <Divider />

    <Card>
      <template #content>
        <h2 class="text-xl font-bold mb-2">サイトコントローラー連携情報</h2>

        <div class="grid grid-cols-7 gap-2 mb-4">
          <div class="col-span-2 mt-6">
            <FloatLabel>
              <InputText v-model="siteControllerNewEntry.name" fluid disabled />
              <label>サイトコントローラー名</label>
            </FloatLabel>
          </div>
          <div class="col-span-2 mt-6">
            <FloatLabel>
              <InputText v-model="siteControllerNewEntry.user_id" fluid />
              <label>ユーザー</label>
            </FloatLabel>
          </div>
          <div class="col-span-2 mt-6">
            <FloatLabel>
              <InputText v-model="siteControllerNewEntry.password" fluid />
              <label>パスワード</label>
            </FloatLabel>
          </div>
          <div class="col-span-1 flex justify-center items-center mt-6">
            <Button @click="siteControllerAddEntry">追加</Button>
          </div>
        </div>

        <DataTable :value="siteController" class="p-datatable-sm">
          <Column field="name" header="サイトコントローラー名" />
          <Column field="user_id" header="ユーザー" />
          <Column field="password" header="パスワード" />
          <Column header="操作">
            <template #body="slotProps">
              <Button @click="siteControllerDeleteEntry(slotProps.index)" severity="danger" size="sm" icon="pi pi-trash"
                outlined />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Divider />

    <Card>
      <template #title>
        プラン表示設定
      </template>
      <template #content>
        <PlanVisibilitySettings :hotelId="selectedHotel.id" v-if="selectedHotel && selectedHotel.id" />
      </template>
    </Card>

    <template #footer>
      <Button label="保存" icon="pi pi-check" @click="saveHotel" class="p-button-success p-button-text p-button-sm" />
      <Button label="キャンセル" icon="pi pi-times" @click="dialogVisible = false"
        class="p-button-danger p-button-text p-button-sm" text />
    </template>

  </Dialog>

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
const { hotels, fetchHotels, fetchHotelSiteController, editHotel, editHotelSiteController } = useHotelStore();

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { Panel, Dialog, Card, DataTable, Column, FloatLabel, Textarea, InputText, InputNumber, DatePicker, InputMask, Checkbox, Select, Button, Accordion, AccordionPanel, AccordionHeader, AccordionContent, Divider } from 'primevue';

// Components
import PlanVisibilitySettings from './components/PlanVisibilitySettings.vue';
import ManageHotelRoomsDialog from './components/dialogs/ManageHotelRoomsDialog.vue';
import ManageHotelAddRoomDialog from './components/dialogs/ManageHotelAddRoomDialog.vue';

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
const siteController = ref(null);
const siteControllerNewEntry = ref({
  hotel_id: '',
  name: 'TL-リンカーン',
  user_id: '',
  password: ''
});
const siteControllerReset = () => {
  siteController.value = [{
    hotel_id: null,
    name: null,
    user_id: null,
    password: null,
  }]
};
const siteControllerAddEntry = () => {
  if (siteControllerNewEntry.value.name && siteControllerNewEntry.value.user_id && siteControllerNewEntry.value.password) {
    siteController.value.push({ ...siteControllerNewEntry.value })
    siteControllerNewEntry.value.name = 'TL-リンカーン';
    siteControllerNewEntry.value.user_id = '';
    siteControllerNewEntry.value.password = '';
  }
};
const siteControllerDeleteEntry = (index) => {
  siteController.value.splice(index, 1)
};

const selectHotelData = async (hotel) => {
  selectedHotel.value = { ...hotel };
  selectedHotel.value.facility_type = selectedHotel.value.facility_type === 'New' ? '新築' : '中古';
  selectedHotel.value.open_date = new Date(selectedHotel.value.open_date);
  selectedHotel.value.sort_order = selectedHotel.value.sort_order || 0;

  siteControllerReset();
  siteController.value = await fetchHotelSiteController(selectedHotel.value.id);
  siteControllerNewEntry.value.hotel_id = selectedHotel.value.id;

  dialogVisible.value = true;
};
const saveHotel = async () => {
  const names = siteController.value.map(item => item.name)
  const hasDuplicate = names.length !== new Set(names).size

  if (hasDuplicate) {
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'サイトコントローラー二重登録はできません。',
      life: 3000
    })
    return
  }

  try {
    await editHotel(selectedHotel.value.id, selectedHotel.value);
    await editHotelSiteController(selectedHotel.value.id, siteController.value);
    await fetchHotels();
    dialogVisible.value = false;
    toast.add({ severity: 'success', summary: '成功', detail: 'ホテル更新されました。', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルの保存に失敗しました', life: 3000 });
  }
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
const selectedHotel = ref(null);
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

const openGoogleDriveUrl = () => {
  if (selectedHotel.value.google_drive_url) {
    window.open(selectedHotel.value.google_drive_url, '_blank');
  }
};

onMounted(async () => {
  await fetchHotels();
});
</script>

<style scoped>
/* Add any specific styles for the ManageHotel page here */
</style>