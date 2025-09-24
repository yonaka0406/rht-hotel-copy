<template>
    <Dialog v-model:visible="dialogVisible" :modal="true" header="宿泊者名簿のエクスポート" style="width: 80vw; height: 80vh;">
        <div class="p-fluid">
            <!-- Explanation for checkboxes -->
            <div class="mb-4 p-4 rounded-lg text-sm" style="background-color: #f0f8ff; border: 1px solid #b0c4de;">
                <p> 各項目の横にあるチェックボックスをオンにすると、PDFにその情報が反映されます。</p>
            </div>
            
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

                <!-- Parking and Vehicle Count (for group) / Payment -->
                <div v-if="!isGroup" class="grid-item label">駐車場</div>
                <div v-if="!isGroup" class="grid-item col-span-2 flex-wrap">
                    <div v-for="lot in parkingLots" :key="lot.id" class="flex items-center mr-4">
                        <Checkbox v-model="selectedParkingLots" :inputId="'lot_' + lot.id" :value="lot.name"></Checkbox>
                        <label :for="'lot_' + lot.id" class="ml-2"> {{ lot.name }} </label>
                    </div>
                </div>
                
                <!-- Vehicle Count (only for group reservations) -->
                <div v-if="isGroup" class="grid-item label">
                    <Checkbox v-model="fields.vehicle_count.include" :binary="true" class="mr-2"/>
                    <span class="highlight">※</span>車両台数
                </div>
                <div v-if="isGroup" class="grid-item col-span-2 flex-wrap">
                    <InputText v-model="fields.vehicle_count.value" fluid />
                </div>
                
                <!-- Payment -->
                <div class="grid-item label">
                    <Checkbox v-model="fields.payment_total.include" :binary="true" class="mr-2"/>
                    現地決済
                </div>
                <div class="grid-item col-span-3" style="display: flex; align-items: center;">
                    <SelectButton v-model="paymentOption" :options="['あり', 'なし']" class="mr-2" />
                     （ <InputText v-model="fields.payment_total.value" class="w-1/2" /> 円）
                </div>

                <!-- Room Details (only for non-group reservations) -->
                <template v-if="!isGroup">
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
                            <Checkbox v-model="selectedPlans" :inputId="'plan_' + plan.id" :value="plan.plan_key"></Checkbox>
                            <label :for="'plan_' + plan.id" class="ml-2"> {{ plan.name }} </label>
                        </div>
                    </div>
                </template>
            </div>

            <!-- Guest sections -->
            <div v-for="(guestFields, index) in guests" :key="index" class="guest-list-grid-container mt-4">
                <!-- Guest Block Header -->
                <div class="grid-item label" style="grid-column: 1 / -1;">
                    宿泊者{{ index + 1 }}人目
                    <span v-if="isGroup && guestFields.room_info" class="ml-4 text-sm text-gray-600">
                        (部屋: {{ guestFields.room_info.room_number }})
                    </span>
                </div>
                
                <!-- Room-specific fields for group reservations -->
                <template v-if="isGroup">
                    <!-- First row: Room Number and Plan only -->
                    <div class="grid-item label">
                        <Checkbox v-model="guestFields.room_number.include" :binary="true" class="mr-2"/>
                        部屋番号
                    </div>
                    <div class="grid-item">
                        <InputText v-model="guestFields.room_number.value" fluid />
                    </div>
                    <div class="grid-item justify-center">
                        <SelectButton v-model="guestFields.smoking_option.value" :options="['禁煙', '喫煙']" />
                    </div>
                    <div class="grid-item label">プラン</div>
                    <div class="grid-item col-span-3 flex-wrap">
                        <div v-for="plan in allPlans" :key="plan.id" class="flex items-center mr-4">
                            <Checkbox v-model="guestFields.selected_plans.value" :inputId="'guest_plan_' + index + '_' + plan.id" :value="plan.name"></Checkbox>
                            <label :for="'guest_plan_' + index + '_' + plan.id" class="ml-2"> {{ plan.name }} </label>
                        </div>
                    </div>
                    
                    <!-- Second row: Parking -->                    
                    <div class="grid-item label">駐車場</div>
                    <div class="grid-item col-span-2 flex-wrap">
                        <div v-for="lot in parkingLots" :key="lot.id" class="flex items-center mr-4">
                            <Checkbox v-model="guestFields.selected_parking.value" :inputId="'guest_parking_' + index + '_' + lot.id" :value="lot.name"></Checkbox>
                            <label :for="'guest_parking_' + index + '_' + lot.id" class="ml-2"> {{ lot.name }} </label>
                        </div>
                    </div>
                    <div class="grid-item label">
                        <Checkbox v-model="guestFields.number_plate.include" :binary="true" class="mr-2"/>
                        <span class="highlight">※</span>車両ナンバー
                    </div>
                    <div class="grid-item col-span-3">
                        <InputText v-model="guestFields.number_plate.value" fluid />
                    </div>
                </template>
                
                <!-- Guest Name and Car Number -->
                <div class="grid-item label">
                    <Checkbox v-model="guestFields.client_name.include" :binary="true" class="mr-2"/>
                    <span class="highlight">※</span>お名前
                </div>
                <div class="grid-item col-span-6">
                    <InputText v-model="guestFields.client_name.value" fluid />
                </div>
                
                

                <!-- Address -->
                <div class="grid-item label">
                    <Checkbox v-model="guestFields.address.include" :binary="true" class="mr-2"/>
                    <span class="highlight">※</span>ご住所
                </div>
                <div class="grid-item col-span-6 flex flex-col items-start p-2">
                    <div class="flex items-center w-full">
                        <span>〒</span>
                        <InputMask v-model="guestFields.postal_code.value" mask="999-9999" placeholder="999-9999" class="w-1/4 ml-2 mr-2" />
                    </div>
                    <InputText v-model="guestFields.address.value" class="w-full mt-2" />
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
import InputMask from 'primevue/inputmask';
import SelectButton from 'primevue/selectbutton';
import { useGuestStore } from '@/composables/useGuestStore';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    visible: Boolean,
    reservation: [Object, Array],
    parkingLots: Array,
    allPlans: Array,
    isGroup: Boolean,
    paymentTiming: String,
});

const emit = defineEmits(['update:visible']);

const { isGenerating, generateGuestListPDF } = useGuestStore();
const toast = useToast();

const dialogVisible = ref(false);
const smokingOption = ref('禁煙');
const paymentOption = ref('なし');
const selectedPlans = ref([]);
const selectedParkingLots = ref([]);

const fields = ref({});
const guests = ref([]);

const initializeFields = (reservation) => {
    //console.log('Component received props:', { 
    //  reservation,
    //  isGroup: props.isGroup 
    //});    
    
    if (!reservation) {
        fields.value = {};
        guests.value = [];
        return;
    }
    
    // Handle array of reservations (group) vs single reservation
    const firstReservation = Array.isArray(reservation) ? reservation[0] : reservation;
    
    if (firstReservation.smoking) {
        smokingOption.value = '喫煙';
    } else {
        smokingOption.value = '禁煙';
    }

    // For group reservations, collect all plans from all rooms
    if (props.isGroup && Array.isArray(reservation)) {
        selectedPlans.value = [...new Set(reservation.flatMap(r => r.assigned_plan_names || []))];
        
        const allAssignedParking = [...new Set(reservation.flatMap(r => r.assigned_parking_lot_names || []))];
        selectedParkingLots.value = allAssignedParking;
        
        paymentOption.value = (firstReservation.payment_timing === 'on-site') ? 'あり' : 'なし';
    } else {
                selectedPlans.value = firstReservation.assigned_plan_names || [];
        selectedParkingLots.value = firstReservation.assigned_parking_lot_names || [];
        paymentOption.value = (firstReservation.payment_timing === 'on-site') ? 'あり' : 'なし';
    }

    const formatJapaneseDate = (dateString) => {
        if (!dateString) return { month: '', day: '', weekday: '' };
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        return { month, day, weekday };
    };

    const checkInDate = formatJapaneseDate(firstReservation.check_in);
    const checkOutDate = formatJapaneseDate(firstReservation.check_out);

    // Calculate total payment for group
    const totalPayment = props.isGroup && Array.isArray(reservation) 
        ? reservation.reduce((sum, r) => sum + (r.payment_total || 0), 0)
        : firstReservation.payment_total || 0;

    fields.value = {
        booker_name: { label: 'ご予約会社様/個人様名', value: firstReservation.booker_name, include: true },
        alternative_name: { label: 'ご宿泊会社様名', value: firstReservation.alternative_name, include: true },
        check_in_month: { label: 'チェックイン月', value: checkInDate.month, include: true },
        check_in_day: { label: 'チェックイン日', value: checkInDate.day, include: true },
        check_in_weekday: { label: 'チェックイン曜日', value: checkInDate.weekday, include: true },
        check_out_month: { label: 'チェックアウト月', value: checkOutDate.month, include: true },
        check_out_day: { label: 'チェックアウト日', value: checkOutDate.day, include: true },
        check_out_weekday: { label: 'チェックアウト曜日', value: checkOutDate.weekday, include: true },
        payment_total: {
            label: '現地決済',
            value: paymentOption.value === 'なし' ? '0' : (totalPayment ? new Intl.NumberFormat('ja-JP').format(totalPayment) : '0'),
            include: true
        },
        room_numbers: { label: '部屋番号', value: firstReservation.room_numbers ? firstReservation.room_numbers.join(', ') : '', include: true },
        comment: { label: '備考', value: firstReservation.comment, include: true },
    };

    // Add vehicle count field for group reservations
    if (props.isGroup) {
        fields.value.vehicle_count = { label: '車両台数', value: '', include: true };
    }

    // Initialize guests based on reservation type
    if (props.isGroup && Array.isArray(reservation)) {
        initializeGroupGuests(reservation);
    } else {
        initializeSingleGuests(firstReservation);
    }
};

const initializeGroupGuests = (reservationArray) => {
    const newGuests = [];
    
    reservationArray.forEach((roomReservation, roomIndex) => {
        const existingGuests = roomReservation.guests || [];
        const numberOfPeople = roomReservation.number_of_people || 0;
        
        for (let i = 0; i < numberOfPeople; i++) {
            const existingGuest = existingGuests[i];
            const guestData = {
                room_info: {
                    room_number: roomReservation.room_number,
                    room_type: roomReservation.room_type,
                },
                room_number: { label: '部屋番号', value: roomReservation.room_number, include: true },
                smoking_option: { label: '喫煙', value: roomReservation.smoking ? '喫煙' : '禁煙', include: true },
                selected_plans: { label: 'プラン', value: roomReservation.assigned_plan_names || [], include: true },
                selected_parking: { label: '駐車場', value: roomReservation.assigned_parking_lot_names || [], include: true },
                client_name: { label: 'お名前', value: existingGuest?.name || '', include: true },
                number_plate: { label: '車両ナンバー', value: existingGuest?.car_number_plate || '', include: true },
                postal_code: { label: '郵便番号', value: existingGuest?.postal_code || '', include: true },
                address: { label: 'ご住所', value: existingGuest?.address || '', include: true },
                phone_number: { label: 'ご連絡先', value: existingGuest?.phone || '', include: true },
            };
            newGuests.push(guestData);
        }
    });
    
    guests.value = newGuests;
};

const initializeSingleGuests = (reservation) => {
    const numberOfPeople = reservation.number_of_people || 0;
    const existingGuests = reservation.guests || [];
    const newGuests = [];

    for (let i = 0; i < numberOfPeople; i++) {
        const existingGuest = existingGuests[i];
        if (existingGuest) {
            newGuests.push({
                client_name: { label: 'お名前', value: existingGuest.name, include: true },
                number_plate: { label: '車両ナンバー', value: existingGuest.car_number_plate, include: true },
                postal_code: { label: '郵便番号', value: existingGuest.postal_code || '', include: true },
                address: { label: 'ご住所', value: existingGuest.address, include: true },
                phone_number: { label: 'ご連絡先', value: existingGuest.phone, include: true },
            });
        } else {
            newGuests.push({
                client_name: { label: 'お名前', value: '', include: true },
                number_plate: { label: '車両ナンバー', value: '', include: true },
                postal_code: { label: '郵便番号', value: '', include: true },
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
    //console.log('--- generatePDF function called ---');
    //console.log('Props reservation object:', props.reservation);

    const guestData = {};
    for (const key in fields.value) {
        if (fields.value[key].include) {
            guestData[key] = fields.value[key].value;
        } else {
            guestData[key] = '';
        }
    }
    guestData.smoking_preference = smokingOption.value;
    guestData.payment_option = paymentOption.value;
    const planNames = selectedPlans.value.map(planKey => {
        const plan = props.allPlans.find(p => p.plan_key === planKey);
        return plan ? plan.name : planKey;
    });
    guestData.plan_names_list = planNames.join(', ');
    guestData.all_plan_names_list = props.allPlans.map(p => p.name).join(',');
    guestData.parking_lot_names_list = selectedParkingLots.value.join(', ');
    
    // Handle hotel_name for both single and group reservations
    const firstReservation = Array.isArray(props.reservation) ? props.reservation[0] : props.reservation;
    guestData.hotel_name = firstReservation.hotel_name;
    
    guestData.all_parking_lots_list = props.parkingLots.map(lot => lot.name).join(', ');

    //console.log('Hotel name:', guestData.hotel_name);

    guestData.guests = guests.value.map(guestFields => {
        const guest = {};
        for (const key in guestFields) {
            if (guestFields[key].include) {
                if (key === 'postal_code') {
                    guest[key] = guestFields[key].value;
                } else {
                    guest[key] = guestFields[key].value;
                }
            } else {
                guest[key] = '';
            }
        }
        return guest;
    });

    //console.log('Data to be sent to PDF function:', guestData);

    let result;
    const reservationId = Array.isArray(props.reservation) ? props.reservation[0].id : props.reservation.id;
    const hotelId = Array.isArray(props.reservation) ? props.reservation[0].hotel_id : props.reservation.hotel_id;
    
    if (props.isGroup) {

    } else {
        result = await generateGuestListPDF(hotelId, reservationId, guestData);
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