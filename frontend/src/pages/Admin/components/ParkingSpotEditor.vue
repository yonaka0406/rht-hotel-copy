<template>
  <div class="parking-layout-editor">
    <div class="editor-toolbar">
      <div class="tool-section">
        <div class="flex align-items-center mb-2">
          <h4 class="m-0">スポットタイプ</h4>
          <Button icon="pi pi-plus" label="カスタム追加" class="p-button-text p-button-sm ml-2" @click="customTypeDialogVisible = true" />
        </div>
        <div class="spot-types-container">
          <div v-for="spotType in spotTypes" :key="spotType.id" class="spot-type-item" draggable="true"
            @dragstart="onDragStart($event, spotType)" @dragend="onDragEnd">
            <div class="spot-preview" :style="{ backgroundColor: spotType.color }">
              {{ spotType.name }}
            </div>
            <small>{{ spotType.width }}m × {{ spotType.height }}m</small>
          </div>
        </div>
      </div>

      <div class="tool-section">
        <h4>レイアウト操作</h4>
        <Button label="グリッド表示切替" icon="pi pi-th-large" class="p-button-sm p-button-text"
          @click="showGrid = !showGrid" />
        <Button label="変更を保存" icon="pi pi-save" class="p-button-sm p-button-success" @click="saveLayout"
          :loading="saving" :disabled="!isDirty" />
      </div>
    </div>

    <div class="layout-container" @dragover.prevent @drop="onDrop" @click="deselectSpot">
      <div class="layout-grid" :style="{
        '--grid-size': `${cellSize}px`,
        '--grid-color': 'rgba(0, 0, 0, 0.1)',
        'background-image': showGrid ? 'linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)' : 'none',
        'background-size': 'var(--grid-size) var(--grid-size)'
      }">
        <div v-for="spot in parkingSpots" :key="spot.id || spot.tempId" class="parking-spot"
          :class="{ 'selected': selectedSpotId === (spot.id || spot.tempId) }" :style="{
            left: `${spot.layout_info.x * cellSize}px`,
            top: `${spot.layout_info.y * cellSize}px`,
            width: `${spot.layout_info.width * cellSize}px`,
            height: `${spot.layout_info.height * cellSize}px`,
            backgroundColor: getSpotType(spot.spot_type)?.color || '#ccc',
            zIndex: selectedSpotId === (spot.id || spot.tempId) ? 10 : 1,
            cursor: 'move',
            position: 'absolute',
            transform: `rotate(${spot.layout_info.rotation}deg)`
          }" @click.stop="selectSpot(spot)" draggable="true" @dragstart="onSpotDragStart($event, spot)"
          @drag="onSpotDrag($event, spot)" @dragend="onSpotDragEnd">
          <div class="spot-label">
            <div class="spot-number">{{ spot.spot_number }}</div>
            <div class="spot-dimensions">{{ spot.layout_info.width }}×{{ spot.layout_info.height }}</div>
          </div>
          <div v-if="selectedSpotId === (spot.id || spot.tempId)" class="spot-controls">
            <Button icon="pi pi-pencil" class="p-button-rounded p-button-success p-button-sm" style="margin-right: 0.5rem;" @click.stop="openEditSpotDialog(spot)" />
            <Button icon="pi pi-sync" class="p-button-rounded p-button-info p-button-sm" style="margin-right: 0.5rem;"
              @click.stop="rotateSpot(spot)" />
            <Button icon="pi pi-trash" class="p-button-rounded p-button-danger p-button-sm"
              @click.stop="deleteSpot(spot)" />
          </div>
        </div>
      </div>
    </div>

    <Dialog v-model:visible="spotDialog.visible" :modal="true" :header="spotDialog.isEdit ? 'スポットを編集' : 'スポットを追加'"
      :style="{ width: '50vw', 'max-width': '600px' }">
      <div class="p-fluid">
        <FloatLabel class="mt-6">
          <InputText id="spotNumber" v-model="spotDialog.spot.spot_number" />
          <label for="spotNumber">スポット番号</label>
        </FloatLabel>
        <FloatLabel class="mt-6">
          <Select id="spotType" v-model="spotDialog.spot.spot_type" :options="spotTypes" optionLabel="name"
            optionValue="id" />
          <label for="spotType">タイプ</label>
        </FloatLabel>
        <div class="mt-6">
          <label>サイズ (グリッド単位)</label>
          <div class="formgrid grid">
            <div class="field col">
                <InputNumber id="spotWidth" v-model="spotDialog.spot.width" :min="1" :max="10" placeholder="幅" />
            </div>
            <div class="field col">
                <InputNumber id="spotHeight" v-model="spotDialog.spot.height" :min="1" :max="10" placeholder="高さ" />
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="キャンセル" icon="pi pi-times" class="p-button-text" @click="spotDialog.visible = false" />
        <Button label="保存" icon="pi pi-check" class="p-button-text" @click="saveSpot" />
      </template>
    </Dialog>

    <Dialog v-model:visible="customTypeDialogVisible" :style="{ width: '450px' }" header="カスタムスポットタイプ" :modal="true"
      class="p-fluid">
      <FloatLabel class="mt-6">
        <InputText id="customName" v-model="customType.name" required="true" autofocus />
        <label for="customName">名称</label>
      </FloatLabel>
      <div class="formgrid grid mt-6">
        <div class="field col">
          <FloatLabel>
            <InputNumber id="customWidth" v-model="customType.width" mode="decimal" :min="0" :maxFractionDigits="2" />
            <label for="customWidth">幅 (m)</label>
          </FloatLabel>
        </div>
        <div class="field col">
          <FloatLabel>
            <InputNumber id="customHeight" v-model="customType.height" mode="decimal" :min="0" :maxFractionDigits="2" />
            <label for="customHeight">高さ (m)</label>
          </FloatLabel>
        </div>
      </div>
      <template #footer>
        <Button label="キャンセル" icon="pi pi-times" class="p-button-sm p-button-danger" @click="customTypeDialogVisible = false" />
        <Button label="追加" icon="pi pi-check" class="p-button-sm" @click="addCustomSpotType" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useApi } from '@/composables/useApi';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import FloatLabel from 'primevue/floatlabel';

const customTypeDialogVisible = ref(false);
const customType = ref({
  name: '',
  width: 2.5,
  height: 5.0
});

function addCustomSpotType() {
  if (customType.value.name && customType.value.width > 0 && customType.value.height > 0) {
    const newType = {
      id: `custom-${customType.value.width}-${customType.value.height}`,
      name: customType.value.name,
      width: customType.value.width,
      height: customType.value.height,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    spotTypes.value.push(newType);
    customTypeDialogVisible.value = false;
    customType.value = { name: '', width: 2.5, height: 5.0 };
  }
}

const props = defineProps({
  parkingLotId: {
    type: [Number, String],
    required: true
  },
  initialSpots: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:spots', 'save']);
const toast = useToast();
const { get } = useApi();

// Constants
const cellSize = 20; // Base size in pixels (smaller for more precise placement)

// Reactive state
const showGrid = ref(true);
const saving = ref(false);
const selectedSpotId = ref(null);
const isDirty = ref(false);
let pristineSpotsState = '';
const draggedNewSpotType = ref(null);
const draggedExistingSpot = ref(null);
const dragOffset = ref({ x: 0, y: 0 });

// Spot types with colors and dimensions
const spotTypes = ref([
  { id: 'standard', name: '標準', width: 2.5, height: 5, color: '#90caf9' },
  { id: 'large', name: '大型', width: 3.5, height: 6, color: '#ffcc80' },
  { id: 'motorcycle', name: 'バイク', width: 1.5, height: 2.5, color: '#b39ddb' }
]);

// Spot dialog
const spotDialog = ref({
  visible: false,
  isEdit: false,
  spot: {
    spot_number: '',
    spot_type: 'standard',
    width: 2.5,
    height: 5,
    x: 0,
    y: 0
  }
});

// Parking spots
const parkingSpots = ref([]);

watch(() => props.initialSpots, (newSpots) => {
  parkingSpots.value = newSpots.map(spot => {
    const layout = spot.layout_info || {
      x: spot.x,
      y: spot.y,
      width: spot.width,
      height: spot.height,
      rotation: spot.rotation || 0
    };
    const newSpot = { ...spot, layout_info: layout };
    if (!newSpot.capacity_units && layout.width && layout.height) {
        newSpot.capacity_units = Math.round(layout.width * layout.height * 8);
    }
    delete newSpot.x;
    delete newSpot.y;
    delete newSpot.width;
    delete newSpot.height;
    delete newSpot.rotation;
    return newSpot;
  });
  pristineSpotsState = JSON.stringify(parkingSpots.value);
  isDirty.value = false;
  logParkingSpotsState('Spots Loaded');
}, { deep: true, immediate: true });

watch(parkingSpots, (currentSpots) => {
  if (JSON.stringify(currentSpots) !== pristineSpotsState) {
    isDirty.value = true;
  } else {
    isDirty.value = false;
  }
}, { deep: true });

// Computed
const selectedSpot = computed(() => {
  return parkingSpots.value.find(spot => (spot.id || spot.tempId) === selectedSpotId.value);
});

// Methods
function getSpotType(typeId) {
  return spotTypes.value.find(t => t.id === typeId) || spotTypes.value[0];
}

function selectSpot(spot) {
  selectedSpotId.value = spot.id || spot.tempId;
}

function deselectSpot() {
  selectedSpotId.value = null;
}

function logParkingSpotsState(action) {
  console.log(`[${action}] Current parking spots:`, JSON.parse(JSON.stringify(parkingSpots.value)));
}

async function deleteSpot(spotToDelete) {
  // For existing spots, check if they are used in reservations
  if (spotToDelete.id && !spotToDelete.tempId) {
    try {
      // TODO: This endpoint is an assumption. Verify the correct API endpoint for checking reservations.
      const response = await get(`/api/v1/parking-spots/${spotToDelete.id}/reservations`);
      if (response && response.length > 0) {
        toast.add({ severity: 'error', summary: '削除エラー', detail: '予約のあるスポットは削除できません。', life: 3000 });
        return;
      }
    } catch (error) {
      console.error('Failed to check for reservations:', error);
      toast.add({ severity: 'error', summary: 'エラー', detail: '予約の確認に失敗しました。削除を中止しました。', life: 3000 });
      return;
    }
  }

  parkingSpots.value = parkingSpots.value.filter(
    spot => (spot.id || spot.tempId) !== (spotToDelete.id || spotToDelete.tempId)
  );
  logParkingSpotsState('Spot Deleted');
}

function openEditSpotDialog(spot) {
  spotDialog.value.isEdit = true;
  spotDialog.value.spot = {
    ...spot,
    width: spot.layout_info.width,
    height: spot.layout_info.height,
  };
  spotDialog.value.visible = true;
}

function saveSpot() {
  const { spot } = spotDialog.value;
  const index = parkingSpots.value.findIndex(s => (s.id || s.tempId) === (spot.id || spot.tempId));
  
  if (index !== -1) {
    const existingSpot = parkingSpots.value[index];
    const updatedSpot = {
      ...existingSpot,
      spot_number: spot.spot_number,
      spot_type: spot.spot_type,
      layout_info: {
        ...existingSpot.layout_info,
        width: spot.width,
        height: spot.height,
      }
    };
    parkingSpots.value.splice(index, 1, updatedSpot);
    logParkingSpotsState('Spot Updated');
  }
  
  spotDialog.value.visible = false;
}

function rotateSpot(spotToRotate) {
  const index = parkingSpots.value.findIndex(s => (s.id || s.tempId) === (spotToRotate.id || spotToRotate.tempId));
  if (index !== -1) {
    const newRotation = (parkingSpots.value[index].layout_info.rotation + 45) % 360;
    parkingSpots.value[index].layout_info.rotation = newRotation;
    logParkingSpotsState('Spot Rotated');
  }
}

function onDragStart(event, spotType) {
  draggedNewSpotType.value = spotType;
  event.dataTransfer.setData('text/plain', 'new-spot');
  event.dataTransfer.effectAllowed = 'copy';
}

function onDragEnd() {
  draggedNewSpotType.value = null;
}

function onDrop(event) {
  event.preventDefault();
  
  if (!draggedNewSpotType.value) return;
  
  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.round((event.clientX - rect.left) / cellSize);
  const y = Math.round((event.clientY - rect.top) / cellSize);
  
  const newSpot = {
    ...draggedNewSpotType.value,
    tempId: `temp-${Date.now()}`,
    spot_type: draggedNewSpotType.value.id,
    spot_number: (parkingSpots.value.length + 1).toString(),
    capacity_units: Math.round(draggedNewSpotType.value.width * draggedNewSpotType.value.height * 8),
    layout_info: {
      x: x,
      y: y,
      width: draggedNewSpotType.value.width,
      height: draggedNewSpotType.value.height,
      rotation: 0
    }
  };
  delete newSpot.id;
  
  // Check for collisions
  if (!checkCollision(newSpot)) {
    parkingSpots.value = [...parkingSpots.value, newSpot];
    logParkingSpotsState('Spot Added');
  } else {
    toast.add({
      severity: 'warn',
      summary: '配置エラー',
      detail: 'この場所には配置できません。他のスポットと重なっています。',
      life: 3000
    });
  }
  
  draggedNewSpotType.value = null;
}

function onSpotDrag(event, spot) {
  if (!draggedExistingSpot.value) return;

  const rect = event.currentTarget.parentElement.getBoundingClientRect();
  const x = Math.max(0, Math.round((event.clientX - rect.left - dragOffset.value.x) / cellSize));
  const y = Math.max(0, Math.round((event.clientY - rect.top - dragOffset.value.y) / cellSize));

  // Update the spot's position
  const updatedSpot = {
    ...spot,
    layout_info: {
      ...spot.layout_info,
      x: x,
      y: y
    }
  };

  // Check for collisions with other spots (excluding self)
  if (!checkCollision(updatedSpot, spot.id || spot.tempId)) {
    // Update the spot in the array
    const index = parkingSpots.value.findIndex(s => (s.id || s.tempId) === (spot.id || spot.tempId));
    if (index !== -1) {
      parkingSpots.value[index] = updatedSpot;
    }
  }
}

function onSpotDragStart(event, spot) {
  const rect = event.currentTarget.getBoundingClientRect();
  dragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };

  draggedExistingSpot.value = { ...spot };
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', spot.id || spot.tempId);
}

function onSpotDragEnd() {
  if (draggedExistingSpot.value) {
    logParkingSpotsState('Spot Moved');
  }
  draggedExistingSpot.value = null;
  dragOffset.value = { x: 0, y: 0 };
}

function getRotatedAABB(layout) {
  const w = layout.width;
  const h = layout.height;
  const rad = layout.rotation * Math.PI / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  
  const aabbWidth = w * cos + h * sin;
  const aabbHeight = w * sin + h * cos;
  
  const centerX = layout.x + w / 2;
  const centerY = layout.y + h / 2;
  
  return {
    x1: centerX - aabbWidth / 2,
    y1: centerY - aabbHeight / 2,
    x2: centerX + aabbWidth / 2,
    y2: centerY + aabbHeight / 2
  };
}

function checkCollision(spot, excludeId = null) {
  return parkingSpots.value.some(existingSpot => {
    if (excludeId && (existingSpot.id === excludeId || existingSpot.tempId === excludeId)) {
      return false;
    }
    
    const spotRect = getRotatedAABB(spot.layout_info);
    const existingRect = getRotatedAABB(existingSpot.layout_info);

    // Standard AABB collision check
    return (
      spotRect.x1 < existingRect.x2 &&
      spotRect.x2 > existingRect.x1 &&
      spotRect.y1 < existingRect.y2 &&
      spotRect.y2 > existingRect.y1
    );
  });
}

// Save the current layout
async function saveLayout() {
  const spotNumbers = parkingSpots.value.map(spot => spot.spot_number);
  const uniqueSpotNumbers = new Set(spotNumbers);
  if (spotNumbers.length !== uniqueSpotNumbers.size) {
    toast.add({
      severity: 'error',
      summary: 'バリデーションエラー',
      detail: '各駐車スペースの番号はユニークでなければなりません。',
      life: 5000
    });
    return;
  }

  saving.value = true;
  try {
    // Emit the save event with the current spots
    emit('save', parkingSpots.value);
    
    toast.add({
      severity: 'success',
      summary: '保存しました',
      detail: '駐車スペースのレイアウトを保存しました',
      life: 3000
    });
  } catch (error) {
    console.error('Error saving layout:', error);
    toast.add({
      severity: 'error',
      summary: 'エラー',
      detail: 'レイアウトの保存中にエラーが発生しました',
      life: 5000
    });
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.parking-layout-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 1rem;
}

.editor-toolbar {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.tool-section {
  flex: 1;
}

.tool-section:last-child {
  flex: 0 0 16.666%;
  max-width: 16.666%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tool-section:last-child .p-button {
  width: 100%;
  justify-content: flex-start;
}

.spot-types-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.spot-type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  cursor: grab;
  transition: all 0.2s, transform 0.1s, box-shadow 0.1s;
  min-width: 80px;
}

.spot-type-item:active {
  cursor: grabbing;
}

.spot-type-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tool-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #495057;
}

.spot-preview {
  width: 60px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: white;
  font-weight: 500;
  font-size: 0.8rem;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
}

.layout-container {
  position: relative;
  width: 100%;
  height: 600px;
  border: 1px solid #ddd;
  overflow: auto;
  background-color: white;
}

.layout-grid {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 500px;
  min-height: 500px;
}

.parking-spot {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(0, 0, 0, 0.5);
  box-sizing: border-box;
  transition: all 0.1s ease;
  user-select: none;
  cursor: move;
  
  &:hover {
    z-index: 5;
    box-shadow: 0 0 0 1px #2196F3;
  }
  
  &.selected {
    z-index: 10;
    box-shadow: 0 0 0 2px #2196F3;
  }
}

.spot-label {
  color: white;
  text-align: center;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  width: 100%;
  padding: 4px;
  box-sizing: border-box;
}

.spot-number {
  font-weight: bold;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.spot-dimensions {
  font-size: 0.7rem;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.spot-controls {
  position: absolute;
  top: 4px;
  right: 4px;
  display: none;
  z-index: 15;
}

.parking-spot.selected .spot-controls {
  display: block;
}
</style>
