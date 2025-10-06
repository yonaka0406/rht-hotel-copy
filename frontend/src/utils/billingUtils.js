export function translateInvoiceStatus(status) {
    switch (status) {
        case 'draft': return '下書き';
        case 'sent': return '送信済み';
        case 'paid': return '支払い済み';
        case 'cancelled': return 'キャンセル';
        default: return status;
    }
}
