const { body } = require("express-validator");

exports.loginValidator = [

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email"),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters")   
];

exports.changePasswordValidator = [
    body("currentPassword")
        .trim()
        .notEmpty().withMessage("Current password is required")
        .isLength({ max: 128 }).withMessage("Current password is too long"),

    body("newPassword")
        .trim()
        .notEmpty()
        .withMessage("New password is required")
        .bail()
        .isLength({ min: 8, max: 32 })
        .withMessage("New password must be between 8 and 32 characters")
        .bail()
        .matches(/(?=.*[A-Z])/)
        .withMessage("New password must contain at least one uppercase letter")
        .matches(/(?=.*[a-z])/)
        .withMessage("New password must contain at least one lowercase letter")
        .matches(/(?=.*\d)/)
        .withMessage("New password must contain at least one number")
        .matches(/(?=.*[@$!%*?&#])/)
        .withMessage('New Password must contain at least one special character (@, $, !, %, *, ?, &, #)'),

    body("confirmPassword")
        .trim()
        .notEmpty()
        .withMessage("Confirm password is required")
        .bail()
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error("Passwords do not match");
            }
            return true;
        })
];