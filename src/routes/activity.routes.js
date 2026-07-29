const express = require("express");
const activityRouter = express.Router();

const { PERMISSIONS } = require("../constants/permissions");

const activityController = require("../controllers/activity.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate");

const {
    activityIdValidator,
} = require("../validators/activity.validator");

//Protected routes
activityRouter.get(
    "/",
    protect, authorize(PERMISSIONS.ACTIVITY_VIEW),
    activityController.getActivities
);

activityRouter.get(
    "/:id",
    protect, authorize(PERMISSIONS.ACTIVITY_VIEW),
    activityIdValidator, validate,
    activityController.getActivity
);

module.exports = activityRouter;