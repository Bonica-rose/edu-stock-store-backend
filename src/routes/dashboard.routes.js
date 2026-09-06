const express = require("express");
const dashboardRouter = express.Router();

const dashboardController = require("../controllers/dashboard.controller");
const protect  = require("../middleware/auth.middleware");

// Dashboard
dashboardRouter.get("/", protect, dashboardController.getDashboard);

dashboardRouter.get(
    "/stock-movement-trend",
    protect,
    dashboardController.getStockMovementTrend,
);

dashboardRouter.get(
    "/inventory-by-category",
    protect,
    dashboardController.getInventoryByCategory,
);

dashboardRouter.get(
    "/stock-health",
    protect,
    dashboardController.getStockHealth,
);

module.exports = dashboardRouter;