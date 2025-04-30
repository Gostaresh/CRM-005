const express = require("express");
const {
  fetchEntity,
  fetchAllActivities,
  fetchMyActivities,
  fetchActivityDetails,
  fetchPaginatedAccounts,
  fetchAccountsForDropdown,
  createEntity,
  createActivity,
  updateTaskDates,
  updateTask,
} = require("../../controllers/crmController");
const authMiddleware = require("../../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Specific routes should come before generic ones
router.post("/activities", createActivity); // Moved up to ensure it matches before /:entity
router.patch("/activities/:activityId/update-dates", updateTaskDates);
router.patch("/activities/:activityId", updateTask);
router.get("/activities/all", fetchAllActivities);
router.get("/activities/my", fetchMyActivities);
router.get("/activities/:activityId", fetchActivityDetails);
router.get("/accounts/paginated", fetchPaginatedAccounts);
router.get("/accounts/dropdown", fetchAccountsForDropdown);

// Generic routes should come last
router.get("/:entity", fetchEntity);
router.post("/:entity", createEntity);

module.exports = router;
