// api/__mocks__/ioredis.js

const IORedisMock = jest.fn().mockImplementation(() => {
  const store = new Map();
  // console.log('[IORedisMock] Instance created');

  const instance = {
    get: jest.fn((key) => {
      // console.log(`[IORedisMock] GET ${key}`);
      return Promise.resolve(store.get(key) || null);
    }),
    set: jest.fn((key, value, ...args) => {
      // console.log(`[IORedisMock] SET ${key} ${value} ${args}`);
      store.set(key, value);
      // Handle EX, PX, KEEPTTL options if necessary for your tests
      if (args.includes('EX')) {
        const ttl = parseInt(args[args.indexOf('EX') + 1], 10);
        if (ttl > 0) {
          // Simple TTL simulation: remove after timeout (not perfect for real TTL tests)
          setTimeout(() => store.delete(key), ttl * 1000);
        }
      }
      return Promise.resolve('OK');
    }),
    del: jest.fn((key) => {
      // console.log(`[IORedisMock] DEL ${key}`);
      const hadKey = store.has(key);
      store.delete(key);
      return Promise.resolve(hadKey ? 1 : 0);
    }),
    on: jest.fn((event, handler) => {
      // console.log(`[IORedisMock] ON ${event}`);
      if (event === 'connect') {
        // Immediately call handler to simulate connection
        handler();
      }
      // Return the instance to allow chaining, e.g., redis.on(...).on(...)
      return instance;
    }),
    connect: jest.fn(() => {
      // console.log('[IORedisMock] CONNECT called');
      // Simulate the 'connect' event emission
      const connectHandler = instance.on.mock.calls.find(call => call[0] === 'connect');
      if (connectHandler && connectHandler[1]) {
        connectHandler[1]();
      }
      return Promise.resolve();
    }),
    disconnect: jest.fn(() => {
      // console.log('[IORedisMock] DISCONNECT called');
      return Promise.resolve();
    }),
    quit: jest.fn(() => {
        // console.log('[IORedisMock] QUIT called');
        return Promise.resolve('OK');
    }),
    // Add any other methods your application uses
    // For example, if you use lists, hashes, etc.
    // lpush: jest.fn().mockResolvedValue(0),
    // hgetall: jest.fn().mockResolvedValue({}),
  };

  // Automatically call the connect event handler if it's registered
  // This ensures that any logic waiting for 'connect' event proceeds
  // Needs to be deferred slightly to ensure `on` has been called in the application code
  process.nextTick(() => {
    const connectCall = instance.on.mock.calls.find(call => call[0] === 'connect');
    if (connectCall && connectCall[1]) {
        // console.log('[IORedisMock] Simulating connect event for registered handler');
        connectCall[1]();
    }
  });


  return instance;
});

module.exports = IORedisMock;
