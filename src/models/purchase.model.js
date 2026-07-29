const mongoose = require("mongoose");
const User = require("../models/user.model");
const Branch = require("../models/branch.model");
const Vendor = require("../models/vendor.model");
const Inventory = require("../models/inventory.model");

const purchaseItemSchema = new mongoose.Schema(
    {
        inventory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Inventory",
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        purchasePrice: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        _id: false,
    }
);

const purchaseSchema = new mongoose.Schema(
    {
        purchaseNo: {
            type: String,
            trim: true,
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

        items: {
            type: [purchaseItemSchema],
            validate: {
                validator: (items) => items.length > 0,
                message: "At least one purchase item is required.",
            },
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        purchaseDate: {
            type: Date,
            default: Date.now,
        },

        notes: {
            type: String,
            trim: true,
            maxlength: 500,
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
        versionKey: false,
    }
);

// Indexes
purchaseSchema.index({ purchaseNo: 1 },{ unique: true });
purchaseSchema.index({ vendor: 1 });
purchaseSchema.index({ branch: 1 });
purchaseSchema.index({ purchaseDate: -1 });

module.exports = mongoose.model("Purchase", purchaseSchema);