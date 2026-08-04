const asyncHandler = require("../middleware/asyncHandler.middleware");
const setupService = require("../services/setup.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.getSetupStatus = asyncHandler(async (req, res) => {

    const result = await setupService.getSetupStatus();

    successResponse(res, 200, "", result);
});

exports.runSetup = asyncHandler(async (req, res) => {

    const result = await setupService.runSetup(req.body);

    successResponse(res, 201, "System initialized successfully.", result);
});