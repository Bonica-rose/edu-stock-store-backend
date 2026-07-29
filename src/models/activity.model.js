const mongoose = require("mongoose");

const {
    ACTIVITY_MODULES,
    ACTIVITY_ACTIONS,
} = require("../constants/activity.constants");

const activitySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        module: {
            type: String,
            enum: Object.values(ACTIVITY_MODULES),
            required: true,
            trim: true,
        },

        action: {
            type: String,
            enum: Object.values(ACTIVITY_ACTIONS),
            required: true,
            trim: true,
        },

        recordId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },

        recordCode: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            required: true,
            trim: true,
        },

        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        ipAddress: {
            type: String,
            default: null,
        },

        userAgent: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

activitySchema.index({ module: 1 });
activitySchema.index({ action: 1 });
activitySchema.index({ user: 1 });
activitySchema.index({ createdAt: -1 });
activitySchema.index({ recordId: 1 });

module.exports = mongoose.model("Activity", activitySchema);