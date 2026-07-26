const { ROLES } = require('../constants/roles'); 
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
        },
        phone: {
            type: String,
            trim: true,
            default: null,
        },
        role: {
            type: String,
            required: [true, 'Role is required'],
            enum: {
                values: Object.values(ROLES || {}), 
                message: '{VALUE} is not a valid role',
            },
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch', // Must match your branches model name
            required: [true, 'Branch reference is required'],
        },
        avatar: {
            type: String,
            default: null,
        },
        isActive: {
            type: Boolean,
            required: [true, 'Active status is required'],
            default: true,
        },
        mustChangePassword: {
            type: Boolean,
            default: true
        },

        passwordChangedAt: {
            type: Date,
            default: null,
        },
        lastLogin: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true, 
    }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ branch: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
