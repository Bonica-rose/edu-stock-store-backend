const asyncHandler = require("../middleware/asyncHandler.middleware");
const branchService = require("../services/branch.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.createBranch = asyncHandler(async (req, res) => {

    const branch = await branchService.createBranch(req.body, req.user._id, req.requestInfo);

    successResponse(res, 201, "Branch created successfully", branch);
});

exports.getBranches = asyncHandler(async (req, res) => {

    const { data, pagination } = await branchService.getBranches(req.query);

    successResponse(res, 200, "Branch retrieved successfully", data, pagination);
});

exports.getBranchById = asyncHandler(async (req, res) => {
    const branch = await branchService.getBranchById(req.params.id);

    successResponse(res, 200, "Branch retrieved successfully", branch);
});

exports.updateBranch = asyncHandler(async (req, res) => {

    const branch = await branchService.updateBranch(req.params.id, req.body, req.user._id, req.requestInfo);

    successResponse(res, 200, "Branch updated successfully", branch);
});

exports.changeBranchStatus = asyncHandler(async (req, res) => {

    const branch = await branchService.changeBranchStatus(
        req.params.id,
        req.body.isActive,
        req.user._id,
        req.requestInfo
    );

    successResponse(res, 200, "Branch status updated successfully", branch);
});