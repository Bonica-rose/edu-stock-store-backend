const express = require("express");
const userRouter = express.Router();

const { PERMISSIONS } = require("../constants/permissions");

const userController = require("../controllers/user.controller");

const protect = require("../middleware/auth.middleware");
const authorize = require("../middleware/authorize.middleware");
const validate = require("../middleware/validate");

const {
    createUserValidator,
    getUsersValidator,
    userIdParamValidator,
    updateUserValidator,
    changeUserStatusValidator,
    updateOwnProfileValidator,
} = require("../validators/user.validator");

// Protected Routes
userRouter.post(
    "/",
    protect, authorize(PERMISSIONS.USER_CREATE),
    createUserValidator, validate,
    userController.createUser
);

userRouter.get(
    "/",
    protect, authorize(PERMISSIONS.USER_VIEW),
    getUsersValidator, validate,
    userController.getUsers
);

userRouter.get(
    "/:id",
    protect, authorize(PERMISSIONS.USER_VIEW),
    userIdParamValidator, validate,
    userController.getUserById
);

userRouter.patch(
    "/:id",
    protect, authorize(PERMISSIONS.USER_UPDATE),
    userIdParamValidator, updateUserValidator,
    validate,
    userController.updateUser
);

userRouter.patch(
    "/:id/status",
    protect, authorize(PERMISSIONS.USER_STATUS_UPDATE),
    userIdParamValidator, changeUserStatusValidator, validate,
    userController.changeUserStatus
);

userRouter.delete(
    "/:id",
    protect, authorize(PERMISSIONS.USER_DELETE),
    userIdParamValidator, validate,
    userController.deleteUser
);

userRouter.patch(
    "/profile",
    protect,
    updateOwnProfileValidator,validate,
    userController.updateOwnProfile
);


module.exports = userRouter;