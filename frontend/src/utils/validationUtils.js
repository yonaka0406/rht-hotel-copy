/**
 * Validates Japanese phone number format.
 * @param {string} phone 
 * @returns {boolean}
 */
export const validatePhone = (phone) => {
  if (!phone) return true; // Allow empty phone numbers, as it's often optional.

  const digitsOnly = phone.replace(/\D/g, '');
  const len = digitsOnly.length;
  const startsWithZero = digitsOnly.startsWith('0');

  // デバッグログを追加
  console.log('--- Phone Validation Debug ---');
  console.log('Original phone:', phone);
  console.log('Digits only:', digitsOnly);
  console.log('Length:', len);
  console.log('Starts with zero:', startsWithZero);

  // Same logic as backend:
  // Starts with 0 -> 10 or 11 digits
  // Doesn't start with 0 -> 8 to 10 digits
  const isValid = (startsWithZero && (len === 10 || len === 11)) || (!startsWithZero && (len >= 8 && len <= 10));

  console.log('Is valid:', isValid);
  console.log('----------------------------');

  return isValid;
};

/**
 * Validates email format.
 * @param {string} email 
 * @returns {boolean}
 */
export const validateEmail = (email) => {
  if (!email) return true; // Allow empty email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates that at least one contact method is provided.
 * @param {string} email 
 * @param {string} phone 
 * @returns {boolean}
 */
export const hasContactInfo = (email, phone) => {
  return !!(email && email.trim()) || !!(phone && phone.trim());
};

/**
 * Validates that customer_id is numeric.
 * @param {string|number} customerId 
 * @returns {boolean}
 */
export const validateCustomerId = (customerId) => {
  if (customerId === null || customerId === undefined || customerId === '') return true;
  return /^\d+$/.test(String(customerId));
};

export const isValidDateString = (dateStr) => {
  // Only allow YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return true;
  }
  return false;
};
