<template>
  <div class="parking-spot-selector">
    <!-- Vehicle Category Selection -->
    <div class="field mt-2">
      <FloatLabel>
        <Select
          id="vehicleCategory"
          v-model="selectedVehicleCategoryId"
          :options="vehicleCategories"
          option-label="name"
          option-value="id"          
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
    <div class="field mt-4" v-if="selectedVehicleCategoryId">
      <FloatLabel>
        <Select
          id="parkingSpot"
          v-model="selectedSpotId"
          :options="availableSpots"
          option-label="displayName"
          option-value="id"          
          :loading="loadingSpots"
          :disabled="disabled || !selectedVehicleCategoryId"
          class="w-full"
          @change="onSpotChange"
        >
          <template #option="slotProps">
            <div class="parking-spot-option">
              <div class="spot-color-indicator" :style="{ backgroundColor: getSpotColor(slotProps.option.spot_type) }"></div>
              <div class="spot-info-container">
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


    <div v-if="filteredParkingSpotAvailability.length > 0" class="availability-details">
      <div class="proportional-stats-grid">
        <div v-for="spot in filteredParkingSpotAvailability" :key="`${spot.width}-${spot.height}`" class="stat-container">
          <div class="stat-item" :style="{ width: `${spot.width * 20}px`, height: `${spot.height * 20}px`, backgroundColor: getSpotColor(spot.spot_type) }">
            <div class="stat-value">{{ spot.available_spots }}</div>
          </div>
          <div class="stat-label">
            幅 {{ spot.width }} x 長さ {{ spot.height }}
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
import { useReservationStore } from '@/composables/useReservationStore';
import Select from 'primevue/select';
import FloatLabel from 'primevue/floatlabel';
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
const reservationStore = useReservationStore();
const { parkingSpotAvailability, fetchParkingSpotAvailability } = reservationStore;

// Reactive state
const selectedVehicleCategoryId = ref(props.preselectedVehicleCategoryId);
const selectedSpotId = ref(props.preselectedSpotId);
const vehicleCategories = computed(() => parkingStore.vehicleCategories.value || []);
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
  if (!availabilityData.value) return compatibleSpots.value || [];
  
  // Ensure fullyAvailableSpots exists and is an array
  const fullyAvailableSpots = availabilityData.value?.fullyAvailableSpots || [];
  const fullyAvailableSpotIds = new Set(
    fullyAvailableSpots.map(spot => spot.spotId)
  );
  
  // Ensure compatibleSpots is an array
  const spots = Array.isArray(compatibleSpots.value) ? compatibleSpots.value : [];
  
  return spots
    .filter(spot => fullyAvailableSpotIds.has(spot.id))
    .map(spot => ({
      ...spot,
      displayName: `${spot.spotNumber || ''} - ${spot.parkingLotName || ''}`.trim(),
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

const filteredParkingSpotAvailability = computed(() => {
  if (!selectedVehicleCategoryId.value) {
    return parkingSpotAvailability.value;
  }

  const selectedCategory = vehicleCategories.value.find(cat => cat.id === selectedVehicleCategoryId.value);
  if (!selectedCategory) {
    return parkingSpotAvailability.value;
  }

  const requiredCapacity = selectedCategory.capacity_units_required;
  return parkingSpotAvailability.value.filter(spot => spot.capacity_units >= requiredCapacity);
});

// Base spot types
const baseSpotTypes = [
  { id: 'standard', name: '標準', width: 2.5, height: 5, color: '#90caf9' },
  { id: 'large', name: '大型', width: 3.5, height: 6, color: '#ffcc80' },
  { id: 'motorcycle', name: 'バイク', width: 1.5, height: 2.5, color: '#b39ddb' }
];

// Combined spot types (base + custom)
const spotTypes = ref([...baseSpotTypes]);

function getSpotColor(spotType) {
  if (!spotType) return '#cccccc';
  
  // Check if we already have this type in our spot types
  const type = spotTypes.value.find(t => t.id === spotType);
  if (type) return type.color;
  
  // Generate consistent color for custom spot types
  if (spotType.startsWith('custom-')) {
    // Extract dimensions from spot type (e.g., "custom-3-5" -> ["3", "5"])
    const dimensions = spotType.match(/\d+/g) || [];
    
    // Create a more unique hash using dimensions and spot type
    let hash = 0;
    const str = spotType + (dimensions ? dimensions.join('') : '');
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Use golden angle for better color distribution
    const goldenRatio = 0.618033988749895;
    let hue = (hash * goldenRatio) % 1;
    
    // Convert to degrees (0-360)
    hue = Math.floor(hue * 360);
    
    // Use higher saturation and vary lightness for better distinction
    const saturation = 70 + (hash % 15); // 70-85%
    const lightness = 60 + (hash % 21);  // 60-80%
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
  
  return '#cccccc';
}

// Methods
function extractCustomSpotTypes(spots) {
  const customTypes = [];
  const seenTypes = new Set();
  
  spots.forEach(spot => {
    if (spot.spot_type && spot.spot_type.startsWith('custom-') && !seenTypes.has(spot.spot_type)) {
      seenTypes.add(spot.spot_type);
      const [_, width, height] = spot.spot_type.match(/custom-([\d.]+)-([\d.]+)/) || [];
      if (width && height) {
        customTypes.push({
          id: spot.spot_type,
          name: `${width}m × ${height}m`,
          width: parseFloat(width),
          height: parseFloat(height),
          color: getSpotColor(spot.spot_type)
        });
      }
    }
  });
  
  return customTypes;
}

const loadVehicleCategories = async () => {
  loadingCategories.value = true;
  try {
    await parkingStore.fetchVehicleCategories();
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
      spot_type: spot.spot_type,
      spotNumber: spot.spotNumber,
      parkingLotName: spot.parkingLotName,
      capacityUnits: spot.capacityUnits,
      capacityMatch: spot.capacityMatch,
      displayName: `${spot.spotNumber} - ${spot.parkingLotName}`
    }));
    
    if (compatibleSpots.value.length === 0) {
      spotError.value = '選択した車両カテゴリに対応する駐車スポットがありません';
    }

    // Extract and add custom spot types
    const customTypes = extractCustomSpotTypes(response.compatibleSpots);
    const existingTypeIds = new Set(spotTypes.value.map(t => t.id));
    
    customTypes.forEach(type => {
      if (!existingTypeIds.has(type.id)) {
        spotTypes.value.push(type);
        existingTypeIds.add(type.id);
      }
    });
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

const _refreshAvailability = async () => {
  if (selectedVehicleCategoryId.value) {
    loadCompatibleSpots();
  }
};

const _selectRecommendedSpot = (recommendedSpot) => {
  if (recommendedSpot) {
    selectedSpotId.value = recommendedSpot.id;
    emitSelectionChange();
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
  return (vehicleCategories.value || []).find(cat => cat && cat.id === selectedVehicleCategoryId.value);
};

const getSelectedSpot = () => {
  return (compatibleSpots.value || []).find(spot => spot && spot.id === selectedSpotId.value);
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

const _formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Watchers
watch(() => props.dates, async (newDates) => {
  if (newDates.length > 0 && selectedVehicleCategoryId.value) {
    await checkRealTimeAvailability();
    validateSelection();
  }
  if (newDates.length > 0 && props.hotelId) {
    await fetchParkingSpotAvailability(props.hotelId, newDates[0], newDates[newDates.length - 1]);
  }
}, { deep: true, immediate: true });

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
  window.addEventListener('parkingUpdate', handleParkingUpdate);
  
  // Only load categories if they're not already loaded
  if (parkingStore.vehicleCategories.value.length === 0) {
    await loadVehicleCategories();
  }
  
  // If there's a preselected vehicle category, load its spots
  if (selectedVehicleCategoryId.value) {
    await loadCompatibleSpots();
    if (props.dates.length > 0) {
      await checkRealTimeAvailability();
    }
  }
  
  validateSelection();
  emitSelectionChange();
});

// Listen for real-time parking updates
const handleParkingUpdate = () => {
  if (selectedVehicleCategoryId.value && props.dates.length > 0) {
    checkRealTimeAvailability();
  }
};

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
  align-items: center;
  gap: 0.75rem;
}

.spot-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.spot-info-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex-grow: 1;
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

.proportional-stats-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-end;
  justify-content: center;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.stat-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.75rem;
  border-radius: var(--border-radius);
  color: white;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  text-align: center;
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