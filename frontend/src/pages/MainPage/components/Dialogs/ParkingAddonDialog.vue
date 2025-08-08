<template>
  <Dialog
    :visible="modelValue"
    @update:visible="$emit('update:modelValue', $event)"
    :header="dialogTitle"
    :closable="true"
    :modal="true"
    :style="{ width: '70vw', maxWidth: '900px' }"
    @hide="onDialogHide"
  >
    <div class="parking-addon-dialog-content">
      <!-- Form Grid -->
      <div class="form-grid">
        <!-- Room Selection - Full width row -->
        <div class="form-row">
          <div class="form-section full-width">
            <h5 class="section-title">部屋選択</h5>
            <div class="field">
              <FloatLabel>
                <Select
                  v-model="localAddonData.roomId"
                  :options="rooms"
                  optionLabel="name"
                  optionValue="id"
                  class="w-full"
                  :class="{ 'p-invalid': errors.roomId }"
                  :disabled="processing || isEditMode"
                  @change="(e) => selectedRoom = rooms.find(r => r.id === e.value)"
                />
                <label>部屋 *</label>
              </FloatLabel>
              <small v-if="errors.roomId" class="p-error">{{ errors.roomId }}</small>
            </div>
          </div>
        </div>

        <!-- Date Selection - Full width row -->
        <div class="form-row">
          <div class="form-section full-width">
            <h5 class="section-title">利用期間</h5>
            <div class="date-fields">
              <div class="field">
                <FloatLabel>
                  <DatePicker
                    id="startDate"
                    v-model="startDate"
                    :min-date="minDate"
                    :max-date="maxDate"
                    :disabled="!localAddonData.roomId || processing"
                    :class="{ 'p-invalid': errors.startDate }"
                    date-format="yy-mm-dd"                    
                    show-icon
                  />
                  <label for="startDate">開始日 (IN) *</label>
                </FloatLabel>
                <small v-if="errors.startDate" class="p-error">{{ errors.startDate }}</small>
              </div>
              
              <div class="field">
                <FloatLabel>
                  <DatePicker
                    id="endDate"
                    v-model="endDate"
                    :min-date="startDate || minDate"
                    :max-date="maxDate"
                    :disabled="!localAddonData.roomId || processing"
                    :class="{ 'p-invalid': errors.endDate }"
                    date-format="yy-mm-dd"                    
                    show-icon
                  />
                  <label for="endDate">終了日 (OUT) *</label>
                </FloatLabel>
                <small v-if="errors.endDate" class="p-error">{{ errors.endDate }}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Basic Info in a new row -->
        <div class="form-row">
          <div class="form-section full-width">
            <h5 class="section-title">基本情報</h5>
            
            <div class="inline-fields">
              <!-- Addon Selector -->
              <div class="field field-grow">
                <FloatLabel>
                  <Select
                    v-model="selectedAddon"
                    :options="addonOptions"
                    optionLabel="addon_name"
                    optionValue="id"
                    placeholder="アドオンを選択"
                    class="w-full"
                    :class="{ 'p-invalid': errors.selectedAddon }"
                    :disabled="processing"
                  />
                  <label>アドオン *</label>
                </FloatLabel>
                <small v-if="errors.selectedAddon" class="p-error">{{ errors.selectedAddon }}</small>
              </div>

              <!-- Unit Price -->
              <div class="field field-shrink">
                <FloatLabel>
                  <InputNumber
                    id="unitPrice"
                    v-model="localAddonData.unitPrice"
                    mode="currency"
                    currency="JPY"
                    locale="ja-JP"
                    :class="{ 'p-invalid': errors.unitPrice }"
                    :disabled="processing"
                    :min="0"
                    class="w-full"
                  />
                  <label for="unitPrice">単価 (税抜) *</label>
                </FloatLabel>
                <small v-if="errors.unitPrice" class="p-error">{{ errors.unitPrice }}</small>
              </div>
            </div>
            
            <!-- Inline pricing breakdown -->
            <div class="inline-pricing" v-if="dateRange.length > 0 && localAddonData.unitPrice">
              <div class="pricing-item">
                <span class="label">単価:</span>
                <span class="value">¥{{ localAddonData.unitPrice?.toLocaleString('ja-JP') || 0 }}</span>
              </div>
              <div class="pricing-item">
                <span class="label">日数:</span>
                <span class="value">{{ dateRange.length }}日</span>
              </div>
              <div class="pricing-item total">
                <span class="label">合計:</span>
                <span class="value">¥{{ calculatedTotalPrice?.toLocaleString('ja-JP') || 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Parking Spot Selection -->
        <div class="form-section full-width">
          <h5 class="section-title">駐車スポット選択</h5>
          
          <ParkingSpotSelector
            :hotel-id="hotelId"
            :dates="dateRange"
            :disabled="processing || dateRange.length === 0"
            :preselected-vehicle-category-id="localAddonData.vehicleCategoryId"
            :preselected-spot-id="localAddonData.spotId"
            @update:vehicle-category-id="onVehicleCategoryChange"
            @update:spot-id="onSpotChange"
            @selection-change="onSpotSelectionChange"
            @validation-change="onSpotValidationChange"
          />
        </div>

      </div>

      <!-- Validation Summary -->
      <div class="validation-summary" v-if="Object.keys(errors).length > 0">
        <Message severity="error" :closable="false">
          <div class="error-list">
            <div class="error-header">
              <i class="pi pi-exclamation-triangle"></i>
              <span>入力エラーがあります:</span>
            </div>
            <ul>
              <li v-for="(error, field) in errors" :key="field">{{ error }}</li>
            </ul>
          </div>
        </Message>
      </div>

      <!-- Success Message -->
      <div class="success-message" v-if="isFormValid && !processing">
        <Message severity="success" :closable="false">
          <div class="success-content">
            <i class="pi pi-check-circle"></i>
            <span>入力内容に問題ありません</span>
          </div>
        </Message>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <Button
          label="キャンセル"
          icon="pi pi-times"
          class="p-button-text p-button-secondary"
          @click="onCancel"
          :disabled="processing"
        />
        <Button
          :label="isEditMode ? '更新' : '追加'"
          :icon="processing ? 'pi pi-spin pi-spinner' : (isEditMode ? 'pi pi-save' : 'pi pi-plus')"
          class="p-button-primary"
          @click="onSave"
          :disabled="!isFormValid || processing"
          :loading="processing"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
// Vue
import { ref, computed, watch, onMounted } from 'vue';

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  addonData: {
    type: Object,
    default: () => ({
      name: '駐車場',
      unitPrice: 1000,
      vehicleCategoryId: null,
      spotId: null,
      roomId: null
    })
  },
  reservationDetails: {
    type: Array,
    required: true
  },
  parkingReservations: {
    type: Object,
    default: () => ({})
  },
  initialDates: {
    type: Array,
    default: () => []
  },
  isEditMode: {
    type: Boolean,
    default: false
  },
  assignmentId: {
    type: [Number, String],
    default: null
  }
});

// Emits
const emit = defineEmits([
  'update:modelValue',
  'save',
  'cancel',
  'close'
]);

import ParkingSpotSelector from '@/pages/MainPage/components/ParkingSpotSelector.vue';

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import Dialog from 'primevue/dialog';
import FloatLabel from 'primevue/floatlabel';
import InputText from 'primevue/inputtext';
import DatePicker from 'primevue/datepicker';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Select from 'primevue/select';

// Stores
import { usePlansStore } from '@/composables/usePlansStore';
const { fetchAllAddons } = usePlansStore();

// Reactive state
const localAddonData = ref({
  roomId: null,
  startDate: null,
  endDate: null,
  unitPrice: 1000,
  vehicleCategoryId: null,
  spotId: null,
  name: ''
});

const selectedAddon = ref(null);
const startDate = ref(null);
const endDate = ref(null);
const selectedRoom = ref(null);
const errors = ref({});
const processing = ref(false);
const spotValidationValid = ref(false);
const selectedVehicleCategory = ref(null);
const selectedSpot = ref(null);
const addonOptions = ref([]);

// Computed properties
const dialogTitle = computed(() => {
  return props.isEditMode ? '駐車場アドオン編集' : '駐車場アドオン追加';
});

const hotelId = computed(() => {
  // Get hotelId from the first reservation detail if available
  return props.reservationDetails?.[0]?.hotel_id;
});

const dateRange = computed(() => {
  if (!startDate.value || !endDate.value) return [];
  
  const dates = [];
  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  
  // Use UTC to prevent timezone issues
  let current = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()));
  const final = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()));

  while (current < final) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return dates;
});

const selectedReservationDetails = computed(() => {
  if (!localAddonData.value.roomId || dateRange.value.length === 0) {
    return [];
  }

  const selectedRoomId = localAddonData.value.roomId;
  const selectedDates = new Set(dateRange.value);

  return props.reservationDetails
    .filter(detail => {
      const detailDate = detail.date ? detail.date.split('T')[0] : null;
      return detail.room_id === selectedRoomId && selectedDates.has(detailDate);
    })
    .map(detail => ({
        id: detail.id,
        date: detail.date.split('T')[0]
    }));
});

const rooms = computed(() => {
  const uniqueRooms = new Map();
  
  props.reservationDetails.forEach(room => {
    if (!uniqueRooms.has(room.room_id)) {
      uniqueRooms.set(room.room_id, {
        id: room.room_id,
        name: room.room_name || `部屋${room.room_number || room.room_id}`,
        checkIn: new Date(room.check_in),
        checkOut: new Date(room.check_out)
      });
    }
  });
  
  return Array.from(uniqueRooms.values());
});

const minDate = computed(() => {
  return selectedRoom.value?.checkIn || null;
});

const maxDate = computed(() => {
  if (!selectedRoom.value?.checkOut) return null;
  const date = new Date(selectedRoom.value.checkOut);
  return date;
});

const calculatedTotalPrice = computed(() => {
  if (!localAddonData.value.unitPrice || dateRange.value.length === 0) return 0;
  return localAddonData.value.unitPrice * dateRange.value.length;
});

const isFormValid = computed(() => {
  return Object.keys(errors.value).length === 0 && 
         spotValidationValid.value &&
         localAddonData.value.unitPrice !== null && localAddonData.value.unitPrice >= 0 &&
         dateRange.value.length > 0 &&
         localAddonData.value.vehicleCategoryId &&
         localAddonData.value.spotId &&
         localAddonData.value.roomId &&
         selectedAddon.value;
});

const saveDataForEmit = computed(() => {
  const { startDate, endDate, ...restOfAddonData } = localAddonData.value;

  return {
    ...restOfAddonData,
    addon_id: selectedAddon.value,
    hotel_id: hotelId.value,
    totalPrice: calculatedTotalPrice.value,
    details: selectedReservationDetails.value,
  };
});

watch(saveDataForEmit, (newValue) => {
  console.log('[ParkingAddonDialog] Save data changed:', JSON.parse(JSON.stringify(newValue)));
}, { deep: true });

// Methods
const validateForm = () => {
  errors.value = {};
  let isValid = true;
  
  if (!localAddonData.value.roomId) {
    errors.value.roomId = '部屋を選択してください';
    isValid = false;
  }
  
  if (!startDate.value) {
    errors.value.startDate = '開始日を選択してください';
    isValid = false;
  } else if (minDate.value && new Date(startDate.value) < new Date(minDate.value)) {
    errors.value.startDate = `開始日は${formatDate(minDate.value)}以降を選択してください`;
    isValid = false;
  }
  
  if (!endDate.value) {
    errors.value.endDate = '終了日を選択してください';
    isValid = false;
  } else if (maxDate.value && new Date(endDate.value) > new Date(maxDate.value)) {
    errors.value.endDate = `終了日は${formatDate(maxDate.value)}以前を選択してください`;
    isValid = false;
  } else if (startDate.value && new Date(endDate.value) <= new Date(startDate.value)) {
    errors.value.endDate = '終了日は開始日より後の日付を選択してください';
    isValid = false;
  }
  
  if (!selectedAddon.value) {
    errors.value.addonId = 'アドオンを選択してください';
    isValid = false;
  }
  
  if (localAddonData.value.unitPrice === null || isNaN(localAddonData.value.unitPrice) || localAddonData.value.unitPrice < 0) {
    errors.value.unitPrice = '有効な単価を入力してください';
    isValid = false;
  }
  
  return isValid && spotValidationValid.value;
};

const calculateTotalPrice = () => {
  // This is automatically calculated by the computed property
  // This method exists for explicit calculation triggers if needed
};

const onDateChange = () => {
  validateForm();
};

const onVehicleCategoryChange = (vehicleCategoryId) => {
  localAddonData.value.vehicleCategoryId = vehicleCategoryId;
  validateForm();
};

const onSpotChange = (spotId) => {
  localAddonData.value.spotId = spotId;
  validateForm();
};

const onSpotSelectionChange = (selectionData) => {
  selectedVehicleCategory.value = selectionData.selectedCategory;
  selectedSpot.value = selectionData.selectedSpot;
  validateForm();
};

const onSpotValidationChange = (isValid) => {
  spotValidationValid.value = isValid;
  validateForm();
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  });
};

const resetForm = () => {
  localAddonData.value = {
    roomId: null,
    startDate: null,
    endDate: null,
    unitPrice: 1000,
    vehicleCategoryId: null,
    spotId: null,
    name: ''
  };
  selectedAddon.value = null;
  selectedRoom.value = null;
  selectedVehicleCategory.value = null;
  selectedSpot.value = null;
  if (props.initialDates.length >= 2) {
    startDate.value = new Date(props.initialDates[0]);
    endDate.value = new Date(props.initialDates[props.initialDates.length - 1]);
  } else {
    startDate.value = null;
    endDate.value = null;
  }
  errors.value = {};
  spotValidationValid.value = false;
};

const onSave = async () => {
  if (!validateForm() || !spotValidationValid.value) {
    toast.add({
      severity: 'warn',
      summary: '入力エラー',
      detail: '入力内容を確認してください',
      life: 3000
    });
    return;
  }
  
  processing.value = true;
  
  try {
    // Note: The actual API call to save the addon is not implemented here.
    // This component currently only emits the data to the parent.
    // The parent component is responsible for making the API call.
    
    const saveData = saveDataForEmit.value;
        
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: props.isEditMode ? '駐車場情報を更新しました' : '駐車場情報を保存しました',
      life: 3000
    });
    
    emit('save', saveData); // Emit the prepared data object
    
    emit('update:modelValue', false);
    
  } catch (error) {
    console.error('Error saving parking addon:', error);
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: error.message || '駐車場アドオンの保存に失敗しました',
      life: 5000
    });
  } finally {
    processing.value = false;
  }
};

const onCancel = () => {
  emit('cancel');
  emit('update:modelValue', false);
};

const onDialogHide = () => {
  emit('close');
};

// Watchers
watch(selectedAddon, (newAddonId) => {
  if (newAddonId) {
    const selected = addonOptions.value.find(a => a.id === newAddonId);
    if (selected) {
      // Only update the price if it hasn't been manually changed
      if (localAddonData.value.unitPrice === 1000) { // Default price
        localAddonData.value.unitPrice = selected.price || 1000;
      }
      // Update the addon name if needed
      if (selected.addon_name) {
        localAddonData.value.name = selected.addon_name;
      }
    }
  }
}, { immediate: true });

// Auto-select first room when rooms are available
watch(() => rooms.value, (newRooms) => {
  if (newRooms.length > 0 && !selectedRoom.value) {
    selectedRoom.value = newRooms[0];
    // Also update the roomId in localAddonData
    localAddonData.value.roomId = newRooms[0].id;
    console.log('[ParkingAddonDialog] Auto-selected first room:', selectedRoom.value);
  }
}, { immediate: true });

// Sync selectedRoom with localAddonData.roomId
watch(selectedRoom, (newRoom) => {
  if (newRoom) {
    localAddonData.value.roomId = newRoom.id;
    // Update date range based on the selected room
    if (newRoom.checkIn) startDate.value = newRoom.checkIn;
    if (newRoom.checkOut) endDate.value = newRoom.checkOut;
  }
}, { immediate: true });

// Watchers for date changes
watch(startDate, (newStartDate) => {
  if (!newStartDate || !endDate.value) return;
  
  const start = new Date(newStartDate);
  const end = new Date(endDate.value);
  
  // Ensure start date is not after end date
  if (start >= end) {
    const nextDay = new Date(start);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Ensure nextDay doesn't exceed the room's check-out date
    if (maxDate.value && nextDay > new Date(maxDate.value)) {
      // If we can't set next day, adjust start date instead
      const prevDay = new Date(end);
      prevDay.setDate(prevDay.getDate() - 1);
      
      // Ensure prevDay is not before room's check-in date
      if (minDate.value && prevDay < new Date(minDate.value)) {
        // If we can't adjust either way, reset to original values
        startDate.value = minDate.value;
        endDate.value = new Date(minDate.value);
        endDate.value.setDate(endDate.value.getDate() + 1);
      } else {
        startDate.value = prevDay;
      }
    } else {
      endDate.value = nextDay;
    }
  }
  
  onDateChange();
});

watch(endDate, (newEndDate) => {
  if (!newEndDate || !startDate.value) return;
  
  const start = new Date(startDate.value);
  const end = new Date(newEndDate);
  
  // Ensure end date is not before start date
  if (end <= start) {
    const prevDay = new Date(end);
    prevDay.setDate(prevDay.getDate() - 1);
    
    // Ensure prevDay is not before room's check-in date
    if (minDate.value && prevDay < new Date(minDate.value)) {
      // If we can't set previous day, adjust end date instead
      const nextDay = new Date(start);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Ensure nextDay doesn't exceed the room's check-out date
      if (maxDate.value && nextDay > new Date(maxDate.value)) {
        // If we can't adjust either way, reset to original values
        endDate.value = maxDate.value;
        startDate.value = new Date(maxDate.value);
        startDate.value.setDate(startDate.value.getDate() - 1);
      } else {
        endDate.value = nextDay;
      }
    } else {
      startDate.value = prevDay;
    }
  }
  
  onDateChange();
});

// Update the date range validation
watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    // Dialog is opening
    try {
      // Auto-select first room if available
      if (rooms.value.length > 0 && !selectedRoom.value) {
        selectedRoom.value = rooms.value[0];
        console.log('[ParkingAddonDialog] Auto-selected first room on dialog open:', selectedRoom.value);
      }
    } catch (error) {
      console.error('Error on dialog open:', error);
    }
  } else {
    // Dialog is closing
    resetForm();
  }
}, { immediate: true });

watch(hotelId, async (newHotelId) => {
  if (newHotelId && !addonOptions.value.length) {
    const allAddons = await fetchAllAddons(newHotelId); 
    if (allAddons && Array.isArray(allAddons)) {
      const parkingAddons = allAddons.filter(addon => addon.addon_type === 'parking');
      addonOptions.value = parkingAddons;
      
      // Auto-select first addon if available
      if (parkingAddons.length > 0 && !selectedAddon.value) {
        selectedAddon.value = parkingAddons[0].id;
      }
    }
  }
}, { immediate: true });
</script>

<style scoped>
.parking-addon-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1rem 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-section.quarter-width {
  grid-column: 1 / 2;
}

.form-section.three-quarters-width {
  grid-column: 2 / -1;
}

.form-section.full-width {
  grid-column: 1 / -1;
}

.section-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-color);
  border-bottom: 1px solid var(--surface-border);
  padding-bottom: 0.5rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.date-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.date-summary {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
  margin-top: 0.5rem;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-weight: 500;
  color: var(--text-color);
}

.date-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pricing-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.inline-pricing {
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: var(--surface-50);
  border-radius: 4px;
}

.pricing-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.pricing-item .label {
  color: var(--text-color-secondary);
}

.pricing-item .value {
  font-weight: 500;
}

.pricing-item.total {
  margin-left: auto;
  font-weight: 600;
  color: var(--primary-color);
}

.pricing-breakdown {
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  padding: 1rem;
  margin-top: 0.5rem;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--surface-border);
}

.breakdown-item:last-child {
  border-bottom: none;
}

.breakdown-item.total {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--primary-color);
  border-top: 2px solid var(--primary-color);
  margin-top: 0.5rem;
  padding-top: 0.75rem;
}

.vehicle-info-card {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--surface-border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  font-weight: 500;
  color: var(--text-color-secondary);
}

.info-row .value {
  font-weight: 600;
  color: var(--text-color);
}

.validation-summary {
  margin-top: 1rem;
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

.error-list ul {
  margin: 0;
  padding-left: 1.5rem;
}

.error-list li {
  margin: 0.25rem 0;
}

.success-message {
  margin-top: 1rem;
}

.success-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.inline-fields {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.field-grow {
  flex: 1;
  min-width: 200px;
}

.field-shrink {
  width: 200px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .date-fields {
    grid-template-columns: 1fr;
  }
  
  .pricing-grid {
    grid-template-columns: 1fr;
  }
  
  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .breakdown-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>