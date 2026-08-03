const express = require("express");
const setupRouter = express.Router();

const setupController = require("../controllers/setup.controller");

const { setupValidator } = require("../validators/setup.validators");

const validate = require("../middleware/validate");

setupRouter.get(
    "/status",
    setupController.getSetupStatus
);

setupRouter.post(
    "/",
    setupValidator,validate,
    setupController.runSetup
);

module.exports = setupRouter;