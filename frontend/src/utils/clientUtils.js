export function translateLegalOrNaturalPerson(personType) {
    switch (personType) {
        case 'legal': return '法人';
        case 'natural': return '個人';
        default: return personType;
    }
}

export function translateGender(gender) {
    switch (gender) {
        case 'male': return '男性';
        case 'female': return '女性';
        case 'other': return 'その他';
        default: return gender;
    }
}

export function translateBillingPreference(preference) {
    switch (preference) {
        case 'paper': return '紙請求';
        case 'digital': return '電子請求';
        default: return preference;
    }
}

export function translateLoyaltyTier(tier) {
    switch (tier) {
        case 'prospect': return '見込み';
        case 'newbie': return '新規';
        case 'brand_loyal': return 'ブランドロイヤル';
        case 'hotel_loyal': return 'ホテルロイヤル';
        case 'repeater': return 'リピーター';
        default: return tier;
    }
}

export function translateImpedimentType(type) {
    switch (type) {
        case 'payment': return '支払い';
        case 'behavioral': return '行動';
        case 'other': return 'その他';
        default: return type;
    }
}

export function translateRestrictionLevel(level) {
    switch (level) {
        case 'warning': return '警告';
        case 'block': return 'ブロック';
        default: return level;
    }
}

export function translateCrmActionType(type) {
    switch (type) {
        case 'visit': return '訪問';
        case 'call': return '電話';
        case 'email': return 'Eメール';
        case 'meeting': return '会議';
        case 'task': return 'タスク';
        case 'note': return 'メモ';
        case 'other': return 'その他';
        default: return type;
    }
}

export function translateCrmActionStatus(status) {
    switch (status) {
        case 'pending': return '保留中';
        case 'scheduled': return '予定';
        case 'completed': return '完了';
        case 'cancelled': return 'キャンセル';
        case 'rescheduled': return '再スケジュール';
        default: return status;
    }
}
