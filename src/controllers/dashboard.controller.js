const asyncHandler = require("../middleware/asyncHandler.middleware");
const dashboardService = require("../services/dashboard.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.getDashboard = asyncHandler(async (req, res) => {
    const dashboard = await dashboardService.getDashboard(req.user);

    successResponse(res, 200, "Dashboard data fetched successfully.", dashboard);
});