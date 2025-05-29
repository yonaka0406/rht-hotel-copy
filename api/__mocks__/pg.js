// api/__mocks__/pg.js
const 실제pg = jest.requireActual('pg');

const mockClient = {
  query: jest.fn((queryText, paramsOrCallback, callback) => {
    // console.log('[PG_MOCK_CLIENT] query:', queryText);
    if (typeof paramsOrCallback === 'function') {
      callback = paramsOrCallback;
    }
    if (queryText.startsWith('LISTEN')) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (callback) {
      callback(null, { rows: [], rowCount: 0 });
      return undefined; // For callback style
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  }),
  on: jest.fn((event, cb) => {
    // console.log(`[PG_MOCK_CLIENT] ON event: ${event}`);
    if (event === 'notification') {
      // You could simulate a notification if needed for a specific test
      // cb({ channel: 'test_channel', payload: 'test_payload' });
    }
    if (event === 'error') {
        // cb(new Error('Mock PG Client Error')); // Optionally simulate an error
    }
    return mockClient; // Allow chaining
  }),
  release: jest.fn(() => {
    // console.log('[PG_MOCK_CLIENT] released');
  }),
  connect: jest.fn(() => {
    // console.log('[PG_MOCK_CLIENT] connected');
    return Promise.resolve();
  }),
  end: jest.fn(() => {
    // console.log('[PG_MOCK_CLIENT] ended');
    return Promise.resolve();
  }),
};

const mockPool = {
  connect: jest.fn(() => {
    // console.log('[PG_MOCK_POOL] connect called');
    return Promise.resolve(mockClient);
  }),
  query: jest.fn((queryText, paramsOrCallback, callback) => {
    // console.log('[PG_MOCK_POOL] query:', queryText);
     if (typeof paramsOrCallback === 'function') {
      callback = paramsOrCallback;
    }
    if (callback) {
      callback(null, { rows: [], rowCount: 0 });
      return undefined; // For callback style
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  }),
  on: jest.fn((event, cb) => {
    // console.log(`[PG_MOCK_POOL] ON event: ${event}`);
    if (event === 'error') {
        // cb(new Error('Mock PG Pool Error')); // Optionally simulate an error
    }
    if (event === 'connect') {
        // cb(mockClient); // Simulate successful connection with a client
    }
  }),
  end: jest.fn(() => {
    // console.log('[PG_MOCK_POOL] ended');
    return Promise.resolve();
  }),
  // Add any other methods your application's Pool instance uses
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0,
};

// Mock the Pool constructor
const Pool = jest.fn().mockImplementation(() => {
  // console.log('[PG_MOCK] New Pool instance created');
  return mockPool;
});

// Mock the Client constructor (if used directly)
const Client = jest.fn().mockImplementation(() => {
  // console.log('[PG_MOCK] New Client instance created');
  return mockClient;
});

module.exports = {
  Pool,
  Client,
  // Export any other specific things from 'pg' that your app might use directly
  // For example, if you use types:
  // types: 실제pg.types 
};
