export const validatePhone = (phone) => {
  if (!phone) return true; // Allow empty phone numbers, as it's often optional.

  const digitsOnly = phone.replace(/\D/g, '');
  const len = digitsOnly.length;
  const startsWithZero = digitsOnly.startsWith('0');

  // Valid patterns for Japanese phone numbers:
  // - Starts with 0, total 10 or 11 digits.
  // - Doesn't start with 0, total 9 or 10 digits (implying leading 0 was omitted).
  const isValid = (startsWithZero && (len === 10 || len === 11)) || (!startsWithZero && (len === 9 || len === 10));

  return isValid;
};

export const validateEmail = (email) => {
  if (!email) return true; // Allow empty email addresses
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidDateString = (dateStr) => {
  // Only allow YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return true;
  }
  return false;
};
