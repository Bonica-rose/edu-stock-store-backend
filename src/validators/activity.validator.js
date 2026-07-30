const { body, param } = require("express-validator");
const mongoose = require("mongoose");

const objectIdValidator = (value) => mongoose.Types.ObjectId.isValid(value);

const activityIdValidator = [
    param("id")
        .custom(objectIdValidator)
        .withMessage("Invalid activity ID."),
];

module.exports = {
    activityIdValidator
}