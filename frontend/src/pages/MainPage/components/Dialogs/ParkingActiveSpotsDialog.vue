<template>
    <Dialog
      :visible="modelValue"
      @update:visible="$emit('update:modelValue', $event)"
      :header="`駐車場割り当て - ${roomName}`"
      :closable="true"
      :modal="true"
      :style="{ width: '80vw', maxWidth: '1200px', height: '80vh' }"
      @hide="onDialogHide"
    >
      <div class="parking-spots-dialog">
        <!-- DataTable container with fixed height -->
        <div class="table-container">
          <DataTable 
            :value="localSpots" 
            :scrollable="true"
            scrollHeight="400px"
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
            
            <Column field="spotNumber" header="駐車番号" :sortable="true" :style="{ minWidth: '180px' }">
              <template #body="{ data }">
                <div class="flex align-items-center gap-2">
                  <Tag :value="data.spotNumber" :severity="getSeverity(data.vehicleCategoryName)" />
                  <span>{{ data.vehicleCategoryName }}</span>
                </div>
              </template>
            </Column>
            
            <Column field="date" header="日付" :sortable="true" :style="{ minWidth: '150px' }">
              <template #body="{ data }">
                {{ formatDate(data.date) }}
              </template>
            </Column>
            
            <Column field="price" header="料金" :sortable="true" :style="{ minWidth: '120px' }">
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
        </div>
  
        <!-- Compact summary section -->
        <div class="summary-section">
          <div class="summary-info">
            <span class="font-semibold">
              合計: {{ formatCurrency(totalPrice) }} ({{ localSpots.length }}件)
            </span>
          </div>
          <div class="summary-actions">
            <Button 
              label="選択削除" 
              icon="pi pi-trash" 
              size="small"
              :disabled="!selectedSpots || selectedSpots.length === 0"
              @click="confirmDeleteSelected"
              severity="danger"
            />
            <Button 
              label="全削除" 
              icon="pi pi-trash" 
              size="small"
              outlined
              :disabled="!localSpots || localSpots.length === 0"
              @click="confirmDeleteAll"
              severity="danger"
            />
          </div>
        </div>
      </div>
  
      <template #footer>
        <Button 
          label="閉じる" 
          icon="pi pi-times" 
          text
          @click="closeDialog"
          :disabled="processing"
        />
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
    gap: 1rem;
    height: 100%;
  }
  
  .table-container {
    flex: 1;
    min-height: 0;
  }
  
  .summary-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--surface-50);
    border-radius: 0.5rem;
    border: 1px solid var(--surface-200);
    flex-shrink: 0;
  }
  
  .summary-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  /* Ensure dialog content uses full height */
  :deep(.p-dialog-content) {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  
  /* DataTable styling for better space usage */
  :deep(.p-datatable .p-paginator) {
    padding: 0.5rem 1rem;
  }
  
  :deep(.p-datatable .p-datatable-header) {
    padding: 0.75rem 1rem;
  }
  </style>