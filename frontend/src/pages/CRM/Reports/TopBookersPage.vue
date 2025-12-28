<template>
  <div class="card p-4 bg-white dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
    <div class="font-semibold text-xl mb-4">売上上位顧客 ({{ dateLabel }})</div>
    
    <div class="flex items-center gap-4 mb-4 flex-wrap">
      <DatePicker v-model="dateRange" selectionMode="range" view="month" :manualInput="false" showIcon fluid class="w-full sm:w-80" dateFormat="yy/mm" />
      <div class="flex items-center gap-2">
        <Checkbox v-model="includeTemp" binary inputId="includeTemp" />
        <label for="includeTemp">仮予約・保留中を含める</label>
      </div>
      <Button label="検索" icon="pi pi-search" @click="fetchData" :loading="loading" />
      <Button label="詳細データCSV" icon="pi pi-download" severity="secondary" @click="downloadCsv" :loading="downloading" />
    </div>

    <DataTable :value="bookers" :loading="loading" showGridlines stripedRows tableStyle="min-width: 50rem" 
      paginator :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]"
      v-model:first="first"
      removableSort
    >
      <template #empty>データが見つかりません。</template>
      <Column header="#" field="rank" sortable :style="{ width: '4rem' }">
        <template #body="slotProps">
          {{ slotProps.data.rank }}
        </template>
      </Column>
      <Column field="client_name" header="予約者名称" sortable></Column>
      <Column field="customer_id" header="顧客ID" sortable></Column>
      <Column header="利用ホテル">
        <template #body="slotProps">
          <div class="flex flex-wrap gap-2">
            <Tag v-for="hotel in slotProps.data.used_hotels" :key="hotel" :value="hotel" severity="info" />
          </div>
        </template>
      </Column>
      <Column field="total_sales" header="売上合計" sortable>
        <template #body="slotProps">
          {{ formatCurrency(slotProps.data.total_sales) }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { DatePicker, Button, DataTable, Column, Tag, Checkbox } from 'primevue';
import { useCRMStore } from '@/composables/useCRMStore';
import Papa from 'papaparse';

const toast = useToast();
const { fetchTopBookers, fetchSalesByClientMonthly } = useCRMStore();

const loading = ref(false);
const downloading = ref(false);
const bookers = ref([]);
const dateRange = ref([]);
const displayedDateRange = ref([]);
const includeTemp = ref(false);
const first = ref(0);

const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatMonth = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
};

const getEndOfMonth = (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

const dateLabel = computed(() => {
    if (!displayedDateRange.value || !displayedDateRange.value[0]) return '';
    const start = formatMonth(displayedDateRange.value[0]);
    const end = displayedDateRange.value[1] ? formatMonth(displayedDateRange.value[1]) : start;
    let label = `${start} - ${end}`;
    if (includeTemp.value) {
        label += ' [仮予約・保留中含む]';
    }
    return label;
});

onMounted(() => {
  // Default to current month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Not strictly needed for the picker val but good for init
  dateRange.value = [start, end];
  fetchData();
});

const formatCurrency = (value) => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};

const fetchData = async () => {
  if (!dateRange.value || !dateRange.value[0]) {
     toast.add({ severity: 'warn', summary: '警告', detail: '期間を選択してください', life: 3000 });
     return;
  }
  
  loading.value = true;
  const sdate = formatDate(dateRange.value[0]);
  // Ensure the end date covers the full month if it's the 1st
  const endDateRaw = dateRange.value[1] || dateRange.value[0];
  const edate = formatDate(getEndOfMonth(endDateRaw));
  
  try {
    const data = await fetchTopBookers(sdate, edate, includeTemp.value);
    bookers.value = data.map((item, index) => ({
        ...item,
        rank: index + 1
    }));
    // Update displayed range only on success
    displayedDateRange.value = [...dateRange.value];
  } catch (error) {
    console.error(error);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'データの取得に失敗しました', life: 3000 });
  } finally {
    loading.value = false;
  }
};

const downloadCsv = async () => {
  if (!dateRange.value || !dateRange.value[0]) {
     toast.add({ severity: 'warn', summary: '警告', detail: '期間を選択してください', life: 3000 });
     return;
  }
  
  downloading.value = true;
  const sdate = formatDate(dateRange.value[0]);
  const endDateRaw = dateRange.value[1] || dateRange.value[0];
  const edate = formatDate(getEndOfMonth(endDateRaw));
  
  try {
    // CSV download should always exclude temp/provisory bookings (pass false)
    const data = await fetchSalesByClientMonthly(sdate, edate, false);
    
    // Prepare CSV data
    const csvData = data.map(row => ({
        'ホテルID': row.hotel_id,
        'ホテル名称': row.hotel_name,
        'レポート期間': row.month,
        '予約タイプ': row.reservation_types,
        '予約者ID': row.client_id,
        '予約者顧客ID': row.customer_id,
        '予約者': row.client_name,
        '予約者カナ': row.client_name_kana,
        '予約者電話番号': row.client_phone,
        '宿泊日数': row.total_nights || 0,
        '人数': row.total_people || 0,
        '支払者': row.payer_names,
        '支払い方法': row.payment_methods,
        '売上': row.total_sales,
        '仮予約売上': row.provisory_sales || 0,
        '仮予約宿泊数': row.provisory_nights || 0,
        'キャンセル（請求あり）': row.cancelled_billable || 0,
        'キャンセル宿泊数（請求あり）': row.cancelled_billable_nights || 0,
        'キャンセル（請求なし）': row.cancelled_non_billable || 0,
        'キャンセル宿泊数（請求なし）': row.cancelled_non_billable_nights || 0
    }));

    const csv = Papa.unparse(csvData);
    
    // Add BOM for Excel compatibility in Japan
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_by_client_${sdate}_${edate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error(error);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'CSVのダウンロードに失敗しました', life: 3000 });
  } finally {
    downloading.value = false;
  }
};
</script>