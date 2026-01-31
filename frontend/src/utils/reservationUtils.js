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

export const formatClientName = (name) => {
    if (!name) return '';

    const replacements = {
      '株式会社': '㈱',
      '合同会社': '(同)',
      '有限会社': '(有)',
      '合名会社': '(名)',
      '合資会社': '(資)',
      '一般社団法人': '(一社)',
      '一般財団法人': '(一財)',
      '公益社団法人': '(公社)',
      '公益財団法人': '(公財)',
      '学校法人': '(学)',
      '医療法人': '(医)',
      '社会福祉法人': '(福)',
      '特定非営利活動法人': '(特非)',
      'NPO法人': '(NPO)',
      '宗教法人': '(宗)'
    };

    let result = name;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }
    return result;
  };

export const CANCELLED_CLIENT_ID = '11111111-1111-1111-1111-111111111111';
export const SPECIAL_BLOCK_CLIENT_ID = '22222222-2222-2222-2222-222222222222';