const mongoose = require("mongoose");
const User = require("../models/user.model");

const branchSchema = new mongoose.Schema(
    {
        branchCode: {
            type: String,
            required: [true, "Branch code is required"],
            trim: true,
            uppercase: true,
            immutable: true,
        },

        branchName: {
            type: String,
            required: [true, "Branch name is required"],
            trim: true,
        },

        address: {
            type: String,
            required: [true, "Address is required"],
            trim: true,
        },

        city: {
            type: String,
            required: [true, "City is required"],
            trim: true,
        },

        state: {
            type: String,
            required: [true, "State is required"],
            trim: true,
        },

        country: {
            type: String,
            required: [true, "Country is required"],
            trim: true,
            default: "India",
        },

        phone: {
            type: String,
            trim: true,
            default: null,
            match: [/^[6-9]\d{9}$/, "Invalid phone number"],
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: null,
            match: [/^\S+@\S+\.\S+$/, "Invalid email"],
        },

        manager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

// Indexes
branchSchema.index({ branchCode: 1 }, { unique: true });
branchSchema.index({ branchName: 1 }, { unique: true });
branchSchema.index({ city: 1 });
branchSchema.index({ state: 1 });
branchSchema.index({ manager: 1 });
branchSchema.index({ isActive: 1 });

module.exports = mongoose.model("Branch", branchSchema);