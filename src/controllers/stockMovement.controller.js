const asyncHandler = require("../middleware/asyncHandler.middleware");
const stockMovementService = require("../services/stockMovement.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.stockIn = asyncHandler(async (req, res) => {

    const movement = await stockMovementService.stockIn(req.body, req.user, req.requestInfo);

    successResponse(res, 200, "Stock added successfully.", movement);
});


exports.stockOut = asyncHandler(async (req, res) => {

    const movement = await stockMovementService.stockOut(req.body, req.user, req.requestInfo);

    successResponse(res, 201, "Stock issued successfully.", movement);
});


exports.transferStock = asyncHandler(async (req, res) => {

    const result = await stockMovementService.transferStock(req.body, req.user, req.requestInfo);

    successResponse(res, 201, "Stock transferred successfully.", result);
});


exports.adjustStock = asyncHandler(async (req, res) => {

    const movement = await stockMovementService.adjustStock(req.body, req.user, req.requestInfo);

    successResponse(res, 201, "Stock adjusted successfully.", movement);
});

exports.getStockMovements = asyncHandler(async (req, res) => {

    const { movements, pagination } = await stockMovementService.getStockMovements(req.query, req.user);

    successResponse(res, 200, "Stock movements retrieved successfully.", movements, pagination);
});

exports.getStockMovement = asyncHandler(async (req, res) => {

    const movement = await stockMovementService.getStockMovement(req.params.id, req.user);

    successResponse(res, 200, "Stock movement retrieved successfully.", movement);
});