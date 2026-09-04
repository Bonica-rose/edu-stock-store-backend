const asyncHandler = require("../middleware/asyncHandler.middleware");
const ApiError = require("../utils/apiError.util");
const { successResponse } = require("../utils/apiResponse.util");
const aiPredictionService = require("../services/ai/aiPrediction.service");

const handleServiceError = (error) => {
    if (error?.statusCode) {
        throw new ApiError(error.statusCode, error.message);
    }

    throw error;
};

const getDashboardPredictions = asyncHandler(async (req, res) => {
    try {
        const data = await aiPredictionService.getDashboardPredictions(
            req.user,
        );

        return successResponse(
            res,
            200,
            "AI inventory predictions generated successfully.",
            data,
        );
    } catch (error) {
        handleServiceError(error);
    }
});

const getInventoryPrediction = asyncHandler(async (req, res) => {
    try {
        const data = await aiPredictionService.getInventoryPrediction(
            req.params.inventoryId,
            req.user,
        );

        return successResponse(
            res,
            200,
            "AI inventory prediction generated successfully.",
            data,
        );
    } catch (error) {
        handleServiceError(error);
    }
});

module.exports = {
    getDashboardPredictions,
    getInventoryPrediction,
};
