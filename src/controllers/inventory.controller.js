const asyncHandler = require("../middleware/asyncHandler.middleware");
const inventoryService = require("../services/inventory.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.getInventories = asyncHandler(async (req, res) => {

    const { inventories, pagination } = await inventoryService.getInventories(req.query, req.user);

    successResponse(res, 200, "Inventories retrieved successfully", inventories, pagination);
});

exports.getInventory = asyncHandler(async (req, res) => {
    const inventory = await inventoryService.getInventory(req.params.id, req.user);

    successResponse(res, 200, "Inventory retrieved successfully", inventory);
});

exports.createInventory = asyncHandler(async (req, res) => {

    const inventory = await inventoryService.createInventory(
        req.body,
        req.file,
        req.user,
        req.requestInfo,
    );

    successResponse(res, 200, "Inventory created successfully", inventory);
});

exports.updateInventory = asyncHandler(async (req, res) => {

    console.log(req.params.id, req.body, req.file, req.user, req.requestInfo);
    

    const inventory = await inventoryService.updateInventory(
        req.params.id,
        req.body,
        req.file,
        req.user,
        req.requestInfo,
    );

    successResponse(res, 200, "Inventory updated successfully", inventory);
});

exports.changeInventoryStatus = asyncHandler(async (req, res) => {

    const inventory = await inventoryService.changeInventoryStatus(req.params.id, req.user, req.requestInfo);

    successResponse(res, 200, `Inventory ${inventory.isActive ? "activated" : "deactivated"} successfully.`, inventory);
});

exports.deleteInventory = asyncHandler(async (req, res) => {

    await inventoryService.deleteInventory(req.params.id, req.user, req.requestInfo);

    successResponse(res, 200, "Inventory deleted successfully", null);
});