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
    throw new Error(`${paramName} is required and cannot be empty.`);
  }
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(String(dateString))) {
    throw new Error(`Invalid ${paramName} format. Must be YYYY-MM-DD. Received: '${dateString}'`);
  }
  // Further check if it's a valid date (e.g., not 2023-02-30)
  const date = new Date(String(dateString));
  const [year, month, day] = String(dateString).split('-').map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    throw new Error(`Invalid ${paramName} value. Date is not a real calendar date. Received: '${dateString}'`);
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
};
