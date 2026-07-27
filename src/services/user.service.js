const User = require("../models/user.model");
const Branch = require("../models/branch.model");
const ApiError = require("../utils/apiError.util");
const { hashPassword } = require("./auth.service");
const generateEmployeeId = require("../utils/generateEmployeeId.util");
const {
    ROLES,
    BRANCH_ADMIN_ALLOWED_USER_ROLES
} = require("../constants/roles");

const { mapUser, mapUsers } = require("../utils/userResponse.util");

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
    await user.populate("branch", "branchCode branchName")
        .populate("createdBy", "employeeId firstName lastName")
        .populate("updatedBy", "employeeId firstName lastName");

    return mapUser(user);
};

exports.getUsers = async (query, loggedInUser) => {

    // Only Super Admin and Branch Admin
    if (![ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN].includes(loggedInUser.role)) {
        throw new ApiError(403, "You are not allowed to view users.");
    }

    // ----------------------------
    // Query Parameters
    // ----------------------------
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(query.limit, 10) || 10, 1);
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const allowedSortFields = [
        "employeeId",
        "firstName",
        "lastName",
        "email",
        "role",
        "isActive",
        "lastLogin",
        "createdAt",
    ];

    const sortBy = allowedSortFields.includes(query.sortBy)
        ? query.sortBy
        : "createdAt";

    const order = query.order === "asc" ? 1 : -1;

    // ----------------------------
    // Base Filter
    // ----------------------------
    const filter = {
        deletedAt: null,
    };

    // Branch Admin can view only own branch
    if (loggedInUser.role === ROLES.BRANCH_ADMIN) {
        filter.branch = loggedInUser.branch;
    }

    // ----------------------------
    // Filters
    // ----------------------------

    if (query.role) {
        filter.role = query.role;
    }

    // Only Super Admin can filter by branch
    if (query.branch && loggedInUser.role === ROLES.SUPER_ADMIN) {
        filter.branch = query.branch;
    }

    if (query.isActive !== undefined) {
        filter.isActive = query.isActive === "true";
    }

    // ----------------------------
    // Search
    // ----------------------------
    if (search) {
        filter.$or = [
            { employeeId: { $regex: search, $options: "i" } },
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    // ----------------------------
    // Database
    // ----------------------------
    const totalRecords = await User.countDocuments(filter);

    const users = await User.find(filter)
        .select("-password -__v")
        .populate("branch", "branchCode branchName")
        .populate("createdBy", "employeeId firstName lastName")
        .populate("updatedBy", "employeeId firstName lastName")
        .sort({ [sortBy]: order })
        .skip(skip)
        .limit(limit)
        .lean();

    return {
        users: mapUsers(users),
        pagination: {
            page,
            limit,
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            hasNextPage: page * limit < totalRecords,
            hasPreviousPage: page > 1,
        },
    };
};