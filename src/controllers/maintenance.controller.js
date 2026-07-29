const asyncHandler = require("../middleware/asyncHandler.middleware");
const { successResponse } = require("../utils/apiResponse.util");
const maintenanceService = require("../services/maintenance.service");

exports.getMaintenances = asyncHandler(async (req, res) => {

    const { maintenances, pagination } = await maintenanceService.getMaintenances(req.query);

    successResponse(res, 200, "Maintenance records fetched successfully.", maintenances, pagination);
});

exports.getMaintenance = asyncHandler(async (req, res) => {

    const maintenance = await maintenanceService.getMaintenance(req.params.id);

    successResponse(res, 200, "Maintenance record fetched successfully.", maintenance);
});

exports.createMaintenance = asyncHandler(async (req, res) => {

    const maintenance = await maintenanceService.createMaintenance(req.body, req.user.id );

    successResponse(res, 201, "Maintenance request created successfully.", maintenance);
});

exports.assignMaintenance = asyncHandler(async (req, res) => {

    const maintenance = await maintenanceService.assignMaintenance(req.params.id, req.body, req.user.id);

    successResponse(res, 200, "Maintenance assigned successfully.", maintenance);
});

exports.updateMaintenanceStatus = asyncHandler(async (req, res) => {

    const maintenance = await maintenanceService.updateMaintenanceStatus(req.params.id, req.body);

    successResponse(res, 200, "Maintenance status updated successfully.", maintenance);
});

exports.completeMaintenance = asyncHandler(async (req, res) => {

    const maintenance = await maintenanceService.completeMaintenance(req.params.id, req.body);

    successResponse(res, 200, "Maintenance completed successfully.", maintenance);
});

exports.deleteMaintenance = asyncHandler(async (req, res) => {

    await maintenanceService.deleteMaintenance(req.params.id);

    successResponse(res, 200, "Maintenance deleted successfully.", null);
});