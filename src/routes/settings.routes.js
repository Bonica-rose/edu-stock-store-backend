const express = require("express");
const settingsRouter = express.Router();

const { PERMISSIONS } = require("../constants/permissions");
const settingsController = require("../controllers/settings.controller");
const validate = require("../middleware/validate");
const { updateSettingsValidator } = require("../validators/settings.validator");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

settingsRouter.get(
    "/",
    protect, authorize(PERMISSIONS.SETTINGS_VIEW),
    settingsController.getSettings
);

settingsRouter.put(
    "/",
    protect, authorize(PERMISSIONS.SETTINGS_UPDATE),
    updateSettingsValidator, validate,
    settingsController.updateSettings
);

module.exports = settingsRouter;