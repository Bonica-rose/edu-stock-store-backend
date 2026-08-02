const { body } = require("express-validator");

const updateSettingsValidator = [

    body("companyName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Company name is required.")
        .isLength({ max: 100 })
        .withMessage("Company name cannot exceed 100 characters."),

    body("companyEmail")
        .optional({ values: "falsy" })
        .trim()
        .isEmail()
        .withMessage("Invalid company email."),

    body("companyPhone")
        .optional({ values: "falsy" })
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage("Enter a valid 10-digit phone number."),

    body("companyAddress")
        .optional({ values: "falsy" })
        .trim()
        .isLength({ max: 250 }).withMessage("Company address cannot exceed 250 characters.")
        .matches(/^[a-zA-Z0-9\s,.'-]*$/)
        .withMessage("Address can only contain letters, numbers, spaces, and , . ' - characters."),

    body("companyLogo")
        .optional()
        .trim(),

    body("defaultCurrency")
        .optional()
        .trim()
        .isLength({ min: 3, max: 3 })
        .withMessage("Currency must be a 3-letter code.")
        .isUppercase()
        .withMessage("Currency must be uppercase."),

    body("timezone")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Timezone is required."),

    body("dateFormat")
        .optional()
        .isIn([
            "DD/MM/YYYY",
            "MM/DD/YYYY",
            "YYYY-MM-DD",
        ])
        .withMessage("Invalid date format."),

    body("lowStockQuantityThreshold")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Low stock threshold must be greater than 0."),

    body("predictionAlertDays")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Prediction Alert Days must be greater than 0."),

    body("predictionHistoryDays")
        .optional()
        .isInt({ min: 7 })
        .withMessage("Prediction History Days must be at least 7."),

    body("isMaintenanceMode")
        .optional()
        .isBoolean()
        .withMessage("Maintenance mode must be true or false."),
];

module.exports = {
    updateSettingsValidator,
};