const express = require("express");
const {
    activityController,
    accountController,
    entityController,
    userController
} = require("../../controllers/crm");
const authMiddleware = require("../../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Activity routes
router.get("/activities/all", activityController.fetchAllActivities);
router.get("/activities/my", activityController.fetchMyActivities);
router.get("/activities/filter", activityController.fetchActivitiesByOwners);
router.get("/activities/:activityId", activityController.fetchActivityDetails);
router.post("/activities", activityController.createActivity);
router.patch("/activities/:activityId/update-dates", activityController.updateTaskDates);
router.patch("/activities/:activityId", activityController.updateTask);

// Account routes
router.get("/accounts", accountController.fetchPaginatedAccounts);
router.get("/accounts/dropdown", accountController.fetchAccountsForDropdown);

// Entity routes
router.get("/entities/:entity", entityController.fetchEntity);

// User routes
router.get("/users/me", userController.getCurrentUser);
router.get("/systemusers/dropdown", userController.fetchSystemUsersForDropdown);

module.exports = router;
