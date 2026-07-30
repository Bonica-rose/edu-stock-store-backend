const { body } = require("express-validator");

const updateSettingsValidator = [
    body("companyName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Company name is required."),

    body("companyEmail")
        .optional()
        .isEmail()
        .withMessage("Invalid company email."),

    body("companyPhone")
        .optional()
        .trim(),

    body("companyAddress")
        .optional()
        .trim(),

    body("companyLogo")
        .optional()
        .trim(),

    body("defaultCurrency")
        .optional()
        .isLength({ min: 3, max: 3 })
        .withMessage("Currency must be a 3-letter code."),

    body("timezone")
        .optional()
        .trim(),

    body("dateFormat")
        .optional()
        .isIn([
            "DD/MM/YYYY",
            "MM/DD/YYYY",
            "YYYY-MM-DD",
        ])
        .withMessage("Invalid date format."),

    body("lowStockThreshold")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Low stock threshold must be greater than 0."),

    body("isMaintenanceMode")
        .optional()
        .isBoolean()
        .withMessage("Maintenance mode must be true or false."),
];