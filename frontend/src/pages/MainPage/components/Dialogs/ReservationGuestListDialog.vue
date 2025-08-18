<template>
    <Dialog v-model:visible="dialogVisible" :modal="true" header="宿泊者名簿のエクスポート" style="width: 80vw; height: 80vh;">
        <div class="guest-list-grid-container">
            <!-- Booker Name -->
            <div class="grid-item label" style="grid-column: 1 / -1;">
                <Checkbox v-model="fields.booker_name.include" :binary="true" class="mr-2"/>
                ご予約会社様/個人様名
            </div>
            <div class="grid-item" style="grid-column: 1 / -1;">
                <InputText :model-value="fields.booker_name.value" readonly />
            </div>

            <!-- Alternative Company Name -->
            <div class="grid-item label" style="grid-column: 1 / -1;">
                <Checkbox v-model="fields.alternative_name.include" :binary="true" class="mr-2"/>
                <span class="highlight">※</span>ご宿泊会社様名（ご予約の会社様と異なる場合のみ）
            </div>
            <div class="grid-item" style="grid-column: 1 / -1;">
                <InputText :model-value="fields.alternative_name.value" readonly />
            </div>

            <!-- Check-in/Check-out Dates -->
            <div class="grid-item label">
                <Checkbox v-model="fields.check_in_date.include" :binary="true" class="mr-2"/>
                チェックイン日
            </div>
            <div class="grid-item col-span-3">
                {{ fields.check_in_month.value }} 月 {{ fields.check_in_day.value }} 日 （ {{ fields.check_in_weekday.value }} ）
            </div>
            <div class="grid-item label">
                <Checkbox v-model="fields.check_out_date.include" :binary="true" class="mr-2"/>
                アウト日
            </div>
            <div class="grid-item col-span-2">
                {{ fields.check_out_month.value }} 月 {{ fields.check_out_day.value }} 日 （ {{ fields.check_out_weekday.value }} ）
            </div>

            <!-- Parking and Payment -->
            <div class="grid-item label">駐車場</div>
            <div class="grid-item col-span-2">第1 ・ 第2</div>
            <div class="grid-item label">
                 <Checkbox v-model="fields.payment_total.include" :binary="true" class="mr-2"/>
                現地決済
            </div>
            <div class="grid-item col-span-3">あり ・ なし （ {{ fields.payment_total.value }} 円）</div>

            <!-- Room Details -->
            <div class="grid-item label">
                <Checkbox v-model="fields.room_numbers.include" :binary="true" class="mr-2"/>
                部屋番号
            </div>
            <div class="grid-item">
                 <InputText :model-value="fields.room_numbers.value" readonly />
            </div>
            <div class="grid-item justify-center">禁煙 ・ 喫煙</div>
            <div class="grid-item label">プラン</div>
            <div class="grid-item col-span-3">素泊り ・ 2食付き</div>

            <!-- Guest Name and Car Number -->
            <div class="grid-item label">
                <Checkbox v-model="fields.client_name.include" :binary="true" class="mr-2"/>
                <span class="highlight">※</span>お名前
            </div>
            <div class="grid-item col-span-2">
                <InputText :model-value="fields.client_name.value" readonly />
            </div>
            <div class="grid-item label">
                <Checkbox v-model="fields.number_plate.include" :binary="true" class="mr-2"/>
                <span class="highlight">※</span>車両ナンバー
            </div>
            <div class="grid-item col-span-3">
                <InputText :model-value="fields.number_plate.value" readonly />
            </div>

            <!-- Address -->
            <div class="grid-item label">
                <Checkbox v-model="fields.address.include" :binary="true" class="mr-2"/>
                <span class="highlight">※</span>ご住所
            </div>
            <div class="grid-item col-span-6">
                (〒&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;) 
                <InputText :model-value="fields.address.value" readonly class="w-full"/>
            </div>

            <!-- Contact Number -->
            <div class="grid-item label">
                <Checkbox v-model="fields.phone_number.include" :binary="true" class="mr-2"/>
                <span class="highlight">※</span>ご連絡先
            </div>
            <div class="grid-item col-span-6">
                <InputText :model-value="fields.phone_number.value" readonly />
            </div>

            <!-- Comments -->
            <div class="grid-item label">
                <Checkbox v-model="fields.comment.include" :binary="true" class="mr-2"/>
                備考
            </div>
            <div class="grid-item col-span-6" style="min-height: 60px;">
                <InputText :model-value="fields.comment.value" readonly class="w-full"/>
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
import { useGuestStore } from '@/composables/useGuestStore';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    visible: Boolean,
    reservation: Object,
});

const emit = defineEmits(['update:visible']);

const { isGenerating, generateGuestListPDF } = useGuestStore();
const toast = useToast();

const dialogVisible = ref(false);

const fields = ref({});

const initializeFields = (reservation) => {
    if (!reservation) {
        fields.value = {};
        return;
    }
    
    const guest = reservation.guests && reservation.guests[0] ? reservation.guests[0] : {};

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
        check_in_date: { label: 'チェックイン日', value: null, include: true },
        check_in_month: { label: 'チェックイン月', value: checkInDate.month, include: true },
        check_in_day: { label: 'チェックイン日', value: checkInDate.day, include: true },
        check_in_weekday: { label: 'チェックイン曜日', value: checkInDate.weekday, include: true },
        check_out_date: { label: 'チェックアウト日', value: null, include: true },
        check_out_month: { label: 'チェックアウト月', value: checkOutDate.month, include: true },
        check_out_day: { label: 'チェックアウト日', value: checkOutDate.day, include: true },
        check_out_weekday: { label: 'チェックアウト曜日', value: checkOutDate.weekday, include: true },
        payment_total: { label: '現地決済', value: reservation.payment_total ? new Intl.NumberFormat('ja-JP').format(reservation.payment_total) : '0', include: true },
        room_numbers: { label: '部屋番号', value: reservation.room_numbers ? reservation.room_numbers.join(', ') : '', include: true },
        client_name: { label: 'お名前', value: guest.name, include: true },
        number_plate: { label: '車両ナンバー', value: guest.car_number_plate, include: true },
        address: { label: 'ご住所', value: guest.address, include: true },
        phone_number: { label: 'ご連絡先', value: guest.phone, include: true },
        comment: { label: '備考', value: reservation.comment, include: true },
    };
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
    const guestData = Object.keys(fields.value).reduce((acc, key) => {
        acc[key] = fields.value[key].include;
        return acc;
    }, {});

    const result = await generateGuestListPDF(props.reservation.hotel_id, props.reservation.id, guestData);

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
