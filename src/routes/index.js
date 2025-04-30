const express = require("express");
const authRoutes = require("./api/authRoutes");
const crmRoutes = require("./api/crmRoutes");

const router = express.Router();

router.use("/api/auth", authRoutes);
router.use("/api/crm", crmRoutes);

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
    content: undefined, // Will be set by EJS
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
    pageScripts: ["/js/dashboard.js", "/js/calendar.js", "/js/accounts.js"],
    content: undefined, // Will be set by EJS
  });
});

module.exports = router;
