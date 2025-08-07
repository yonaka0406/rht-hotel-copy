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
        <!-- Basic Addon Information -->
        <div class="form-section">
          <h5 class="section-title">基本情報</h5>
          
          <div class="field">
            <FloatLabel>
              <InputText
                id="addonName"
                v-model="localAddonData.name"
                :class="{ 'p-invalid': errors.name }"
                :disabled="processing"
                class="w-full"
              />
              <label for="addonName">アドオン名 *</label>
            </FloatLabel>
            <small v-if="errors.name" class="p-error">{{ errors.name }}</small>
          </div>

          <div class="field">
            <FloatLabel>
              <Textarea
                id="addonComment"
                v-model="localAddonData.comment"
                :disabled="processing"
                rows="3"
                class="w-full"
              />
              <label for="addonComment">コメント</label>
            </FloatLabel>
          </div>
        </div>

        <!-- Date Selection -->
        <div class="form-section">
          <h5 class="section-title">利用期間</h5>
          
          <div class="date-fields">
            <div class="field">
              <FloatLabel>
                <Calendar
                  id="startDate"
                  v-model="startDate"
                  :class="{ 'p-invalid': errors.dates }"
                  :disabled="processing"
                  date-format="yy-mm-dd"
                  :min-date="minDate"
                  class="w-full"
                  @date-select="onDateChange"
                />
                <label for="startDate">開始日 *</label>
              </FloatLabel>
            </div>
            
            <div class="field">
              <FloatLabel>
                <Calendar
                  id="endDate"
                  v-model="endDate"
                  :class="{ 'p-invalid': errors.dates }"
                  :disabled="processing"
                  date-format="yy-mm-dd"
                  :min-date="startDate || minDate"
                  class="w-full"
                  @date-select="onDateChange"
                />
                <label for="endDate">終了日 *</label>
              </FloatLabel>
            </div>
          </div>
          
          <small v-if="errors.dates" class="p-error">{{ errors.dates }}</small>
          
          <div v-if="dateRange.length > 0" class="date-summary">
            <div class="summary-header">
              <i class="pi pi-calendar"></i>
              <span>選択期間: {{ dateRange.length }}日間</span>
            </div>
            <div class="date-list">
              <Tag
                v-for="date in dateRange.slice(0, 5)"
                :key="date"
                :value="formatDate(date)"
                severity="info"
              />
              <Tag
                v-if="dateRange.length > 5"
                :value="`他 ${dateRange.length - 5}日`"
                severity="secondary"
              />
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
                  id="unitPrice"
                  v-model="localAddonData.unitPrice"
                  :class="{ 'p-invalid': errors.unitPrice }"
                  :disabled="processing"
                  mode="currency"
                  currency="JPY"
                  locale="ja-JP"
                  :min="0"
                  class="w-full"
                  @input="calculateTotalPrice"
                />
                <label for="unitPrice">単価 (円/日) *</label>
              </FloatLabel>
              <small v-if="errors.unitPrice" class="p-error">{{ errors.unitPrice }}</small>
            </div>

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
import { ref, computed, watch, onMounted } from 'vue';

import { useToast } from 'primevue/usetoast';
import ParkingSpotSelector from '@/pages/MainPage/components/ParkingSpotSelector.vue';
import Dialog from 'primevue/dialog';
import FloatLabel from 'primevue/floatlabel';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Calendar from 'primevue/calendar';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Tag from 'primevue/tag';

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  reservationDetailId: {
    type: [Number, String],
    default: null
  },
  addonData: {
    type: Object,
    default: () => ({
      name: '駐車場',
      comment: '',
      unitPrice: 1000,
      vehicleCategoryId: null,
      spotId: null
    })
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

// Composables
const toast = useToast();

// Reactive state
const localAddonData = ref({
  name: '駐車場',
  comment: '',
  unitPrice: 1000,
  vehicleCategoryId: null,
  spotId: null,
  ...props.addonData
});

const startDate = ref(null);
const endDate = ref(null);
const processing = ref(false);
const errors = ref({});
const spotValidationValid = ref(false);
const selectedVehicleCategory = ref(null);
const selectedSpot = ref(null);

// Computed properties
const dialogTitle = computed(() => {
  return props.isEditMode ? '駐車場アドオン編集' : '駐車場アドオン追加';
});

const minDate = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
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
         localAddonData.value.name &&
         localAddonData.value.unitPrice > 0 &&
         dateRange.value.length > 0 &&
         localAddonData.value.vehicleCategoryId &&
         localAddonData.value.spotId;
});

// Methods
const validateForm = () => {
  const newErrors = {};
  
  if (!localAddonData.value.name?.trim()) {
    newErrors.name = 'アドオン名は必須です';
  }
  
  if (!localAddonData.value.unitPrice || localAddonData.value.unitPrice <= 0) {
    newErrors.unitPrice = '単価は0より大きい値を入力してください';
  }
  
  if (!startDate.value || !endDate.value) {
    newErrors.dates = '開始日と終了日を選択してください';
  } else if (startDate.value > endDate.value) {
    newErrors.dates = '終了日は開始日以降を選択してください';
  }
  
  if (!localAddonData.value.vehicleCategoryId) {
    newErrors.vehicleCategory = '車両カテゴリを選択してください';
  }
  
  if (!localAddonData.value.spotId) {
    newErrors.spot = '駐車スポットを選択してください';
  }
  
  errors.value = newErrors;
  return Object.keys(newErrors).length === 0;
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
    comment: '',
    unitPrice: 1000,
    vehicleCategoryId: null,
    spotId: null,
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
      hotel_id: props.hotelId,
      reservation_id: props.reservationId,
      addon_id: 3, // Global parking addon ID
      name: localAddonData.value.name,
      comment: localAddonData.value.comment,
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
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    resetForm();
    validateForm();
  }
});

watch(() => props.addonData, (newValue) => {
  if (newValue) {
    localAddonData.value = {
      name: '駐車場',
      comment: '',
      unitPrice: 1000,
      vehicleCategoryId: null,
      spotId: null,
      ...newValue
    };
  }
}, { deep: true });

watch(() => props.initialDates, (newDates) => {
  if (newDates.length >= 2) {
    startDate.value = new Date(newDates[0]);
    endDate.value = new Date(newDates[newDates.length - 1]);
  }
}, { deep: true });

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

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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