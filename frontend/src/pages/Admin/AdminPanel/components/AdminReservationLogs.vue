<template>
  <div class="card">    
    <div class="card-body">
      <div class="mb-4">
        <FloatLabel>
          <DatePicker v-model="selectedDate" inputId="log-date" class="w-full" dateFormat="yy/mm/dd" />
          <label for="log-date">日付を選択</label>
        </FloatLabel>
      </div>
      <div class="flex justify-content-end mb-4">
        <Button label="CSVエクスポート" icon="pi pi-download" @click="exportCsv" />
      </div>
      <DataTable ref="dt" :value="transformedLogsForTable" :loading="loading" responsiveLayout="scroll" emptyMessage="選択した日付にログがありません。"
        paginator :rows="rows" :totalRecords="totalRecords" @page="onPage"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        :rowsPerPageOptions="[10, 20, 50, 100]"
        currentPageReportTemplate="{first}-{last} of {totalRecords}"
        sortField="hotel_name" :sortOrder="1">
        <Column header="予約ID" sortable field="record_id">
          <template #body="slotProps">
            <Button
              :label="slotProps.data.record_id"
              icon="pi pi-external-link"
              class="p-button-sm p-button-text"
              @click="openReservationEdit(slotProps.data.record_id)"
              :disabled="slotProps.data.delete"
            />
          </template>
        </Column>
        <Column field="hotel_id" header="ホテルID" hidden sortable></Column>
        <Column field="hotel_name" header="ホテル名" sortable></Column>
        <Column field="insert" header="作成" sortable>
          <template #body="slotProps">
            <i v-if="slotProps.data.insert" class="pi pi-check-circle" style="color: green;"></i>
            <i v-else class="pi pi-times-circle" style="color: red;"></i>
          </template>
        </Column>
        <Column field="update" header="更新" sortable>
          <template #body="slotProps">
            <i v-if="slotProps.data.update" class="pi pi-check-circle" style="color: green;"></i>
            <i v-else class="pi pi-times-circle" style="color: red;"></i>
          </template>
        </Column>
        <Column field="delete" header="削除" sortable>
          <template #body="slotProps">
            <i v-if="slotProps.data.delete" class="pi pi-check-circle" style="color: green;"></i>
            <i v-else class="pi pi-times-circle" style="color: red;"></i>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import DatePicker from 'primevue/datepicker';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import FloatLabel from 'primevue/floatlabel';
import Button from 'primevue/button'; // Import Button component
import { ref, onMounted, watch, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { formatDate } from '@/utils/dateUtils';
import { useSystemLogs } from '@/composables/useSystemLogs';

const toast = useToast();
const selectedDate = ref(new Date());
const { logs: rawTransformedLogs, loading, fetchLogs: systemLogsFetchLogs } = useSystemLogs();

const transformedLogsForTable = computed(() => {
  if (!rawTransformedLogs.value) return [];
  return Object.entries(rawTransformedLogs.value).map(([record_id, data]) => ({
    record_id,
    hotel_id: data.hotel_id,
    hotel_name: data.hotel_name,
    update: data.UPDATE || false,
    insert: data.INSERT || false,
    delete: data.DELETE || false,
  }));
});

const dt = ref(); // Reference to the DataTable
const rows = ref(10); // Number of rows per page
const totalRecords = ref(0); // Total number of records

const onPage = (event) => {
  rows.value = event.rows;
  console.log('Pagination event:', event);
};

const loadLogs = async () => {
  const date = formatDate(selectedDate.value);
  const response = await systemLogsFetchLogs(date);
  totalRecords.value = Object.keys(response.logs || {}).length;
};

onMounted(() => {
  loadLogs();
});

watch(selectedDate, (newDate) => {
  loadLogs();
});

const exportCsv = () => {
  dt.value.exportCSV();
};

const openReservationEdit = (id) => {
    const url = `/reservations/edit/${id}`;
    window.open(url, '_blank');
};
</script>
