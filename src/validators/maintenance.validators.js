const { body } = require("express-validator");
const { MAINTENANCE_PRIORITY, MAINTENANCE_STATUS } = require("../constants/maintenance.constants");
const { ASSET_CONDITION } = require("../constants/asset.constants");

const createMaintenanceValidator = [
    body("asset")
        .notEmpty()
        .withMessage("Asset is required.")
        .isMongoId()
        .withMessage("Invalid asset id."),

    body("issueTitle")
        .trim()
        .notEmpty()
        .withMessage("Issue title is required.")
        .isLength({ max: 100 })
        .withMessage("Issue title cannot exceed 100 characters."),

    body("description")
        .trim()
        .notEmpty()
        .withMessage("Description is required.")
        .isLength({ max: 1000 })
        .withMessage("Description cannot exceed 1000 characters."),

    body("priority")
        .optional()
        .isIn(Object.values(MAINTENANCE_PRIORITY))
        .withMessage("Invalid priority."),
];

const assignMaintenanceValidator = [
    body("assignedTo")
        .notEmpty()
        .withMessage("Assigned user is required.")
        .isMongoId()
        .withMessage("Invalid assigned user id."),
];

const updateMaintenanceStatusValidator = [
    body("status")
        .notEmpty()
        .withMessage("Status is required.")
        .isIn(Object.values(MAINTENANCE_STATUS))
        .withMessage("Invalid maintenance status."),
];

const completeMaintenanceValidator = [
    body("repairNotes")
        .trim()
        .notEmpty()
        .withMessage("Repair notes are required.")
        .isLength({ max: 1000 })
        .withMessage("Repair notes cannot exceed 1000 characters."),

    body("repairCost")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Repair cost must be a positive number."),

    body("partsReplaced")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Parts replaced cannot exceed 500 characters."),

    body("vendor")
        .optional({ nullable: true, checkFalsy: true })
        .isMongoId()
        .withMessage("Invalid vendor id."),
    
    body("assetCondition")
        .notEmpty()
        .withMessage("Asset condition is required.")
        .isIn([
            ASSET_CONDITION.GOOD,
            ASSET_CONDITION.DAMAGED,
        ])
        .withMessage("Invalid asset condition."),
];

module.exports = {
    createMaintenanceValidator,
    assignMaintenanceValidator,
    updateMaintenanceStatusValidator,
    completeMaintenanceValidator,
};