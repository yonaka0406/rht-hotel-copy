const assert = require('assert');
const { sanitizeName } = require('../../models/reservations');

function runTests() {
  console.log('Running sanitizeName tests...');
  let passed = 0;
  let failed = 0;

  function test(description, testFn) {
    try {
      testFn();
      console.log(`✅ ${description}`);
      passed++;
    } catch (error) {
      console.error(`❌ ${description}`);
      console.error(`   ${error.message}`);
      failed++;
    }
  }

  // Test cases
  test('should remove text in 【】 brackets', () => {
    const input = 'Iwashita Atsushi【seisanfuyou】';
    const expected = 'Iwashita Atsushi';
    assert.strictEqual(sanitizeName(input), expected);
  });

  test('should handle multiple brackets', () => {
    const input = 'Iwashita Atsushi【seisanfuyou】【test】';
    const expected = 'Iwashita Atsushi';
    assert.strictEqual(sanitizeName(input), expected);
  });

  test('should handle empty string', () => {
    assert.strictEqual(sanitizeName(''), '');
  });

  test('should handle null or undefined', () => {
    assert.strictEqual(sanitizeName(null), '');
    assert.strictEqual(sanitizeName(undefined), '');
  });

  test('should handle string with only brackets', () => {
    assert.strictEqual(sanitizeName('【seisanfuyou】'), '');
  });

  test('should handle string with multiple brackets and text', () => {
    const input = 'Iwashita【seisanfuyou】Atsushi';
    const expected = 'Iwashita Atsushi';
    assert.strictEqual(sanitizeName(input), expected);
  });

  test('should handle real-world example', () => {
    const input = 'Iwashita Atsushi【seisanfuyou】';
    const expected = 'Iwashita Atsushi';
    assert.strictEqual(sanitizeName(input), expected);
  });

  // Summary
  console.log('\nTest Summary:');
  console.log(`✅ ${passed} tests passed`);
  if (failed > 0) {
    console.error(`❌ ${failed} tests failed`);
    process.exit(1);
  } else {
    console.log('All tests passed!');
  }
}

// Run the tests
runTests();
