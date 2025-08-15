<template>
  <div class="parking-section">
    <!-- Header with Add Parking Button -->
    <div class="section-header">
      <div class="header-info">
        <h4 class="section-title">
          <i class="pi pi-car"></i>
          駐車場 ({{ parkingAssignments.length }})
        </h4>        
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
          <Column field="room" header="部屋" :style="{ 'min-width': '200px' }" frozen>
            <template #body="{ data: [roomId, roomData] }">
              <div class="flex align-items-center gap-2">
                <span>{{ roomData.roomName }}</span>
                <Button 
                  icon="pi pi-arrow-up-right" 
                  class="p-button-sm p-button-outlined p-button-secondary"
                  style="width: 2rem; height: 2rem"
                  @click="openParkingSpotsDialog(roomId, roomData.roomName)"
                  v-tooltip.top="'駐車場を管理'"
                />
              </div>
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
      :reservation-details="reservationDetails"
      :parking-reservations="parkingReservations"
      :initial-dates="reservationDates"
      :is-edit-mode="isEditMode"
      :addon-data="dialogAddonData"
      @save="onParkingSave"
      @cancel="onParkingCancel"
    />

    <!-- Active Parking Spots Dialog -->
    <ParkingActiveSpotsDialog
      v-if="selectedRoomId"
      v-model="showParkingSpotsDialog"
      :room-id="selectedRoomId"
      :room-name="selectedRoomName"
      :parking-spots="selectedRoomParkingSpots"
      :processing="processing"
      @hide="cleanupDialog"
    />

    <!-- Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup>
// Vue
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

import ParkingAddonDialog from '@/pages/MainPage/components/Dialogs/ParkingAddonDialog.vue';
import ParkingActiveSpotsDialog from '@/pages/MainPage/components/Dialogs/ParkingActiveSpotsDialog.vue';

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

import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ConfirmDialog from 'primevue/confirmdialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

// Helper
const formatDate = (date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        return date; // Return original if it's not a valid date
    }
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Reactive state
const parkingAssignments = ref([]);
const showParkingDialog = ref(false);
const isEditMode = ref(false);
const editingAssignmentId = ref(null);
const dialogAddonData = ref({});
const dialogInitialDates = ref([]);
const showParkingSpotsDialog = ref(false);
const selectedRoomId = ref(null);
const selectedRoomName = ref('');
const processing = ref(false);
const loading = ref(false);

// Watch for changes in parkingReservations prop
watch(() => props.parkingReservations, (newVal) => {
  const reservationsArray = newVal?.parking || [];
  if (reservationsArray.length > 0) {
    // Group by reservation_addon_id first to handle multi-date reservations
    const groupedByAddon = reservationsArray.reduce((groups, reservation) => {
      const addonId = reservation.reservation_addon_id;
      if (!groups[addonId]) {
        groups[addonId] = {
          id: addonId,
          spotId: reservation.parking_spot_id,
          spotNumber: reservation.spot_number,
          parkingLotName: reservation.parking_lot_name,
          vehicleCategoryId: reservation.vehicle_category_id,
          vehicleCategoryName: reservation.vehicle_category_name,
          roomId: reservation.room_id,
          dates: [],
          unitPrice: Number(reservation.price) || 0,
          totalPrice: 0,
          comment: reservation.comment || '',
          status: reservation.status || 'active',
          reservationDetailsId: reservation.reservation_details_id
        };
      }
      // Format the date to YYYY-MM-DD for consistency
      const formattedDate = formatDate(reservation.date);
      if (!groups[addonId].dates.includes(formattedDate)) {
        groups[addonId].dates.push(formattedDate);
      }
      // Calculate total price based on number of dates
      groups[addonId].totalPrice = groups[addonId].unitPrice * groups[addonId].dates.length;
      return groups;
    }, {});
    
    parkingAssignments.value = Object.values(groupedByAddon);
    console.log('[ReservationParking] parkingAssignments', parkingAssignments.value);
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
        roomName: room.room_name || `部屋${room.room_number || room.room_id}`,
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
    const roomId = assignment.roomId;
    
    if (roomId && assignment.dates && Array.isArray(assignment.dates)) {
      assignment.dates.forEach(date => {
        // Ensure the date is in the correct format (YYYY-MM-DD)
        const formattedDate = formatDate(date);
        
        if (usage[roomId]?.dates[formattedDate] !== undefined) {
          usage[roomId].dates[formattedDate]++;
        } else {
          console.warn(`Date ${formattedDate} not found in room ${roomId} dates`);
        }
      });
    } else {
      console.warn('Invalid assignment - missing roomId or dates:', assignment);
    }
  });

  // console.log('parkingUsageByRoom computed:', JSON.parse(JSON.stringify(usage)));
  
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

const selectedRoomParkingSpots = computed(() => {
  if (!selectedRoomId.value) return [];
  
  const spots = [];
  const targetRoomId = String(selectedRoomId.value);
  console.log(`[DEBUG] Filtering spots for room ID: ${targetRoomId} (type: ${typeof targetRoomId})`);  
    
  parkingAssignments.value.forEach(assignment => {
    if (String(assignment.roomId) === targetRoomId && assignment.dates) {
      assignment.dates.forEach(date => {
        spots.push({
          id: `${assignment.id}-${date}`, // Unique ID for each spot-date combination
          spotNumber: assignment.spotNumber || '未設定',
          parkingLotName: assignment.parkingLotName || '未設定',
          vehicleCategoryName: assignment.vehicleCategoryName || '未設定',
          date: date,
          price: assignment.unitPrice || 0,          
          ...assignment
        });
      });
    }
  });
  
  console.log('[ReservationParking] Selected room parking spots:', spots);
  return spots;
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

const openParkingSpotsDialog = (roomId, roomName) => {
  selectedRoomId.value = roomId;
  selectedRoomName.value = roomName;
  showParkingSpotsDialog.value = true;
};

const onParkingSave = async (saveData) => {
    loading.value = true;
    try {
        if (!props.reservationDetails || props.reservationDetails.length === 0) {
            throw new Error('Reservation details are not available.');
        }
        
        const hotelId = props.reservationDetails[0].hotel_id;
        if (!hotelId) {
            throw new Error('Hotel ID is not available in reservation details.');
        }

        const reservationDetailIds = props.reservationDetails.map(d => d.id);
        if (!reservationDetailIds.length) {
            throw new Error('No reservation detail IDs available.');
        }

        let assignmentsToSave = [];
        const dates = saveData.details ? saveData.details.map(d => d.date) : [];
        const unitPrice = Number(saveData.unitPrice) || 0;
        const comment = saveData.comment || '';

        if (isEditMode.value) {
            // For updates, only include the assignment being edited
            const existingAssignment = parkingAssignments.value.find(a => a.id === editingAssignmentId.value);
            if (existingAssignment) {
                assignmentsToSave = [{
                    ...existingAssignment,
                    ...saveData,
                    hotel_id: hotelId,
                    spotId: saveData.spotId,
                    vehicleCategoryId: saveData.vehicleCategoryId,
                    unitPrice: unitPrice,
                    comment: comment,
                    dates: dates,
                    totalPrice: unitPrice * dates.length,
                    updated_at: new Date().toISOString()
                }];
            }
        } else {
            // For new assignments, only create new ones without including existing ones
            assignmentsToSave = [{
                id: `temp-${Date.now()}`,
                hotel_id: hotelId,
                ...saveData,
                spotId: saveData.spotId,
                vehicleCategoryId: saveData.vehicleCategoryId,
                unitPrice: unitPrice,
                comment: comment,
                dates: dates,
                totalPrice: unitPrice * dates.length,
                created_by: 'system',
                updated_by: 'system',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }];
        }

        await parkingStore.saveParkingAssignments(reservationDetailIds, assignmentsToSave);
        
        // Refresh data after saving
        await parkingStore.fetchParkingReservations(props.reservationDetails[0].hotel_id, props.reservationDetails[0].reservation_id);

        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '駐車場情報を保存しました',
            life: 3000
        });
        showParkingDialog.value = false;

    } catch (error) {
        console.error('Error saving parking assignment:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '駐車場予約の保存に失敗しました',
            life: 3000
        });
    } finally {
        loading.value = false;
    }
};

const onParkingCancel = () => {
  showParkingDialog.value = false;
};

const cleanupDialog = () => {
  selectedRoomId.value = null;
  selectedRoomName.value = '';
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

/* Style for the frozen column header (部屋) */
.parking-table :deep(.p-datatable-thead > tr > th.p-datatable-frozen-column) {
  background: white !important;
  z-index: 2; /* Higher than other headers */
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