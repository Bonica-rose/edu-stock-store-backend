const asyncHandler = require("../middleware/asyncHandler.middleware");
const assetService = require("../services/asset.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.getAssets = asyncHandler(async (req, res) => {

    const { assets, pagination } = await assetService.getAssets(req.query, req.user);

    successResponse(res, 200, "Assets fetched successfully.", assets, pagination);
});

exports.getAsset = asyncHandler(async (req, res) => {

    const asset = await assetService.getAsset(req.params.id, req.user);

    successResponse(res, 200, "Asset retrieved successfully.", asset);
});

exports.createAsset = asyncHandler(async (req, res) => {

    const asset = await assetService.createAsset(req.body, req.user);
    
    successResponse(res, 200, "Asset created successfully.", asset);
});

exports.updateAsset = asyncHandler(async (req, res) => {

    const asset = await assetService.updateAsset(req.params.id, req.body, req.user);
    
    successResponse(res, 200, "Asset updated successfully.", asset);
});

exports.changeAssetStatus = asyncHandler(async (req, res) => { 

    const asset = await assetService.changeAssetStatus(req.params.id, req.user);
    
    successResponse(res, 200, "Asset status updated successfully.", asset);
});

exports.deleteAsset = asyncHandler(async (req, res) => { 

    await assetService.deleteAsset(req.params.id, req.user);
    
    successResponse(res, 200, "Asset deleted successfully.", null);
});

exports.assignAsset = asyncHandler(async (req, res) => { 

    const asset = await assetService.assignAsset(req.params.id, req.body, req.user);
    
    successResponse(res, 200, "Asset assigned successfully.", asset);
});

exports.returnAsset = asyncHandler(async (req, res) => { 

    const asset = await assetService.returnAsset(req.params.id, req.body, req.user);
    
    successResponse(res, 200, "Asset returned successfully.", asset);
});