const asyncHandler  = require("../middleware/asyncHandler.middleware");
const userService = require("../services/user.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.createUser = asyncHandler(async (req, res) => {
    const user = await userService.createUser(
        req.body,
        req.user
    );

    successResponse(res, 201, "User created successfully", user);
});