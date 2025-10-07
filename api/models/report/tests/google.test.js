const assert = require('assert');

// --- Patch DB before requiring the model ---
const originalDatabaseModule = require('../../../config/database');

let mockQueryResult = { rows: [] };

const mockPool = {
  query: async (query, params) => {
    return mockQueryResult;
  },
  connect: async () => mockPool,
  release: () => {}
};

const mockGetPool = () => mockPool;

// Temporarily override the getPool function for testing
const originalGetPool = originalDatabaseModule.getPool;
originalDatabaseModule.getPool = mockGetPool;

// Now require the model (it will use the patched DB pool)
const { selectReservationsForGoogle, selectParkingReservationsForGoogle } = require('../google');

// Restore original getPool after tests
process.on('exit', () => {
  originalDatabaseModule.getPool = originalGetPool;
});

(async () => {
  console.log('Running google.js tests...');

  // Test selectReservationsForGoogle
  try {
    // Test case 1: NODE_ENV is not production or development
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    let result = await selectReservationsForGoogle('test-request', 1, '2023-01-01', '2023-01-31');
    assert.deepStrictEqual(result, [], 'selectReservationsForGoogle should return an empty array in test env');
    process.env.NODE_ENV = originalEnv;

    // Test case 2: Formatting client names
    process.env.NODE_ENV = 'development';
    mockQueryResult = {
      rows: [
        { client_name: '株式会社テスト' },
        { client_name: '合同会社テスト' },
        { client_name: '有限会社テスト' },
        { client_name: 'NPO法人テスト' },
        { client_name: null },
      ]
    };
    result = await selectReservationsForGoogle('test-request', 1, '2023-01-01', '2023-01-31');
    assert.strictEqual(result[0].client_name, '㈱テスト', 'selectReservationsForGoogle should format 株式会社');
    assert.strictEqual(result[1].client_name, '(同)テスト', 'selectReservationsForGoogle should format 合同会社');
    assert.strictEqual(result[2].client_name, '(有)テスト', 'selectReservationsForGoogle should format 有限会社');
    assert.strictEqual(result[3].client_name, '(NPO)テスト', 'selectReservationsForGoogle should format NPO法人');
    assert.strictEqual(result[4].client_name, null, 'selectReservationsForGoogle should handle null client_name');
    process.env.NODE_ENV = originalEnv;

    console.log('selectReservationsForGoogle tests passed.');
  } catch (error) {
    console.error('selectReservationsForGoogle tests failed:', error.message);
    process.exit(1);
  }

  // Test selectParkingReservationsForGoogle
  try {
    // Test case 1: NODE_ENV is not production or development
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    let result = await selectParkingReservationsForGoogle('test-request', 1, '2023-01-01', '2023-01-31');
    assert.deepStrictEqual(result, [], 'selectParkingReservationsForGoogle should return an empty array in test env');
    process.env.NODE_ENV = originalEnv;

    // Test case 2: Formatting client names
    process.env.NODE_ENV = 'development';
    mockQueryResult = {
      rows: [
        { client_name: '株式会社パーキング' },
        { client_name: '合同会社パーキング' },
        { client_name: '有限会社パーキング' },
        { client_name: '宗教法人パーキング' },
        { client_name: null },
      ]
    };
    result = await selectParkingReservationsForGoogle('test-request', 1, '2023-01-01', '2023-01-31');
    assert.strictEqual(result[0].client_name, '㈱パーキング', 'selectParkingReservationsForGoogle should format 株式会社');
    assert.strictEqual(result[1].client_name, '(同)パーキング', 'selectParkingReservationsForGoogle should format 合同会社');
    assert.strictEqual(result[2].client_name, '(有)パーキング', 'selectParkingReservationsForGoogle should format 有限会社');
    assert.strictEqual(result[3].client_name, '(宗)パーキング', 'selectParkingReservationsForGoogle should format 宗教法人');
    assert.strictEqual(result[4].client_name, null, 'selectParkingReservationsForGoogle should handle null client_name');
    process.env.NODE_ENV = originalEnv;

    console.log('selectParkingReservationsForGoogle tests passed.');
  } catch (error) {
    console.error('selectParkingReservationsForGoogle tests failed:', error.message);
    process.exit(1);
  }

  console.log('All google.js tests completed successfully.');
})();
