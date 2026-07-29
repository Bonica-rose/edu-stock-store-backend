const asyncHandler = require("../middleware/asyncHandler.middleware");
const activityService = require("../services/activity.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.getActivities = asyncHandler(async (req, res) => {

    const { activities, pagination } = await activityService.getActivities(req.query);

    return successResponse(res, 200, "Activity logs fetched successfully.", activities, pagination);
});

exports.getActivity = asyncHandler(async (req, res) => {

    const activity = await activityService.getActivity(req.params.id);

    return successResponse(res, 200, "Activity log fetched successfully.", activity
    );
});