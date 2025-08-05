<template>
  <div>
    <p class="text-sm text-gray-500 mb-2">※最新100件のキューエントリーのみ表示されます。</p>
    <DataTable
      :value="filteredOtaQueue"
      :paginator="true"
      :rows="15"
      :rowsPerPageOptions="[15, 25, 50]"
      v-model:filters="filters"
      filterDisplay="row"
    >
      <Column field="created_at" header="作成日時">
        <template #body="slotProps">
          {{ formatDateTime(slotProps.data.created_at) }}
        </template>
      </Column>
      <Column field="status" header="ステータス">
        <template #body="slotProps">
          <Badge :severity="statusSeverity(slotProps.data.status)" :value="getStatusInJapanese(slotProps.data.status)" />
        </template>
      </Column>
      <Column field="ota_reservation_id" header="予約ID"></Column>
      <Column field="booker_name" header="予約者名"></Column>
      <Column field="hotel_name" header="ホテル名" :showFilterMenu="false">
        <template #filter="{ filterModel, filterCallback }">
          <Dropdown
            v-model="filterModel.value"
            :options="hotels"
            optionLabel="name"
            optionValue="name"
            placeholder="ホテルで絞り込み"
            class="p-column-filter"
            :showClear="true"
            @change="filterCallback()"
          >
          </Dropdown>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup>
import { onMounted, watch, computed, ref } from 'vue';
import { useXMLStore } from '@/composables/useXMLStore';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Badge from 'primevue/badge';
import Dropdown from 'primevue/dropdown';
import { FilterMatchMode } from 'primevue/api';

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
const hotels = computed(() => {
  const hotelSet = new Set();
  otaQueue.value.forEach(item => {
    hotelSet.add(JSON.stringify({ id: item.hotel_id, name: item.hotel_name }));
  });
  return Array.from(hotelSet).map(item => JSON.parse(item));
});

const filteredOtaQueue = computed(() => {
  let queue = otaQueue.value;
  if (props.hotelId) {
    queue = queue.filter(item => item.hotel_id === props.hotelId);
  }
  return queue;
});

const formatDateTime = (dateString) => {
  const date = new Date(dateString);
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
      return 'warning';
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

onMounted(() => {
  fetchOtaQueue();
});

watch(() => props.hotelId, () => {
  // No need to fetch again, filtering is done in computed property
});
</script>
