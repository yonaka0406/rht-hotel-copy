<template>
  <div class="parking-section">
    <!-- Header with Add Parking Button -->
    <div class="section-header">
      <div class="header-info">
        <h4 class="section-title">
          <i class="pi pi-car"></i>
          駐車場 ({{ parkingAssignments.length }})
        </h4>
        <div class="status-indicators" v-if="parkingAssignments.length > 0">
          <Tag
            :value="`${fullyAssignedCount}/${parkingAssignments.length} 完全割当`"
            :severity="fullyAssignedCount === parkingAssignments.length ? 'success' : 'warning'"
          />
        </div>
      </div>
      <div class="header-actions">
        <Button
          icon="pi pi-plus"
          label="駐車場追加"
          class="p-button-sm p-button-success"
          @click="openAddParkingDialog"
          :disabled="!canAddParking"
        />
      </div>
    </div>

    <!-- Parking Assignments List -->
    <div class="parking-assignments" v-if="parkingAssignments.length > 0">
      <Accordion :activeIndex="0">
        <AccordionPanel
          v-for="(assignment, index) in parkingAssignments"
          :key="assignment.id || `temp-${index}`"
          :value="assignment.id || `temp-${index}`"
        >
          <AccordionHeader>
            <div class="assignment-header">
              <div class="assignment-info">
                <div class="spot-info">
                  <span class="spot-number">{{ assignment.spotNumber || 'スポット未割当' }}</span>
                  <span class="parking-lot" v-if="assignment.parkingLotName">
                    - {{ assignment.parkingLotName }}
                  </span>
                </div>
                <div class="assignment-details">
                  <span class="vehicle-category">{{ assignment.vehicleCategoryName || '車両未選択' }}</span>
                  <span class="date-range">{{ formatDateRange(assignment.dates) }}</span>
                </div>
              </div>
              <div class="assignment-status">
                <div class="status-indicators">
                  <i
                    class="pi"
                    :class="assignment.spotId ? 'pi-check-circle' : 'pi-exclamation-triangle'"
                    :style="{ color: assignment.spotId ? 'var(--green-500)' : 'var(--orange-500)' }"
                    :title="assignment.spotId ? 'スポット割当済み' : 'スポット未割当'"
                  ></i>
                  <i
                    class="pi"
                    :class="assignment.vehicleCategoryId ? 'pi-check-circle' : 'pi-exclamation-triangle'"
                    :style="{ color: assignment.vehicleCategoryId ? 'var(--green-500)' : 'var(--orange-500)' }"
                    :title="assignment.vehicleCategoryId ? '車両カテゴリ設定済み' : '車両カテゴリ未設定'"
                  ></i>
                </div>
                <div class="price-info">
                  <span class="total-price">¥{{ (assignment.totalPrice || 0).toLocaleString('ja-JP') }}</span>
                </div>
              </div>
            </div>
          </AccordionHeader>
          <AccordionContent>
            <div class="assignment-details-panel">
              <!-- Assignment Information -->
              <div class="details-grid">
                <div class="detail-section">
                  <h6>基本情報</h6>
                  <div class="detail-item">
                    <span class="label">アドオン名:</span>
                    <span class="value">{{ assignment.name || '駐車場' }}</span>
                  </div>
                  <div class="detail-item" v-if="assignment.comment">
                    <span class="label">コメント:</span>
                    <span class="value">{{ assignment.comment }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">単価:</span>
                    <span class="value">¥{{ (assignment.unitPrice || 0).toLocaleString('ja-JP') }}/日</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">日数:</span>
                    <span class="value">{{ assignment.dates?.length || 0 }}日</span>
                  </div>
                </div>

                <div class="detail-section" v-if="assignment.vehicleCategoryId">
                  <h6>車両情報</h6>
                  <div class="detail-item">
                    <span class="label">車両カテゴリ:</span>
                    <span class="value">{{ assignment.vehicleCategoryName }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">必要容量:</span>
                    <span class="value">{{ assignment.capacityUnitsRequired }} 単位</span>
                  </div>
                </div>

                <div class="detail-section" v-if="assignment.spotId">
                  <h6>駐車スポット</h6>
                  <div class="detail-item">
                    <span class="label">スポット番号:</span>
                    <span class="value">{{ assignment.spotNumber }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">駐車場:</span>
                    <span class="value">{{ assignment.parkingLotName }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">スポット容量:</span>
                    <span class="value">{{ assignment.spotCapacityUnits }} 単位</span>
                  </div>
                </div>

                <div class="detail-section">
                  <h6>利用期間</h6>
                  <div class="date-list">
                    <Tag
                      v-for="date in assignment.dates?.slice(0, 7)"
                      :key="date"
                      :value="formatDate(date)"
                      severity="info"
                      class="date-tag"
                    />
                    <Tag
                      v-if="assignment.dates?.length > 7"
                      :value="`他 ${assignment.dates.length - 7}日`"
                      severity="secondary"
                    />
                  </div>
                </div>
              </div>

              <!-- Real-time Availability Status -->
              <div class="availability-status" v-if="assignment.availabilityData">
                <h6>リアルタイム空き状況</h6>
                <div class="availability-summary">
                  <div class="availability-stat">
                    <span class="stat-label">利用可能率:</span>
                    <span class="stat-value">{{ assignment.availabilityData.overallStats.averageAvailabilityRate }}%</span>
                  </div>
                  <div class="availability-stat">
                    <span class="stat-label">完全利用可能:</span>
                    <span class="stat-value">{{ assignment.availabilityData.overallStats.fullyAvailableSpots }}</span>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="assignment-actions">
                <Button
                  icon="pi pi-pencil"
                  label="編集"
                  class="p-button-sm p-button-info"
                  @click="openEditParkingDialog(assignment)"
                />
                <Button
                  icon="pi pi-refresh"
                  label="空き状況更新"
                  class="p-button-sm p-button-secondary"
                  @click="refreshAvailability(assignment)"
                  :loading="assignment.refreshing"
                />
                <Button
                  icon="pi pi-trash"
                  label="削除"
                  class="p-button-sm p-button-danger"
                  @click="confirmRemoveAssignment(assignment)"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </div>

    <!-- Empty State -->
    <div class="empty-state" v-else>
      <div class="empty-content">
        <i class="pi pi-car empty-icon"></i>
        <h5>駐車場の予約がありません</h5>
        <p>「駐車場追加」ボタンをクリックして駐車場を予約してください。</p>
        <Button
          icon="pi pi-plus"
          label="駐車場追加"
          class="p-button-lg"
          @click="openAddParkingDialog"
          :disabled="!canAddParking"
        />
      </div>
    </div>

    <!-- Parking Addon Dialog -->
    <ParkingAddonDialog
      v-model="showParkingDialog"
      :reservation-detail-id="reservationDetailId"      
    />

    <!-- Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup>
// Vue
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

import ParkingAddonDialog from '@/pages/MainPage/components/Dialogs/ParkingAddonDialog.vue';

// Props
const props = defineProps({
  reservationDetails: {
    type: Array,
    required: true
  }
});

// Emits
const emit = defineEmits(['parking-updated', 'parking-added', 'parking-removed']);

// Stores
import { useParkingStore } from '@/composables/useParkingStore';

// Primevue
import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import Accordion from 'primevue/accordion';
import AccordionPanel from 'primevue/accordionpanel';
import AccordionHeader from 'primevue/accordionheader';
import AccordionContent from 'primevue/accordioncontent';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';

// Composables
const parkingStore = useParkingStore();

// Reactive state
const parkingAssignments = ref([]);
const showParkingDialog = ref(false);
const isEditMode = ref(false);
const editingAssignmentId = ref(null);
const dialogAddonData = ref({});
const dialogInitialDates = ref([]);
const loading = ref(false);

// Computed properties
const reservationDetailId = computed(() => {
  return props.reservationDetails?.[0]?.id || null;
});

const reservationDates = computed(() => {
  if (!props.reservationDetails || props.reservationDetails.length === 0) return [];
  
  const checkIn = new Date(props.reservationDetails[0].check_in);
  const checkOut = new Date(props.reservationDetails[0].check_out);
  const dates = [];
  
  const current = new Date(checkIn);
  while (current < checkOut) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
});

const canAddParking = computed(() => {
  return props.hotelId && props.reservationId && reservationDates.value.length > 0;
});

const fullyAssignedCount = computed(() => {
  return parkingAssignments.value.filter(assignment => 
    assignment.spotId && assignment.vehicleCategoryId
  ).length;
});

// Methods
const loadParkingAssignments = async () => {
  loading.value = true;
  try {
    // This would typically load existing parking assignments for the reservation
    // For now, we'll initialize with empty array
    // In a real implementation, this would call an API to get existing assignments
    parkingAssignments.value = [];
  } catch (error) {
    console.error('Error loading parking assignments:', error);
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '駐車場予約の読み込みに失敗しました',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const openAddParkingDialog = () => {
  isEditMode.value = false;
  editingAssignmentId.value = null;
  dialogAddonData.value = {
    name: '駐車場',
    comment: '',
    unitPrice: 1000,
    vehicleCategoryId: null,
    spotId: null
  };
  dialogInitialDates.value = reservationDates.value;
  showParkingDialog.value = true;
};

const openEditParkingDialog = (assignment) => {
  isEditMode.value = true;
  editingAssignmentId.value = assignment.id;
  dialogAddonData.value = {
    name: assignment.name || '駐車場',
    comment: assignment.comment || '',
    unitPrice: assignment.unitPrice || 1000,
    vehicleCategoryId: assignment.vehicleCategoryId,
    spotId: assignment.spotId
  };
  dialogInitialDates.value = assignment.dates || reservationDates.value;
  showParkingDialog.value = true;
};

const onParkingSave = async (saveData) => {
  try {
    if (isEditMode.value) {
      // Update existing assignment
      const index = parkingAssignments.value.findIndex(a => a.id === editingAssignmentId.value);
      if (index !== -1) {
        parkingAssignments.value[index] = {
          ...parkingAssignments.value[index],
          ...saveData.addonData,
          dates: saveData.dates,
          totalPrice: saveData.addonData.unitPrice * saveData.dates.length
        };
      }
      emit('parking-updated', saveData);
    } else {
      // Add new assignment
      const newAssignment = {
        id: `temp-${Date.now()}`,
        ...saveData.addonData,
        dates: saveData.dates,
        totalPrice: saveData.addonData.unitPrice * saveData.dates.length,
        createdAt: new Date().toISOString()
      };
      parkingAssignments.value.push(newAssignment);
      emit('parking-added', saveData);
    }
    
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: isEditMode.value ? '駐車場予約を更新しました' : '駐車場予約を追加しました',
      life: 3000
    });
  } catch (error) {
    console.error('Error saving parking assignment:', error);
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '駐車場予約の保存に失敗しました',
      life: 3000
    });
  }
};

const onParkingCancel = () => {
  showParkingDialog.value = false;
};

const onParkingClose = () => {
  showParkingDialog.value = false;
  isEditMode.value = false;
  editingAssignmentId.value = null;
  dialogAddonData.value = {};
  dialogInitialDates.value = [];
};

const confirmRemoveAssignment = (assignment) => {
  confirm.require({
    message: `駐車場予約「${assignment.name || '駐車場'}」を削除しますか？`,
    header: '削除確認',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    acceptLabel: '削除',
    rejectLabel: 'キャンセル',
    accept: () => removeAssignment(assignment)
  });
};

const removeAssignment = async (assignment) => {
  try {
        
    // Remove from local state
    const index = parkingAssignments.value.findIndex(a => a.id === assignment.id);
    if (index !== -1) {
      parkingAssignments.value.splice(index, 1);
    }
    
    emit('parking-removed', assignment);
    
    toast.add({
      severity: 'success',
      summary: '削除完了',
      detail: '駐車場予約を削除しました',
      life: 3000
    });
  } catch (error) {
    console.error('Error removing parking assignment:', error);
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '駐車場予約の削除に失敗しました',
      life: 3000
    });
  }
};

const refreshAvailability = async (assignment) => {
  if (!assignment.vehicleCategoryId || !assignment.dates?.length) return;
  
  assignment.refreshing = true;
  
  try {
    const availabilityData = await parkingStore.checkRealTimeAvailability(
      props.hotelId,
      assignment.vehicleCategoryId,
      assignment.dates
    );
    
    assignment.availabilityData = availabilityData;
    
    toast.add({
      severity: 'success',
      summary: '更新完了',
      detail: '空き状況を更新しました',
      life: 2000
    });
  } catch (error) {
    console.error('Error refreshing availability:', error);
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: '空き状況の更新に失敗しました',
      life: 3000
    });
  } finally {
    assignment.refreshing = false;
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  });
};

const formatDateRange = (dates) => {
  if (!dates || dates.length === 0) return '期間未設定';
  if (dates.length === 1) return formatDate(dates[0]);
  
  const startDate = formatDate(dates[0]);
  const endDate = formatDate(dates[dates.length - 1]);
  return `${startDate} - ${endDate} (${dates.length}日)`;
};

// WebSocket integration for real-time updates
const handleParkingUpdate = (event) => {
  const data = event.detail;
  console.log('ParkingSection: Received parking update:', data);
  
  // Refresh availability for all assignments
  parkingAssignments.value.forEach(assignment => {
    if (assignment.vehicleCategoryId && assignment.dates?.length) {
      refreshAvailability(assignment);
    }
  });
};

// Lifecycle
onMounted(async () => {
  await loadParkingAssignments(); 
});

// Watchers
watch(() => props.reservationDetails, async (newDetails) => {
  if (newDetails && newDetails.length > 0) {
    await loadParkingAssignments();
  }
}, { deep: true });
</script>

<style scoped>
.parking-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--surface-border);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.section-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-color);
}

.status-indicators {
  display: flex;
  gap: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.parking-assignments {
  margin-top: 1rem;
}

.assignment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0;
}

.assignment-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.spot-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.spot-number {
  font-weight: 600;
  color: var(--primary-color);
}

.parking-lot {
  color: var(--text-color-secondary);
}

.assignment-details {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.assignment-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-indicators {
  display: flex;
  gap: 0.5rem;
}

.price-info {
  text-align: right;
}

.total-price {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 1.1rem;
}

.assignment-details-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.detail-section {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.detail-section h6 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--primary-color);
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--surface-border);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item .label {
  font-weight: 500;
  color: var(--text-color-secondary);
}

.detail-item .value {
  font-weight: 600;
  color: var(--text-color);
}

.date-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.date-tag {
  font-size: 0.75rem;
}

.availability-status {
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.availability-status h6 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color);
}

.availability-summary {
  display: flex;
  gap: 2rem;
}

.availability-stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
}

.stat-value {
  font-weight: 600;
  color: var(--primary-color);
}

.assignment-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--surface-border);
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  border: 2px dashed var(--surface-border);
}

.empty-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
}

.empty-icon {
  font-size: 3rem;
  color: var(--text-color-secondary);
  margin-bottom: 1rem;
}

.empty-content h5 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.empty-content p {
  margin: 0 0 1.5rem 0;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

@media (max-width: 768px) {
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .header-info {
    justify-content: center;
  }
  
  .assignment-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  
  .assignment-status {
    justify-content: space-between;
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
  
  .availability-summary {
    flex-direction: column;
    gap: 1rem;
  }
  
  .assignment-actions {
    flex-direction: column;
  }
}
</style>