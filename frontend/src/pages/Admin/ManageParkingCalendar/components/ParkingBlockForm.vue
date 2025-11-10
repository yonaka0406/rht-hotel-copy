<template>
    <Card class="mb-4">
        <template #header><span class="text-lg font-bold">駐車場利用不可日付登録</span></template>
        <template #content>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <div>
                    <label for="hotel" class="block text-sm font-medium text-gray-700">ホテル選択</label>
                    <Select name="hotel" v-model="selectedHotelId" :options="hotels" optionLabel="name"
                        optionValue="id" :virtualScrollerOptions="{ itemSize: 38 }" fluid
                        placeholder="ホテル選択" filter />
                </div>
                <div>
                    <label for="parkingLot" class="block text-sm font-medium text-gray-700">駐車場選択</label>
                    <Select name="parkingLot" v-model="selectedParkingLot" :options="filteredParkingLots"
                        optionLabel="name" optionValue="id"
                        :virtualScrollerOptions="{ itemSize: 38 }" fluid placeholder="駐車場選択" filter />
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
                <div>
                    <label for="spotSize" class="block text-sm font-medium text-gray-700">スポットサイズ (任意)</label>
                    <Select id="spotSize" v-model="formData.spotSize" :options="availableSizes" 
                        optionLabel="label" optionValue="value" fluid placeholder="全サイズ" showClear />
                    <small class="text-gray-500">未選択の場合、全サイズに適用されます</small>
                </div>
                <div>
                    <label for="blockedCapacity" class="block text-sm font-medium text-gray-700">ブロック台数</label>
                    <InputNumber id="blockedCapacity" v-model="formData.blockedCapacity" :min="1" fluid
                        placeholder="ブロックする台数を入力" />
                </div>
                <div>
                    <label for="startDate" class="block text-sm font-medium text-gray-700">開始日</label>
                    <DatePicker id="startDate" v-model="formData.startDate" dateFormat="yy-mm-dd" fluid />
                </div>
                <div>
                    <label for="endDate" class="block text-sm font-medium text-gray-700">終了日</label>
                    <DatePicker id="endDate" v-model="formData.endDate" dateFormat="yy-mm-dd" fluid />
                </div>
                <div class="col-span-1 md:col-span-3">
                    <label for="comment" class="block text-sm font-medium text-gray-700">備考</label>
                    <InputText id="comment" v-model="formData.comment" type="text" fluid />
                </div>
            </div>
            
            <div class="mt-4 flex justify-center gap-2">
                <Button label="ブロック設定を適用" @click="$emit('apply-block')" class="p-button-primary" 
                    :disabled="!selectedHotelId" />
            </div>
        </template>
    </Card>
</template>

<script setup>
import { defineProps, defineEmits, computed, watch } from 'vue';
import Card from 'primevue/card';
import Select from 'primevue/select';
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

const emit = defineEmits(['apply-block', 'update:selectedHotelId', 'parking-lot-changed', 'dates-changed']);

// Computed property for two-way binding with parent
const selectedHotelId = computed({
    get: () => props.selectedHotelId,
    set: (value) => emit('update:selectedHotelId', value)
});

// Computed property for parking lot selection with change event
const selectedParkingLot = computed({
    get: () => props.formData.selectedParkingLot,
    set: (value) => {
        props.formData.selectedParkingLot = value;
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

// Watch for date changes to recalculate max blockable spots
watch([() => props.formData.startDate, () => props.formData.endDate], ([newStartDate, newEndDate]) => {
    if (newStartDate && newEndDate && props.formData.selectedParkingLot) {
        emit('dates-changed', { startDate: newStartDate, endDate: newEndDate });
    }
});
</script>
