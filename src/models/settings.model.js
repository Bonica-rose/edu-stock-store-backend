const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
    {
        // Company Information
        companyName: {
            type: String,
            required: true,
            trim: true,
            default: "Edu Stock&Store",
        },

        companyEmail: {
            type: String,
            trim: true,
            lowercase: true,
            default: "",
        },

        companyPhone: {
            type: String,
            trim: true,
            default: "",
        },

        companyAddress: {
            type: String,
            trim: true,
            default: "",
        },

        companyLogo: {
            type: String,
            default: "",
        },

        // System Settings
        defaultCurrency: {
            type: String,
            default: "INR",
        },

        timezone: {
            type: String,
            default: "Asia/Kolkata",
        },

        dateFormat: {
            type: String,
            default: "DD/MM/YYYY",
        },

        // Inventory
        lowStockThreshold: {
            type: Number,
            default: 10,
            min: 1,
        },

        // General
        isMaintenanceMode: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

module.exports = mongoose.model("Setting", settingsSchema);