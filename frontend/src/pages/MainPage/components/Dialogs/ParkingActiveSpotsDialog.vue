<template>
    <Dialog
      :visible="modelValue"
      @update:visible="$emit('update:modelValue', $event)"
      :header="`駐車場割り当て - ${roomName}`"
      :closable="true"
      :modal="true"
      :style="{ width: '90vw', maxWidth: '1400px', height: '85vh' }"
      @hide="onDialogHide"
    >
      <div class="parking-spots-dialog">
        <!-- Overall Summary -->
        <div class="overall-summary">
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-label">総駐車スポット:</span>
              <span class="stat-value">{{ uniqueParkingSpots.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">総予約数:</span>
              <span class="stat-value">{{ localSpots.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">総売上:</span>
              <span class="stat-value">{{ formatCurrency(totalRevenue) }}</span>
            </div>
          </div>
          <div class="summary-actions">
            <Button 
              label="全選択削除" 
              icon="pi pi-trash" 
              size="small"
              :disabled="!hasAnySelection"
              @click="confirmDeleteAllSelected"
              severity="danger"
            />
            <Button 
              label="全データ削除" 
              icon="pi pi-trash" 
              size="small"
              outlined
              :disabled="!localSpots || localSpots.length === 0"
              @click="confirmDeleteAll"
              severity="danger"
            />
          </div>
        </div>
  
        <!-- Tabs for each parking spot -->
        <div class="tabs-container">
          <TabView v-if="uniqueParkingSpots.length > 0" scrollable>
            <TabPanel 
              v-for="spotNumber in uniqueParkingSpots" 
              :key="spotNumber"
              :header="spotNumber"
            >
              <template #header>
                <div class="tab-header">
                  <span>{{ spotNumber }}</span>
                  <Badge 
                    :value="getSpotReservationCount(spotNumber)" 
                    :severity="getSpotSeverity(spotNumber)"
                    class="ml-2"
                  />
                </div>
              </template>
              
              <div class="tab-content">
                <!-- Spot Summary -->
                <div class="spot-summary">
                  <div class="spot-info">
                    <Tag 
                      :value="getSpotVehicleType(spotNumber)" 
                      :severity="getSeverityByType(getSpotVehicleType(spotNumber))"
                      class="mr-2"
                    />
                    <span class="font-semibold">
                      {{ getSpotReservationCount(spotNumber) }}件の予約
                    </span>
                    <span class="ml-2">
                      売上: {{ formatCurrency(getSpotRevenue(spotNumber)) }}
                    </span>
                  </div>
                  <div class="spot-actions">
                    <Button 
                      label="選択削除" 
                      icon="pi pi-trash" 
                      size="small"
                      :disabled="!getSpotSelection(spotNumber).length"
                      @click="confirmDeleteSpotSelected(spotNumber)"
                      severity="danger"
                    />
                    <Button 
                      label="スポット全削除" 
                      icon="pi pi-trash" 
                      size="small"
                      outlined
                      :disabled="!getSpotData(spotNumber).length"
                      @click="confirmDeleteSpot(spotNumber)"
                      severity="danger"
                    />
                  </div>
                </div>
  
                <!-- DataTable for this spot -->
                <div class="spot-table">
                  <DataTable 
                    :value="getSpotData(spotNumber)" 
                    :scrollable="true"
                    scrollHeight="300px"
                    v-model:selection="spotSelections[spotNumber]"
                    dataKey="id"
                    selectionMode="multiple"
                    :paginator="true"
                    :rows="5"
                    :rowsPerPageOptions="[5,10,20]"
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    currentPageReportTemplate="{first} から {last} 件目 / 全{totalRecords}件"
                    :emptyMessage="`${spotNumber} の予約はありません`"
                  >
                    <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
                    
                    <Column field="date" header="日付" :sortable="true" :style="{ minWidth: '150px' }">
                      <template #body="{ data }">
                        <div class="flex align-items-center gap-2">
                          <i class="pi pi-calendar text-primary"></i>
                          {{ formatDate(data.date) }}
                        </div>
                      </template>
                    </Column>
                    
                    <Column field="price" header="料金" :sortable="true" :style="{ minWidth: '120px' }">
                      <template #body="{ data }">
                        <div class="flex align-items-center gap-2">
                          <i class="pi pi-dollar text-green-500"></i>
                          {{ formatCurrency(data.price) }}
                        </div>
                      </template>
                    </Column>
  
                    <Column field="vehicleCategoryName" header="車両タイプ" :sortable="true" :style="{ minWidth: '120px' }">
                      <template #body="{ data }">
                        <Tag 
                          :value="data.vehicleCategoryName" 
                          :severity="getSeverityByType(data.vehicleCategoryName)"
                        />
                      </template>
                    </Column>
                    
                    <Column headerStyle="width: 4rem; text-align: center" bodyStyle="text-align: center; overflow: visible">
                      <template #body="{ data }">
                        <Button 
                          icon="pi pi-trash" 
                          text
                          rounded
                          severity="danger"
                          size="small"
                          @click="confirmDeleteSingle(data)"
                          v-tooltip.top="'この予約を削除'"
                        />
                      </template>
                    </Column>
                  </DataTable>
                </div>
              </div>
            </TabPanel>
          </TabView>
          
          <!-- Empty state -->
          <div v-else class="empty-state">
            <i class="pi pi-car text-6xl text-400 mb-3"></i>
            <h3>駐車場の予約がありません</h3>
            <p class="text-500">この部屋には駐車場の割り当てがありません。</p>
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
  import { ref, computed, watch, reactive } from 'vue';
  import { useConfirm } from 'primevue/useconfirm';
  import { useToast } from 'primevue/usetoast';
  import Dialog from 'primevue/dialog';
  import Button from 'primevue/button';
  import DataTable from 'primevue/datatable';
  import Column from 'primevue/column';
  import Tag from 'primevue/tag';
  import Badge from 'primevue/badge';
  import TabView from 'primevue/tabview';
  import TabPanel from 'primevue/tabpanel';
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
  const spotSelections = reactive({});
  const confirm = useConfirm();
  const toast = useToast();
  
  // Watch for external changes to parkingSpots
  watch(() => props.parkingSpots, (newSpots) => {
    localSpots.value = [...newSpots];
    initializeSelections();
  }, { deep: true });
  
  // Initialize selections for each spot
  const initializeSelections = () => {
    uniqueParkingSpots.value.forEach(spotNumber => {
      if (!spotSelections[spotNumber]) {
        spotSelections[spotNumber] = [];
      }
    });
  };
  
  // Get unique parking spot numbers
  const uniqueParkingSpots = computed(() => {
    const spots = [...new Set(localSpots.value.map(spot => spot.spotNumber))];
    return spots.sort((a, b) => {
      // Sort numerically if possible, otherwise alphabetically
      const aNum = parseInt(a.replace(/\D/g, ''));
      const bNum = parseInt(b.replace(/\D/g, ''));
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
      }
      return a.localeCompare(b);
    });
  });
  
  // Initialize selections when spots change
  watch(uniqueParkingSpots, () => {
    initializeSelections();
  }, { immediate: true });
  
  const totalRevenue = computed(() => {
    return localSpots.value.reduce((sum, spot) => sum + (parseFloat(spot.price) || 0), 0);
  });
  
  const hasAnySelection = computed(() => {
    return Object.values(spotSelections).some(selection => selection && selection.length > 0);
  });
  
  // Get data for a specific parking spot
  const getSpotData = (spotNumber) => {
    return localSpots.value.filter(spot => spot.spotNumber === spotNumber);
  };
  
  // Get selection for a specific spot
  const getSpotSelection = (spotNumber) => {
    return spotSelections[spotNumber] || [];
  };
  
  // Get reservation count for a spot
  const getSpotReservationCount = (spotNumber) => {
    return getSpotData(spotNumber).length;
  };
  
  // Get revenue for a spot
  const getSpotRevenue = (spotNumber) => {
    return getSpotData(spotNumber).reduce((sum, spot) => sum + (parseFloat(spot.price) || 0), 0);
  };
  
  // Get vehicle type for a spot (assuming all reservations for a spot have same vehicle type)
  const getSpotVehicleType = (spotNumber) => {
    const spotData = getSpotData(spotNumber);
    return spotData.length > 0 ? spotData[0].vehicleCategoryName : '';
  };
  
  // Get severity for spot badge based on reservation count
  const getSpotSeverity = (spotNumber) => {
    const count = getSpotReservationCount(spotNumber);
    if (count === 0) return 'secondary';
    if (count < 3) return 'success';
    if (count < 6) return 'warning';
    return 'danger';
  };
  
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
  
  const getSeverityByType = (vehicleType) => {
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
    // Clear all selections
    Object.keys(spotSelections).forEach(key => {
      spotSelections[key] = [];
    });
    emit('hide');
  };
  
  const deleteSpots = (spotsToDelete) => {
    const spotIds = new Set(spotsToDelete.map(spot => spot.id));
    localSpots.value = localSpots.value.filter(spot => !spotIds.has(spot.id));
    
    // Clear selections
    Object.keys(spotSelections).forEach(key => {
      spotSelections[key] = spotSelections[key].filter(spot => !spotIds.has(spot.id));
    });
    
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
  
  const confirmDeleteSingle = (spot) => {
    confirm.require({
      message: 'この予約を削除しますか？',
      header: '確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '削除',
      rejectLabel: 'キャンセル',
      accept: () => deleteSpots([spot])
    });
  };
  
  const confirmDeleteSpotSelected = (spotNumber) => {
    const selected = getSpotSelection(spotNumber);
    if (!selected || selected.length === 0) return;
    
    confirm.require({
      message: `${spotNumber}の選択された${selected.length}件の予約を削除しますか？`,
      header: '確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '削除',
      rejectLabel: 'キャンセル',
      accept: () => deleteSpots([...selected])
    });
  };
  
  const confirmDeleteSpot = (spotNumber) => {
    const spotData = getSpotData(spotNumber);
    if (!spotData || spotData.length === 0) return;
    
    confirm.require({
      message: `${spotNumber}のすべての予約(${spotData.length}件)を削除しますか？`,
      header: '確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'すべて削除',
      rejectLabel: 'キャンセル',
      accept: () => deleteSpots([...spotData])
    });
  };
  
  const confirmDeleteAllSelected = () => {
    const allSelected = Object.values(spotSelections).flat().filter(Boolean);
    if (allSelected.length === 0) return;
    
    confirm.require({
      message: `全スポットから選択された${allSelected.length}件の予約を削除しますか？`,
      header: '確認',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: '削除',
      rejectLabel: 'キャンセル',
      accept: () => deleteSpots([...allSelected])
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
  
  .overall-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: linear-gradient(135deg, var(--primary-50) 0%, var(--primary-100) 100%);
    border-radius: 0.5rem;
    border: 1px solid var(--primary-200);
    flex-shrink: 0;
  }
  
  .summary-stats {
    display: flex;
    gap: 2rem;
  }
  
  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: var(--text-color-secondary);
  }
  
  .stat-value {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary-color);
  }
  
  .summary-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .tabs-container {
    flex: 1;
    min-height: 0;
  }
  
  .tab-header {
    display: flex;
    align-items: center;
  }
  
  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .spot-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: var(--surface-50);
    border-radius: 0.5rem;
    border: 1px solid var(--surface-200);
  }
  
  .spot-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .spot-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .spot-table {
    flex: 1;
  }
  
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    text-align: center;
    color: var(--text-color-secondary);
  }
  
  /* Dialog content styling */
  :deep(.p-dialog-content) {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  
  /* Tab view styling */
  :deep(.p-tabview) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  :deep(.p-tabview-panels) {
    flex: 1;
    min-height: 0;
  }
  
  :deep(.p-tabview-panel) {
    height: 100%;
    overflow: hidden;
  }
  
  /* DataTable styling */
  :deep(.p-datatable .p-paginator) {
    padding: 0.5rem 1rem;
  }
  
  /* Tab nav styling for better scrolling */
  :deep(.p-tabview-nav) {
    max-width: 100%;
  }
  </style>