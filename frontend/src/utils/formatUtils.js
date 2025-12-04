export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Reporting-specific currency formatter with custom null handling
export const formatCurrencyForReporting = (value) => {
  if (value === null || value === undefined) return '- 円';
  const n = parseFloat(value);
  if (Number.isNaN(n)) return '- 円';
  return n.toLocaleString('ja-JP') + ' 円';
};

// Format value as percentage
// Expects a fractional value (e.g., 0.5 -> 50%, 0.1234 -> 12.34%)
export const formatPercentage = (value) => {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  return num.toLocaleString('ja-JP', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Format Yen in 万円 (10,000s) with decimals
export const formatYenInTenThousands = (value) => {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  const valueInMan = num / 10000;
  return valueInMan.toLocaleString('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }) + '万円';
};

// Format Yen in 万円 (10,000s) without decimals
export const formatYenInTenThousandsNoDecimal = (value) => {
  if (value === null || value === undefined) return '-';
  const num = Number(value);
  if (!Number.isFinite(num)) return '-';
  const valueInMan = num / 10000;
  return valueInMan.toLocaleString('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }) + '万円';
};

// Format month string (e.g., "YYYY-MM" or ISO date string) to Japanese (YYYY年MM月)
export const formatMonth = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // getMonth() is 0-indexed
  return `${year}年${month}月`;
};
