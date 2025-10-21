<template>
  <div class="card">    
    <div class="card-body">
      <div class="mb-4">
        <FloatLabel>
          <DatePicker v-model="selectedDate" @update:modelValue="handleDateChange" inputId="log-date" class="w-full" />
          <label for="log-date">日付を選択</label>
        </FloatLabel>
      </div>
      <DataTable :value="logs" :loading="loading" responsiveLayout="scroll">
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
import { ref, onMounted } from 'vue';
import DatePicker from 'primevue/datepicker';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import FloatLabel from 'primevue/floatlabel';
import { useSystemLogs } from '@/composables/useSystemLogs';

const selectedDate = ref(new Date());
const { logs, loading, fetchLogs } = useSystemLogs();

const handleDateChange = () => {
  const date = selectedDate.value.toISOString().split('T')[0];
  fetchLogs(date);
};

onMounted(() => {
  handleDateChange();
});
</script>
