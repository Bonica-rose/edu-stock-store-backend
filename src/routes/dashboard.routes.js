const express = require("express");
const dashboardRouter = express.Router();

const dashboardController = require("../controllers/dashboard.controller");
const protect  = require("../middleware/auth.middleware");

// Dashboard
dashboardRouter.get("/", protect, dashboardController.getDashboard);

module.exports = dashboardRouter;