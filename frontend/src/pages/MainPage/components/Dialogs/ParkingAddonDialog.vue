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
                    placeholder="開始日"
                    show-icon
                  />
                  <label for="startDate">開始日 *</label>
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
                    placeholder="終了日"
                    show-icon
                  />
                  <label for="endDate">終了日 *</label>
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
            <div class="field">
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

        <!-- Pricing Information -->
        <div class="form-section">
          <h5 class="section-title">料金情報</h5>
          
          <div class="pricing-grid">
            <div class="field">
              <FloatLabel>
                <InputNumber
                  id="totalPrice"
                  v-model="calculatedTotalPrice"
                  :disabled="true"
                  mode="currency"
                  currency="JPY"
                  locale="ja-JP"
                  class="w-full"
                />
                <label for="totalPrice">合計金額</label>
              </FloatLabel>
            </div>
          </div>

          <div class="pricing-breakdown" v-if="dateRange.length > 0 && localAddonData.unitPrice">
            <div class="breakdown-item">
              <span>単価:</span>
              <span>¥{{ localAddonData.unitPrice?.toLocaleString('ja-JP') || 0 }}</span>
            </div>
            <div class="breakdown-item">
              <span>日数:</span>
              <span>{{ dateRange.length }}日</span>
            </div>
            <div class="breakdown-item total">
              <span>合計:</span>
              <span>¥{{ calculatedTotalPrice?.toLocaleString('ja-JP') || 0 }}</span>
            </div>
          </div>
        </div>

        <!-- Vehicle Category Information -->
        <div class="form-section" v-if="selectedVehicleCategory">
          <h5 class="section-title">車両情報</h5>
          
          <div class="vehicle-info-card">
            <div class="info-row">
              <span class="label">車両カテゴリ:</span>
              <span class="value">{{ selectedVehicleCategory.name }}</span>
            </div>
            <div class="info-row">
              <span class="label">必要容量:</span>
              <span class="value">{{ selectedVehicleCategory.capacity_units_required }} 単位</span>
            </div>
            <div class="info-row" v-if="selectedSpot">
              <span class="label">選択スポット:</span>
              <span class="value">{{ selectedSpot.spotNumber }} - {{ selectedSpot.parkingLotName }}</span>
            </div>
            <div class="info-row" v-if="selectedSpot">
              <span class="label">スポット容量:</span>
              <span class="value">{{ selectedSpot.capacityUnits }} 単位</span>
            </div>
          </div>
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
import Select from 'primevue/dropdown';

// Stores
import { usePlansStore } from '@/composables/usePlansStore';
const { fetchAllAddons } = usePlansStore();

// Reactive state
const localAddonData = ref({
  name: '駐車場',
  unitPrice: 1000,
  vehicleCategoryId: null,
  spotId: null,
  roomId: null,
  ...props.addonData
});

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
  date.setDate(date.getDate() - 1); // Exclude check-out date
  return date;
});

const dateRange = computed(() => {
  if (!startDate.value || !endDate.value) return [];
  
  const dates = [];
  const current = new Date(startDate.value);
  const end = new Date(endDate.value);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
});

const calculatedTotalPrice = computed(() => {
  if (!localAddonData.value.unitPrice || dateRange.value.length === 0) return 0;
  return localAddonData.value.unitPrice * dateRange.value.length;
});

const isFormValid = computed(() => {
  return Object.keys(errors.value).length === 0 && 
         spotValidationValid.value &&
         localAddonData.value.unitPrice > 0 &&
         dateRange.value.length > 0 &&
         localAddonData.value.vehicleCategoryId &&
         localAddonData.value.spotId &&
         localAddonData.value.roomId;
});

// Methods
const validateForm = () => {
  errors.value = {};
  
  if (!localAddonData.value.roomId) {
    errors.value.roomId = '部屋を選択してください';
  }
  
  if (!startDate.value) {
    errors.value.startDate = '開始日を選択してください';
  }
  
  if (!endDate.value) {
    errors.value.endDate = '終了日を選択してください';
  } else if (startDate.value && endDate.value < startDate.value) {
    errors.value.endDate = '終了日は開始日以降にしてください';
  }
  
  if (!localAddonData.value.unitPrice || localAddonData.value.unitPrice <= 0) {
    errors.value.unitPrice = '単価は0より大きい値を入力してください';
  }
  
  if (!localAddonData.value.vehicleCategoryId) {
    errors.value.vehicleCategoryId = '車両タイプを選択してください';
  }
  
  if (!localAddonData.value.spotId) {
    errors.value.spotId = '駐車スペースを選択してください';
  }
  
  return Object.keys(errors.value).length === 0;
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
    name: '駐車場',
    unitPrice: 1000,
    vehicleCategoryId: null,
    spotId: null,
    roomId: null,
    ...props.addonData
  };
  
  if (props.initialDates.length >= 2) {
    startDate.value = new Date(props.initialDates[0]);
    endDate.value = new Date(props.initialDates[props.initialDates.length - 1]);
  } else {
    startDate.value = null;
    endDate.value = null;
  }
  
  errors.value = {};
  spotValidationValid.value = false;
  selectedVehicleCategory.value = null;
  selectedSpot.value = null;
  selectedRoom.value = null;
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
    const addonData = {
      hotel_id: props.reservationDetails?.[0]?.hotel_id,
      reservation_id: props.reservationId,
      addon_id: 3, // Global parking addon ID
      name: localAddonData.value.name,
      price: calculatedTotalPrice.value,
      created_by: 'current_user', // This should come from auth context
      updated_by: 'current_user'
    };  
        
    toast.add({
      severity: 'success',
      summary: '成功',
      detail: props.isEditMode ? '駐車場アドオンを更新しました' : '駐車場アドオンを追加しました',
      life: 3000
    });
    
    emit('save', {
      addonData: localAddonData.value,
      dates: dateRange.value,
      result: result
    });
    
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
watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    // Dialog is opening
    try {
      // Get hotelId from the first reservation detail if available
      const hotelId = props.reservationDetails?.[0]?.hotel_id;
      
      if (hotelId && !addonOptions.value.length) {
        const allAddons = await fetchAllAddons(hotelId); 
        console.log('[ParkingAddonDialog] fetchAllAddons', allAddons);
        if (allAddons && Array.isArray(allAddons)) {
          addonOptions.value = allAddons.filter(addon => addon.addon_type === 'parking');
          console.log('[ParkingAddonDialog] addonOptions', addonOptions.value);
        }
      }
    } catch (error) {
      console.error('Error loading addons:', error);
    }
  } else {
    // Dialog is closing
    resetForm();
  }
}, { immediate: true });

// Lifecycle
onMounted(() => {
  resetForm();
});
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