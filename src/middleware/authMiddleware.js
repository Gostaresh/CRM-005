const logger = require("../utils/logger");

const authMiddleware = (req, res, next) => {
  if (!req.session.user) {
    logger.warn("Unauthorized access attempt");
    return res.redirect("/"); // Redirect to login page instead of JSON response
  }
  next();
};

module.exports = authMiddleware;
