const { ROLES } = require('../constants/roles'); 
const mongoose = require('mongoose');
const Branch = require("../models/branch.model")

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
        employeeId: {
            type: String,
            required: [true, 'Employee ID is required'],
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
            select: false,
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
        profileImage: {
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
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,         
    }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ employeeId: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ branch: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
