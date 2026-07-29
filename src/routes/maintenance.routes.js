const express = require("express");
const maintenanceRouter = express.Router();
const { PERMISSIONS } = require("../constants/permission.constants");
const maintenanceController = require("../controllers/maintenance.controller");

const validate = require("../middleware/validate");
const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");

const {
    createMaintenanceValidator,
    assignMaintenanceValidator,
    updateMaintenanceStatusValidator,
    completeMaintenanceValidator,
} = require("../validators/maintenance.validators");

maintenanceRouter.use(protect);

maintenanceRouter.get(
    "/",
    authorize(PERMISSIONS.MAINTENANCE_VIEW),
    maintenanceController.getMaintenances
);

maintenanceRouter.get(
    "/:id",
    authorize(PERMISSIONS.MAINTENANCE_VIEW),
    maintenanceController.getMaintenance
);

maintenanceRouter.post(
    "/",
    authorize(PERMISSIONS.MAINTENANCE_CREATE),
    createMaintenanceValidator, validate,
    maintenanceController.createMaintenance
);

maintenanceRouter.patch(
    "/:id/assign",
    authorize(PERMISSIONS.MAINTENANCE_ASSIGN),
    assignMaintenanceValidator, validate,
    maintenanceController.assignMaintenance
);

maintenanceRouter.patch(
    "/:id/status",
    authorize(PERMISSIONS.MAINTENANCE_UPDATE_STATUS),
    updateMaintenanceStatusValidator, validate,
    maintenanceController.updateMaintenanceStatus
);

maintenanceRouter.patch(
    "/:id/complete",
    authorize(PERMISSIONS.MAINTENANCE_COMPLETE),
    completeMaintenanceValidator, validate,
    maintenanceController.completeMaintenance
);

maintenanceRouter.delete(
    "/:id",
    authorize(PERMISSIONS.MAINTENANCE_DELETE),
    maintenanceController.deleteMaintenance
);

module.exports = maintenanceRouter;