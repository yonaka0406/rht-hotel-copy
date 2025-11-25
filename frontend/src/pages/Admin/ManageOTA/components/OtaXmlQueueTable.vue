<template>
  <div>
    <p class="text-sm text-gray-500 mb-2">※最新のキューエントリーのみ表示されます。</p>
    <DataTable
      :value="otaXmlQueueData"
      :paginator="true"
      :rows="10"
      :rowsPerPageOptions="[10, 25, 50]"
      v-model:filters="filters"
      filterDisplay="row"
      :loading="otaXmlQueueLoading"
      dataKey="ota_xml_queue_id"
      sortField="status"
      :sortOrder="-1"
    >
      <Column header="詳細">
        <template #body="slotProps">
          <Button
            icon="pi pi-eye"
            class="p-button-rounded p-button-text"
            @click="showRowDetails(slotProps.data)"
          />
        </template>
      </Column>
      <Column field="hotel_name" header="ホテル名" :sortable="true"></Column>
      <Column header="調整期間" :sortable="true" style="min-width: 12rem">
        <template #body="{ data }">
          {{ getMinMaxAdjustmentDate(data.xml_body) }}
        </template>
      </Column>
      <Column field="status" header="ステータス" :sortable="true" style="min-width: 10rem">
        <template #body="{ data }">
          <Badge :severity="statusSeverity(data.status)" :value="getStatusInJapanese(data.status)" />
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <Select
            v-model="filterModel.value"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="ステータスで絞り込み"
            class="p-column-filter"
            :showClear="true"
            @change="filterCallback()"
            fluid
          />
        </template>
      </Column>
      <Column field="created_at" header="作成日時" :sortable="true" style="min-width: 10rem">
        <template #body="{ data }">
          {{ formatDateTimeWithSeconds(data.created_at) }}
        </template>
      </Column>    
    </DataTable>

    <Dialog v-model:visible="displayDialog" header="詳細" :modal="true" :style="{ width: '70vw' }">
      <div v-if="selectedRow">
        <Fieldset legend="キュー詳細">
          <div class="grid grid-cols-3 gap-4">
            <div class="col-span-3">
              <strong>ホテル名:</strong> {{ selectedRow.hotel_name }}
            </div>
            <div>
              <strong>ID:</strong> {{ selectedRow.id }}
            </div>
            <div>
              <strong>ステータス:</strong>
              <Badge :severity="statusSeverity(selectedRow.status)" :value="getStatusInJapanese(selectedRow.status)" class="ml-2" />
            </div>
            <div>
              <strong>リトライ数:</strong> {{ selectedRow.retries }}
            </div>
            <div class="col-span-3">
              <strong>最終エラー:</strong> <small v-if="!selectedRow.last_error">エラーなし</small><span v-else>{{ selectedRow.last_error }}</span>
            </div>
            <div class="col-span-3">
              <strong>作成日時:</strong> {{ formatDateTimeWithSeconds(selectedRow.created_at) }}
            </div>
            <div class="col-span-3">
              <strong>処理日時:</strong> {{ formatDateTimeWithSeconds(selectedRow.processed_at) || '未処理' }}
            </div>
            <div class="col-span-3">
              <strong>XMLボディ:</strong>
              <Message severity="info" :closable="false" class="mb-2">
                `adjustmentDate`タグは更新対象日を、`remainingCount`タグは更新対象数を、`netRmTypeGroupCode`タグは部屋タイプを指します。
              </Message>
              <pre class="xml-display">{{ selectedRow.xml_body }}</pre>
            </div>
          </div>
        </Fieldset>
      </div>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { formatDateTime, formatDateTimeWithSeconds } from '../../../../utils/dateUtils';
import { FilterMatchMode } from '@primevue/core/api';
import { useXMLStore } from '../../../../composables/useXMLStore';

// PrimeVue Components
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Badge from 'primevue/badge';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Fieldset from 'primevue/fieldset';
import Message from 'primevue/message';

const { otaXmlQueueData, fetchOtaXmlQueue, otaXmlQueueLoading } = useXMLStore();

const displayDialog = ref(false);
const selectedRow = ref(null);

const showRowDetails = (row) => {
  selectedRow.value = row;
  displayDialog.value = true;
};

const filters = ref({
  hotel_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  status: { value: null, matchMode: FilterMatchMode.EQUALS },
});

const statusOptions = ref([
  { label: 'すべて', value: null },
  { label: '完了', value: 'completed' },
  { label: '保留中', value: 'pending' },
  { label: '失敗', value: 'failed' },
  { label: '処理中', value: 'processing' },
]);

onMounted(() => {
  fetchOtaXmlQueue();
});

const dialogFieldLabels = {
  id: 'ID',
  hotel_name: 'ホテル名',
  status: 'ステータス',
  retries: 'リトライ数',
  last_error: '最終エラー',
  created_at: '作成日時',
  processed_at: '処理日時',
  xml_body: 'XMLボディ',
  current_request_id: '現在のリクエストID',
  service_name: 'サービス名',
  // Add other fields as needed
};


const getAdjustmentDates = (xmlString) => {
  if (!xmlString) return [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");
    const adjustmentDateElements = xmlDoc.getElementsByTagName("adjustmentDate");
    const dates = [];
    for (let i = 0; i < adjustmentDateElements.length; i++) {
      dates.push(adjustmentDateElements[i].textContent);
    }
    return dates;
  } catch (error) {
    console.error("Error parsing XML:", error);
    return [];
  }
};

const getMinMaxAdjustmentDate = (xmlString) => {
  const dates = getAdjustmentDates(xmlString);
  if (dates.length === 0) return 'N/A';

  const sortedDates = dates.sort();
  const minDate = sortedDates[0];
  const maxDate = sortedDates[sortedDates.length - 1];

  const formatDateToYYMMDD = (dateString) => {
    if (!dateString || dateString.length !== 8) return '';
    const formattedDateString = `${dateString.slice(0, 4)}-${dateString.slice(4, 6)}-${dateString.slice(6, 8)}`;
    const date = new Date(formattedDateString);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const formattedMinDate = formatDateToYYMMDD(minDate);
  const formattedMaxDate = formatDateToYYMMDD(maxDate);

  if (formattedMinDate && formattedMaxDate) {
    return `${formattedMinDate} ~ ${formattedMaxDate}`;
  }
  return 'N/A';
};

const statusMapping = {
  completed: '完了',
  pending: '保留中',
  failed: '失敗',
  processing: '処理中',
};

const statusSeverity = (status) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
      return 'warn';
    case 'failed':
      return 'danger';
    case 'processing':
      return 'info';
    default:
      return 'secondary';
  }
};

const getStatusInJapanese = (status) => {
  return statusMapping[status] || status;
};

</script>

<style scoped>
  .xml-display {
    text-align: left;
    white-space: pre-wrap; /* Allows text to wrap */
    overflow-x: auto; /* Adds horizontal scrollbar if needed */
    max-width: 100%; /* Ensures it doesn't exceed its container */
    background-color: #f8f8f8; /* Light background for better readability */
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: monospace; /* Monospaced font for code */
  }
</style>