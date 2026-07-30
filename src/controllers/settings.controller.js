const asyncHandler = require("../middleware/asyncHandler.middleware");
const settingsService = require("../services/settings.service");
const { successResponse } = require("../utils/apiResponse.util");

const getSettings = asyncHandler(async (req, res) => {
    const settings = await settingsService.getSettings();

    successResponse(res, 200, "Settings retrieved successfully.", settings);
});

const updateSettings = asyncHandler(async (req, res) => {
    const settings = await settingsService.updateSettings(
        req.body, req.user._id, req.requestInfo
    );

    successResponse(res, 200, "Settings updated successfully.", settings);
});

module.exports = {
    getSettings,
    updateSettings,
};