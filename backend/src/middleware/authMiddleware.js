const logger = require("../utils/logger");

const authMiddleware = (req, res, next) => {
  if (!req.session.user) {
    logger.warn("Unauthorized access attempt");

    if (req.originalUrl.startsWith("/api")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return res.redirect("/");
  }
  next();
};

module.exports = authMiddleware;
