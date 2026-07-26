const User = require("../models/user.model");
const Branch = require("../models/branch.model");
const ApiError = require("../utils/apiError.util");
const { hashPassword } = require("./auth.service");
const generateEmployeeId = require("../utils/generateEmployeeId.util");
const {
    ROLES,
    BRANCH_ADMIN_ALLOWED_USER_ROLES
} = require("../constants/roles");

const mapUserResponse = (user) => ({
    _id: user._id,
    employeeId: user.employeeId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    branch: user.branch,
    profileImage: user.profileImage,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

exports.createUser = async (userData, loggedInUser) => {
    const {
        firstName,
        lastName,
        email,
        password,
        phone,
        role,
        branch,
        profileImage,
    } = userData;

    // Only valid roles
    if (!Object.values(ROLES).includes(role)) {
        throw new ApiError(400, "Invalid role");
    }

    // Validate creator role 
    if (![ROLES.SUPER_ADMIN,ROLES.BRANCH_ADMIN].includes(loggedInUser.role)) {
        throw new ApiError(403, "You are not allowed to create users.");
    }

    // Validate Branch Admin restrictions
    if (loggedInUser.role === ROLES.BRANCH_ADMIN && branch.toString() !== loggedInUser.branch.toString()) {
        throw new ApiError(403, "Branch Admin can create users only in their own branch.");
    }

    // Branch Admin role restriction 
    if (loggedInUser.role === ROLES.BRANCH_ADMIN &&!BRANCH_ADMIN_ALLOWED_USER_ROLES.includes(role)) {
        throw new ApiError(403, "Branch Admin can create only Inventory Staff, Maintenance Staff and Auditor.");
    }

    // Check branch exists 
    const branchExists = await Branch.exists({ _id: branch, isActive: true,});
    if (!branchExists) {
        throw new ApiError(404, "Branch not found");
    }

    // Email already exists
    const existingUser = await User.findOne({email: email.toLowerCase().trim(), deletedAt: null });
    if (existingUser) {
        throw new ApiError(409, "Email already exists");
    }

    // Generate Employee ID
    const employeeId = await generateEmployeeId(role);

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        employeeId,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phone: phone?.trim() || null,
        role,
        branch,
        profileImage: profileImage ?? null,

        isActive: true,
        mustChangePassword: true,

        createdBy: loggedInUser._id,
        updatedBy: loggedInUser._id,
    });

    // Populated branch
    await user.populate("branch", "branchCode branchName");

    return mapUserResponse(user);
};