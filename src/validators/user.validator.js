const { body, param, query } = require('express-validator');
const { ROLES } = require('../constants/roles'); 

const ALLOWED_ROLES = Object.values(ROLES);

exports.createUserValidator = [
    body("firstName")
        .trim()
        .notEmpty().withMessage("First name is required")
        .bail()
        .isLength({ min: 3, max: 25 }).withMessage("First name must be between 3 and 25 characters")
        .bail()
        .isAlpha('en-US').withMessage('First name must contain only letters'),

    body("lastName")
        .trim()
        .notEmpty().withMessage("Last name is required")
        .bail()
        .isLength({ min: 3, max: 50 }).withMessage("Last name must be between 3 and 50 characters")
        .bail()
        .matches(/^[a-zA-Z. ]+$/).withMessage('Last name must contain only letters, periods, and spaces'),

    body("email")
        .trim()
        .notEmpty().withMessage("Email is required")
        .bail()
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
        .optional({ values: 'falsy' })
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

exports.getUsersValidator = [

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),

    query("search")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Search cannot exceed 100 characters"),

    query("role")
        .optional()
        .isIn(Object.values(ROLES))
        .withMessage("Invalid role"),

    query("branch")
        .optional()
        .isMongoId()
        .withMessage("Invalid branch ID"),

    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),

    query("sortBy")
        .optional()
        .isIn([
            "employeeId",
            "firstName",
            "lastName",
            "email",
            "role",
            "isActive",
            "lastLogin",
            "createdAt",
        ])
        .withMessage("Invalid sort field"),

    query("order")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Order must be asc or desc"),
];

exports.updateUserValidator = [
    body("firstName")
        .optional()
        .trim()
        .isLength({ min: 3, max: 25 }).withMessage("First name must be between 3 and 25 characters")
        .bail()
        .isAlpha("en-US").withMessage("First name must contain only letters"),

    body("lastName")
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage("Last name must be between 3 and 50 characters")
        .bail()
        .matches(/^[a-zA-Z. ]+$/).withMessage('Last name must contain only letters, periods, and spaces'),

    body("phone")
        .optional({ nullable: true })
        .trim()
        .matches(/^[6-9]\d{9}$/).withMessage("Please provide a valid phone number"),

    body("role")
        .optional()
        .isIn(ALLOWED_ROLES).withMessage(`Invalid role. Allowed: ${ALLOWED_ROLES.join(", ")}`),

    body("branch")
        .optional()
        .isMongoId().withMessage("Invalid branch ID"),

    body("profileImage")
        .optional({ nullable: true })
        .trim()
        .isURL().withMessage("Invalid profile image URL"),

    body("isActive")
        .optional()
        .isBoolean().withMessage("isActive must be true or false"),
];

exports.updateOwnProfileValidator = [

    body("firstName")
        .optional()
        .trim()
        .isLength({ min: 3, max: 25 }).withMessage("First name must be between 3 and 25 characters")
        .bail()
        .isAlpha("en-US").withMessage("First name must contain only letters"),

    body("lastName")
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage("Last name must be between 3 and 50 characters")
        .bail()
        .matches(/^[a-zA-Z. ]+$/).withMessage('Last name must contain only letters, periods, and spaces'),        

    body("phone")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^[6-9]\d{9}$/).withMessage("Please provide a valid phone number"),

    // Block forbidden fields
    body("email")
        .not()
        .exists()
        .withMessage("Email cannot be updated."),

    body("employeeId")
        .not()
        .exists()
        .withMessage("Employee ID cannot be updated."),

    body("role")
        .not()
        .exists()
        .withMessage("Role cannot be updated."),

    body("branch")
        .not()
        .exists()
        .withMessage("Branch cannot be updated."),

    body("isActive")
        .not()
        .exists()
        .withMessage("Status cannot be updated."),

    body("password")
        .not()
        .exists()
        .withMessage("Password cannot be updated."),

    body("createdBy")
        .not()
        .exists()
        .withMessage("createdBy cannot be updated."),

    body("updatedBy")
        .not()
        .exists()
        .withMessage("updatedBy cannot be updated."),

    body("deletedAt")
        .not()
        .exists()
        .withMessage("deletedAt cannot be updated."),
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
