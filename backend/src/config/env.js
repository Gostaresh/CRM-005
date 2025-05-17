require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  crmUrl: process.env.CRM_URL || "http://192.168.1.6/gostaresh/api/data/v9.1",
  domain: process.env.DOMAIN || "GOSTARESH",
  sessionSecret:
    process.env.SESSION_SECRET || "your-secret-key-32-bytes-long!!", // Must be 32 bytes
  vue: process.env.VUE,
};
