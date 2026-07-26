const { body, param } = require('express-validator');
const { ROLES } = require('../constants/roles'); 

const ALLOWED_ROLES = Object.values(ROLES);

exports.createUserValidator = [
    body("firstName")
        .trim()
        .notEmpty().withMessage("First name is required")
        .isLength({ min: 3, max: 25 }).withMessage("First name must be between 3 and 25 characters")
        .bail()
        .isAlpha('en-US').withMessage('First name must contain only letters'),

    body("lastName")
        .trim()
        .notEmpty().withMessage("Last name is required")
        .bail()
        .isLength({ min: 3, max: 50 }).withMessage("Last name must be between 3 and 50 characters"),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .isEmail().withMessage("Invalid email address")
        .normalizeEmail(),

    body("password")
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

    body("phone")
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[6-9]\d{9}$/).withMessage("Please provide a valid phone number"),

    body("role")
        .notEmpty().withMessage("Role is required")
        .isIn(ALLOWED_ROLES).withMessage(`Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`),

    body("branch")
        .trim()
        .notEmpty().withMessage("Branch is required")
        .isMongoId().withMessage("Invalid branch ID")
];

exports.updateUserValidator = [
    body("firstName")
        .optional()
        .trim()
        .notEmpty().withMessage("First name is required")
        .isLength({ min: 3, max: 25 }).withMessage("First name must be between 3 and 25 characters")
        .bail()
        .isAlpha('en-US').withMessage('First name must contain only letters'),

    body("lastName")
        .optional()
        .trim()
        .notEmpty().withMessage("Last name is required")
        .bail()
        .isLength({ min: 3, max: 50 }).withMessage("Last name must be between 3 and 50 characters"),
    
    body("phone")
        .optional()
        .trim()
        .matches(/^[6-9]\d{9}$/).withMessage("Please provide a valid phone number"),

    body("role")
        .optional()
        .trim()
        .notEmpty().withMessage("Role is required")
        .isIn(ALLOWED_ROLES).withMessage(`Invalid role`),

    body("branch")
        .optional()
        .trim()
        .isMongoId().withMessage("Invalid branch ID"),

    body("profileImage")
        .optional()
        .trim()
        .isURL().withMessage("Invalid profile image URL"),

    body("isActive")
        .optional()
        .trim()
        .isBoolean()
];

exports.updateProfileValidator = [
    body("firstName")
        .optional()
        .trim()
        .isLength({ min: 3, max: 25 }).withMessage("First name must be between 3 and 25 characters")
        .bail()
        .isAlpha('en-US').withMessage('First name must contain only letters'),
    
    body("lastName")
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage("Last name must be between 3 and 50 characters")
        .bail()
        .matches(/^[a-zA-Z. ]+$/).withMessage('Last name must contain only letters, periods, and spaces')
        .bail()
        .custom((value, { req }) => {
            const firstName = req.body.firstName?.trim().toLowerCase();
            if (firstName && value.trim().toLowerCase() === firstName) {
                throw new Error("Last name cannot be identical to first name");
            }
            return true; // Return true if validation passes
        }),

    body("phone")
        .optional()
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage("Please provide a valid phone number"),

    body("profileImage")
        .optional()
        .trim()
        .isURL().withMessage("Invalid profile image URL")
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

exports.changeUserStatusValidator = [
    body("isActive")
        .notEmpty().withMessage("Status is required")
        .isBoolean().withMessage("Status must be true or false")
];

exports.userIdParamValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid user ID"),
];
