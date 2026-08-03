const { body, param } = require("express-validator");
const mongoose = require("mongoose");

const objectIdValidator = (value) => mongoose.Types.ObjectId.isValid(value);

const createAssetValidator = [
    body("inventory")
        .notEmpty()
        .withMessage("Inventory is required.")
        .custom(objectIdValidator)
        .withMessage("Invalid inventory ID."),

    body("serialNumber")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 100 })
        .withMessage("Serial number cannot exceed 100 characters."),

    body("remarks")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Remarks cannot exceed 500 characters."),
];

const updateAssetValidator = [
    body("serialNumber")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 100 })
        .withMessage("Serial number cannot exceed 100 characters."),

    body("remarks")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Remarks cannot exceed 500 characters."),
];

const assignAssetValidator = [
    body("assignedTo")
        .notEmpty()
        .withMessage("User is required.")
        .custom(objectIdValidator)
        .withMessage("Invalid user ID."),

    body("remarks")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Remarks cannot exceed 500 characters."),
];

const returnAssetValidator = [
    body("remarks")
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Remarks cannot exceed 500 characters."),
];

const assetIdValidator = [
    param("id")
        .custom(objectIdValidator)
        .withMessage("Invalid asset ID."),
];

module.exports = {
    createAssetValidator,
    updateAssetValidator,
    assignAssetValidator,
    returnAssetValidator,
    assetIdValidator,
};