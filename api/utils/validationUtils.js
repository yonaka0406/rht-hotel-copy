const { validate: uuidValidate } = require('uuid');
const { ValidationError } = require('./customErrors');

/**
 * Validates if the given ID string is a positive integer.
 *
 * @param {string} idString - The ID string to validate.
 * @param {string} paramName - The name of the parameter for error messages.
 * @returns {number} The validated numeric ID.
 * @throws {Error} If the ID is not a positive integer or is empty/null/undefined.
 */
function validateNumericParam(idString, paramName) {
  if (idString === undefined || idString === null || String(idString).trim() === '') {
    throw new ValidationError(`${paramName}は必須項目であり、空にすることはできません。`, 'MISSING_REQUIRED_PARAM');
  }
  const numericId = parseInt(idString, 10);
  if (isNaN(numericId) || numericId <= 0) {
    throw new ValidationError(`${paramName}の形式が正しくありません。正の整数である必要があります。入力された値: '${idString}'`, 'INVALID_NUMERIC_PARAM');
  }
  return numericId;
}

/**
 * Validates if the given string is a valid UUID.
 *
 * @param {string} uuidString - The string to validate.
 * @param {string} paramName - The name of the parameter for error messages.
 * @returns {string} The validated UUID string.
 * @throws {Error} If the string is not a valid UUID or is empty/null/undefined.
 */
function validateUuidParam(uuidString, paramName) {
  if (uuidString === undefined || uuidString === null || String(uuidString).trim() === '') {
    throw new ValidationError(`${paramName}は必須項目であり、空にすることはできません。`, 'MISSING_REQUIRED_PARAM');
  }
  if (!uuidValidate(String(uuidString))) {
    throw new ValidationError(`${paramName}の形式が正しくありません。有効なUUIDである必要があります。入力された値: '${uuidString}'`, 'INVALID_UUID_PARAM');
  }
  return String(uuidString);
}

/**
 * Validates if the given string is a valid date in YYYY-MM-DD format.
 *
 * @param {string} dateString - The string to validate.
 * @param {string} paramName - The name of the parameter for error messages.
 * @returns {string} The validated date string.
 * @throws {Error} If the string is not a valid date format or is empty/null/undefined.
 */
function validateDateStringParam(dateString, paramName) {
  if (dateString === undefined || dateString === null || String(dateString).trim() === '') {
    return null; // Return null for empty/undefined/null date strings
  }
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(String(dateString))) {
    return null; // Return null for invalid format
  }
  // Further check if it's a valid date (e.g., not 2023-02-30)
  const date = new Date(String(dateString));
  const [year, month, day] = String(dateString).split('-').map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return null; // Return null for non-real calendar dates
  }
  return String(dateString);
}

/**
 * Validates if the given string is not empty or just whitespace.
 *
 * @param {string} str - The string to validate.
 * @param {string} paramName - The name of the parameter for error messages.
 * @returns {string} The validated (trimmed) string.
 * @throws {Error} If the string is empty/null/undefined or only whitespace.
 */
function validateNonEmptyStringParam(str, paramName) {
  if (str === undefined || str === null || String(str).trim() === '') {
    throw new ValidationError(`${paramName}は必須項目であり、空にすることはできません。`, 'MISSING_REQUIRED_PARAM');
  }
  return String(str).trim();
}

/**
 * Validates if the given string is a valid integer (positive, negative, or zero).
 *
 * @param {string} intString - The string to validate.
 * @param {string} paramName - The name of the parameter for error messages.
 * @returns {number} The validated integer.
 * @throws {Error} If the string is not a valid integer or is empty/null/undefined.
 */
function validateIntegerParam(intString, paramName) {
  if (intString === undefined || intString === null || String(intString).trim() === '') {
    throw new ValidationError(`${paramName}は必須項目であり、空にすることはできません。`, 'MISSING_REQUIRED_PARAM');
  }
  const numericInt = parseInt(intString, 10);
  if (isNaN(numericInt)) {
    throw new ValidationError(`${paramName}の形式が正しくありません。整数である必要があります。入力された値: '${intString}'`, 'INVALID_INTEGER_PARAM');
  }
  // Ensure it's a finite number, helps catch things like '1.2.3' which parseInt might partially parse then isNaN is false
  if (!isFinite(numericInt)) {
    throw new ValidationError(`${paramName}の形式が正しくありません。有限な整数である必要があります。入力された値: '${intString}'`, 'INVALID_INTEGER_PARAM');
  }
  // Check if the original string, when parsed, is the same as the number.
  // This helps catch cases like "123xyz" which parseInt would turn into 123.
  // Or "1.5" which parseInt would turn to 1. We need strict integer check.
  // A stricter check for non-decimal strings:
  if (!/^-?\d+$/.test(String(intString).trim())) {
    throw new ValidationError(`${paramName}の形式が正しくありません。整数（小数点なし）である必要があります。入力された値: '${intString}'`, 'INVALID_INTEGER_PARAM');
  }
  // The regex check above makes the String(numericInt) !== String(intString).trim() check somewhat redundant
  // for already-trimmed valid integer strings, but it's a good safeguard.
  // If `intString` was "1 " and `numericInt` is 1, `String(numericInt)` is "1" and `String(intString).trim()` is "1". They match.
  // If `intString` was "1.0", regex fails. If `intString` was "1.5", regex fails.
  // If `intString` was "1abc", regex fails.

  return numericInt;
}

/**
 * Validates if the given string is a plausible email format.
 * Note: This is a basic check. True email validation requires sending a confirmation link.
 *
 * @param {string} emailString - The string to validate.
 * @param {string} paramName - The name of the parameter for error messages.
 * @returns {string} The validated email string.
 * @throws {Error} If the string is not a plausible email format or is empty/null/undefined.
 */
function validateEmailFormat(emailString, paramName) {
  if (emailString === undefined || emailString === null || String(emailString).trim() === '') {
    throw new ValidationError(`${paramName}は必須項目であり、空にすることはできません。`, 'MISSING_REQUIRED_PARAM');
  }
  const email = String(emailString).trim();
  // Basic regex for email format. More comprehensive regexes exist but can be overly complex.
  // This one checks for something@something.something
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(`${paramName}の形式が正しくありません。有効なメールアドレスを入力してください。入力された値: '${emailString}'`, 'INVALID_EMAIL_FORMAT');
  }
  return email;
}

/**
 * Validates if the given string is a plausible Japanese phone number format.
 * It allows for numbers with or without the leading '0'.
 *
 * @param {string} phoneString - The string to validate.
 * @param {string} paramName - The name of the parameter for error messages.
 * @returns {string} The validated phone number string (trimmed).
 * @throws {Error} If the string is not a valid Japanese phone number format or is empty/null/undefined.
 */
function validatePhoneNumberFormat(phoneString, paramName) {
  if (phoneString === undefined || phoneString === null || String(phoneString).trim() === '') {
    throw new ValidationError(`${paramName}は必須項目であり、空にすることはできません。`, 'MISSING_REQUIRED_PARAM');
  }

  const phone = String(phoneString).trim();

  // Remove all non-digit characters to validate the core number.
  const digitsOnly = phone.replace(/\D/g, '');
  const len = digitsOnly.length;
  const startsWithZero = digitsOnly.startsWith('0');

  // Valid patterns for Japanese phone numbers:
  // - Starts with 0, total 10 or 11 digits.
  // - Doesn't start with 0, total 8, 9 or 10 digits (implying leading 0 was omitted or short number).
  const isValid = (startsWithZero && (len === 10 || len === 11)) || (!startsWithZero && (len >= 8 && len <= 10));

  if (!isValid) {
    throw new ValidationError(`${paramName}の形式が正しくありません。有効な8〜11桁の日本の電話番号を入力してください。入力された値: '${phoneString}'`, 'INVALID_PHONE');
  }

  // Return the original, trimmed string to preserve user-entered formatting (e.g., hyphens).
  return phone;
}

module.exports = {
  validateNumericParam,
  validateUuidParam,
  validateDateStringParam,
  validateNonEmptyStringParam,
  validateIntegerParam,
  validateEmailFormat,
  validatePhoneNumberFormat,
};
