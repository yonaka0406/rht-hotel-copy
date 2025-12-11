export const reservationPaymentTimingOptions = [
    { label: '未設定', value: 'not_set' },
    { label: '事前決済', value: 'prepaid' },
    { label: '現地決済', value: 'on-site' },
    { label: '後払い', value: 'postpaid' },
];

export function translateReservationPaymentTiming(timing) {
    const option = reservationPaymentTimingOptions.find(opt => opt.value === timing);
    return option ? option.label : timing;
}

export const reservationStatusOptions = [
    { label: '保留中', value: 'hold' },
    { label: '仮予約', value: 'provisory' },
    { label: '確定', value: 'confirmed' },
    { label: 'チェックイン', value: 'checked_in' },
    { label: 'チェックアウト', value: 'checked_out' },
    { label: 'キャンセル', value: 'cancelled' },
    { label: '予約不可', value: 'block' },
];

export function translateReservationStatus(status) {
    switch (status) {
        case 'hold': return '保留中';
        case 'provisory': return '仮予約';
        case 'confirmed': return '確定';
        case 'checked_in': return 'チェックイン';
        case 'checked_out': return 'チェックアウト';
        case 'cancelled': return 'キャンセル';
        case 'block': return '予約不可';
        default: return status;
    }
}

export const reservationTypeOptions = [
    { label: '通常予約', value: 'default' },
    { label: '社員', value: 'employee' },
    { label: 'OTA', value: 'ota' },
    { label: '自社WEB', value: 'web' },
];

export function translateReservationType(type) {
    const option = reservationTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
}
