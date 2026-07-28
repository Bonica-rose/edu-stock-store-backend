const mongoose = require("mongoose");
const User = require("../models/user.model");

const inventorySchema = new mongoose.Schema(
    {
        sku: {
            type: String, // itemCode
            required: true,
            trim: true,
            uppercase: true,
        },

        itemName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        barcode: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true,
        },

        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
        },

        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
        },

        currentStock: {
            type: Number,
            required: true,
            default: 0,
            min: 0, // qunatity
        },

        minimumStock: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },

        unit: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20, // Piece Pack Box Bottle Kg Litre Dozen Bundle
        },

        purchasePrice: {
            type: Number,
            required: true,
            min: 0, // Price of item per unit
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },

        itemImage: {
            type: String,
            default: null,
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
            default: null,
        },

        deletedBy: {
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
inventorySchema.index({ sku: 1 }, { unique: true });
inventorySchema.index({ branch: 1 });
inventorySchema.index({ category: 1 });
inventorySchema.index({ vendor: 1 });
inventorySchema.index({ itemName: 1 });
inventorySchema.index({ isActive: 1 });
inventorySchema.index({ isDeleted: 1 });
inventorySchema.index({ branch: 1, category: 1 });
inventorySchema.index({ branch: 1, isActive: 1 });

module.exports = mongoose.model("Inventory", inventorySchema);