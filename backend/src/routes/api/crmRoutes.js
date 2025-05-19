const express = require("express");
const {
  activityController,
  accountController,
  entityController,
  userController,
  searchController,
  noteController,
} = require("../../controllers/crm");
const authMiddleware = require("../../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Activity routes
router.get("/activities/all", activityController.fetchAllActivities);
router.get("/activities/my", activityController.fetchMyActivities);
router.get("/activities/filter", activityController.fetchActivitiesByOwners);
router.get(
  "/activities/regarding-options",
  activityController.getRegardingOptions
);
router.get("/activities/:activityId", activityController.fetchActivityDetails);
router.post("/activities", activityController.createActivity);
router.patch(
  "/activities/:activityId/update-dates",
  activityController.updateTaskDates
);
router.patch("/activities/:activityId", activityController.updateTask);

// Notes routes
router.get("/activities/:activityId/notes", noteController.fetchNotes);
router.post("/activities/:activityId/notes", noteController.createNote);
// Download note attachment
router.get("/notes/:noteId/download", noteController.downloadNote);

// Account routes
router.get("/accounts", accountController.fetchPaginatedAccounts);
router.get("/accounts/dropdown", accountController.fetchAccountsForDropdown);

// Entity routes
router.get("/entities/:entity", entityController.fetchEntity);

// Generic entity search
router.get("/search", searchController.search);

// User routes
router.get("/users/me", userController.getCurrentUser);
router.get("/systemusers/dropdown", userController.fetchSystemUsersForDropdown);

module.exports = router;
