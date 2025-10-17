<template>
    <Dialog :visible="props.visible" @update:visible="$emit('update:visible', $event)" header="予約報告書" :modal="true"
        :style="{ width: '60vw' }" appendTo="body">
        <div class="p-fluid">
            <Fieldset legend="予約概要" class="mb-4">
                <div class="grid grid-cols-2 gap-2">
                    <div class="col-span-2"><strong>予約者名:</strong> {{ reservationInfo.client_name }}</div>
                    <div><strong>TEL:</strong> {{ reservationInfo.client_phone || '' }}</div>
                    <div><strong>FAX:</strong> {{ reservationInfo.client_fax || '' }}</div>
                    <div><strong>TEL:</strong> {{ reservationInfo.client_phone || '' }}</div>
                    <div><strong>FAX:</strong> {{ reservationInfo.client_fax || '' }}</div>
                    <div class="col-span-2"><strong>宿泊者:</strong>
                        <template v-if="reservationInfo.reservation_clients && reservationInfo.reservation_clients.length > 0">
                            <span v-for="(client, index) in reservationInfo.reservation_clients" :key="index">
                                {{ client.name_kanji || client.name_kana || client.name }}
                                <template v-if="index < reservationInfo.reservation_clients.length - 1">, </template>
                            </span>
                        </template>
                        <template v-else>{{ reservationInfo.client_name }}</template>
                    </div>
                    <div class="col-span-2"><strong>宿泊期間:</strong> {{ formattedCheckInDate }} ({{ formattedCheckInTime }}) - {{ formattedCheckOutDate }}</div>
                    <div><strong>人数:</strong> {{ groupedRooms.length }}室 {{ reservationInfo.reservation_number_of_people }}名</div>
                                        <div><strong>喫煙/禁煙: </strong>
                                            <template v-if="smokingRoomsCount > 0">喫煙{{ smokingRoomsCount }}室</template>
                                            <template v-if="smokingRoomsCount > 0 && nonSmokingRoomsCount > 0"> / </template>
                                            <template v-if="nonSmokingRoomsCount > 0">禁煙{{ nonSmokingRoomsCount }}室</template>
                                        </div>
                    <div><strong>プラン:</strong> {{ planNamesList }}</div>
                    <div><strong>土日:</strong> {{ reservationInfo.weekend_stay || '未設定' }}</div>
                    <div><strong>駐車場:</strong> {{ parkingDetails }}</div>
                    <div><strong>清算方法:</strong> {{ paymentDetailsDisplay }}</div>
                    <div><strong>予約経路:</strong> {{ translatedReservationType }}</div>
                </div>
            </Fieldset>

            <Fieldset legend="備考" class="mb-4">
                <p>{{ reservationInfo.comment || 'キャンセルポリシー説明済' }}</p>
            </Fieldset>

            <Fieldset legend="部屋詳細">
                <DataTable :value="roomDetailsForDisplay" size="small">
                    <Column field="date" header="日付"></Column>
                    <Column field="non_smoking_rooms" header="禁煙部屋"></Column>
                    <Column field="smoking_rooms" header="喫煙部屋"></Column>
                    <Column field="plan_name" header="プラン"></Column>
                </DataTable>
            </Fieldset>
        </div>

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
    Dialog, Textarea, Button, Fieldset, DataTable, Column, Tag
} from 'primevue';
import { translatePaymentTiming, translateType } from '@/utils/reservationUtils';

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
    parking_reservations: {
        type: [Object, Array],
        default: () => ({}),
    },
    reservation_payments: {
        type: [Array, Object],
        default: () => [],
    },
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

const getJapaneseWeekday = (dateString) => {
    const date = new Date(dateString);
    const options = { weekday: 'short' };
    return date.toLocaleDateString('ja-JP', options).replace('.', '');
};

const generateSlackMessage = () => {
    const info = props.reservationInfo;
    if (!info) {
        slackMessage.value = '予約情報がありません。';
        return;
    }

    // Extract client details
    const clientName = info.client_name || '';
    const clientPhone = info.client_phone || '';
    const clientFax = info.client_fax || '';

    // Room details
    let roomNumbers = new Set(); // Use a Set to store unique room numbers
    let smokingRooms = 0;
    let nonSmokingRooms = 0;
    let planNames = new Set();

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

    // Dates
    const checkInDate = info.check_in ? formatDate(new Date(info.check_in)) : '';
    const checkOutDate = info.check_out ? formatDate(new Date(info.check_out)) : '';

    // Payment
    let totalOnSitePayment = 0;
    if (props.reservation_payments && props.reservation_payments.length > 0) {
        props.reservation_payments.forEach(payment => {
            if (payment.payment_method === '現地決済') { // Assuming '現地決済' is the value for on-site payment
                totalOnSitePayment += payment.amount;
            }
        });
    }
    const translatedPaymentTiming = translatePaymentTiming(info.payment_timing);
    let paymentDetails = info.payment_timing === 'on-site' ? `${translatedPaymentTiming} ${totalOnSitePayment > 0 ? `¥${totalOnSitePayment.toLocaleString()}` : ''}` : translatedPaymentTiming;

    // Parking
    let parkingCount = 0;
    if (props.parking_reservations && props.parking_reservations.parking && props.parking_reservations.parking.length > 0) {
        parkingCount = props.parking_reservations.parking.length;
    }

        // Construct the message

        let guestNames = '';

        if (info.reservation_clients && info.reservation_clients.length > 0) {

            guestNames = info.reservation_clients.map(client => client.name_kanji || client.name_kana || client.name).join(', ');

        } else {

            guestNames = info.client_name || '';

        }

    

        slackMessage.value = `【${clientName}】

                TEL/FAX：${clientPhone}/${clientFax}

    宿泊者：${guestNames}

    部屋番号：${uniqueRoomNumbers}

    宿泊期間：${checkInDate} (${getJapaneseWeekday(info.check_in)}) (${formatTime(info.check_in_time)})-${checkOutDate} (${getJapaneseWeekday(info.check_out)})人数：${props.groupedRooms.length}室　${info.reservation_number_of_people}名
            喫煙/禁煙: ${smokingRoomsCount > 0 ? `喫煙${smokingRoomsCount}室` : ''}${smokingRoomsCount > 0 && nonSmokingRoomsCount > 0 ? ' / ' : ''}${nonSmokingRoomsCount > 0 ? `禁煙${nonSmokingRoomsCount}室` : ''}            プラン：${weekdayPlanNamesList || '未設定'}
            土日：${weekendPlanNamesList || '未設定'}
駐車場：${parkingCount > 0 ? `${parkingCount}台` : '未設定'}
            清算方法：${paymentDetails}　※現地決済の場合は${totalOnSitePayment > 0 ? `¥${totalOnSitePayment.toLocaleString()}` : ''}も反映備考：${info.comment || 'キャンセルポリシー説明済'}
現場：${info.site_name || '未設定'}
予約経路：${translateType(info.type)}`;
    console.log('Generated Slack message:', slackMessage.value);
};

const formattedCheckInDate = computed(() => props.reservationInfo.check_in ? `${formatDate(new Date(props.reservationInfo.check_in))} (${getJapaneseWeekday(props.reservationInfo.check_in)})` : '');
const formattedCheckOutDate = computed(() => props.reservationInfo.check_out ? `${formatDate(new Date(props.reservationInfo.check_out))} (${getJapaneseWeekday(props.reservationInfo.check_out)})` : '');
const formattedCheckInTime = computed(() => props.reservationInfo.check_in_time ? formatTime(props.reservationInfo.check_in_time) : '');

const smokingRoomsCount = computed(() => {
    const uniqueSmokingRooms = new Set();
    if (props.groupedRooms && props.groupedRooms.length > 0) {
        props.groupedRooms.forEach(group => {
            group.details.forEach(detail => {
                if (detail.room_type_smoking) {
                    uniqueSmokingRooms.add(detail.room_id);
                }
            });
        });
    }
    return uniqueSmokingRooms.size;
});

const nonSmokingRoomsCount = computed(() => {
    const uniqueNonSmokingRooms = new Set();
    if (props.groupedRooms && props.groupedRooms.length > 0) {
        props.groupedRooms.forEach(group => {
            group.details.forEach(detail => {
                if (!detail.room_type_smoking) {
                    uniqueNonSmokingRooms.add(detail.room_id);
                }
            });
        });
    }
    return uniqueNonSmokingRooms.size;
});

const planNamesList = computed(() => {
    let planNames = new Set();
    if (props.groupedRooms && props.groupedRooms.length > 0) {
        props.groupedRooms.forEach(group => {
            group.details.forEach(detail => {
                if (detail.plan_name) {
                    planNames.add(detail.plan_name);
                }
            });
        });
    }
    return Array.from(planNames).join(', ');
});

const weekdayPlanNamesList = computed(() => {
    let planNames = new Set();
    if (props.groupedRooms && props.groupedRooms.length > 0) {
        props.groupedRooms.forEach(group => {
            group.details.forEach(detail => {
                const date = new Date(detail.date);
                const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                if (dayOfWeek !== 0 && dayOfWeek !== 6 && detail.plan_name) { // Not Saturday or Sunday
                    planNames.add(detail.plan_name);
                }
            });
        });
    }
    return Array.from(planNames).join(', ');
});

const weekendPlanNamesList = computed(() => {
    let planNames = new Set();
    if (props.groupedRooms && props.groupedRooms.length > 0) {
        props.groupedRooms.forEach(group => {
            group.details.forEach(detail => {
                const date = new Date(detail.date);
                const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                if ((dayOfWeek === 0 || dayOfWeek === 6) && detail.plan_name) { // Saturday or Sunday
                    planNames.add(detail.plan_name);
                }
            });
        });
    }
    return Array.from(planNames).join(', ');
});

const parkingDetails = computed(() => {
    let parkingCount = 0;
    if (props.parking_reservations && props.parking_reservations.parking && props.parking_reservations.parking.length > 0) {
        parkingCount = props.parking_reservations.parking.length;
    }
    return parkingCount > 0 ? `${parkingCount}台` : '未設定';
});

const paymentDetailsDisplay = computed(() => {
    const info = props.reservationInfo;
    let totalOnSitePayment = 0;
    if (props.reservation_payments && props.reservation_payments.length > 0) {
        props.reservation_payments.forEach(payment => {
            if (payment.payment_method === '現地決済') {
                totalOnSitePayment += payment.amount;
            }
        });
    }
    const translatedPaymentTiming = translatePaymentTiming(info.payment_timing);
    return info.payment_timing === 'on-site' ? `${translatedPaymentTiming} ${totalOnSitePayment > 0 ? `¥${totalOnSitePayment.toLocaleString()}` : ''}` : translatedPaymentTiming;
});

const translatedReservationType = computed(() => translateType(props.reservationInfo.type));

const roomDetailsForDisplay = computed(() => {
    const detailsByDate = {};

    if (props.groupedRooms && props.groupedRooms.length > 0) {
        props.groupedRooms.forEach(group => {
            group.details.forEach(detail => {
                const date = formatDate(new Date(detail.date)); // Assuming detail.date is available
                if (!detailsByDate[date]) {
                    detailsByDate[date] = {
                        date: `${date} (${getJapaneseWeekday(detail.date)})`,
                        non_smoking_rooms: 0,
                        smoking_rooms: 0,
                        plan_name: new Set(), // Use a Set to collect unique plan names for the date
                    };
                }

                if (detail.room_type_smoking) {
                    detailsByDate[date].smoking_rooms++;
                } else {
                    detailsByDate[date].non_smoking_rooms++;
                }
                if (detail.plan_name) {
                    detailsByDate[date].plan_name.add(detail.plan_name);
                }
            });
        });
    }

    // Convert plan_name Set to a comma-separated string
    const formattedDetails = Object.values(detailsByDate).map(item => ({
        ...item,
        plan_name: Array.from(item.plan_name).join(', '),
    }));

    return formattedDetails;
});

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