<template>
    <Dialog v-model:visible="dialogVisible" :modal="true" header="宿泊者名簿のエクスポート" style="width: 80vw; height: 80vh;">
        <div class="p-fluid">
            <div class="guest-list-grid-container">
                <!-- Booker Name -->
                <div class="grid-item label" style="grid-column: 1 / -1;">
                    <Checkbox v-model="fields.booker_name.include" :binary="true" class="mr-2"/>
                    ご予約会社様/個人様名
                </div>
                <div class="grid-item" style="grid-column: 1 / -1;">
                    <InputText v-model="fields.booker_name.value" fluid />
                </div>

                <!-- Alternative Company Name -->
                <div class="grid-item label" style="grid-column: 1 / -1;">
                    <Checkbox v-model="fields.alternative_name.include" :binary="true" class="mr-2"/>
                    <span class="highlight">※</span>ご宿泊会社様名（ご予約の会社様と異なる場合のみ）
                </div>
                <div class="grid-item" style="grid-column: 1 / -1;">
                    <InputText v-model="fields.alternative_name.value" fluid />
                </div>

                <!-- Check-in/Check-out Dates -->
                <div class="grid-item label">
                    チェックイン日
                </div>
                <div class="grid-item col-span-3">
                    <InputText v-model="fields.check_in_month.value" class="w-1/4" /> 月 
                    <InputText v-model="fields.check_in_day.value" class="w-1/4" /> 日 （ 
                    <InputText v-model="fields.check_in_weekday.value" class="w-1/4" /> ）
                </div>
                <div class="grid-item label">
                    アウト日
                </div>
                <div class="grid-item col-span-2">
                    <InputText v-model="fields.check_out_month.value" class="w-1/4" /> 月 
                    <InputText v-model="fields.check_out_day.value" class="w-1/4" /> 日 （ 
                    <InputText v-model="fields.check_out_weekday.value" class="w-1/4" /> ）
                </div>

                <!-- Parking and Payment -->
                <div class="grid-item label">駐車場</div>
                <div class="grid-item col-span-2 flex-wrap">
                    <div v-for="lot in parkingLots" :key="lot.id" class="flex items-center mr-4">
                        <Checkbox v-model="selectedParkingLots" :inputId="'lot_' + lot.id" :value="lot.name"></Checkbox>
                        <label :for="'lot_' + lot.id" class="ml-2"> {{ lot.name }} </label>
                    </div>
                </div>
                <div class="grid-item label">
                    <Checkbox v-model="fields.payment_total.include" :binary="true" class="mr-2"/>
                    現地決済
                </div>
                <div class="grid-item col-span-3">あり ・ なし （ <InputText v-model="fields.payment_total.value" class="w-1/2" /> 円）</div>

                <!-- Room Details -->
                <div class="grid-item label">
                    <Checkbox v-model="fields.room_numbers.include" :binary="true" class="mr-2"/>
                    部屋番号
                </div>
                <div class="grid-item">
                    <InputText v-model="fields.room_numbers.value" fluid />
                </div>
                <div class="grid-item justify-center">
                    <SelectButton v-model="smokingOption" :options="['禁煙', '喫煙']" />
                </div>
                <div class="grid-item label">プラン</div>
                <div class="grid-item col-span-3 flex-wrap">
                    <div v-for="plan in allPlans" :key="plan.id" class="flex items-center mr-4">
                        <Checkbox v-model="selectedPlans" :inputId="'plan_' + plan.id" :value="plan.name"></Checkbox>
                        <label :for="'plan_' + plan.id" class="ml-2"> {{ plan.name }} </label>
                    </div>
                </div>
            </div>

            <div v-for="(guestFields, index) in guests" :key="index" class="guest-list-grid-container mt-4">
                    <!-- Guest Name and Car Number -->
                <div class="grid-item label">
                    <Checkbox v-model="guestFields.client_name.include" :binary="true" class="mr-2"/>
                    <span class="highlight">※</span>お名前
                </div>
                <div class="grid-item col-span-2">
                    <InputText v-model="guestFields.client_name.value" fluid />
                </div>
                <div class="grid-item label">
                    <Checkbox v-model="guestFields.number_plate.include" :binary="true" class="mr-2"/>
                    <span class="highlight">※</span>車両ナンバー
                </div>
                <div class="grid-item col-span-3">
                    <InputText v-model="guestFields.number_plate.value" fluid />
                </div>

                <!-- Address -->
                <div class="grid-item label">
                    <Checkbox v-model="guestFields.address.include" :binary="true" class="mr-2"/>
                    <span class="highlight">※</span>ご住所
                </div>
                <div class="grid-item col-span-6">
                    (〒&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;) 
                    <InputText v-model="guestFields.address.value" class="w-full" fluid />
                </div>

                <!-- Contact Number -->
                <div class="grid-item label">
                    <Checkbox v-model="guestFields.phone_number.include" :binary="true" class="mr-2"/>
                    <span class="highlight">※</span>ご連絡先
                </div>
                <div class="grid-item col-span-6">
                    <InputText v-model="guestFields.phone_number.value" fluid />
                </div>
            </div>

                <!-- Comments -->
            <div class="guest-list-grid-container mt-4">
                <div class="grid-item label">
                    <Checkbox v-model="fields.comment.include" :binary="true" class="mr-2"/>
                    備考
                </div>
                <div class="grid-item col-span-6" style="min-height: 60px;">
                    <InputText v-model="fields.comment.value" class="w-full" fluid />
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" @click="closeDialog" class="p-button-text p-button-danger"/>
            <Button label="PDF生成" icon="pi pi-file-pdf" @click="generatePDF" :loading="isGenerating"/>
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import SelectButton from 'primevue/selectbutton';
import { useGuestStore } from '@/composables/useGuestStore';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    visible: Boolean,
    reservation: Object,
    parkingLots: Array,
    allPlans: Array,
    isGroup: Boolean,
});

const emit = defineEmits(['update:visible']);

const { isGenerating, generateGuestListPDF, generateGroupGuestListPDF } = useGuestStore();
const toast = useToast();

const dialogVisible = ref(false);
const smokingOption = ref('禁煙');
const selectedPlans = ref([]);
const selectedParkingLots = ref([]);

const fields = ref({});
const guests = ref([]);

const initializeFields = (reservation) => {
    // --- START: Added console log for the props received by the component ---
    console.log('Component received reservation prop:', reservation);
    // --- END: Added console log for the props received by the component ---
    
    if (!reservation) {
        fields.value = {};
        guests.value = [];
        return;
    }
    
    if (reservation.smoking) {
        smokingOption.value = '喫煙';
    } else {
        smokingOption.value = '禁煙';
    }

    selectedPlans.value = reservation.assigned_plan_names || [];
    selectedParkingLots.value = reservation.assigned_parking_lot_names || [];

    const formatJapaneseDate = (dateString) => {
        if (!dateString) return { month: '', day: '', weekday: '' };
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        return { month, day, weekday };
    };

    const checkInDate = formatJapaneseDate(reservation.check_in);
    const checkOutDate = formatJapaneseDate(reservation.check_out);

    fields.value = {
        booker_name: { label: 'ご予約会社様/個人様名', value: reservation.booker_name, include: true },
        alternative_name: { label: 'ご宿泊会社様名', value: reservation.alternative_name, include: true },
        check_in_month: { label: 'チェックイン月', value: checkInDate.month, include: true },
        check_in_day: { label: 'チェックイン日', value: checkInDate.day, include: true },
        check_in_weekday: { label: 'チェックイン曜日', value: checkInDate.weekday, include: true },
        check_out_month: { label: 'チェックアウト月', value: checkOutDate.month, include: true },
        check_out_day: { label: 'チェックアウト日', value: checkOutDate.day, include: true },
        check_out_weekday: { label: 'チェックアウト曜日', value: checkOutDate.weekday, include: true },
        payment_total: { label: '現地決済', value: reservation.payment_total ? new Intl.NumberFormat('ja-JP').format(reservation.payment_total) : '0', include: true },
        room_numbers: { label: '部屋番号', value: reservation.room_numbers ? reservation.room_numbers.join(', ') : '', include: true },
        comment: { label: '備考', value: reservation.comment, include: true },
    };

    const numberOfPeople = reservation.number_of_people || 0;
    const existingGuests = reservation.guests || [];
    const newGuests = [];

    for (let i = 0; i < numberOfPeople; i++) {
        const existingGuest = existingGuests[i];
        if (existingGuest) {
            newGuests.push({
                client_name: { label: 'お名前', value: existingGuest.name, include: true },
                number_plate: { label: '車両ナンバー', value: existingGuest.car_number_plate, include: true },
                address: { label: 'ご住所', value: existingGuest.address, include: true },
                phone_number: { label: 'ご連絡先', value: existingGuest.phone, include: true },
            });
        } else {
            newGuests.push({
                client_name: { label: 'お名前', value: '', include: true },
                number_plate: { label: '車両ナンバー', value: '', include: true },
                address: { label: 'ご住所', value: '', include: true },
                phone_number: { label: 'ご連絡先', value: '', include: true },
            });
        }
    }
    guests.value = newGuests;
};

watch(() => props.visible, (newValue) => {
    dialogVisible.value = newValue;
    if (newValue) {
        initializeFields(props.reservation);
    }
});

watch(dialogVisible, (newValue) => {
    if (!newValue) {
        emit('update:visible', false);
    }
});

const closeDialog = () => {
    dialogVisible.value = false;
};

const generatePDF = async () => {
    // --- START: Added console logs for debugging ---
    console.log('--- generatePDF function called ---');
    console.log('Props reservation object:', props.reservation);
    // --- END: Added console logs for debugging ---

    const guestData = {};
    for (const key in fields.value) {
        if (fields.value[key].include) {
            guestData[key] = fields.value[key].value;
        } else {
            guestData[key] = '';
        }
    }
    guestData.smoking_preference = smokingOption.value;
    guestData.plan_names_list = selectedPlans.value.join(', ');
    guestData.parking_lot_names_list = selectedParkingLots.value.join(', ');
    guestData.hotel_name = props.reservation.hotel_name;
    
    // Explicitly check for hotel_name and log it
    console.log('Hotel name:', guestData.hotel_name);

    guestData.guests = guests.value.map(guestFields => {
        const guest = {};
        for (const key in guestFields) {
            if (guestFields[key].include) {
                guest[key] = guestFields[key].value;
            } else {
                guest[key] = '';
            }
        }
        return guest;
    });

    // --- START: Added console log for the final data object ---
    console.log('Data to be sent to PDF function:', guestData);
    // --- END: Added console log for the final data object ---

    let result;
    if (props.isGroup) {
        result = await generateGroupGuestListPDF(props.reservation.hotel_id, props.reservation.id, guestData);
    } else {
        result = await generateGuestListPDF(props.reservation.hotel_id, props.reservation.id, guestData);
    }

    if (result.success) {
        toast.add({ severity: 'success', summary: '成功', detail: `PDFが生成されました: ${result.filename}`, life: 3000 });
        closeDialog();
    } else {
        toast.add({ severity: 'error', summary: 'エラー', detail: 'PDFの生成に失敗しました。', life: 3000 });
    }
};
</script>

<style scoped>
.guest-list-grid-container {
    display: grid;
    grid-template-columns: 150px 1fr 1fr 1fr 100px 1fr 1fr;
}
.grid-item {
    border: 1px solid #a9a9a9;
    padding: 8px;
    display: flex;
    align-items: center;
}
.label {
    background-color: #f2f2f2;
    font-weight: bold;
    justify-content: center;
}
.highlight {
    color: #ff0000;
}
</style>
