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
  if (value === null || value === undefined || Number.isNaN(value)) return '- 円';
  return parseFloat(value).toLocaleString('ja-JP') + ' 円';
};

// Format value as percentage
export const formatPercentage = (value) => {
  if (value === null || value === undefined) return '-';
  return parseFloat(value).toLocaleString('ja-JP', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Format Yen in 万円 (10,000s) with decimals
export const formatYenInTenThousands = (value) => {
  if (value === null || value === undefined) return '-';
  const valueInMan = value / 10000;
  return valueInMan.toLocaleString('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }) + '万円';
};

// Format Yen in 万円 (10,000s) without decimals
export const formatYenInTenThousandsNoDecimal = (value) => {
  if (value === null || value === undefined) return '-';
  const valueInMan = value / 10000;
  return valueInMan.toLocaleString('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }) + '万円';
};