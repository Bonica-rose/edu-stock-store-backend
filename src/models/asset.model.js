const mongoose = require("mongoose");
const { ASSET_STATUS } = require("../constants/asset.constants");
const User = require("../models/user.model");
const Branch = require("../models/branch.model");
const Inventory = require("../models/inventory.model");

const assignmentHistorySchema = new mongoose.Schema(
    {
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        assignedDate: {
            type: Date,
            required: true,
            default: Date.now,
        },

        assignmentRemarks: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        returnedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        returnedDate: {
            type: Date,
        },

        returnRemarks: {
            type: String,
            trim: true,
            maxlength: 500,
        },
    },
    {
        _id: false,
    }
);

const assetSchema = new mongoose.Schema(
    {
        assetCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        inventory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Inventory",
            required: true,
        },

        serialNumber: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
        },

        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
        },

        // For current assignment
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // For current assignment
        assignedDate: {
            type: Date,
        },

        assignmentHistory: {
            type: [assignmentHistorySchema],
            default: [],
        },

        // For current asset status
        status: {
            type: String,
            enum: Object.values(ASSET_STATUS),
            default: ASSET_STATUS.AVAILABLE,
        },

        remarks: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },

        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Indexes
assetSchema.index({ assetCode: 1 },{ unique: true });
assetSchema.index({ inventory: 1 });
assetSchema.index({ branch: 1 });
assetSchema.index({ assignedTo: 1 });
assetSchema.index({ status: 1 });

module.exports = mongoose.model("Asset", assetSchema);