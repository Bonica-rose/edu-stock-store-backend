const mongoose = require("mongoose");
const User = require("../models/user.model");
const { CATEGORY_TYPES } = require("../constants/category.constants");

const categorySchema = new mongoose.Schema(
    {
        categoryName: {
            type: String,
            required: [true, "Category name is required."],
            trim: true,
            maxlength: [100, "Category name cannot exceed 100 characters."],
        },

        categoryCode: {
            type: String,
            required: [true, "Category code is required."],
            trim: true,
            uppercase: true,
            maxlength: [20, "Category code cannot exceed 20 characters."],
        },

        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description cannot exceed 500 characters."],
            default: "",
        },

        type: {
            type: String,
            enum: Object.values(CATEGORY_TYPES),
            default: "Both",
            required: true,
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
categorySchema.index({ categoryName: 1 }, { unique: true });
categorySchema.index({ categoryCode: 1 }, { unique: true });
categorySchema.index({ type: 1 });
categorySchema.index({ isActive: 1 });

// Convert categoryName to title case
categorySchema.pre("save", function () {
    if (this.categoryName) {
        this.categoryName = this.categoryName
            .trim()
            .split(/\s+/)
            .map(
                (word) =>
                    word.charAt(0).toUpperCase() +
                    word.slice(1).toLowerCase()
            )
            .join(" ");
    }

    if (this.categoryCode) {
        this.categoryCode = this.categoryCode.trim().toUpperCase();
    }
});

module.exports = mongoose.model("Category", categorySchema);