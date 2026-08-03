const { body, param } = require("express-validator");
const mongoose = require("mongoose");


const objectIdValidator = (value) => {
    return mongoose.Types.ObjectId.isValid(value);
};


// Stock In / Stock Out
const stockMovementValidator = [
    body("inventory")
        .notEmpty()
        .withMessage("Inventory is required.")
        .custom(objectIdValidator)
        .withMessage("Invalid inventory ID."),

    body("quantity")
        .notEmpty()
        .withMessage("Quantity is required.")
        .isInt({ min: 1 })
        .withMessage("Quantity must be greater than zero."),

    body("reason")
        .trim()
        .notEmpty()
        .withMessage("Reason is required.")
        .isLength({ max: 100 })
        .withMessage("Reason cannot exceed 100 characters."),

    body("remarks")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Remarks cannot exceed 500 characters."),
];



// Transfer Stock
const transferStockValidator = [
    body("inventory")
        .notEmpty()
        .withMessage("Inventory is required.")
        .custom(objectIdValidator)
        .withMessage("Invalid inventory ID."),

    body("quantity")
        .notEmpty()
        .withMessage("Quantity is required.")
        .isInt({ min: 1 })
        .withMessage("Quantity must be greater than zero."),

    body("toBranch")
        .notEmpty()
        .withMessage("Destination branch is required.")
        .custom(objectIdValidator)
        .withMessage("Invalid destination branch ID."),

    body("reason")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Reason cannot exceed 100 characters."),

    body("remarks")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Remarks cannot exceed 500 characters."),
];



// Stock Adjustment
const adjustmentValidator = [
    body("inventory")
        .notEmpty()
        .withMessage("Inventory is required.")
        .custom(objectIdValidator)
        .withMessage("Invalid inventory ID."),

    body("quantity")
        .notEmpty()
        .withMessage("Adjustment quantity is required.")
        .isInt()
        .withMessage("Adjustment quantity must be an integer."),

    body("reason")
        .trim()
        .notEmpty()
        .withMessage("Adjustment reason is required.")
        .isLength({ max: 100 })
        .withMessage("Reason cannot exceed 100 characters."),

    body("remarks")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Remarks cannot exceed 500 characters."),
];



// Stock Movement ID
const stockMovementIdValidator = [
    param("id")
        .custom(objectIdValidator)
        .withMessage("Invalid stock movement ID."),
];


module.exports = {
    stockMovementValidator,
    transferStockValidator,
    adjustmentValidator,
    stockMovementIdValidator,
};