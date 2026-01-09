const { body } = require('express-validator');

const emailValidation = [
  body('email')
    .notEmpty().withMessage('メールアドレスが必要です。')
    .isEmail().withMessage('無効なメール形式です。')
    .normalizeEmail(),
];

const passwordLoginValidation = [
  body('password')
    .notEmpty().withMessage('パスワードが必要です。'),
];

// Strong password validation: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol
const strongPasswordValidation = [
  body('password')
    .notEmpty().withMessage('パスワードが必要です。')
    .isLength({ min: 8 }).withMessage('パスワードは少なくとも8文字である必要があります。')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]).*$/)
    .withMessage('パスワードには少なくとも8文字、大文字1文字、小文字1文字、数字1文字、および記号1文字を含める必要があります。'),
];

// Name validation (e.g., for registration)
const nameValidation = [
  body('name')
    .notEmpty().withMessage('名前が必要です。')
    .isString().withMessage('名前は文字列である必要があります。')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('名前は2文字から50文字の間である必要があります。'),
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
