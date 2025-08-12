<template>
  <Dialog
    :visible="modelValue"
    @update:visible="$emit('update:modelValue', $event)"
    :header="`駐車場割り当て - ${roomName}`"
    :closable="true"
    :modal="true"
    :style="{ width: '80vw', maxWidth: '1200px' }"
    @hide="onDialogHide"
  >
    <div class="parking-spots-dialog">
      <DataTable 
        :value="localSpots" 
        :scrollable="true"
        scrollHeight="flex"
        class="flex-1"
        v-model:selection="selectedSpots"
        dataKey="id"
        selectionMode="multiple"
        :paginator="true"
        :rows="10"
        :rowsPerPageOptions="[5,10,25,50]"
        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
        currentPageReportTemplate="{first} から {last} 件目 / 全{totalRecords}件"
      >
        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
        
        <Column field="spotNumber" header="駐車番号" :sortable="true">
          <template #body="{ data }">
            <div class="flex align-items-center gap-2">
              <Tag :value="data.spotNumber" :severity="getSeverity(data.vehicleCategoryName)" />
              <span>{{ data.vehicleCategoryName }}</span>
            </div>
          </template>
        </Column>
        
        <Column field="date" header="日付" :sortable="true">
          <template #body="{ data }">
            {{ formatDate(data.date) }}
          </template>
        </Column>
        
        <Column field="price" header="料金" :sortable="true">
          <template #body="{ data }">
            {{ formatCurrency(data.price) }}
          </template>
        </Column>
        
        <Column headerStyle="width: 4rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
          <template #body="{ data }">
            <Button 
              icon="pi pi-trash" 
              class="p-button-text p-button-danger p-button-sm" 
              @click="confirmDelete(data)"
              v-tooltip.top="'この日付を削除'"
            />
          </template>
        </Column>
      </DataTable>

      <div class="mt-4 pt-3 border-top-1 border-300">
        <div class="flex justify-content-between align-items-center">
          <div class="font-bold">
            合計: {{ formatCurrency(totalPrice) }} ({{ localSpots.length }}件)
          </div>
          <div class="flex gap-2">
            <Button 
              label="選択を削除" 
              icon="pi pi-trash" 
              class="p-button-danger" 
              :disabled="!selectedSpots || selectedSpots.length === 0"
              @click="confirmDeleteSelected"
            />
            <Button 
              label="すべて削除" 
              icon="pi pi-trash" 
              class="p-button-danger p-button-outlined" 
              :disabled="!localSpots || localSpots.length === 0"
              @click="confirmDeleteAll"
            />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-content-end gap-2">
        <Button 
          label="閉じる" 
          icon="pi pi-times" 
          class="p-button-text" 
          @click="closeDialog"
          :disabled="processing"
        />
      </div>
    </template>
  </Dialog>

  <ConfirmDialog />
  <Toast />
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  roomId: {
    type: [String, Number],
    required: false,
    default: null
  },
  roomName: {
    type: String,
    default: '未設定'
  },
  parkingSpots: {
    type: Array,
    required: true,
    default: () => []
  },
  processing: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:modelValue',
  'update:parkingSpots',
  'hide'
]);

const localSpots = ref([...props.parkingSpots]);
const selectedSpots = ref([]);
const confirm = useConfirm();
const toast = useToast();

// Watch for external changes to parkingSpots
watch(() => props.parkingSpots, (newSpots) => {
  localSpots.value = [...newSpots];
}, { deep: true });

const totalPrice = computed(() => {
  return localSpots.value.reduce((sum, spot) => sum + (parseFloat(spot.price) || 0), 0);
});

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  });
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return '¥0';
  return `¥${parseFloat(value).toLocaleString('ja-JP')}`;
};

const getSeverity = (vehicleType) => {
  switch (vehicleType) {
    case '普通車': return 'info';
    case '大型車': return 'warning';
    case 'オートバイ': return 'success';
    default: return 'secondary';
  }
};

const closeDialog = () => {
  emit('update:modelValue', false);
};

const onDialogHide = () => {
  selectedSpots.value = [];
  emit('hide');
};

const deleteSpots = (spotsToDelete) => {
  const spotIds = new Set(spotsToDelete.map(spot => spot.id));
  localSpots.value = localSpots.value.filter(spot => !spotIds.has(spot.id));
  selectedSpots.value = [];
  
  // Emit the updated spots
  emit('update:parkingSpots', [...localSpots.value]);
  
  // Show success message
  const count = spotsToDelete.length;
  toast.add({
    severity: 'success',
    summary: '削除完了',
    detail: count > 1 ? `${count}件の駐車場割り当てを削除しました` : '駐車場の割り当てを削除しました',
    life: 3000
  });
};

const confirmDelete = (spot) => {
  confirm.require({
    message: '選択した駐車場の割り当てを削除しますか？',
    header: '確認',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '削除',
    rejectLabel: 'キャンセル',
    accept: () => deleteSpots([spot])
  });
};

const confirmDeleteSelected = () => {
  if (!selectedSpots.value || selectedSpots.value.length === 0) return;
  
  confirm.require({
    message: `${selectedSpots.value.length}件の駐車場の割り当てを削除しますか？`,
    header: '確認',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: '削除',
    rejectLabel: 'キャンセル',
    accept: () => deleteSpots([...selectedSpots.value])
  });
};

const confirmDeleteAll = () => {
  if (!localSpots.value || localSpots.value.length === 0) return;
  
  confirm.require({
    message: 'この部屋のすべての駐車場の割り当てを削除しますか？',
    header: '確認',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'すべて削除',
    rejectLabel: 'キャンセル',
    accept: () => deleteSpots([...localSpots.value])
  });
};
</script>

<style scoped>
.parking-spots-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
  max-height: 70vh;
}

:deep(.p-datatable) {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

:deep(.p-datatable-wrapper) {
  flex: 1;
  overflow: auto;
}

:deep(.p-datatable-thead > tr > th) {
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 1;
}

:deep(.p-paginator) {
  border-top: 0 none;
}
</style>
