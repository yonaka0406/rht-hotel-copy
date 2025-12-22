export function translatePlanType(planType) {
    switch (planType) {
        case 'per_person': return '人あたり';
        case 'per_room': return '一部屋あたり';
        default: return planType;
    }
}

export function translateAdjustmentType(adjustmentType) {
    switch (adjustmentType) {
        case 'base_rate': return '基本料金';
        case 'percentage': return 'パーセント';
        case 'flat_fee': return '定額料金';
        default: return adjustmentType;
    }
}

export function translateConditionType(conditionType) {
    switch (conditionType) {
        case 'no_restriction': return '制限なし';
        case 'day_of_week': return '曜日';
        case 'month': return '月';
        default: return conditionType;
    }
}

export const adjustmentTypes = [
    { label: '基本料金', value: 'base_rate' },
    { label: 'パーセント', value: 'percentage' },
    { label: '定額料金', value: 'flat_fee' },
];

export const conditionTypes = [
    { label: '条件なし', value: 'no_restriction' },
    { label: '曜日毎', value: 'day_of_week' },
    { label: '月毎', value: 'month' },
];