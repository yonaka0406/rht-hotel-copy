<template>
  <div class="card mt-4">
    <DataTable
      :value="otaXmlQueueData"
      :paginator="true"
      :rows="10"
      :rowsPerPageOptions="[10, 25, 50]"
      v-model:filters="filters"
      filterDisplay="row"
      :loading="loading"
      dataKey="ota_xml_queue_id"
      responsiveLayout="scroll"
      stateStorage="session"
      stateKey="otaxmlqueue-table"
    >
      <Column field="hotel_name" header="ホテル名" :sortable="true" style="min-width: 12rem">
        <template #body="{ data }">
          {{ data.hotel_name }}
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            type="text"
            v-model="filterModel.value"
            @keydown.enter="filterCallback()"
            class="p-column-filter"
            placeholder="ホテル名で検索"
          />
        </template>
      </Column>
      <Column field="status" header="ステータス" :sortable="true" style="min-width: 10rem">
        <template #body="{ data }">
          <Badge :severity="getSeverity(data.status)" :value="data.status" />
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            type="text"
            v-model="filterModel.value"
            @keydown.enter="filterCallback()"
            class="p-column-filter"
            placeholder="ステータスで検索"
          />
        </template>
      </Column>
      <Column field="retries" header="リトライ数" :sortable="true" style="min-width: 8rem">
        <template #body="{ data }">
          {{ data.retries }}
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputNumber
            v-model="filterModel.value"
            @keydown.enter="filterCallback()"
            class="p-column-filter"
            placeholder="リトライ数で検索"
          />
        </template>
      </Column>
      <Column field="last_error" header="最新エラー" :sortable="true" style="min-width: 16rem">
        <template #body="{ data }">
          <span v-if="data.last_error">{{ data.last_error }}</span>
          <span v-else>N/A</span>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            type="text"
            v-model="filterModel.value"
            @keydown.enter="filterCallback()"
            class="p-column-filter"
            placeholder="エラーメッセージで検索"
          />
        </template>
      </Column>
      <Column field="created_at" header="作成日時" :sortable="true" style="min-width: 14rem">
        <template #body="{ data }">
          {{ formatDateTime(data.created_at) }}
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            type="text"
            v-model="filterModel.value"
            @keydown.enter="filterCallback()"
            class="p-column-filter"
            placeholder="作成日時で検索"
          />
        </template>
      </Column>
      <Column field="processed_at" header="処理日時" :sortable="true" style="min-width: 14rem">
        <template #body="{ data }">
          <span v-if="data.processed_at">{{ formatDateTime(data.processed_at) }}</span>
          <span v-else>未処理</span>
        </template>
        <template #filter="{ filterModel, filterCallback }">
          <InputText
            type="text"
            v-model="filterModel.value"
            @keydown.enter="filterCallback()"
            class="p-column-filter"
            placeholder="処理日時で検索"
          />
        </template>
      </Column>
      <!-- Add a column for viewing full XML request/response if needed -->
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { FilterMatchMode } from '@primevue/core/api';
import { useXMLStore } from '../../../../../src/composables/useXMLStore';

// PrimeVue Components
import { DataTable, Column, Badge, InputText, InputNumber } from 'primevue';

const { otaXmlQueueData, fetchOtaXmlQueue } = useXMLStore();
const loading = ref(true);

const filters = ref({
  hotel_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
  status: { value: null, matchMode: FilterMatchMode.CONTAINS },
  retries: { value: null, matchMode: FilterMatchMode.EQUALS },
  last_error: { value: null, matchMode: FilterMatchMode.CONTAINS },
  created_at: { value: null, matchMode: FilterMatchMode.CONTAINS },
  processed_at: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

onMounted(() => {
  fetchOtaXmlQueueData();
});

const fetchOtaXmlQueueData = async () => {
  loading.value = true;
  await fetchOtaXmlQueue();
  loading.value = false;
};

const getSeverity = (status) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending':
      return 'info';
    case 'failed':
      return 'danger';
    case 'processing':
      return 'warning';
    default:
      return 'secondary';
  }
};

const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};
</script>

<style scoped>
/* Add any specific styles for this component here */
</style>