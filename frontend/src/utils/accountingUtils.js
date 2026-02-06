/**
 * Accounting utility functions
 */

export const getUtilityUnit = (subAccount) => {
    if (!subAccount) return '-';
    const name = subAccount.toLowerCase();
    if (name.includes('電気')) return 'kWh';
    if (name.includes('水道')) return 'm3';
    if (name.includes('ガス')) return 'm3';
    if (name.includes('灯油') || name.includes('重油')) return 'L';
    return '-';
};
