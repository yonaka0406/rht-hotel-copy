export const translatePaymentTiming = (timing) => {
  switch (timing) {
      case 'not_set': return '未設定';
      case 'prepaid': return '事前決済';
      case 'on-site': return '現地決済';
      case 'postpaid': return '後払い';
      default: return '';
  }
};

export const paymentTimingOptions = [
    { label: '未設定', value: 'not_set' },
    { label: '事前決済', value: 'prepaid' },
    { label: '現地決済', value: 'on-site' },
    { label: '後払い', value: 'postpaid' },
];

export function translateStatus(status) {
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

export function translateType(type) {
    switch (type) {
        case 'default': return '通常予約';
        case 'employee': return '社員';
        case 'ota': return 'OTA';
        case 'web': return '自社ウェブ';
        default: return type;
    }
}
