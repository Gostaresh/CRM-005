const multer = require("multer");

// ✔ 5 MB max per file – change if you need bigger
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = upload;
