const express = require("express");
const { buildTree } = require("../../services/menuService");
const authMiddleware = require("../../middleware/authMiddleware");
const logger = require("../../utils/logger");

const router = express.Router();
router.use(authMiddleware);

router.get("/menus", async (_req, res) => {
  try {
    const tree = await buildTree();
    res.json(tree);
  } catch (e) {
    logger.error("menuRoutes: " + e.message);
    res.status(500).json({ error: "menu_fetch_failed" });
  }
});

module.exports = router;
