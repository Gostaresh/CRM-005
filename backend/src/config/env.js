require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  crmUrl: process.env.CRM_URL || "http://192.168.1.6/gostaresh/api/data/v9.1",
  domain: process.env.DOMAIN || "GOSTARESH",
  sessionSecret:
    process.env.SESSION_SECRET ||
    `JBWlCxdx3f1W30L6jAzohpH/mP5/pCu5eipkKrNSKJVTyUbkfYTrbHICWo9lbcyO`,
  vue: process.env.VUE,
  vue_preview: process.env.VUE_preview,
};
