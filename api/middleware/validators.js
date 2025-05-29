const { body } = require('express-validator');

const emailValidation = [
  body('email')
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Invalid email format.')
    .normalizeEmail(),
];

const passwordLoginValidation = [
  body('password')
    .notEmpty().withMessage('Password is required.'),
];

// Strong password validation: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol
const strongPasswordValidation = [
  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]).*$/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'),
];

// Name validation (e.g., for registration)
const nameValidation = [
  body('name')
    .notEmpty().withMessage('Name is required.')
    .isString().withMessage('Name must be a string.')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters.'),
];

// Validation for just the password field when it's being reset (uses strong password rules)
const passwordResetValidation = [
  ...strongPasswordValidation // Re-use the strong password rules
];


module.exports = {
  emailValidation,
  passwordLoginValidation,
  strongPasswordValidation,
  nameValidation,
  passwordResetValidation,
};
