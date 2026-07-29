const asyncHandler = require("../middleware/asyncHandler.middleware");
const purchaseService = require("../services/purchase.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.getPurchases = asyncHandler(async (req, res) => {
    const { purchases, pagination } = await purchaseService.getPurchases(req.query, req.user);

    successResponse(res, 200, "Purchases retrieved successfully.", purchases, pagination);
});

exports.getPurchase = asyncHandler(async (req, res) => {
    const purchase = await purchaseService.getPurchase(req.params.id, req.user);

    successResponse(res, 200, "Purchase retrieved successfully.", purchase);
});

exports.createPurchase = asyncHandler(async (req, res) => {
    const purchase = await purchaseService.createPurchase(req.body, req.user);

    successResponse(res, 200, "Purchase created successfully.", purchase);
});