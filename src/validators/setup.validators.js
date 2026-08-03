const { body } = require("express-validator");

exports.setupValidator = [
    body("firstName")
        .trim()
        .notEmpty()
        .withMessage("First name is required."),

    body("lastName")
        .trim()
        .notEmpty()
        .withMessage("Last name is required."),

    body("email")
        .trim()
        .isEmail()
        .withMessage("Valid email is required.")
        .normalizeEmail(),

    body("password")
        .isStrongPassword({
            minLength: 8,
            minUppercase: 1,
            minLowercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        })
        .withMessage("Password does not meet policy."),
];