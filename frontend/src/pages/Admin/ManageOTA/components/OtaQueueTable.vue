<template>
  <div>
    <p class="text-sm text-gray-500 mb-2">※デフォルトでは最新100件を表示しますが、検索機能で過去のエントリーから最大500件まで検索可能です。</p>

    <!-- Filter Section (Accounting Style) -->
    <div
      class="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-3 border-b border-slate-100 dark:border-slate-800 mb-4 rounded-t-xl">
      <div class="flex flex-wrap gap-4 items-center">
        <span class="text-[10px] font-bold text-slate-400 uppercase w-12">ステータス:</span>
        <div class="flex gap-1">
          <Button label="すべて" :severity="statusFilter === 'all' ? 'primary' : 'secondary'" size="small" text
            @click="statusFilter = 'all'" class="!py-1 !px-3 text-xs" />
          <Button label="失敗" :severity="statusFilter === 'failed' ? 'danger' : 'secondary'" size="small" text
            @click="statusFilter = 'failed'" class="!py-1 !px-3 text-xs" />
        </div>
      </div>
      <div class="flex flex-wrap gap-4 items-center">
        <span class="text-[10px] font-bold text-slate-400 uppercase w-12">検索:</span>
        <div class="flex gap-2">
          <InputText v-model="searchQuery" placeholder="予約IDまたは予約者名" class="!py-1 !px-3 text-xs w-64"
            @keyup.enter="handleSearch" :disabled="isLoading" />
          <Button icon="pi pi-search" size="small" @click="handleSearch" severity="secondary" class="!py-1 !px-3"
            :loading="isLoading" />
          <Button v-if="searchQuery" icon="pi pi-times" size="small" @click="clearSearch" severity="secondary" text
            class="!py-1 !px-3" :disabled="isLoading" />
        </div>
      </div>
      <div v-if="errorMessage" class="text-red-500 text-xs mt-1">
        {{ errorMessage }}
      </div>
    </div>

    <DataTable :value="filteredOtaQueue" :paginator="true" :rows="15" :rowsPerPageOptions="[15, 25, 50]"
      v-model:filters="filters" filterDisplay="row" class="p-datatable-sm">
      <Column header="詳細" class="w-16">
        <template #body="slotProps">
          <Button icon="pi pi-eye" class="p-button-rounded p-button-text" @click="showRowDetails(slotProps.data)" />
        </template>
      </Column>
      <Column field="created_at" header="作成日時" sortable>
        <template #body="slotProps">
          {{ formatDateTime(slotProps.data.created_at) }}
        </template>
      </Column>
      <Column field="status" header="ステータス" sortable>
        <template #body="slotProps">
          <Badge :severity="statusSeverity(slotProps.data.status)"
            :value="getStatusInJapanese(slotProps.data.status)" />
        </template>
      </Column>
      <Column field="ota_reservation_id" header="予約ID" sortable>
        <template #body="slotProps">
          <div class="flex flex-col gap-1">
            <span>{{ slotProps.data.ota_reservation_id }}</span>
            <Tag :severity="classificationSeverity(slotProps.data.data_classification)"
              :value="getClassificationInJapanese(slotProps.data.data_classification)"
              class="w-fit text-[9px] !bg-transparent border px-1" />
          </div>
        </template>
      </Column>
      <Column field="booker_name" header="予約者名" sortable></Column>
      <Column field="hotel_name" header="ホテル名" sortable :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <Select v-model="filterModel.value" :options="hotels" optionLabel="name" optionValue="name"
            placeholder="ホテルで絞り込み" class="p-column-filter" :showClear="true" @change="filterCallback()" fluid />
        </template>
      </Column>
    </DataTable>

    <!-- Details Dialog -->
    <Dialog v-model:visible="displayDialog" header="予約キュー詳細" :modal="true" :style="{ width: '70vw' }">
      <div v-if="selectedRow">
        <Fieldset legend="基本情報">
          <div class="grid grid-cols-3 gap-4">
            <div><strong>ID:</strong> {{ selectedRow.id }}</div>
            <div><strong>ホテル名:</strong> {{ selectedRow.hotel_name }}</div>
            <div><strong>予約ID:</strong> {{ selectedRow.ota_reservation_id }}</div>
            <div>
              <strong>ステータス:</strong>
              <Badge :severity="statusSeverity(selectedRow.status)" :value="getStatusInJapanese(selectedRow.status)"
                class="ml-2" />
            </div>
            <div>
              <strong>種別:</strong>
              <Tag :severity="classificationSeverity(selectedRow.data_classification)"
                :value="getClassificationInJapanese(selectedRow.data_classification)"
                class="ml-2 !bg-transparent border px-2" />
            </div>
            <div><strong>作成日時:</strong> {{ formatDateTime(selectedRow.created_at) }}</div>
            <div class="col-span-3"><strong>予約者名:</strong> {{ selectedRow.booker_name }}</div>
          </div>
        </Fieldset>

        <Fieldset v-if="formattedTelegramData" legend="通信欄 (Telegram Data)" class="mt-4">
          <pre class="telegram-display">{{ formattedTelegramData }}</pre>
        </Fieldset>

        <Fieldset legend="予約データ (JSON)" class="mt-4">
          <pre class="json-display">{{ JSON.stringify(selectedRow.reservation_data, null, 2) }}</pre>
        </Fieldset>
      </div>
      <template #footer>
        <Button label="閉じる" icon="pi pi-times" severity="secondary" @click="displayDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { onMounted, computed, ref } from 'vue';
import { useXMLStore } from '@/composables/useXMLStore';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Badge from 'primevue/badge';
import Select from 'primevue/select';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Fieldset from 'primevue/fieldset';
import Tag from 'primevue/tag';
import { FilterMatchMode } from '@primevue/core/api';

const props = defineProps({
  hotelId: {
    type: Number,
    default: null,
  },
});

const { otaQueue, fetchOtaQueue } = useXMLStore();
const filters = ref({
  hotel_name: { value: null, matchMode: FilterMatchMode.EQUALS },
});

// State for filtering and dialog
const statusFilter = ref('all');
const searchQuery = ref('');
const displayDialog = ref(false);
const selectedRow = ref(null);
const isLoading = ref(false);
const errorMessage = ref('');

const handleSearch = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    await fetchOtaQueue(searchQuery.value);
  } catch (err) {
    console.error('Failed to search OTA queue:', err);
    errorMessage.value = 'データの検索に失敗しました。';
  } finally {
    isLoading.value = false;
  }
};

const clearSearch = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  searchQuery.value = '';
  try {
    await fetchOtaQueue();
  } catch (err) {
    console.error('Failed to clear search and fetch OTA queue:', err);
    errorMessage.value = 'データの取得に失敗しました。';
  } finally {
    isLoading.value = false;
  }
};

const hotels = computed(() => {
  const hotelMap = new Map();
  otaQueue.value.forEach(item => {
    hotelMap.set(item.hotel_id, { id: item.hotel_id, name: item.hotel_name });
  });
  return Array.from(hotelMap.values());
});

const filteredOtaQueue = computed(() => {
  let queue = otaQueue.value;

  // Property based filter
  if (props.hotelId) {
    queue = queue.filter(item => item.hotel_id === props.hotelId);
  }

  // Status filter (button based)
  if (statusFilter.value !== 'all') {
    queue = queue.filter(item => item.status === statusFilter.value);
  }

  return queue;
});

const formattedTelegramData = computed(() => {
  const data = selectedRow.value?.reservation_data;
  if (!data) return null;

  // Try different paths for TelegramData based on common structures
  const telegramData =
    data?.RisaplsInformation?.RisaplsCommonInformation?.Basic?.TelegramData ||
    data?.BasicInformation?.TelegramData;

  if (!telegramData) return null;

  // Replace literal \r\n or ¥r¥n with real \n
  return telegramData.replace(/\\r\\n/g, '\n').replace(/¥r¥n/g, '\n');
});

const showRowDetails = (row) => {
  selectedRow.value = row;
  displayDialog.value = true;
};

const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('ja-JP');
};

const statusMapping = {
  pending: '保留中',
  processed: '処理済み',
  failed: '失敗',
};

const statusSeverity = (status) => {
  switch (status) {
    case 'pending':
      return 'warn';
    case 'processed':
      return 'success';
    case 'failed':
      return 'danger';
    default:
      return 'info';
  }
};

const getStatusInJapanese = (status) => {
  return statusMapping[status] || status;
};

const classificationMapping = {
  NewBookReport: '新規予約',
  ModificationReport: '予約変更',
  CancellationReport: '予約取消',
};

const classificationSeverity = (classification) => {
  switch (classification) {
    case 'NewBookReport':
      return 'success';
    case 'ModificationReport':
      return 'info';
    case 'CancellationReport':
      return 'danger';
    default:
      return 'secondary';
  }
};

const getClassificationInJapanese = (classification) => {
  return classificationMapping[classification] || classification || '不明';
};

onMounted(() => {
  fetchOtaQueue();
});
</script>

<style scoped>
.json-display {
  text-align: left;
  white-space: pre-wrap;
  overflow-x: auto;
  max-width: 100%;
  background-color: #f8f8f8;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8rem;
}

.dark .json-display {
  background-color: #1e293b;
  border-color: #334155;
  color: #f8fafc;
}

.telegram-display {
  text-align: left;
  white-space: pre-wrap;
  overflow-x: auto;
  max-width: 100%;
  background-color: #fff9db;
  padding: 10px;
  border: 1px solid #fab005;
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
}

.dark .telegram-display {
  background-color: #2d2400;
  border-color: #8a6d00;
  color: #fff;
}
</style>
