const mongoose = require("mongoose");
const { MAINTENANCE_STATUS, MAINTENANCE_PRIORITY } = require("../constants/maintenance.constants");
// const User = require("../models/user.model");
// const Vendor = require("../models/vendor.model");
// const Asset = require("../models/asset.model");

const maintenanceSchema = new mongoose.Schema(
    {
        maintenanceId: {
            type: String,
            unique: true,
            required: true,
            trim: true,
        },

        asset: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Asset",
            required: true,
        },

        issueTitle: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        priority: {
            type: String,
            enum: Object.values(MAINTENANCE_PRIORITY),
            default: MAINTENANCE_PRIORITY.MEDIUM,
        },

        status: {
            type: String,
            enum: Object.values(MAINTENANCE_STATUS),
            default: MAINTENANCE_STATUS.PENDING,
        },

        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        assignedDate: {
            type: Date,
            default: null,
        },

        repairNotes: {
            type: String,
            trim: true,
            default: "",
        },

        partsReplaced: {
            type: String,
            trim: true,
            default: "",
        },

        repairCost: {
            type: Number,
            default: 0,
            min: 0,
        },

        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            default: null,
        },

        completedDate: {
            type: Date,
            default: null,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model("Maintenance", maintenanceSchema);