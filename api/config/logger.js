const winston = require('winston');

const { combine, timestamp, printf, json } = winston.format;

const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} ${level}: ${stack || message} ${metaString}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: process.env.NODE_ENV === 'production' ?
    combine(
      timestamp(),
      json()
    ) :
    combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.colorize(),
      devFormat
    ),
  transports: [
    new winston.transports.Console()
  ],
});

module.exports = logger;
