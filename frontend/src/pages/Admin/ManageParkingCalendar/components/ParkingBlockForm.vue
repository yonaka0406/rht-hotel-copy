<template>
    <Card class="mb-4">
        <template #header><span class="text-lg font-bold">駐車場利用不可日付登録</span></template>
        <template #content>
            <div class="grid grid-cols-2 gap-4 mb-2">
                <div>
                    <label for="hotel" class="block text-sm font-medium text-gray-700">ホテル選択</label>
                    <Select name="hotel" v-model="selectedHotelId" :options="hotels" optionLabel="name"
                        optionValue="id" :virtualScrollerOptions="{ itemSize: 38 }" class="w-48"
                        placeholder="ホテル選択" filter />
                </div>
                <div>
                    <label for="parkingLots" class="block text-sm font-medium text-gray-700">駐車場選択</label>
                    <MultiSelect name="parkingLots" v-model="formData.selectedParkingLots" :options="parkingLots"
                        optionLabel="name" optionValue="id"
                        :virtualScrollerOptions="{ itemSize: 38 }" class="w-48" placeholder="駐車場選択" filter />
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="vehicleCategories" class="block text-sm font-medium text-gray-700">車両タイプ選択</label>
                    <MultiSelect name="vehicleCategories" v-model="formData.selectedVehicleCategories" :options="vehicleCategories"
                        optionLabel="name" optionValue="id"
                        :virtualScrollerOptions="{ itemSize: 38 }" class="w-full" placeholder="車両タイプ選択" filter />
                </div>
                <div>
                    <label for="blockedCapacity" class="block text-sm font-medium text-gray-700">ブロック台数</label>
                    <InputNumber id="blockedCapacity" v-model="formData.blockedCapacity" :min="1" class="w-full" 
                        placeholder="ブロックする台数を入力" />
                </div>
                <div>
                    <label for="startDate" class="block text-sm font-medium text-gray-700">開始日</label>
                    <DatePicker id="startDate" v-model="formData.startDate" dateFormat="yy-mm-dd" class="w-full" />
                </div>
                <div>
                    <label for="endDate" class="block text-sm font-medium text-gray-700">終了日</label>
                    <DatePicker id="endDate" v-model="formData.endDate" dateFormat="yy-mm-dd" class="w-full" />
                </div>
                <div class="col-span-2">
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
import { defineProps, defineEmits, computed } from 'vue';
import Card from 'primevue/card';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
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
    vehicleCategories: {
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
    }
});

const emit = defineEmits(['apply-block', 'update:selectedHotelId']);

// Computed property for two-way binding with parent
const selectedHotelId = computed({
    get: () => props.selectedHotelId,
    set: (value) => emit('update:selectedHotelId', value)
});
</script>
