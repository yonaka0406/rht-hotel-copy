<template>
  <div class="card">    
    <div class="card-body">
      <div class="mb-4">
        <FloatLabel>
          <DatePicker v-model="selectedDate" inputId="log-date" class="w-full" />
          <label for="log-date">日付を選択</label>
        </FloatLabel>
      </div>
      <DataTable :value="logs" :loading="loading" responsiveLayout="scroll" emptyMessage="選択した日付にログがありません。">
        <Column field="log_id" header="ログID"></Column>
        <Column field="log_time" header="ログ時刻">
          <template #body="slotProps">
            {{ new Date(slotProps.data.log_time).toLocaleString() }}
          </template>
        </Column>
        <Column field="user_id" header="ユーザーID"></Column>
        <Column field="details" header="詳細"></Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import DatePicker from 'primevue/datepicker';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import FloatLabel from 'primevue/floatlabel';
import { ref, onMounted, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import { formatDate } from '@/utils/dateUtils';
import { useSystemLogs } from '@/composables/useSystemLogs';

const toast = useToast();
const selectedDate = ref(new Date());
const { logs, loading, fetchLogs } = useSystemLogs();

onMounted(() => {
  fetchLogs(formatDate(selectedDate.value));
});

watch(selectedDate, (newDate) => {
  fetchLogs(formatDate(newDate));
});
</script>
