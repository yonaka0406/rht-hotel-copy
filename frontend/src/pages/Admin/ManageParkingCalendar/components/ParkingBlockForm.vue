<template>
    <Card class="mb-4">
        <template #header>
            <div>
                <div class="text-lg font-bold">駐車場スポットブロック設定</div>
                <div class="text-sm text-gray-600 mt-1">施設利用者以外の使用や季節的な理由により利用不可となるスポットを設定します</div>
            </div>
        </template>
        <template #content>
            <div class="grid grid-cols-12 gap-4 mb-2">
                <div class="col-span-12 md:col-span-6 mt-6">
                    <FloatLabel>
                        <Select id="hotel" name="hotel" v-model="selectedHotelId" :options="hotels" optionLabel="name"
                            optionValue="id" :virtualScrollerOptions="{ itemSize: 38 }" fluid filter />
                        <label for="hotel">ホテル選択</label>
                    </FloatLabel>
                </div>
                <div class="col-span-12 md:col-span-6 mt-6">
                    <FloatLabel>
                        <Select id="parkingLot" name="parkingLot" v-model="selectedParkingLot" :options="filteredParkingLots"
                            optionLabel="name" optionValue="id"
                            :virtualScrollerOptions="{ itemSize: 38 }" fluid filter />
                        <label for="parkingLot">駐車場選択</label>
                    </FloatLabel>
                </div>
            </div>

            <!-- Capacity Information and Max Blockable Spots Display -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <!-- Capacity Information Display -->
                <div v-if="parkingLotCapacity" class="p-4 bg-blue-50 border border-blue-200 rounded">
                    <h3 class="text-sm font-semibold text-gray-700 mb-2">駐車場容量情報</h3>
                    <div class="grid grid-cols-2 gap-2">
                        <div v-for="capacity in parkingLotCapacity" :key="capacity.size" class="text-sm">
                            <span class="font-medium">サイズ {{ capacity.size }}:</span>
                            <span class="ml-1">{{ capacity.count }}台</span>
                        </div>
                    </div>
                </div>

                <!-- Max Blockable Spots Display -->
                <div v-if="maxBlockableSpots !== null" class="p-4 bg-green-50 border border-green-200 rounded">
                    <div class="flex flex-col h-full justify-between">
                        <div>
                            <h3 class="text-sm font-semibold text-gray-700">選択期間でブロック可能な最大台数</h3>
                            <p class="text-xs text-gray-600 mt-1">既存の予約とブロックを考慮した利用可能台数</p>
                        </div>
                        <div class="text-2xl font-bold text-green-700 text-center mt-2">
                            {{ maxBlockableSpots }}台
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div class="mt-6">
                    <FloatLabel>
                        <InputNumber id="blockedCapacity" v-model="formData.blockedCapacity" :min="1" fluid />
                        <label for="blockedCapacity">ブロック台数</label>
                    </FloatLabel>
                </div>
                <div class="mt-6">
                    <FloatLabel>
                        <DatePicker id="startDate" v-model="formData.startDate" dateFormat="yy-mm-dd" fluid />
                        <label for="startDate">開始日</label>
                    </FloatLabel>
                </div>
                <div class="mt-6">
                    <FloatLabel>
                        <DatePicker id="endDate" v-model="formData.endDate" dateFormat="yy-mm-dd" fluid />
                        <label for="endDate">終了日</label>
                    </FloatLabel>
                </div>
                <div class="mt-6">
                    <FloatLabel>
                        <Select id="spotSize" v-model="formData.spotSize" :options="availableSizes" 
                            optionLabel="label" optionValue="value" fluid showClear />
                        <label for="spotSize">スポットサイズ (任意)</label>
                    </FloatLabel>
                    <small class="text-gray-500">未選択の場合、全サイズに適用されます</small>
                </div>
                <div class="col-span-1 md:col-span-3 mt-6">
                    <FloatLabel>
                        <InputText id="comment" v-model="formData.comment" type="text" fluid />
                        <label for="comment">備考</label>
                    </FloatLabel>
                </div>
            </div>
            
            <div class="mt-4 flex justify-center gap-2">
                <Button label="ブロック設定を適用" @click="$emit('apply-block')" class="p-button-primary" 
                    :disabled="!selectedHotelId || !selectedParkingLot" />
            </div>
        </template>
    </Card>
</template>

<script setup>
import { defineProps, defineEmits, computed, watch, ref } from 'vue';
import Card from 'primevue/card';
import Select from 'primevue/select';
import FloatLabel from 'primevue/floatlabel';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';

const props = defineProps({
    hotels: {
        type: Array,
        required: true
    },
    parkingLots: {
        type: Array,
        required: true
    },
    selectedHotelId: {
        type: [Number, String],
        default: null
    },
    formData: {
        type: Object,
        required: true
    },
    parkingLotCapacity: {
        type: Array,
        default: null
    },
    maxBlockableSpots: {
        type: Number,
        default: null
    }
});

const emit = defineEmits(['apply-block', 'update:selectedHotelId', 'parking-lot-changed', 'dates-changed', 'update:startDate', 'update:endDate']);

// Computed property for two-way binding with parent
const selectedHotelId = computed({
    get: () => props.selectedHotelId,
    set: (value) => emit('update:selectedHotelId', value)
});

// Computed property for parking lot selection with change event
const selectedParkingLot = computed({
    get: () => props.formData.selectedParkingLot,
    set: (value) => {
        emit('parking-lot-changed', value);
    }
});

// Filter out virtual capacity pool from parking lots
const filteredParkingLots = computed(() => {
    return props.parkingLots.filter(lot => lot.name !== 'Virtual Capacity Pool');
});

// Generate available sizes from parking lot capacity
const availableSizes = computed(() => {
    if (!props.parkingLotCapacity || props.parkingLotCapacity.length === 0) {
        return [];
    }
    return props.parkingLotCapacity.map(capacity => ({
        label: `サイズ ${capacity.size} (${capacity.count}台)`,
        value: capacity.size
    }));
});

// Flag to prevent duplicate emissions during auto-adjustments
const isAdjusting = ref(false);

// Watch for start date changes to validate against end date
watch(() => props.formData.startDate, (newStartDate) => {
    if (isAdjusting.value) return;
    
    if (newStartDate && props.formData.endDate) {
        // If start date is after end date, update end date to match start date
        if (newStartDate > props.formData.endDate) {
            isAdjusting.value = true;
            const newEndDate = new Date(newStartDate);
            emit('update:endDate', newEndDate);
            emit('dates-changed', { startDate: newStartDate, endDate: newEndDate });
            isAdjusting.value = false;
            return;
        }
    }
    
    // Trigger recalculation if both dates are set
    if (newStartDate && props.formData.endDate && props.formData.selectedParkingLot) {
        emit('dates-changed', { startDate: newStartDate, endDate: props.formData.endDate });
    }
});

// Watch for end date changes to validate against start date
watch(() => props.formData.endDate, (newEndDate) => {
    if (isAdjusting.value) return;
    
    if (newEndDate < props.formData.startDate) {
        // If end date is before start date, update start date to match end date
        if (newEndDate && props.formData.startDate) {
            isAdjusting.value = true;
            const newStartDate = new Date(newEndDate);
            emit('update:startDate', newStartDate);
            emit('dates-changed', { startDate: newStartDate, endDate: newEndDate });
            isAdjusting.value = false;
            return;
        }
    }
    
    // Trigger recalculation if both dates are set
    if (props.formData.startDate && newEndDate && props.formData.selectedParkingLot) {
        emit('dates-changed', { startDate: props.formData.startDate, endDate: newEndDate });
    }
});
</script>
