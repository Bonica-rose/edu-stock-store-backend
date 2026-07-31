const express = require("express");
const reportRouter = express.Router();

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const reportController = require("../controllers/report.controller");
const exportController = require("../controllers/export.controller");
const { PERMISSIONS } = require("../constants/permissions");

// All report routes require authentication
reportRouter.use(protect);

// Dashboard Summary
reportRouter.get(
    "/dashboard-summary",
    authorize(PERMISSIONS.REPORT_DASHBOARD),
    reportController.getDashboardSummary
);

// Inventory Report
reportRouter.get(
    "/inventory",
    authorize(PERMISSIONS.REPORT_INVENTORY),
    reportController.getInventoryReport
);
reportRouter.get(
    "/inventory/export",
    authorize(PERMISSIONS.REPORT_INVENTORY, PERMISSIONS.REPORT_INVENTORY_EXPORT),
    exportController.exportInventoryReport
);

// Low Stock Report
reportRouter.get(
    "/low-stock",
    authorize(PERMISSIONS.REPORT_LOW_STOCK),
    reportController.getLowStockReport
);
reportRouter.get(
    "/low-stock/export",
    authorize(PERMISSIONS.REPORT_LOW_STOCK, PERMISSIONS.REPORT_LOW_STOCK_EXPORT),
    exportController.exportLowStockReport
);

// Asset Report
reportRouter.get(
    "/assets",
    authorize(PERMISSIONS.REPORT_ASSET),
    reportController.getAssetReport
);
reportRouter.get(
    "/assets/export",
    authorize(PERMISSIONS.REPORT_ASSET, PERMISSIONS.REPORT_ASSET_EXPORT),
    exportController.exportAssetReport
);

// Stock Movement Report
reportRouter.get(
    "/stock-movements",
    authorize(PERMISSIONS.REPORT_STOCK_MOVEMENT),
    reportController.getStockMovementReport
);
reportRouter.get(
    "/stock-movements/export",
    authorize(PERMISSIONS.REPORT_STOCK_MOVEMENT, PERMISSIONS.REPORT_STOCK_MOVEMENT_EXPORT),
    exportController.exportStockMovementReport
);

// Purchase Summary
reportRouter.get(
    "/purchases",
    authorize(PERMISSIONS.REPORT_PURCHASE),
    reportController.getPurchaseSummary
);
reportRouter.get(
    "/purchases/export",
    authorize(PERMISSIONS.REPORT_PURCHASE, PERMISSIONS.REPORT_PURCHASE_EXPORT),
    exportController.exportPurchaseSummary
);

// Maintenance Report
reportRouter.get(
    "/maintenance",
    authorize(PERMISSIONS.REPORT_MAINTENANCE),
    reportController.getMaintenanceReport
);
reportRouter.get(
    "/maintenance/export",
    authorize(PERMISSIONS.REPORT_MAINTENANCE, PERMISSIONS.REPORT_MAINTENANCE_EXPORT),
    exportController.exportMaintenanceReport
);

// Vendor Report
reportRouter.get(
    "/vendors",
    authorize(PERMISSIONS.REPORT_VENDOR),
    reportController.getVendorReport
);
reportRouter.get(
    "/vendors/export",
    authorize(PERMISSIONS.REPORT_VENDOR,PERMISSIONS.REPORT_VENDOR_EXPORT),
    exportController.exportVendorReport
);

module.exports = reportRouter;