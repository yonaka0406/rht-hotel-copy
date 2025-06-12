const Redis = require('ioredis');

const redisDB = process.env.NODE_ENV === 'production' ? 0 : 1;

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  db: redisDB
});

module.exports = redis;