const asyncHandler = require("../middleware/asyncHandler.middleware");
const exportService = require("../services/export.service");
const { successResponse } = require("../utils/apiResponse.util");

const exportInventoryReport = asyncHandler(async (req, res) => {
});


module.exports = {
    exportInventoryReport,
    // exportLowStockReport,
    // exportAssetReport,
    // exportStockMovementReport,
    // exportPurchaseSummary,
    // exportMaintenanceReport,
    // exportVendorReport,
};