<template>
  <div class="parking-spot-selector">
    <!-- Vehicle Category Selection -->
    <div class="field">
      <FloatLabel>
        <Select
          id="vehicleCategory"
          v-model="selectedVehicleCategoryId"
          :options="vehicleCategories"
          option-label="name"
          option-value="id"
          placeholder="車両カテゴリを選択"
          :loading="loadingCategories"
          :disabled="disabled"
          class="w-full"
          @change="onVehicleCategoryChange"
        >
          <template #option="slotProps">
            <div class="vehicle-category-option">
              <div class="category-name">{{ slotProps.option.name }}</div>
              <div class="capacity-info">
                <small class="text-500">
                  容量: {{ slotProps.option.capacity_units_required }} 単位
                </small>
              </div>
            </div>
          </template>
          <template #value="slotProps">
            <div v-if="slotProps.value" class="selected-category">
              <span>{{ getSelectedCategoryName() }}</span>
              <small class="ml-2 text-500">
                ({{ getSelectedCategoryCapacity() }} 単位)
              </small>
            </div>
          </template>
        </Select>
        <label for="vehicleCategory">車両カテゴリ *</label>
      </FloatLabel>
      <small v-if="vehicleCategoryError" class="p-error">{{ vehicleCategoryError }}</small>
    </div>

    <!-- Parking Spot Selection -->
    <div class="field" v-if="selectedVehicleCategoryId">
      <FloatLabel>
        <Select
          id="parkingSpot"
          v-model="selectedSpotId"
          :options="availableSpots"
          option-label="displayName"
          option-value="id"
          placeholder="駐車スポットを選択"
          :loading="loadingSpots"
          :disabled="disabled || !selectedVehicleCategoryId"
          class="w-full"
          @change="onSpotChange"
        >
          <template #option="slotProps">
            <div class="parking-spot-option">
              <div class="spot-header">
                <span class="spot-number">{{ slotProps.option.spotNumber }}</span>
                <span class="parking-lot-name">{{ slotProps.option.parkingLotName }}</span>
              </div>
              <div class="spot-details">
                <div class="capacity-match">
                  <small :class="getCapacityMatchClass(slotProps.option)">
                    容量: {{ slotProps.option.capacityUnits }} 単位
                    <span v-if="slotProps.option.capacityMatch">
                      ({{ slotProps.option.capacityMatch.isExactMatch ? '完全一致' : `+${slotProps.option.capacityMatch.excess}` }})
                    </span>
                  </small>
                </div>
                <div class="availability-info" v-if="slotProps.option.availabilityInfo">
                  <small class="text-success">
                    <i class="pi pi-check-circle"></i>
                    利用可能
                  </small>
                </div>
              </div>
            </div>
          </template>
          <template #value="slotProps">
            <div v-if="slotProps.value" class="selected-spot">
              <span>{{ getSelectedSpotDisplay() }}</span>
            </div>
          </template>
        </Select>
        <label for="parkingSpot">駐車スポット *</label>
      </FloatLabel>
      <small v-if="spotError" class="p-error">{{ spotError }}</small>
    </div>

    <!-- Real-time Availability Status -->
    <div class="availability-status" v-if="selectedVehicleCategoryId && dates.length > 0">
      <div class="status-header">
        <h5 class="m-0">リアルタイム空き状況</h5>
        <Button
          icon="pi pi-refresh"
          class="p-button-text p-button-sm"
          @click="refreshAvailability"
          :loading="checkingAvailability"
          :disabled="disabled"
        />
      </div>
      
      <div v-if="availabilityData" class="availability-details">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ availabilityData.overallStats.fullyAvailableSpots }}</div>
            <div class="stat-label">完全利用可能</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ availabilityData.overallStats.totalCompatibleSpots }}</div>
            <div class="stat-label">対応スポット総数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ availabilityData.overallStats.averageAvailabilityRate }}%</div>
            <div class="stat-label">平均利用可能率</div>
          </div>
        </div>

        <!-- Date-specific availability -->
        <div class="date-availability" v-if="availabilityData.dateAvailability">
          <h6>日別空き状況</h6>
          <div class="date-list">
            <div
              v-for="(dayData, date) in availabilityData.dateAvailability"
              :key="date"
              class="date-item"
              :class="{ 'low-availability': dayData.availabilityRate < 50 }"
            >
              <span class="date">{{ formatDate(date) }}</span>
              <span class="availability-rate">{{ dayData.availabilityRate }}%</span>
              <span class="available-count">({{ dayData.availableSpots }}/{{ dayData.totalCompatibleSpots }})</span>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        <div class="recommendations" v-if="availabilityData.recommendations">
          <h6>おすすめ</h6>
          <div class="recommendation-list">
            <div
              v-for="spot in availabilityData.recommendations.alternativeSpots.slice(0, 3)"
              :key="spot.spotId"
              class="recommendation-item"
              @click="selectRecommendedSpot(spot)"
            >
              <span class="spot-info">{{ spot.spotNumber }} ({{ spot.parkingLotName }})</span>
              <span class="availability-rate">{{ spot.availabilityRate }}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Validation Messages -->
    <div class="validation-messages" v-if="validationErrors.length > 0">
      <Message
        v-for="(error, index) in validationErrors"
        :key="index"
        severity="error"
        :closable="false"
      >
        {{ error }}
      </Message>
    </div>

    <!-- Success Message -->
    <div class="success-message" v-if="isValid && selectedSpotId">
      <Message severity="success" :closable="false">
        <div class="success-content">
          <i class="pi pi-check-circle"></i>
          <span>選択完了: {{ getSelectedSpotDisplay() }}</span>
        </div>
      </Message>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useParkingStore } from '@/composables/useParkingStore';
import { useParkingAddonManager } from '@/composables/useParkingAddonManager';
import Select from 'primevue/select';
import FloatLabel from 'primevue/floatlabel';
import Button from 'primevue/button';
import Message from 'primevue/message';

// Props
const props = defineProps({
  hotelId: {
    type: [Number, String],
    required: true
  },
  dates: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  },
  excludeReservationId: {
    type: [Number, String],
    default: null
  },
  preselectedVehicleCategoryId: {
    type: [Number, String],
    default: null
  },
  preselectedSpotId: {
    type: [Number, String],
    default: null
  }
});

// Emits
const emit = defineEmits([
  'update:vehicleCategoryId',
  'update:spotId',
  'selection-change',
  'validation-change'
]);

// Composables
const parkingStore = useParkingStore();
const parkingAddonManager = useParkingAddonManager();

// Reactive state
const selectedVehicleCategoryId = ref(props.preselectedVehicleCategoryId);
const selectedSpotId = ref(props.preselectedSpotId);
const vehicleCategories = ref([]);
const compatibleSpots = ref([]);
const availabilityData = ref(null);

// Loading states
const loadingCategories = ref(false);
const loadingSpots = ref(false);
const checkingAvailability = ref(false);

// Error states
const vehicleCategoryError = ref('');
const spotError = ref('');
const validationErrors = ref([]);

// Computed properties
const availableSpots = computed(() => {
  if (!availabilityData.value) return compatibleSpots.value;
  
  // Filter spots based on availability data
  const fullyAvailableSpotIds = new Set(
    availabilityData.value.fullyAvailableSpots.map(spot => spot.spotId)
  );
  
  return compatibleSpots.value
    .filter(spot => fullyAvailableSpotIds.has(spot.id))
    .map(spot => ({
      ...spot,
      displayName: `${spot.spotNumber} - ${spot.parkingLotName}`,
      availabilityInfo: {
        isAvailable: true,
        fullyAvailable: true
      }
    }));
});

const isValid = computed(() => {
  return selectedVehicleCategoryId.value && 
         selectedSpotId.value && 
         validationErrors.value.length === 0;
});

// Methods
const loadVehicleCategories = async () => {
  loadingCategories.value = true;
  try {
    await parkingStore.fetchVehicleCategories();
    vehicleCategories.value = parkingStore.vehicleCategories;
  } catch (error) {
    console.error('Failed to load vehicle categories:', error);
    vehicleCategoryError.value = '車両カテゴリの読み込みに失敗しました';
  } finally {
    loadingCategories.value = false;
  }
};

const loadCompatibleSpots = async () => {
  if (!selectedVehicleCategoryId.value) return;
  
  loadingSpots.value = true;
  spotError.value = '';
  
  try {
    const response = await parkingStore.getCompatibleSpots(
      props.hotelId,
      selectedVehicleCategoryId.value
    );
    
    compatibleSpots.value = response.compatibleSpots.map(spot => ({
      id: spot.id,
      spotNumber: spot.spotNumber,
      parkingLotName: spot.parkingLotName,
      capacityUnits: spot.capacityUnits,
      capacityMatch: spot.capacityMatch,
      displayName: `${spot.spotNumber} - ${spot.parkingLotName}`
    }));
    
    if (compatibleSpots.value.length === 0) {
      spotError.value = '選択した車両カテゴリに対応する駐車スポットがありません';
    }
  } catch (error) {
    console.error('Failed to load compatible spots:', error);
    spotError.value = '対応駐車スポットの読み込みに失敗しました';
  } finally {
    loadingSpots.value = false;
  }
};

const checkRealTimeAvailability = async () => {
  if (!selectedVehicleCategoryId.value || props.dates.length === 0) return;
  
  checkingAvailability.value = true;
  
  try {
    const response = await parkingStore.checkRealTimeAvailability(
      props.hotelId,
      selectedVehicleCategoryId.value,
      props.dates,
      props.excludeReservationId
    );
    
    availabilityData.value = response;
  } catch (error) {
    console.error('Failed to check real-time availability:', error);
  } finally {
    checkingAvailability.value = false;
  }
};

const validateSelection = () => {
  const errors = [];
  
  if (!selectedVehicleCategoryId.value) {
    errors.push('車両カテゴリを選択してください');
  }
  
  if (!selectedSpotId.value) {
    errors.push('駐車スポットを選択してください');
  }
  
  if (selectedSpotId.value && availabilityData.value) {
    const selectedSpotAvailable = availabilityData.value.fullyAvailableSpots.some(
      spot => spot.spotId === parseInt(selectedSpotId.value)
    );
    
    if (!selectedSpotAvailable) {
      errors.push('選択した駐車スポットは指定された日程で利用できません');
    }
  }
  
  validationErrors.value = errors;
  return errors.length === 0;
};

// Event handlers
const onVehicleCategoryChange = async () => {
  vehicleCategoryError.value = '';
  selectedSpotId.value = null;
  compatibleSpots.value = [];
  availabilityData.value = null;
  
  emit('update:vehicleCategoryId', selectedVehicleCategoryId.value);
  
  if (selectedVehicleCategoryId.value) {
    await loadCompatibleSpots();
    if (props.dates.length > 0) {
      await checkRealTimeAvailability();
    }
  }
  
  validateSelection();
  emitSelectionChange();
};

const onSpotChange = () => {
  spotError.value = '';
  emit('update:spotId', selectedSpotId.value);
  validateSelection();
  emitSelectionChange();
};

const refreshAvailability = async () => {
  await checkRealTimeAvailability();
  validateSelection();
};

const selectRecommendedSpot = (recommendedSpot) => {
  const spot = compatibleSpots.value.find(s => s.id === recommendedSpot.spotId);
  if (spot) {
    selectedSpotId.value = spot.id;
    onSpotChange();
  }
};

const emitSelectionChange = () => {
  emit('selection-change', {
    vehicleCategoryId: selectedVehicleCategoryId.value,
    spotId: selectedSpotId.value,
    isValid: isValid.value,
    selectedCategory: getSelectedCategory(),
    selectedSpot: getSelectedSpot()
  });
};

// Utility methods
const getSelectedCategory = () => {
  return vehicleCategories.value.find(cat => cat.id === selectedVehicleCategoryId.value);
};

const getSelectedSpot = () => {
  return compatibleSpots.value.find(spot => spot.id === selectedSpotId.value);
};

const getSelectedCategoryName = () => {
  const category = getSelectedCategory();
  return category ? category.name : '';
};

const getSelectedCategoryCapacity = () => {
  const category = getSelectedCategory();
  return category ? category.capacity_units_required : '';
};

const getSelectedSpotDisplay = () => {
  const spot = getSelectedSpot();
  return spot ? `${spot.spotNumber} - ${spot.parkingLotName}` : '';
};

const getCapacityMatchClass = (spot) => {
  if (!spot.capacityMatch) return 'text-500';
  
  if (spot.capacityMatch.isExactMatch) {
    return 'text-success';
  } else if (spot.capacityMatch.excess <= 20) {
    return 'text-warning';
  } else {
    return 'text-info';
  }
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  });
};

// Watchers
watch(() => props.dates, async (newDates) => {
  if (newDates.length > 0 && selectedVehicleCategoryId.value) {
    await checkRealTimeAvailability();
    validateSelection();
  }
}, { deep: true });

watch(() => props.preselectedVehicleCategoryId, (newValue) => {
  if (newValue !== selectedVehicleCategoryId.value) {
    selectedVehicleCategoryId.value = newValue;
    onVehicleCategoryChange();
  }
});

watch(() => props.preselectedSpotId, (newValue) => {
  if (newValue !== selectedSpotId.value) {
    selectedSpotId.value = newValue;
    onSpotChange();
  }
});

watch(isValid, (newValue) => {
  emit('validation-change', newValue);
});

// Lifecycle
onMounted(async () => {
  await loadVehicleCategories();
  
  if (selectedVehicleCategoryId.value) {
    await loadCompatibleSpots();
    if (props.dates.length > 0) {
      await checkRealTimeAvailability();
    }
  }
  
  validateSelection();
  emitSelectionChange();
});

// Initialize parking addon manager WebSocket connection
onMounted(() => {
  parkingAddonManager.initializeWebSocket();
});

onUnmounted(() => {
  parkingAddonManager.disconnectWebSocket();
});

// Listen for real-time parking updates
const handleParkingUpdate = () => {
  if (selectedVehicleCategoryId.value && props.dates.length > 0) {
    checkRealTimeAvailability();
  }
};

onMounted(() => {
  window.addEventListener('parkingUpdate', handleParkingUpdate);
});

onUnmounted(() => {
  window.removeEventListener('parkingUpdate', handleParkingUpdate);
});
</script>

<style scoped>
.parking-spot-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.vehicle-category-option {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.category-name {
  font-weight: 500;
}

.capacity-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.selected-category {
  display: flex;
  align-items: center;
}

.parking-spot-option {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.spot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.spot-number {
  font-weight: 600;
  color: var(--primary-color);
}

.parking-lot-name {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.spot-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.availability-info {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.selected-spot {
  font-weight: 500;
}

.availability-status {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.availability-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-top: 0.25rem;
}

.date-availability h6,
.recommendations h6 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-color);
}

.date-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
}

.date-item.low-availability {
  background: var(--red-50);
  border-left: 3px solid var(--red-500);
}

.date {
  font-weight: 500;
}

.availability-rate {
  font-weight: 600;
  color: var(--primary-color);
}

.available-count {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.recommendation-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recommendation-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: background-color 0.2s;
}

.recommendation-item:hover {
  background: var(--surface-hover);
}

.spot-info {
  font-weight: 500;
}

.validation-messages {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.success-message {
  margin-top: 0.5rem;
}

.success-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .spot-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .spot-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}
</style>