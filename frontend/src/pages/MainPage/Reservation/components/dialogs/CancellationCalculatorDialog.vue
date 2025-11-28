<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" modal header="キャンセル料発生計算"
        style="width: 50vw">
        <div v-if="!isLoading">
            <div class="p-fluid" v-if="isLongTermReservation">
                <div class="field flex grid grid-cols-12 gap-x-4 mt-6">
                    <div class="col-span-6">
                        <FloatLabel>                        
                            <DatePicker v-model="cancellationDate" showIcon fluid iconDisplay="input" dateFormat="yy-mm-dd"
                            :numberOfMonths="2"
                            :selectOtherMonths="true" />
                            <label for="cancellation-date">キャンセル日</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-6">
                        <FloatLabel>                        
                            <InputNumber v-model="ruleDays" inputId="rule-days" :min="0" />
                            <label for="rule-days">キャンセル料発生日数（〇日間前まで）</label>
                        </FloatLabel>
                    </div>
                </div>
                <div class="field mt-4">
                    <p><b>キャンセル料発生日:</b> {{ cancellationFeeDate ? formatDate(cancellationFeeDate) : 'N/A' }}
                    </p>
                </div>
                <div class="field">
                    <Card>
                        <template #title>計算結果</template>
                        <template #content>
                            <p><b>キャンセルされる泊数:</b> {{ nightsCancelled.count }}</p>
                            <p><b>合計キャンセル料:</b> {{ new Intl.NumberFormat('ja-JP', {
                                style: 'currency', currency: 'JPY'
                                }).format(totalFee) }}</p>
                        </template>
                    </Card>
                </div>
            </div>
            <div v-else>
                <p>この予約は長期予約（30泊以上）ではないため、この計算機は適用されません。</p>
            </div>
        </div>
        <div v-else class="flex justify-content-center">
            <ProgressSpinner />
        </div>
        <template #footer>
            <Button label="閉じる" icon="pi pi-times" @click="$emit('update:visible', false)" class="p-button-danger p-button-text p-button-sm" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import FloatLabel from 'primevue/floatlabel';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import { useCancellationFeeCalculator } from '@/composables/useCancellationFeeCalculator';

const props = defineProps({
    visible: Boolean,
    reservationDetails: {
        type: [Array, Object],
        required: true,
        default: () => ([])
    },
});

const _emits = defineEmits(['update:visible']);

const isLoading = ref(true);
const cancellationDate = ref(new Date());
const ruleDays = ref(30);

const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error("Invalid Date object:", date);
      throw new Error("The provided input is not a valid Date object:");
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const {
    nightsCancelled,
    totalFee,
    isLongTermReservation,
    cancellationFeeDate,
} = useCancellationFeeCalculator(
    () => props.reservationDetails,
    cancellationDate,
    ruleDays
);

// Watch for changes to reservationDetails
watch(() => props.visible, (isVisible) => {
    if (isVisible) {
        //console.log('Dialog opened with reservation details:', props.reservationDetails);
    }
});

onMounted(() => {
    // Small delay to ensure the component is fully mounted
    setTimeout(() => {
        isLoading.value = false;
    }, 100);
});
</script>
