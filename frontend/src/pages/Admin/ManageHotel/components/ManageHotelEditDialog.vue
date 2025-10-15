<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :modal="true" header="ホテル編集" :style="{ width: '75vw' }" class="p-fluid">
    <Card>
      <template #content>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col">
            <label for="email" class="font-medium mb-2 block">正式名称</label>
            <InputText id="formal_name" v-model="localSelectedHotel.formal_name" required />
          </div>
          <div class="flex flex-col">
            <label for="email" class="font-medium mb-2 block">名称</label>
            <InputText id="name" v-model="localSelectedHotel.name" required />
          </div>
          <div class="flex flex-col">
            <label for="email" class="font-medium mb-2 block">メールアドレス</label>
            <InputText id="email" v-model="localSelectedHotel.email" required />
          </div>
          <div class="flex flex-col">
            <label for="phone_number" class="font-medium mb-2 block">電話番号</label>
            <InputMask id="phone_number" v-model="localSelectedHotel.phone_number" mask="(999) 999-9999" required />
          </div>
          <div class="flex flex-col">
            <label for="postal_code" class="font-medium mb-2 block">郵便番号</label>
            <InputText id="postal_code" v-model="localSelectedHotel.postal_code" />
          </div>
          <div class="flex flex-col">
            <label for="address" class="font-medium mb-2 block">住所</label>
            <InputText id="address" v-model="localSelectedHotel.address" />
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
                :disabled="!localSelectedHotel.google_drive_url" />
            </div>
            <div class="p-inputgroup">
              <InputText id="google_drive_url" v-model="localSelectedHotel.google_drive_url" fluid />
            </div>
          </div>
          <div class="flex flex-col">
            <label for="latitude" class="font-medium mb-2 block">緯度</label>
            <InputNumber id="latitude" v-model="localSelectedHotel.latitude" :minFractionDigits="6" />
          </div>
          <div class="flex flex-col">
            <label for="longitude" class="font-medium mb-2 block">経度</label>
            <InputNumber id="longitude" v-model="localSelectedHotel.longitude" :minFractionDigits="6" />
          </div>
          <div class="flex flex-col">
            <label for="facility_type" class="font-medium mb-2 block">施設区分</label>
            <InputText id="facility_type" v-model="localSelectedHotel.facility_type" disabled />
          </div>
          <div class="flex flex-col">
            <label for="open_date" class="font-medium mb-2 block">オープン日</label>
            <DatePicker id="open_date" v-model="localSelectedHotel.open_date" dateFormat="yy-mm-dd" disabled />
          </div>
          <div class="flex flex-col">
            <label for="sort_order" class="font-medium mb-2 block">表示順</label>
            <InputNumber id="sort_order" v-model="localSelectedHotel.sort_order" />
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
              <InputText v-model="localSelectedHotel.bank_name" fluid />
              <label>銀行名</label>
            </FloatLabel>
          </div>
          <div class="col-span-3 mt-6">
            <FloatLabel>
              <InputText v-model="localSelectedHotel.bank_branch_name" fluid />
              <label>支店名</label>
            </FloatLabel>
          </div>
          <div class="col-span-2 mt-6">
            <FloatLabel>
              <InputText v-model="localSelectedHotel.bank_account_type" fluid />
              <label>口座種類</label>
            </FloatLabel>
          </div>
          <div class="col-span-3 mt-6">
            <FloatLabel>
              <InputText v-model="localSelectedHotel.bank_account_number" fluid />
              <label>口座番号</label>
            </FloatLabel>
          </div>
          <div class="col-span-6 mt-6">
            <FloatLabel>
              <InputText v-model="localSelectedHotel.bank_account_name" fluid />
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
        <PlanVisibilitySettings :hotelId="localSelectedHotel.id" v-if="localSelectedHotel && localSelectedHotel.id" />
      </template>
    </Card>

    <template #footer>
      <Button label="保存" icon="pi pi-check" @click="saveHotel" class="p-button-success p-button-text p-button-sm" />
      <Button label="キャンセル" icon="pi pi-times" @click="$emit('update:visible', false)"
        class="p-button-danger p-button-text p-button-sm" text />
    </template>

  </Dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { useHotelStore } from '@/composables/useHotelStore';
import { useToast } from 'primevue/usetoast';
import { Panel, Dialog, Card, DataTable, Column, FloatLabel, Textarea, InputText, InputNumber, DatePicker, InputMask, Checkbox, Select, Button, Accordion, AccordionPanel, AccordionHeader, AccordionContent, Divider } from 'primevue';
import PlanVisibilitySettings from './PlanVisibilitySettings.vue';

const props = defineProps({
  visible: Boolean,
  selectedHotel: Object,
});

const emit = defineEmits(['update:visible', 'hotel-updated']);

const toast = useToast();
const { fetchHotelSiteController, editHotel, editHotelSiteController } = useHotelStore();
const authToken = localStorage.getItem('authToken');

const localSelectedHotel = ref({});
const siteController = ref(null);
const siteControllerNewEntry = reactive({
  hotel_id: '',
  name: 'TL-リンカーン',
  user_id: '',
  password: ''
});

watch(() => props.visible, async (newValue) => {
  if (newValue && props.selectedHotel) {
    localSelectedHotel.value = { ...props.selectedHotel };
    localSelectedHotel.value.facility_type = localSelectedHotel.value.facility_type === 'New' ? '新築' : '中古';
    localSelectedHotel.value.open_date = new Date(localSelectedHotel.value.open_date);
    localSelectedHotel.value.sort_order = localSelectedHotel.value.sort_order || 0;

    siteControllerReset();
    siteController.value = await fetchHotelSiteController(localSelectedHotel.value.id);
    siteControllerNewEntry.hotel_id = localSelectedHotel.value.id;
  }
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
  if (siteControllerNewEntry.name && siteControllerNewEntry.user_id && siteControllerNewEntry.password) {
    siteController.value.push({ ...siteControllerNewEntry })
    siteControllerNewEntry.name = 'TL-リンカーン';
    siteControllerNewEntry.user_id = '';
    siteControllerNewEntry.password = '';
  }
};

const siteControllerDeleteEntry = (index) => {
  siteController.value.splice(index, 1)
};

const saveHotel = async () => {
  const names = siteController.value.map(item => item.name)
  const hasDuplicate = names.length !== new Set(names).size

  if (hasDuplicate) {
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'サイトコントローラー二重登録はできません。例えば、TL-リンカーンは一つしか登録できません。',
      life: 3000
    })
    return
  }

  try {
    await editHotel(localSelectedHotel.value.id, localSelectedHotel.value);
    await editHotelSiteController(localSelectedHotel.value.id, siteController.value);
    emit('hotel-updated');
    emit('update:visible', false);
    toast.add({ severity: 'success', summary: '成功', detail: 'ホテル更新されました。', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルの保存に失敗しました', life: 3000 });
  }
};

const openGoogleDriveUrl = () => {
  if (localSelectedHotel.value.google_drive_url) {
    window.open(localSelectedHotel.value.google_drive_url, '_blank');
  }
};
</script>
