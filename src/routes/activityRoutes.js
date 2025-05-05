const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

module.exports = (activityController) => {
  router.get(
    "/create-activity",
    authMiddleware,
    activityController.getCreateActivityPage.bind(activityController)
  );
  router.post(
    "/create-activity/:entity",
    authMiddleware,
    activityController.createActivity.bind(activityController)
  );
  return router;
};
