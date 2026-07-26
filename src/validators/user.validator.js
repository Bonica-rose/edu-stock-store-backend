const { body } = require('express-validator');
const User = require("../models/user.model");
const { ROLES } = require('../constants/roles'); 

const ALLOWED_ROLES = Object.values(ROLES);

exports.validateUserRegistration = [
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 3 })
        .withMessage('First name must be at least 3 characters'),

    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .custom(async (email) => {
            const user = await User.findOne({ email });
            if (user) {
                throw new Error("Email already exists");
            }
            return true;
        }),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number')
        .matches(/[@$!%*?&#]/)
        .withMessage('Password must contain at least one special character (@, $, !, %, *, ?, &, #)'),


    body('phone')
        .optional({ checkFalsy: true })
        .trim()
        .isMobilePhone()
        .matches(/^[6-9]\d{9}$/)
        .withMessage('Please provide a valid phone number'),

    body('role')
        .trim()
        .notEmpty()
        .withMessage('Role is required')
        .isIn(ALLOWED_ROLES) // Pass the dynamic array here
        .withMessage(`Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}`),

    body('branch')
        .trim()
        .notEmpty()
        .withMessage('Branch ID is required')
        .isMongoId()
        .withMessage('Invalid Branch ID format'),

    body('avatar')
        .optional({ checkFalsy: true })
        .trim()
        .isURL()
        .withMessage('Avatar must be a valid URL'),

    body('isActive')
        .notEmpty()
        .withMessage('isActive field is required')
        .isBoolean()
        .withMessage('isActive must be a boolean value'),

    body('createdBy')
        .optional({ checkFalsy: true })
        .trim()
        .isMongoId()
        .withMessage('Invalid Creator User ID format')
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
        .withMessage("Invalid phone number"),

    body("avatar")
        .optional()
        .trim()
        .isURL()
        .withMessage("Invalid profile image URL")
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
