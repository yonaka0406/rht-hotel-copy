// ASSUMPTIONS:
// 1. Jest is used as the test runner (npm install --save-dev jest supertest)
// 2. Supertest is used for making HTTP requests (npm install --save-dev supertest)
// 3. A test database is configured and accessible. Environment variables for it might be needed.
//    (e.g., TEST_DATABASE_URL or specific TEST_DB_USER, TEST_DB_HOST, etc.)
// 4. This file would be run by a command like "jest" or "npm test" if package.json is updated.
// 5. Database helper functions (like getDbPool) might need to be created or imported.
//    For this example, we'll assume a simple pool import from a hypothetical db-test-helpers.js

const request = require('supertest');
const app = require('../index'); // Assuming your Express app is exported from api/index.js
const { Pool } = require('pg'); // Direct pg usage

// Database connection details - replace with your actual test DB config
// It's better to use environment variables for this
const TEST_DB_CONFIG = {
  user: process.env.TEST_DB_USER || 'your_test_db_user',
  host: process.env.TEST_DB_HOST || 'localhost',
  database: process.env.TEST_DB_NAME || 'your_test_db_name',
  password: process.env.TEST_DB_PASSWORD || 'your_test_db_password',
  port: process.env.TEST_DB_PORT || 5432,
};

let pool;

// Helper function to get a user by email for cleanup or checks
const findTestUserByEmail = async (email) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
};

// Helper function to delete a user by email
const deleteTestUserByEmail = async (email) => {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
};

describe('Auth API - Google Linked Account Login', () => {
  let testUser;
  const testUserEmail = 'googleuser-test@example.com';
  const testUserPassword = 'fakepassword123'; // Not used for auth, but for the request

  beforeAll(async () => {
    // Initialize the test database pool
    // In a real setup, you might have a dedicated test DB setup script
    pool = new Pool(TEST_DB_CONFIG);
    try {
      await pool.connect();
    } catch (err) {
      console.error('Failed to connect to the test database', err);
      // Throwing error here will stop tests if DB connection fails
      throw new Error('Test database connection failed. Ensure test DB is running and configured.');
    }
    // Clean up any existing test user with the same email before starting
    await deleteTestUserByEmail(testUserEmail);
  });

  beforeEach(async () => {
    // Create a Google-linked user directly in the database
    // Ensure role_id exists in your roles table (e.g., 5 for 'user')
    // Ensure status_id exists in your statuses table (e.g., 1 for 'active')
    // provider_user_id should be unique if you have constraints
    const googleProviderId = `testgoogleid-${Date.now()}`;
    try {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, role_id, status_id, auth_provider, provider_user_id, created_at, updated_at, name)
         VALUES ($1, NULL, $2, $3, 'google', $4, NOW(), NOW(), $5) RETURNING *`,
        [testUserEmail, 5, 1, googleProviderId, 'Test Google User'] // Assuming role_id 5 and status_id 1
      );
      testUser = result.rows[0];
      if (!testUser) {
        throw new Error('Test user creation failed in beforeEach.');
      }
    } catch (dbError) {
      console.error('Error creating test user:', dbError);
      throw dbError; // Fail the test if user creation fails
    }
  });

  afterEach(async () => {
    // Clean up the created user
    if (testUserEmail) {
      try {
        await deleteTestUserByEmail(testUserEmail);
      } catch (dbError) {
        console.error('Error deleting test user in afterEach:', dbError);
        // Don't throw here to allow other tests to run, but log it.
      }
    }
    testUser = null;
  });

  afterAll(async () => {
    // Close the database connection pool
    if (pool) {
      await pool.end();
    }
  });

  it('should return 403 error when Google-linked user tries password login', async () => {
    if (!app) {
        throw new Error('Express app not loaded. Check api/index.js export.');
    }
    if (!testUser) {
        throw new Error('Test user was not set up correctly in beforeEach.');
    }

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUserEmail,
        password: testUserPassword, // Any password, as it shouldn't be checked
      })
      .set('Accept', 'application/json');

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe("このアカウントはGoogleで登録されています。Googleログインをご利用ください。");
  });

  // Add other auth tests here if needed
});
