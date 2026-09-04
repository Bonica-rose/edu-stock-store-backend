const express = require("express");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const { PERMISSIONS } = require("../constants/permissions");
const aiController = require("../controllers/ai.controller");

const aiRouter = express.Router();

aiRouter.use(protect);

// Inventory view is the existing permission shared by the intended users.
// The controller additionally restricts access to Branch Admin and Inventory Staff.
aiRouter.get(
    "/dashboard",
    authorize(PERMISSIONS.INVENTORY_VIEW),
    aiController.getDashboardPredictions,
);

aiRouter.get(
    "/inventory/:inventoryId",
    authorize(PERMISSIONS.INVENTORY_VIEW),
    aiController.getInventoryPrediction,
);

module.exports = aiRouter;
