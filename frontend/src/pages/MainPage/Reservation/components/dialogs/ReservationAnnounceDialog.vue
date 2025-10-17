<template>
    <Dialog :visible="props.visible" @update:visible="$emit('update:visible', $event)" header="予約報告書" :modal="true"
        :style="{ width: '50vw' }">
        <Textarea v-model="slackMessage" rows="15" autoResize readonly class="w-full" />
        <template #footer>
            <Button label="コピー" icon="pi pi-copy" @click="copyToClipboard" />
            <Button label="閉じる" icon="pi pi-times" @click="$emit('update:visible', false)" class="p-button-secondary" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch, defineProps, defineEmits } from 'vue';
import { useToast } from 'primevue/usetoast';
import {
    Dialog, Textarea, Button
} from 'primevue';

const toast = useToast();

const props = defineProps({
    visible: Boolean,
    reservationInfo: {
        type: Object,
        required: true,
    },
    groupedRooms: {
        type: Array,
        required: true,
    },
    paymentTimingSelected: String,
    reservationType: String,
    checkInTime: String,
});

const emit = defineEmits(['update:visible']);

const slackMessage = ref('');

watch(() => props.visible, (newValue) => {
    if (newValue) {
        generateSlackMessage();
    }
});

const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatTime = (time) => {
    if (!time) return "";
    if (time instanceof Date) {
        return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const date = new Date(`1970-01-01T${time}`);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const generateSlackMessage = () => {
    const info = props.reservationInfo;
    if (!info) {
        slackMessage.value = '予約情報がありません。';
        return;
    }

    // Extract client details
    const clientName = info.client_name || '';
    const clientTel = info.client_tel || '';
    const clientFax = info.client_fax || '';
    console.log('clientName:', clientName, 'clientTel:', clientTel, 'clientFax:', clientFax);

    // Room details
    let roomNumbers = new Set(); // Use a Set to store unique room numbers
    let smokingRooms = 0;
    let nonSmokingRooms = 0;
    let planNames = new Set();

    console.log('groupedRooms:', props.groupedRooms);
    if (props.groupedRooms && props.groupedRooms.length > 0) {
        props.groupedRooms.forEach(group => {
            group.details.forEach(detail => {
                roomNumbers.add(detail.room_number); // Add room number to the Set
                if (detail.room_type_smoking) {
                    smokingRooms++;
                } else {
                    nonSmokingRooms++;
                }
                if (detail.plan_name) {
                    planNames.add(detail.plan_name);
                }
            });
        });
    }
    const uniqueRoomNumbers = Array.from(roomNumbers).join(', '); // Convert Set to Array and join
    console.log('roomNumbers:', uniqueRoomNumbers, 'smokingRooms:', smokingRooms, 'nonSmokingRooms:', nonSmokingRooms, 'planNames:', Array.from(planNames).join(', '));

    // Dates
    const checkInDate = info.check_in ? formatDate(new Date(info.check_in)) : '';
    const checkOutDate = info.check_out ? formatDate(new Date(info.check_out)) : '';
    console.log('checkInDate:', checkInDate, 'checkOutDate:', checkOutDate);

        // Payment

        let totalOnSitePayment = 0;

        if (props.reservation_payments && props.reservation_payments.length > 0) {

            props.reservation_payments.forEach(payment => {

                if (payment.payment_method === '現地決済') { // Assuming '現地決済' is the value for on-site payment

                    totalOnSitePayment += payment.amount;

                }

            });

        }

        let paymentDetails = props.paymentTimingSelected === 'on-site' ? `現地決済 ${totalOnSitePayment > 0 ? `¥${totalOnSitePayment.toLocaleString()}` : ''}` : props.paymentTimingSelected;

        if (paymentDetails === 'not_set') paymentDetails = '未設定';

        if (paymentDetails === 'prepaid') paymentDetails = '事前決済';

        if (paymentDetails === 'postpaid') paymentDetails = '後払い';

        console.log('paymentDetails:', paymentDetails, 'total_price:', info.total_price);

    

        // Parking

        let parkingCount = 0;

        if (props.parking_reservations && props.parking_reservations.parking && props.parking_reservations.parking.length > 0) {

            parkingCount = props.parking_reservations.parking.length;

        }

    

        // Construct the message

        slackMessage.value = `【${clientName}】

    会社名/個人名：${clientName}

    予約担当者：${info.responsible_person_name || '未設定'}

    TEL/FAX：${clientTel}/${clientFax}

    部屋番号：${uniqueRoomNumbers}

    宿泊期間：${checkInDate}-${checkOutDate}out

    人数：${props.groupedRooms.length}室　${info.reservation_number_of_people}名

    喫煙/禁煙：喫煙${smokingRooms}室/禁煙${nonSmokingRooms}室

    プラン：${Array.from(planNames).join(', ')}

    土日：${info.weekend_stay || '未設定'}

    駐車場：${parkingCount > 0 ? `${parkingCount}台` : '未設定'}

    現地決済：${paymentDetails}　※現地決済の場合は${totalOnSitePayment > 0 ? `¥${totalOnSitePayment.toLocaleString()}` : ''}も反映

    備考：${info.comment || 'キャンセルポリシー説明済'}

    チェックイン時間：${formatTime(props.checkInTime)}

    現場：${info.site_name || '未設定'}

    予約経路：${props.reservationType}`;

        console.log('Generated Slack message:', slackMessage.value);
};

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(slackMessage.value);
        toast.add({ severity: 'success', summary: '成功', detail: 'Slackメッセージをクリップボードにコピーしました。', life: 3000 });
    } catch (err) {
        console.error('Failed to copy: ', err);
        toast.add({ severity: 'error', summary: 'エラー', detail: 'クリップボードへのコピーに失敗しました。', life: 3000 });
    }
};

defineExpose({
    generateSlackMessage,
});
</script>