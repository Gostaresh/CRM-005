const logger = require("../utils/logger");

const errorMiddleware = (err, req, res, next) => {
  logger.error(`Error: ${err.message}, Stack: ${err.stack}`);
  res.status(500).json({
    error: "خطا در سرور",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};

module.exports = errorMiddleware;
