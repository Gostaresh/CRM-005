const express = require("express");
const authRoutes = require("./api/authRoutes");
const crmRoutes = require("./api/crmRoutes");
const metaRoutes = require("./api/metaRoutes");
const menuRoutes = require("./api/menuRoutes");

module.exports = () => {
  const router = express.Router();

  router.use("/api/auth", authRoutes);
  router.use("/api/crm", crmRoutes);
  router.use("/api/ui", menuRoutes);
  // router.use("/api/meta", metaRoutes);

  router.get("/", (req, res) => {
    if (req.session.user) {
      return res.redirect("/dashboard");
    }
    res.render("login", {
      layout: "layouts/main",
      title: "ورود به CRM",
      user: null,
      includeFullCalendar: false,
      pageScripts: ["/js/login.js"],
      content: undefined,
    });
  });

  router.get("/dashboard", (req, res) => {
    if (!req.session.user) {
      return res.redirect("/");
    }
    res.render("dashboard", {
      layout: "layouts/main",
      title: "داشبورد CRM",
      user: req.session.user,
      includeFullCalendar: true,
      pageScripts: [
        "/js/dashboard.js",
        "/js/calendar.js",
        "/js/accounts.js",
        "/js/regardingDropdown.js",
      ],
      content: undefined,
    });
  });

  router.get("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });

  return router;
};
