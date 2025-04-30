const logger = require("../utils/logger");

const authMiddleware = (req, res, next) => {
  if (!req.session.user) {
    logger.warn("Unauthorized access attempt");
    return res.status(401).json({ error: "لطفاً ابتدا وارد شوید" });
  }
  next();
};

module.exports = authMiddleware;
