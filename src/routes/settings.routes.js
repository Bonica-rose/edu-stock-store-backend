const express = require("express");
const settingsRouter = express.Router();

const settingsController = require("../controllers/settings.controller");
const validate = require("../middleware/validate.middleware");
const { updateSettingsValidator } = require("../validators/settings.validator");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

settingsRouter.get(
    "/",
    protect, authorize("settings.view"),
    settingsController.getSettings
);

settingsRouter.put(
    "/",
    protect, authorize("settings.update"),
    updateSettingsValidator, validate,
    settingsController.updateSettings
);

module.exports = settingsRouter;