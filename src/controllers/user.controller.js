const asyncHandler  = require("../middleware/asyncHandler.middleware");
const userService = require("../services/user.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.createUser = asyncHandler(async (req, res) => {

    const user = await userService.createUser(req.body, req.user, req.requestInfo);

    successResponse(res, 201, "User created successfully", user);
});

exports.getUsers = asyncHandler(async (req, res) => {

    const result = await userService.getUsers(req.query, req.user);

    successResponse(res, 200, "Users retrieved successfully", result);
});

exports.getUserById = asyncHandler(async (req, res) => {

    const user = await userService.getUserById(req.params.id, req.user);

    successResponse(res, 200, "User retrieved successfully", user);
});

exports.updateUser = asyncHandler(async (req, res) => {

    const user = await userService.updateUser(req.params.id, req.body, req.user, req.requestInfo);

    successResponse(res, 200, "User updated successfully", user);
});

exports.updateOwnProfile = asyncHandler(async (req, res) => {

    const user = await userService.updateOwnProfile(req.user._id, req.body);

    successResponse(res, 200, "Profile updated successfully", user);
});

exports.changeUserStatus = asyncHandler(async (req, res) => {

    const user = await userService.changeUserStatus(req.params.id, req.body.isActive, req.user, req.requestInfo);

    successResponse(res, 200, "User status updated successfully", user);
});

exports.deleteUser = asyncHandler(async (req, res) => {

    await userService.deleteUser(req.params.id, req.user, req.requestInfo);

    successResponse(res, 200, "User deleted successfully", user);
});