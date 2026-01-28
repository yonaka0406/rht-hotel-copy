export const formatCurrency = (value) => {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const formatNumber = (value, style) => {
  let thisValue = value;
  if (value === null || value === undefined) { // Handle null/undefined explicitly for consistency
    thisValue = 0;
  }
  if (style === 'currency') {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(thisValue);
  }
  if (style === 'decimal') {
    return new Intl.NumberFormat('ja-JP', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(thisValue);
  }
  // Default or throw error if style is not recognized
  return thisValue.toString();
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
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Pad with leading zero
  return `${year}年${month}月`;
};

// Format integer with comma separators
export const formatInteger = (value) => {
  if (value === null || value === undefined) return '0';
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString('ja-JP');
};