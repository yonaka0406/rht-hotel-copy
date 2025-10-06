export function translateWaitlistStatus(status) {
    switch (status) {
        case 'waiting': return '待機中';
        case 'notified': return '通知済み';
        case 'confirmed': return '確定';
        case 'expired': return '期限切れ';
        case 'cancelled': return 'キャンセル';
        default: return status;
    }
}

export function translateCommunicationPreference(preference) {
    switch (preference) {
        case 'email': return 'Eメール';
        case 'phone': return '電話';
        default: return preference;
    }
}

export function translateSmokingPreference(preference) {
    switch (preference) {
        case 'any': return '指定なし';
        case 'smoking': return '喫煙';
        case 'non_smoking': return '禁煙';
        default: return preference;
    }
}
