const winston = require("winston");

const logger = winston.createLogger({
  level: "debug", // Capture all levels (debug and above)
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    // Info and Debug logs to info.log
    new winston.transports.File({
      filename: "info.log",
      level: "info",
      filter: (info) => ["info", "debug"].includes(info.level),
    }),
    // Error and Warn logs to error.log
    new winston.transports.File({
      filename: "error.log",
      level: "error",
      filter: (info) => ["error", "warn"].includes(info.level),
    }),
    // All logs to console
    new winston.transports.Console(),
  ],
});

module.exports = logger;
