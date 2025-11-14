module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  // Setup files to run before each test file
  setupFiles: ['dotenv/config'],
};