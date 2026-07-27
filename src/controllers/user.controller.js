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

exports.getUsers = asyncHandler(async (req, res) => {

    const result = await userService.getUsers(req.query, req.user);

    successResponse(res, 200, "Users retrieved successfully", result);
});