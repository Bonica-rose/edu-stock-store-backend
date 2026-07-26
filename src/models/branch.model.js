const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
    {
        branchCode: {
            type: String,
            required: [true, "Branch code is required"],
            trim: true,
            uppercase: true,
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
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: null,
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
    },
    {
        timestamps: true,
    }
);

// Indexes
branchSchema.index({ branchCode: 1 }, { unique: true });
branchSchema.index({ branchName: 1 });
branchSchema.index({ city: 1 });
branchSchema.index({ state: 1 });
branchSchema.index({ manager: 1 });
branchSchema.index({ isActive: 1 });

module.exports = mongoose.model("Branch", branchSchema);