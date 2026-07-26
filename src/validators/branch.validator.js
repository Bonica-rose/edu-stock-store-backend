const { body } = require("express-validator");
const Branch = require("../models/branch.model");

exports.createBranchValidator = [

    body("branchCode")
        .trim()
        .notEmpty()
        .withMessage("Branch code is required")
        .isLength({ min: 2, max: 10 })
        .withMessage("Branch code must be between 2 and 10 characters")
        .matches(/^[A-Za-z0-9_-]+$/)
        .withMessage("Branch code can contain only letters, numbers, hyphen and underscore")
        .custom(async (value) => {
            const branch = await Branch.findOne({ branchCode: value.toUpperCase() });

            if (branch) {
                throw new Error("Branch code already exists");
            }

            return true;
        }),

    body("branchName")
        .trim()
        .notEmpty()
        .withMessage("Branch name is required")
        .isLength({ min: 3, max: 50 })
        .withMessage("Branch name must be between 3 and 50 characters"),

    body("address")
        .trim()
        .notEmpty()
        .withMessage("Address is required")
        .isLength({ max: 100 })
        .withMessage("Address cannot exceed 100 characters"),

    body("city")
        .trim()
        .notEmpty()
        .withMessage("City is required")
        .isLength({ max: 50 })
        .withMessage("City cannot exceed 50 characters"),

    body("state")
        .trim()
        .notEmpty()
        .withMessage("State is required")
        .isLength({ max: 50 })
        .withMessage("State cannot exceed 50 characters"),

    body("country")
        .trim()
        .notEmpty()
        .withMessage("Country is required")
        .isLength({ max: 50 })
        .withMessage("Country cannot exceed 50 characters"),

    body("phone")
        .optional({ checkFalsy: true })
        .trim()
        .isMobilePhone("any")
        .withMessage("Invalid phone number"),

    body("email")
        .optional({ checkFalsy: true })
        .trim()
        .isEmail()
        .withMessage("Invalid email")
        .normalizeEmail(),

    body("manager")
        .optional({ checkFalsy: true })
        .isMongoId()
        .withMessage("Invalid manager ID"),

    body("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),
];

exports.updateBranchValidator = [

    body("branchCode")
        .optional()
        .trim()
        .isLength({ min: 2, max: 10 })
        .matches(/^[A-Za-z0-9_-]+$/),

    body("branchName")
        .optional()
        .trim()
        .isLength({ min: 3, max: 50 }),

    body("address")
        .optional()
        .trim()
        .isLength({ max: 100 }),

    body("city")
        .optional()
        .trim()
        .isLength({ max: 50 }),

    body("state")
        .optional()
        .trim()
        .isLength({ max: 50 }),

    body("country")
        .optional()
        .trim()
        .isLength({ max: 50 }),

    body("phone")
        .optional({ checkFalsy: true })
        .isMobilePhone("any"),

    body("email")
        .optional({ checkFalsy: true })
        .isEmail()
        .normalizeEmail(),

    body("manager")
        .optional({ checkFalsy: true })
        .isMongoId(),

    body("isActive")
        .optional()
        .isBoolean(),
];