const { body, param } = require("express-validator");

exports.createVendorValidator = [
    body("vendorCode")
        .trim()
        .notEmpty()
        .withMessage("Vendor code is required.")
        .isLength({ min: 2, max: 20 })
        .withMessage("Vendor code must be between 2 and 20 characters.")
        .matches(/^[A-Za-z0-9-_]+$/)
        .withMessage("Vendor code can contain only letters, numbers, hyphens and underscores."),

    body("vendorName")
        .trim()
        .notEmpty()
        .withMessage("Vendor name is required.")
        .isLength({ min: 3, max: 100 })
        .withMessage("Vendor name must be between 3 and 100 characters."),

    body("contactPerson")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("Contact person cannot exceed 100 characters."),

    body("email")
        .optional({ values: "falsy" })
        .trim()
        .isEmail()
        .withMessage("Invalid email address.")
        .normalizeEmail(),

    body("phone")
        .trim()
        .notEmpty()
        .withMessage("Phone number is required.")
        .matches(/^[0-9]{10,15}$/)
        .withMessage("Phone number must contain 10 to 15 digits."),

    body("alternatePhone")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^[0-9]{10,15}$/)
        .withMessage("Alternate phone number must contain 10 to 15 digits."),

    body("address")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 255 })
        .withMessage("Address cannot exceed 255 characters."),

    body("city")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("City cannot exceed 100 characters."),

    body("state")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("State cannot exceed 100 characters."),

    body("country")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 100 })
        .withMessage("Country cannot exceed 100 characters."),

    body("postalCode")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 20 })
        .withMessage("Postal code cannot exceed 20 characters."),

    body("gstNumber")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .withMessage("Invalid GST number."),

    body("website")
        .optional({ values: "falsy" })
        .trim()
        .isURL()
        .withMessage("Invalid website URL."),

    body("notes")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 500 })
        .withMessage("Notes cannot exceed 500 characters."),
];

exports.updateVendorValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid vendor ID."),

    body("vendorCode")
        .optional()
        .trim()
        .isLength({ min: 2, max: 20 })
        .withMessage("Vendor code must be between 2 and 20 characters.")
        .matches(/^[A-Za-z0-9-_]+$/)
        .withMessage("Vendor code can contain only letters, numbers, hyphens and underscores."),

    body("vendorName")
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage("Vendor name must be between 3 and 100 characters."),

    body("contactPerson")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Contact person cannot exceed 100 characters."),

    body("email")
        .optional({ values: "falsy" })
        .trim()
        .isEmail()
        .withMessage("Invalid email address.")
        .normalizeEmail(),

    body("phone")
        .optional()
        .trim()
        .matches(/^[0-9]{10,15}$/)
        .withMessage("Phone number must contain 10 to 15 digits."),

    body("alternatePhone")
        .optional()
        .trim()
        .matches(/^[0-9]{10,15}$/)
        .withMessage("Alternate phone number must contain 10 to 15 digits."),

    body("address")
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage("Address cannot exceed 255 characters."),

    body("city")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("City cannot exceed 100 characters."),

    body("state")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("State cannot exceed 100 characters."),

    body("country")
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Country cannot exceed 100 characters."),

    body("postalCode")
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage("Postal code cannot exceed 20 characters."),

    body("gstNumber")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
        .withMessage("Invalid GST number."),

    body("website")
        .optional()
        .trim()
        .isURL()
        .withMessage("Invalid website URL."),

    body("notes")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Notes cannot exceed 500 characters."),
];

exports.changeVendorStatusValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid vendor ID."),
];

exports.deleteVendorValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid vendor ID."),
];

exports.getVendorValidator = [
    param("id")
        .isMongoId()
        .withMessage("Invalid vendor ID."),
];