const asyncHandler = require("../middleware/asyncHandler.middleware");
const reportService = require("../services/report.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.exportInventoryReport = asyncHandler(async (req, res) => {
    await reportService.exportInventoryReport(req.query, req.user, res);
});

exports.exportLowStockReport = asyncHandler(async (req, res) => {
    await reportService.exportLowStockReport(req.query, req.user, res);
});

exports.exportAssetReport = asyncHandler(async (req, res) => {
    await reportService.exportAssetReport(req.query, req.user, res);
});

exports.exportStockMovementReport = asyncHandler(async (req, res) => {
    await reportService.exportStockMovementReport(req.query, req.user, res);
});

exports.exportPurchaseSummary = asyncHandler(async (req, res) => {
    await reportService.exportPurchaseSummary(req.query, req.user, res);
});

exports.exportMaintenanceReport = asyncHandler(async (req, res) => {
    await reportService.exportMaintenanceReport(req.query, req.user, res);
});

exports.exportVendorReport = asyncHandler(async (req, res) => {
    await reportService.exportVendorReport(req.query, req.user, res);
});