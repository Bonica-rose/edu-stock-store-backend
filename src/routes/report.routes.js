const express = require("express");
const reportRouter = express.Router();

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const reportController = require("../controllers/report.controller");
const { PERMISSIONS } = require("../constants/permissions");

// All report routes require authentication
reportRouter.use(protect);

// Dashboard Summary
reportRouter.get(
    "/dashboard-summary",
    authorize(PERMISSIONS.REPORT_VIEW),
    reportController.getDashboardSummary
);

// Inventory Report
reportRouter.get(
    "/inventory",
    authorize(PERMISSIONS.REPORT_VIEW),
    reportController.getInventoryReport
);

// Low Stock Report
reportRouter.get(
    "/low-stock",
    authorize(PERMISSIONS.REPORT_VIEW),
    reportController.getLowStockReport
);

// Asset Report
reportRouter.get(
    "/assets",
    authorize(PERMISSIONS.REPORT_VIEW),
    reportController.getAssetReport
);

// Stock Movement Report
reportRouter.get(
    "/stock-movements",
    authorize(PERMISSIONS.REPORT_VIEW),
    reportController.getStockMovementReport
);

// Purchase Summary
reportRouter.get(
    "/purchase-summary",
    authorize(PERMISSIONS.REPORT_VIEW),
    reportController.getPurchaseSummary
);

// Maintenance Report
reportRouter.get(
    "/maintenance",
    authorize(PERMISSIONS.REPORT_VIEW),
    reportController.getMaintenanceReport
);

// Vendor Report
reportRouter.get(
    "/vendors",
    authorize(PERMISSIONS.REPORT_VIEW),
    reportController.getVendorReport
);

// Export Reports
reportRouter.get(
    "/export/inventory",
    authorize(PERMISSIONS.REPORT_EXPORT),
    reportController.exportInventoryReport
);

reportRouter.get(
    "/export/low-stock",
    authorize(PERMISSIONS.REPORT_EXPORT),
    reportController.exportLowStockReport
);

reportRouter.get(
    "/export/assets",
    authorize(PERMISSIONS.REPORT_EXPORT),
    reportController.exportAssetReport
);

reportRouter.get(
    "/export/stock-movements",
    authorize(PERMISSIONS.REPORT_EXPORT),
    reportController.exportStockMovementReport
);

reportRouter.get(
    "/export/purchase-summary",
    authorize(PERMISSIONS.REPORT_EXPORT),
    reportController.exportPurchaseSummary
);

reportRouter.get(
    "/export/maintenance",
    authorize(PERMISSIONS.REPORT_EXPORT),
    reportController.exportMaintenanceReport
);

reportRouter.get(
    "/export/vendors",
    authorize(PERMISSIONS.REPORT_EXPORT),
    reportController.exportVendorReport
);

module.exports = reportRouter;