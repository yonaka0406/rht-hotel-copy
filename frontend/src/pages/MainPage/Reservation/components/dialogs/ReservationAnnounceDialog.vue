<template>
    <Dialog :visible="props.visible" @update:visible="$emit('update:visible', $event)" header="予約報告書" :modal="true"
        :style="{ width: '60vw' }" appendTo="body">
        <div class="p-fluid">
            <Fieldset legend="予約概要" class="mb-4">
                <div class="grid grid-cols-2 gap-2">
                    <div class="col-span-2"><strong>予約者名:</strong> {{ reservationInfo.client_name }}</div>
                    <div class="col-span-2"><strong>宿泊期間:</strong> {{ formattedCheckInDate }} ({{ formattedCheckInTime }}) - {{ formattedCheckOutDate }}</div>
                    <div><strong>TEL:</strong> {{ reservationInfo.client_phone || '' }}</div>
                    <div><strong>FAX:</strong> {{ reservationInfo.client_fax || '' }}</div>
                    <div class="col-span-2"><strong>宿泊者:</strong>
                        <template v-if="props.allReservationClients && props.allReservationClients.length > 0">
                            <span v-for="(client, index) in props.allReservationClients" :key="client.client_id">
                                {{ client.name_kanji || client.name_kana || client.name }}
                                <template v-if="index < props.allReservationClients.length - 1">, </template>
                            </span>
                            <!-- Debug log for reservation_clients -->
                        </template>
                        <template v-else>{{ reservationInfo.client_name }}</template>
                    </div>
                    <div><strong>人数:</strong> {{ reservationInfo.reservation_number_of_people }}名</div>
                                        <div><strong>部屋数: </strong>
                                            <template v-if="smokingRoomsCount > 0">喫煙 {{ smokingRoomsCount }}室</template>
                                            <template v-if="smokingRoomsCount > 0 && nonSmokingRoomsCount > 0"> / </template>
                                            <template v-if="nonSmokingRoomsCount > 0">禁煙 {{ nonSmokingRoomsCount }}室</template>
                                        </div>
                    <div><strong>プラン:</strong> {{ planNamesList }}</div>
                    <div v-if="weekendPlanNamesList"><strong>土日:</strong> {{ weekendPlanNamesList }}</div>
                    <div><strong>駐車場:</strong> {{ parkingDetails }}</div>
                    <div><strong>清算方法:</strong> {{ paymentDetailsDisplay }}</div>
                    <div><strong>予約経路:</strong> {{ translatedReservationType }}</div>
                </div>
            </Fieldset>

            <Fieldset legend="備考" class="mb-4">
                <p style="white-space: pre-wrap;">{{ reservationInfo.comment || 'キャンセルポリシー説明済' }}</p>
            </Fieldset>

            <Fieldset legend="部屋詳細">
                <DataTable :value="roomDetailsForDisplay" size="small">
                    <Column field="date" header="日付"></Column>
                    <Column field="non_smoking_rooms" header="禁煙部屋" bodyStyle="text-align: center"></Column>
                    <Column field="smoking_rooms" header="喫煙部屋" bodyStyle="text-align: center"></Column>
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
    Dialog, Button, Fieldset, DataTable, Column
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
    allReservationClients: {
        type: Array,
        default: () => [],
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
        return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    const date = new Date(`1970-01-01T${time}`);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const getJapaneseWeekday = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '';

    const parts = dateString.split('-');
    if (parts.length !== 3) return '';

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';

    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) return '';

    const options = { weekday: 'short' };
    return date.toLocaleDateString('ja-JP', options).replace('.', '');
};

const ON_SITE_PAYMENT_METHOD = '現地決済';

const calculateTotalOnSitePayment = (payments) => {
    let total = 0;
    if (payments && payments.length > 0) {
        payments.forEach(payment => {
            if (payment?.payment_method === ON_SITE_PAYMENT_METHOD) {
                total += payment?.amount || 0;
            }
        });
    }
    return total;
};

const generateSlackMessage = () => {
    const info = props.reservationInfo;
    if (!info) {
        slackMessage.value = '予約情報がありません。';
        return;
    }

    const clientName = info.client_name || '';
    const clientPhone = info.client_phone || '';
    const clientFax = info.client_fax || '';
    const uniqueRoomNumbers = Array.from(new Set(props.groupedRooms.flatMap(group => group.details.map(detail => detail.room_number)))).join(', ');
    const checkInDate = info.check_in ? formatDate(new Date(info.check_in)) : '';
    const checkOutDate = info.check_out ? formatDate(new Date(info.check_out)) : '';
    const totalOnSitePayment = calculateTotalOnSitePayment(props.reservation_payments);
    const translatedPaymentTiming = translatePaymentTiming(info.payment_timing);
    let paymentDetails = info.payment_timing === 'on-site' ? `${translatedPaymentTiming} ${totalOnSitePayment > 0 ? `¥${totalOnSitePayment.toLocaleString()}` : ''}` : translatedPaymentTiming;
    let guestNames = '';
    if (props.allReservationClients && props.allReservationClients.length > 0) {
        guestNames = props.allReservationClients.map(client => client.name_kanji || client.name_kana || client.name).join(', ');
    } else {
        guestNames = info.client_name || '';
    }

    let message = `🗓️【${clientName}】\n`;
    message += `📞TEL/FAX：\t${clientPhone}/${clientFax}\n`;
    message += `🧑‍💼予約担当者：\t${info.responsible_person_name || '未設定'}\n`;
    message += `⏳宿泊期間：\t${checkInDate} (${getJapaneseWeekday(info.check_in)}) (${formatTime(info.check_in_time)})-${checkOutDate} (${getJapaneseWeekday(info.check_out)})\n`;
    message += `🌐予約経路：\t${translateType(info.type)}\n`;
    message += `🧑人数：\t${info.reservation_number_of_people}名\n`;
    message += `宿泊者：\t${guestNames}\n\n`;

    message += `🚪部屋数:\t${smokingRoomsCount.value > 0 ? `喫煙 ${smokingRoomsCount.value}室` : ''}${smokingRoomsCount.value > 0 && nonSmokingRoomsCount.value > 0 ? ' / ' : ''}${nonSmokingRoomsCount.value > 0 ? `禁煙 ${nonSmokingRoomsCount.value}室` : ''}\n`;
    message += `部屋番号：\t${uniqueRoomNumbers}\n\n`;

    message += `🥡プラン：\t${weekdayPlanNamesList.value || '未設定'}\n`;
    if (weekendPlanNamesList.value) {
        message += `週末プラン：\t${weekendPlanNamesList.value}\n\n`;
    }
    message += `🚗駐車場：\t${parkingDetails.value}\n`;
    message += `💰清算方法：\t${paymentDetails}\n`;
    
    
    message += `🏢現場：\t${info.site_name || '未設定'}\n`;
    message += `📝備考：${info.comment || 'キャンセルポリシー説明済'}`;

    slackMessage.value = message;
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
    if (props.parking_reservations?.parking?.length > 0) {
        const uniqueSpots = new Set();
        props.parking_reservations.parking.forEach(p => {
            if (p.spot_number) {
                uniqueSpots.add(p.spot_number);
            }
        });
        parkingCount = uniqueSpots.size;
    }
    return parkingCount > 0 ? `${parkingCount}台` : '未設定';
});

const paymentDetailsDisplay = computed(() => {
    const info = props.reservationInfo;
    const totalOnSitePayment = calculateTotalOnSitePayment(props.reservation_payments);
    const translatedPaymentTiming = translatePaymentTiming(info.payment_timing);
    return info.payment_timing === 'on-site' ? `${translatedPaymentTiming} ${totalOnSitePayment > 0 ? `¥${totalOnSitePayment.toLocaleString()}` : ''}` : translatedPaymentTiming;
});

const translatedReservationType = computed(() => translateType(props.reservationInfo.type));

const roomDetailsForDisplay = computed(() => {
    const detailsByDate = {};

    if (props.groupedRooms && props.groupedRooms.length > 0) {
        props.groupedRooms.forEach(group => {
            group.details.forEach(detail => {
                const date = detail.date ? formatDate(new Date(detail.date)) : '未設定';
                const weekday = detail.date ? getJapaneseWeekday(detail.date) : '';
                if (!detailsByDate[date]) {
                    detailsByDate[date] = {
                        date: `${date} ${weekday ? `(${weekday})` : ''}`,
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