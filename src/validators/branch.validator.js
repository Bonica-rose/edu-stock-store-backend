const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const createBranchValidator = [
    body("branchCode")
        .trim()
        .notEmpty()
        .withMessage("Branch code is required")
        .isLength({ min: 2, max: 20 })
        .withMessage("Branch code must be between 2 and 20 characters")
        .matches(/^[A-Za-z0-9_-]+$/)
        .withMessage(
            "Branch code can contain only letters, numbers, hyphens and underscores"
        )
        .toUpperCase(),

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
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage("Country cannot exceed 50 characters"),

    body("phone")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage("Phone number must be a valid 10-digit Indian mobile number"),

    body("email")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail(),

    body("manager")
        .optional({ nullable: true, checkFalsy: true })
        .custom((value) => {
            if (!isValidObjectId(value)) {
                throw new Error("Invalid manager ID");
            }
            return true;
        }),
];

const updateBranchValidator = [
    param("id").custom((value) => {
        if (!isValidObjectId(value)) {
            throw new Error("Invalid branch ID");
        }
        return true;
    }),

    body("branchCode")
        .not()
        .exists()
        .withMessage("Branch code cannot be updated"),

    body("branchName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Branch name cannot be empty")
        .isLength({ min: 3, max: 50 })
        .withMessage("Branch name must be between 3 and 50 characters"),

    body("address")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Address cannot be empty")
        .isLength({ max: 100 })
        .withMessage("Address cannot exceed 100 characters"),

    body("city")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("City cannot be empty")
        .isLength({ max: 50 })
        .withMessage("City cannot exceed 50 characters"),

    body("state")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("State cannot be empty")
        .isLength({ max: 50 })
        .withMessage("State cannot exceed 50 characters"),

    body("country")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Country cannot be empty")
        .isLength({ max: 50 })
        .withMessage("Country cannot exceed 50 characters"),

    body("phone")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage("Phone number must be a valid 10-digit Indian mobile number"),

    body("email")
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail(),

    body("manager")
        .optional({ nullable: true, checkFalsy: true })
        .custom((value) => {
            if (!isValidObjectId(value)) {
                throw new Error("Invalid manager ID");
            }
            return true;
        }),

    body("isActive")
        .not()
        .exists()
        .withMessage("Use the status endpoint to change branch status"),
];

const changeBranchStatusValidator = [
    param("id").custom((value) => {
        if (!isValidObjectId(value)) {
            throw new Error("Invalid branch ID");
        }
        return true;
    }),

    body("isActive")
        .exists()
        .withMessage("isActive is required")
        .isBoolean()
        .withMessage("isActive must be true or false"),
];

const getBranchByIdValidator = [
    param("id").custom((value) => {
        if (!isValidObjectId(value)) {
            throw new Error("Invalid branch ID");
        }
        return true;
    }),
];

const getBranchesValidator = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be greater than 0")
        .toInt(),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100")
        .toInt(),

    query("search")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Search cannot exceed 100 characters"),

    query("city")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("City cannot exceed 100 characters"),

    query("state")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("State cannot exceed 100 characters"),

    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false"),

    query("sort")
        .optional()
        .isIn([
            "branchName",
            "-branchName",
            "branchCode",
            "-branchCode",
            "city",
            "-city",
            "createdAt",
            "-createdAt",
        ])
        .withMessage("Invalid sort field"),
];

module.exports = {
    createBranchValidator,
    getBranchesValidator,
    getBranchByIdValidator,
    updateBranchValidator,
    changeBranchStatusValidator,
};