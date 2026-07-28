const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
    {
        vendorCode: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },

        vendorName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        contactPerson: {
            type: String,
            trim: true,
        },

        email: {
            type: String,
            lowercase: true,
            trim: true,
        },

        phone: {
            type: String,
            trim: true,
        },

        alternatePhone: {
            type: String,
            trim: true,
        },

        address: {
            type: String,
            trim: true,
        },

        city: {
            type: String,
            trim: true,
        },

        state: {
            type: String,
            trim: true,
        },

        country: {
            type: String,
            default: "India",
        },

        postalCode: {
            type: String,
            trim: true,
        },

        gstNumber: {
            type: String,
            trim: true,
        },

        website: {
            type: String,
            trim: true,
        },

        notes: {
            type: String,
            trim: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
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
    },
    {
        timestamps: true,
    }
);

//Indexes
vendorSchema.index({ vendorName: 1 });
vendorSchema.index({ vendorCode: 1 });
vendorSchema.index({ isActive: 1 });
vendorSchema.index({
    vendorName: "text",
    contactPerson: "text",
});

module.exports = mongoose.model("Vendor", vendorSchema);