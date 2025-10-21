const { validate: uuidValidate } = require('uuid');

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
    throw new Error(`${paramName} is required and cannot be empty.`);
  }
  const numericId = parseInt(idString, 10);
  if (isNaN(numericId) || numericId <= 0) {
    throw new Error(`Invalid ${paramName} format. Must be a positive integer. Received: '${idString}'`);
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
    throw new Error(`${paramName} is required and cannot be empty.`);
  }
  if (!uuidValidate(String(uuidString))) {
    throw new Error(`Invalid ${paramName} format. Must be a valid UUID. Received: '${uuidString}'`);
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
    throw new Error(`${paramName} is required and cannot be empty or just whitespace.`);
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
    throw new Error(`${paramName} is required and cannot be empty.`);
  }
  const numericInt = parseInt(intString, 10);
  if (isNaN(numericInt)) {
    throw new Error(`Invalid ${paramName} format. Must be an integer. Received: '${intString}'`);
  }
  // Ensure it's a finite number, helps catch things like '1.2.3' which parseInt might partially parse then isNaN is false
  if (!isFinite(numericInt)) { 
    throw new Error(`Invalid ${paramName} format. Must be a finite integer. Received: '${intString}'`);
  }
  // Check if the original string, when parsed, is the same as the number.
  // This helps catch cases like "123xyz" which parseInt would turn into 123.
  // Or "1.5" which parseInt would turn to 1. We need strict integer check.
  // A stricter check for non-decimal strings:
  if (!/^-?\d+$/.test(String(intString).trim())) {
      throw new Error(`Invalid ${paramName} format. Must be a whole integer (no decimals). Received: '${intString}'`);
  }
  // The regex check above makes the String(numericInt) !== String(intString).trim() check somewhat redundant
  // for already-trimmed valid integer strings, but it's a good safeguard.
  // If `intString` was "1 " and `numericInt` is 1, `String(numericInt)` is "1" and `String(intString).trim()` is "1". They match.
  // If `intString` was "1.0", regex fails. If `intString` was "1.5", regex fails.
  // If `intString` was "1abc", regex fails.

  return numericInt;
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
    // Allow empty if email is optional, otherwise make it required via validateNonEmptyStringParam first
    // For now, let's assume if called, it's expected to be a valid email or handled as an error by this fn.
    // If an email field is optional, the caller should check for presence before calling this.
    // Alternatively, this function could return null/undefined for empty strings if that's desired.
    throw new Error(`${paramName} is required and cannot be empty if provided for validation.`);
  }
  const email = String(emailString).trim();
  // Basic regex for email format. More comprehensive regexes exist but can be overly complex.
  // This one checks for something@something.something
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`Invalid ${paramName} format. Must be a valid email address. Received: '${emailString}'`);
  }
  return email;
}

/**
 * Validates if the given string is a plausible phone number format.
 * This is a very basic check (e.g., mostly digits, optional +, -, spaces).
 * Specific country code validation or length is not performed here.
 *
 * @param {string} phoneString - The string to validate.
 * @param {string} paramName - The name of the parameter for error messages.
 * @returns {string} The validated phone number string (trimmed).
 * @throws {Error} If the string is not a plausible phone number format or is empty/null/undefined.
 */
function validatePhoneNumberFormat(phoneString, paramName) {
  if (phoneString === undefined || phoneString === null || String(phoneString).trim() === '') {
    // Similar to email, if phone is optional, caller should check.
    // If called, it's expected to be a valid phone number.
    throw new Error(`${paramName} is required and cannot be empty if provided for validation.`);
  }
  const phone = String(phoneString).trim();
  // Basic regex for phone numbers: allows digits, spaces, hyphens, parentheses, and an optional leading +
  // Does not enforce specific lengths or structures.
  const phoneRegex = /^[+]?[\d\s()-]+$/;
  // A stricter version that requires at least a few digits: /^[+]?[\d\s()-]{7,}$/ for min 7 chars.
  // For simplicity, we'll use a lenient one.
  if (!phoneRegex.test(phone)) {
    throw new Error(`Invalid ${paramName} format. Contains invalid characters for a phone number. Received: '${phoneString}'`);
  }
  // Optionally, one might want to strip non-digits for storage or further validation:
  // const digitsOnly = phone.replace(/\D/g, '');
  // if (digitsOnly.length < 7 || digitsOnly.length > 15) { // Example length check
  //   throw new Error(`Invalid ${paramName} length. Must be between 7 and 15 digits. Received: '${phoneString}'`);
  // }
  return phone;
}
