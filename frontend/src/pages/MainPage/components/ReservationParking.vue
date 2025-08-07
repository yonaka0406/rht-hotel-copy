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

    <!-- Parking Usage Table -->
    <div class="parking-usage" v-if="Object.keys(parkingUsageByRoom).length > 0">
      <div class="card">
        <DataTable :value="Object.entries(parkingUsageByRoom)" :scrollable="true" scrollDirection="both" class="parking-table">
          <Column field="room" header="部屋" :style="{ 'min-width': '150px' }" frozen>
            <template #body="{ data: [roomId, roomData] }">
              {{ roomData.roomName }}
            </template>
          </Column>
          <Column v-for="date in reservationDates" :key="date" :field="date" :header="formatDate(date)" :style="{ 'min-width': '100px' }">
            <template #body="{ data: [roomId, roomData] }">
              <div class="text-center">
                <Tag v-if="roomData.dates[date] > 0" severity="info">
                  {{ roomData.dates[date] }}
                </Tag>
                <span v-else>-</span>
              </div>
            </template>
          </Column>
        </DataTable>
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
  },
  parkingReservations: {
    type: Object,
    default: () => ({})
  }
});

// Stores
import { useParkingStore } from '@/composables/useParkingStore';
const parkingStore = useParkingStore();

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

// Helper
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Reactive state
const parkingAssignments = ref([]);
const showParkingDialog = ref(false);
const isEditMode = ref(false);
const editingAssignmentId = ref(null);
const dialogAddonData = ref({});
const dialogInitialDates = ref([]);
const loading = ref(false);

// Watch for changes in parkingReservations prop
watch(() => props.parkingReservations, (newVal) => {
  const reservationsArray = newVal?.parking || [];
  if (reservationsArray.length > 0) {
    parkingAssignments.value = reservationsArray.map(reservation => ({
      id: reservation.id,
      spotId: reservation.parking_spot_id,
      spotNumber: reservation.spot_number,
      parkingLotName: '', // Add if available in the response
      vehicleCategoryId: reservation.vehicle_category_id,
      vehicleCategoryName: reservation.vehicle_category_name,
      dates: [reservation.date],
      unitPrice: Number(reservation.price) || 0,
      totalPrice: Number(reservation.price) || 0,
      comment: reservation.comment || '',
      status: reservation.status || 'active'
    }));
  } else {
    parkingAssignments.value = [];
  }
}, { immediate: true, deep: true });

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

// Group parking assignments by room and date
const parkingUsageByRoom = computed(() => {
  const usage = {};
  
  // Initialize with all rooms from reservation details
  props.reservationDetails.forEach(room => {
    if (!usage[room.room_id]) {
      usage[room.room_id] = {
        roomName: room.room_name || `Room ${room.room_number || room.room_id}`,
        dates: {}
      };
      
      // Initialize all dates with 0 spots
      reservationDates.value.forEach(date => {
        usage[room.room_id].dates[date] = 0;
      });
    }
  });
  
  // Count parking spots per room per date
  parkingAssignments.value.forEach(assignment => {
    if (assignment.room_id && assignment.dates) {
      assignment.dates.forEach(date => {
        if (usage[assignment.room_id]?.dates[date] !== undefined) {
          usage[assignment.room_id].dates[date]++;
        }
      });
    }
  });
  
  return usage;
});

const canAddParking = computed(() => {
  return reservationDetailId.value && reservationDates.value.length > 0;
});

const fullyAssignedCount = computed(() => {
  return parkingAssignments.value.filter(assignment => 
    assignment.spotId && assignment.vehicleCategoryId
  ).length;
});

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
      props.reservationDetails[0].hotel_id,
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

const formatDateRange = (dates) => {
  if (!dates || dates.length === 0) return '期間未設定';
  if (dates.length === 1) return formatDate(new Date(dates[0]));
  
  const startDate = formatDate(new Date(dates[0]));
  const endDate = formatDate(new Date(dates[dates.length - 1]));
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
.parking-usage {
  margin-bottom: 1.5rem;
}

.parking-table {
  width: 100%;
  overflow-x: auto;
}

.parking-table :deep(.p-datatable-wrapper) {
  overflow-x: auto;
}

.parking-table :deep(.p-datatable-thead > tr > th) {
  white-space: nowrap;
  position: sticky;
  top: 0;
  background: var(--surface-card);
  z-index: 1;
}

.parking-table :deep(.p-datatable-tbody > tr > td) {
  white-space: nowrap;
}

.text-center {
  text-align: center;
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