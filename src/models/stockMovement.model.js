const mongoose = require("mongoose");
const { STOCK_MOVEMENT_TYPES } = require("../constants/stockMovement.constants");
const User = require("../models/user.model");
const Branch = require("../models/branch.model");
const Inventory = require("../models/inventory.model");

const stockMovementSchema = new mongoose.Schema(
    {
        inventory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Inventory",
            required: true,
        },

        movementType: {
            type: String,
            enum: Object.values(STOCK_MOVEMENT_TYPES),
            required: true,
        },

        // affected branch: Used only when stock-in & stock-out
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        previousStock: {
            type: Number,
            required: true,
            min: 0,
        },

        newStock: {
            type: Number,
            required: true,
            min: 0,
        },

        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        remarks: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        // Used only when Transfer
        fromBranch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            default: null,
        },

        // Used only when Transfer
        toBranch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            default: null,
        },

        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    },
);

// Indexes
stockMovementSchema.index({ inventory: 1, createdAt: -1 }); // Inventory history
stockMovementSchema.index({ branch: 1, createdAt: -1 }); // Branch-wise stock movement reports

module.exports = mongoose.model("StockMovement", stockMovementSchema);