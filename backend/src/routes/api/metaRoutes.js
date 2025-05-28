const express = require("express");
const { createHash } = require("crypto");
const { getTaskFilterMeta } = require("../../services/metaService");
const { decrypt } = require("../../utils/crypto");

const authMiddleware = require("../../middleware/authMiddleware");

const router = express.Router();

// apply auth to every route in this router
router.use(authMiddleware);

router.get("/task/filters", async (req, res) => {
  try {
    const credentials = {
      username: req.session.user.username.split("\\")[1],
      password: decrypt(req.session.encryptedPassword),
    };
    const data = await getTaskFilterMeta(credentials);
    const tag = createHash("md5").update(JSON.stringify(data)).digest("hex");

    if (req.headers["if-none-match"] === tag) return res.status(304).end();

    res.setHeader("ETag", tag);
    res.json(data); // compression middleware gzips it
  } catch (err) {
    console.error("Error in /task/filters:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
