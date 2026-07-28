const { body, param, query } = require("express-validator");
const mongoose = require("mongoose");

const createInventoryValidator = [
    body("itemName")
        .trim()
        .notEmpty()
        .withMessage("Item name is required.")
        .isLength({ max: 100 })
        .withMessage("Item name cannot exceed 100 characters."),

    body("barcode")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage("Barcode cannot exceed 100 characters."),

    body("category")
        .notEmpty()
        .withMessage("Category is required.")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid category ID."),

    body("vendor")
        .notEmpty()
        .withMessage("Vendor is required.")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid vendor ID."),

    body("branch")
        .notEmpty()
        .withMessage("Branch is required.")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid branch ID."),

    body("minimumStock")
        .notEmpty()
        .withMessage("Minimum stock is required.")
        .isInt({ min: 0 })
        .withMessage("Minimum stock must be 0 or greater."),

    body("unit")
        .trim()
        .notEmpty()
        .withMessage("Unit is required.")
        .isLength({ max: 20 })
        .withMessage("Unit cannot exceed 20 characters."),

    body("purchasePrice")
        .notEmpty()
        .withMessage("Purchase price is required.")
        .isFloat({ min: 0 })
        .withMessage("Purchase price must be 0 or greater."),

    body("description")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters."),

    body("itemImage")
        .optional({ checkFalsy: true })
        .trim()
];

/**
 * Update Inventory
 */
const updateInventoryValidator = [
    param("id")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid inventory ID."),

    body("itemName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Item name cannot be empty.")
        .isLength({ max: 100 })
        .withMessage("Item name cannot exceed 100 characters."),

    body("barcode")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 100 })
        .withMessage("Barcode cannot exceed 100 characters."),

    body("category")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid category ID."),

    body("vendor")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid vendor ID."),

    body("branch")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid branch ID."),

    body("minimumStock")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Minimum stock must be 0 or greater."),

    body("unit")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Unit cannot be empty.")
        .isLength({ max: 20 })
        .withMessage("Unit cannot exceed 20 characters."),

    body("purchasePrice")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Purchase price must be 0 or greater."),

    body("description")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description cannot exceed 500 characters."),

    body("itemImage")
        .optional({ checkFalsy: true })
        .trim()
];

/**
 * Inventory ID
 */
const inventoryIdValidator = [
    param("id")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid inventory ID.")
];

/**
 * Change Status
 */
const changeInventoryStatusValidator = [
    param("id")
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid inventory ID.")
];

/**
 * Get Inventories
 */
const getInventoriesValidator = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be at least 1."),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100."),

    query("search")
        .optional()
        .trim(),

    query("category")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid category ID."),

    query("vendor")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid vendor ID."),

    query("branch")
        .optional()
        .custom((value) => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid branch ID."),

    query("isActive")
        .optional()
        .isBoolean()
        .withMessage("isActive must be true or false.")
];

module.exports = {
    createInventoryValidator,
    updateInventoryValidator,
    inventoryIdValidator,
    changeInventoryStatusValidator,
    getInventoriesValidator,
};