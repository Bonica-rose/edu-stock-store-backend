const { body, param } = require("express-validator");
const mongoose = require("mongoose");

const objectIdValidator = (value) => mongoose.Types.ObjectId.isValid(value);

const createPurchaseValidator = [
    body("vendor")
        .notEmpty()
        .withMessage("Vendor is required.")
        .custom(objectIdValidator)
        .withMessage("Invalid vendor ID."),

    body("branch")
        .notEmpty()
        .withMessage("Branch is required.")
        .custom(objectIdValidator)
        .withMessage("Invalid branch ID."),

    body("items")
        .isArray({ min: 1 })
        .withMessage("At least one purchase item is required."),

    body("items.*.inventory")
        .notEmpty()
        .withMessage("Inventory is required.")
        .custom(objectIdValidator)
        .withMessage("Invalid inventory ID."),

    body("items.*.quantity")
        .isInt({ min: 1 })
        .withMessage("Quantity must be at least 1."),

    body("items.*.purchasePrice")
        .isFloat({ min: 0 })
        .withMessage("Purchase price must be 0 or greater."),

    body("purchaseDate")
        .optional()
        .isISO8601()
        .withMessage("Invalid purchase date."),

    body("notes")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Notes cannot exceed 500 characters."),
];

const purchaseIdValidator = [
    param("id")
        .custom(objectIdValidator)
        .withMessage("Invalid purchase ID."),
];

module.exports = {
    createPurchaseValidator,
    purchaseIdValidator,
};