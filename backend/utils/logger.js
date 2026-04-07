const winston = require('winston');
const path = require('path');
const { appConfig } = require('../config');

// Define log levels and colors
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'cyan',
  },
};

winston.addColors(logLevels.colors);

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]${metaStr}: ${message}${stack ? '\n' + stack : ''}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  // Default to `warn` to keep terminal output focused on actionable issues.
  level: appConfig.logLevel,
  levels: logLevels.levels,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Stream object for Morgan HTTP logging
const stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = {
  logger,
  stream,
};
