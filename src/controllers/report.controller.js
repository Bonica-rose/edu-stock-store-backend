const asyncHandler = require("../middleware/asyncHandler.middleware");
const reportService = require("../services/report.service");
const { successResponse } = require("../utils/apiResponse.util");

const getDashboardSummary = asyncHandler(async (req, res) => {
    const data = await reportService.getDashboardSummary(req.user);

    return successResponse(res, "Dashboard summary fetched successfully.", data);
});

const getInventoryReport = asyncHandler(async (req, res) => {
    const data = await reportService.getInventoryReport(req.query, req.user);

    return successResponse(res, "Inventory report fetched successfully.", data);
});

const getLowStockReport = asyncHandler(async (req, res) => {
    const data = await reportService.getLowStockReport(req.query, req.user);

    return successResponse(res, "Low stock report fetched successfully.", data);
});

const getAssetReport = asyncHandler(async (req, res) => {
    const data = await reportService.getAssetReport(req.query, req.user);

    return successResponse(res, "Asset report fetched successfully.", data);
});

const getStockMovementReport = asyncHandler(async (req, res) => {
    const data = await reportService.getStockMovementReport(req.query, req.user);

    return successResponse(res, "Stock movement report fetched successfully.", data);
});

const getPurchaseSummary = asyncHandler(async (req, res) => {
    const data = await reportService.getPurchaseSummary(req.query, req.user);

    return successResponse(res, "Purchase summary fetched successfully.", data);
});

const getMaintenanceReport = asyncHandler(async (req, res) => {
    const data = await reportService.getMaintenanceReport(req.query, req.user);

    return successResponse(res, "Maintenance report fetched successfully.", data);
});

const getVendorReport = asyncHandler(async (req, res) => {
    const data = await reportService.getVendorReport(req.query, req.user);

    return successResponse(res, "Vendor report fetched successfully.", data);
});

module.exports = {
    getDashboardSummary,
    getInventoryReport,
    getLowStockReport,
    getAssetReport,
    getStockMovementReport,
    getPurchaseSummary,
    getMaintenanceReport,
    getVendorReport,
};

