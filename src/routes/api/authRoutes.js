const express = require("express");
const { login, logout } = require("../../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.status(200).json({ user: req.session.user });
});

module.exports = router;
