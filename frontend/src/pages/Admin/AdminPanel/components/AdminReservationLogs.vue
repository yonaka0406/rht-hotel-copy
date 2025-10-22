<template>
  <div class="card">    
    <div class="card-body">
      <div class="mb-4">
        <FloatLabel>
          <DatePicker v-model="selectedDate" inputId="log-date" class="w-full" dateFormat="yy/mm/dd" />
          <label for="log-date">日付を選択</label>
        </FloatLabel>
      </div>

      <DataTable ref="dt" :value="transformedLogsForTable" :loading="loading" responsiveLayout="scroll" emptyMessage="選択した日付にログがありません。"
        paginator :rows="rows" :totalRecords="totalRecords" @page="onPage" @filter="onFilter"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown CustomExportButton"
        :rowsPerPageOptions="[10, 20, 50, 100]"
        currentPageReportTemplate="{first}-{last} of {totalRecords}"
        sortField="hotel_name" :sortOrder="1"
        v-model:filters="filters" filterDisplay="row">
        <template #paginatorend>
            <Button type="button" icon="pi pi-download" class="p-button-text" @click="exportCsv()" />
        </template>
        <Column header="予約ID" sortable field="record_id">
          <template #body="slotProps">
            <Button
              label=""
              icon="pi pi-external-link"
              class="p-button-sm p-button-text"
              @click="openReservationEdit(slotProps.data.record_id)"
              :disabled="slotProps.data.delete"
            />
          </template>
        </Column>
        <Column field="reservation_url" header="予約URL" hidden></Column> <!-- New hidden column -->
        <Column field="hotel_id" header="ホテルID" hidden sortable></Column>
        <Column field="hotel_name" header="ホテル名" sortable filter filterField="hotel_name" :showFilterMatchModes="false" :showFilterMenu="false">
          <template #filter="{ filterModel, filterCallback }">
            <Select v-model="filterModel.value" :options="uniqueHotelNames" placeholder="全て" class="p-column-filter" :showClear="true" @change="filterCallback()"></Select>
          </template>
        </Column>
        <Column field="status" header="ステータス" sortable filter filterField="status" :showFilterMatchModes="false" :showFilterMenu="false">
          <template #body="slotProps">
            {{ translateStatus(slotProps.data.status) }}
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Select v-model="filterModel.value" :options="uniqueStatuses" optionLabel="label" optionValue="value" placeholder="全て" class="p-column-filter" :showClear="true" @change="filterCallback()"></Select>
          </template>
        </Column>
        <Column field="check_in" header="チェックイン" hidden></Column>
        <Column field="check_out" header="チェックアウト" hidden></Column>
        <Column field="number_of_people" header="人数" hidden></Column>
        <Column field="type" header="タイプ" hidden>
          <template #body="slotProps">
            {{ translateType(slotProps.data.type) }}
          </template>
        </Column>
        <Column field="insert" header="作成" sortable filter filterField="insert" :showFilterMatchModes="false" :showFilterMenu="false">
          <template #header>
            <Badge :value="insertCount"></Badge>
          </template>
          <template #body="slotProps">
            <i v-if="slotProps.data.insert" class="pi pi-check-circle" style="color: green;"></i>
            <i v-else class="pi pi-times-circle" style="color: red;"></i>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Select v-model="filterModel.value" :options="booleanFilterOptions" optionLabel="label" optionValue="value" placeholder="全て" class="p-column-filter" :showClear="true" @change="filterCallback()"></Select>
          </template>
        </Column>
        <Column field="update" header="更新" sortable filter filterField="update" :showFilterMatchModes="false" :showFilterMenu="false">
          <template #header>
            <Badge :value="updateCount" severity="info"></Badge>
          </template>
          <template #body="slotProps">
            <i v-if="slotProps.data.update" class="pi pi-check-circle" style="color: green;"></i>
            <i v-else class="pi pi-times-circle" style="color: red;"></i>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Select v-model="filterModel.value" :options="booleanFilterOptions" optionLabel="label" optionValue="value" placeholder="全て" class="p-column-filter" :showClear="true" @change="filterCallback()"></Select>
          </template>
        </Column>
        <Column field="delete" header="削除" sortable filter filterField="delete" :showFilterMatchModes="false" :showFilterMenu="false">
          <template #header>
            <Badge :value="deleteCount" severity="danger"></Badge>
          </template>
          <template #body="slotProps">
            <i v-if="slotProps.data.delete" class="pi pi-check-circle" style="color: green;"></i>
            <i v-else class="pi pi-times-circle" style="color: red;"></i>
          </template>
          <template #filter="{ filterModel, filterCallback }">
            <Select v-model="filterModel.value" :options="booleanFilterOptions" optionLabel="label" optionValue="value" placeholder="全て" class="p-column-filter" :showClear="true" @change="filterCallback()"></Select>
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
import Select from 'primevue/select'; // Import Select component
import Badge from 'primevue/badge'; // Import Badge component
import { ref, onMounted, watch, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { formatDate } from '@/utils/dateUtils';
import { useSystemLogs } from '@/composables/useSystemLogs';
import { translateStatus, translateType } from '@/utils/reservationUtils';
import { FilterMatchMode } from '@primevue/core/api'; // Import FilterMatchMode

const toast = useToast();
const selectedDate = ref(new Date());
const { logs: rawTransformedLogs, loading, fetchLogs: systemLogsFetchLogs } = useSystemLogs();

const transformedLogsForTable = computed(() => {
  if (!rawTransformedLogs.value) return [];
  return Object.entries(rawTransformedLogs.value).map(([record_id, data]) => ({
    record_id,
    hotel_id: data.hotel_id,
    hotel_name: data.hotel_name,
    update: data.UPDATE.changed || false,
    insert: data.INSERT.changed || false,
    delete: data.DELETE.changed || false,
    // Determine the status to display based on which action occurred
    status: (data.DELETE.changed && data.DELETE.status) ||
            (data.UPDATE.changed && data.UPDATE.status) ||
            (data.INSERT.changed && data.INSERT.status) || null,
    check_in: (data.DELETE.changed && data.DELETE.check_in) ||
              (data.UPDATE.changed && data.UPDATE.check_in) ||
              (data.INSERT.changed && data.INSERT.check_in) || null,
    check_out: (data.DELETE.changed && data.DELETE.check_out) ||
               (data.UPDATE.changed && data.UPDATE.check_out) ||
               (data.INSERT.changed && data.INSERT.check_out) || null,
    number_of_people: (data.DELETE.changed && data.DELETE.number_of_people) ||
                      (data.UPDATE.changed && data.UPDATE.number_of_people) ||
                      (data.INSERT.changed && data.INSERT.number_of_people) || null,
    type: (data.DELETE.changed && data.DELETE.type) ||
          (data.UPDATE.changed && data.UPDATE.type) ||
          (data.INSERT.changed && data.INSERT.type) || null,
    reservation_url: `wehub.work/reservations/edit/${record_id}` // Add the URL here
  }));
});

const uniqueHotelNames = computed(() => {
  const names = new Set();
  transformedLogsForTable.value.forEach(log => {
    if (log.hotel_name) {
      names.add(log.hotel_name);
    }  });
  return Array.from(names).sort();
});

const uniqueStatuses = computed(() => {
  const statuses = new Set();
  transformedLogsForTable.value.forEach(log => {
    if (log.status) {
      statuses.add(log.status);
    }  });
  // Map raw status values to translated ones for display in the filter dropdown
  return Array.from(statuses).map(s => ({ label: translateStatus(s), value: s })).sort((a, b) => a.label.localeCompare(b.label));
});

const booleanFilterOptions = ref([
  { label: '全て', value: null },
  { label: 'はい', value: true },
  { label: 'いいえ', value: false }
]);

const filters = ref({ // Add filters ref
  hotel_name: { value: null, matchMode: FilterMatchMode.EQUALS },
  status: { value: null, matchMode: FilterMatchMode.EQUALS },
  insert: { value: null, matchMode: FilterMatchMode.EQUALS },
  update: { value: null, matchMode: FilterMatchMode.EQUALS },
  delete: { value: null, matchMode: FilterMatchMode.EQUALS }
});

const currentFilteredLogs = ref([]); // New ref to store filtered logs

const dt = ref(); // Reference to the DataTable
const rows = ref(10); // Number of rows per page
const totalRecords = ref(0); // Total number of records

const onFilter = (event) => {
  currentFilteredLogs.value = event.filteredValue;
};

const insertCount = computed(() => {
  if (!currentFilteredLogs.value) return 0;
  return currentFilteredLogs.value.filter(log => log.insert).length;
});

const updateCount = computed(() => {
  if (!currentFilteredLogs.value) return 0;
  return currentFilteredLogs.value.filter(log => log.update).length;
});

const deleteCount = computed(() => {
  if (!currentFilteredLogs.value) return 0;
  return currentFilteredLogs.value.filter(log => log.delete).length;
});

const onPage = (event) => {
  rows.value = event.rows;
  console.log('Pagination event:', event);
};

const loadLogs = async () => {
  const date = formatDate(selectedDate.value);
  const response = await systemLogsFetchLogs(date);
  totalRecords.value = Object.keys(response.logs || {}).length;
  // Initialize currentFilteredLogs with all transformed logs
  currentFilteredLogs.value = transformedLogsForTable.value;
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
