const express = require("express");
const authRouter = express.Router();

const authController = require("../controllers/auth.controller");

const { loginValidator } = require("../validators/auth.validator");
const { updateProfileValidator, changePasswordValidator } = require("../validators/user.validator");

const protect = require("../middleware/auth.middleware");
const validate = require("../middleware/validate");

// Public Routes
authRouter.post("/login", loginValidator, validate, authController.login);

// Protected Routes
authRouter.post("/logout", protect, authController.logout);
authRouter.get("/me", protect, authController.me);
authRouter.put("/change-password", protect, changePasswordValidator, validate, authController.changePassword);
authRouter.put("/profile", protect, updateProfileValidator, validate, authController.updateProfile);

module.exports = authRouter;