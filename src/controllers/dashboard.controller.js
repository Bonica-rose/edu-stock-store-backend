const asyncHandler = require("../middleware/asyncHandler.middleware");
const dashboardService = require("../services/dashboard.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.getDashboard = asyncHandler(async (req, res) => {
    const dashboard = await dashboardService.getDashboard(req.user);

    successResponse(res, 200, "Dashboard data fetched successfully.", dashboard);
});

exports.getStockMovementTrend = asyncHandler(async (req, res) => {
    const data = await dashboardService.getStockMovementTrend(req.user);

    successResponse(res, 200, "Stock movement trend fetched successfully.", data);
});

exports.getInventoryByCategory = asyncHandler(async (req, res) => {
    const data = await dashboardService.getInventoryByCategory(req.user);

    successResponse(res, 200, "Inventory by category fetched successfully.", data);
});

exports.getStockHealth = asyncHandler(async (req, res) => {
    const data = await dashboardService.getStockHealth(req.user);

    successResponse(res, 200, "Stock health fetched successfully.", data);
});