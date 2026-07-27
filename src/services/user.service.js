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
    const { firstName, lastName, email, password, phone, role, branch, profileImage} = userData;

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

    // Identical-name check
    if (firstName.trim().toLowerCase() === lastName.trim().toLowerCase()) {
        throw new ApiError(400, "Last name cannot be identical to first name");
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

exports.getUserById = async (userId, loggedInUser) => {

    const user = await User.findOne({_id: userId, deletedAt: null})
        .select("-password -__v")
        .populate("branch", "branchCode branchName")
        .populate("createdBy", "employeeId firstName lastName")
        .populate("updatedBy", "employeeId firstName lastName");

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Branch Admin can view only users in their own branch.
    if (
        loggedInUser.role === ROLES.BRANCH_ADMIN &&
        user.branch &&
        user.branch._id.toString() !== loggedInUser.branch.toString()
    ) {
        throw new ApiError(403,"You are not allowed to view users from another branch.");
    }

    return mapUser(user);
};

exports.updateUser = async (userId, userData, loggedInUser) => {

    /* To update user, it may contain only firstName, lastName, email, password, 
     phone, role, branch, profileImage, isActive */

    const user = await User.findOne({_id: userId, deletedAt: null});
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Branch Admin Business Rules
    if (loggedInUser.role === ROLES.BRANCH_ADMIN) {

        // Can update only users in own branch
        if (user.branch.toString() !== loggedInUser.branch.toString()) {
            throw new ApiError(403, "You can update only users in your own branch.");
        }

        // Cannot update another Branch Admin or Super Admin
        if ([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN].includes(user.role)) {
            throw new ApiError(403,"You cannot update this user.");
        }

        // Cannot promote users
        if (userData.role && !BRANCH_ADMIN_ALLOWED_USER_ROLES.includes(userData.role)) {
            throw new ApiError(403, "Branch Admin cannot assign this role.");
        }

        // Cannot move user to another branch
        if (userData.branch && userData.branch.toString() !== loggedInUser.branch.toString()) {
            throw new ApiError(403, "Users can only belong to your own branch.");
        }
    }

    // Email uniqueness 
    if (userData.email && userData.email.trim().toLowerCase() !== user.email) {

        const emailExists = await User.exists({
            email: userData.email.trim().toLowerCase(),
            deletedAt: null,
            _id: { $ne: userId },
        });

        if (emailExists) {
            throw new ApiError(409, "Email already exists");
        }

        user.email = userData.email.trim().toLowerCase();
    }

    // Validate branch  
    if (userData.branch) {

        const branchExists = await Branch.exists({
            _id: userData.branch,
            isActive: true,
        });

        if (!branchExists) {
            throw new ApiError(404, "Branch not found");
        }

        user.branch = userData.branch;
    }

    const newFirstName = userData.firstName ?? user.firstName;
    const newLastName = userData.lastName ?? user.lastName;
    if (newFirstName.trim().toLowerCase() === newLastName.trim().toLowerCase()) {
        throw new ApiError(400, "Last name cannot be identical to first name");
    }

    // Update allowed fields only
    if (userData.firstName !== undefined)
        user.firstName = userData.firstName.trim();

    if (userData.lastName !== undefined)
        user.lastName = userData.lastName.trim();

    if (userData.phone !== undefined)
        user.phone = userData.phone?.trim() || null;

    if (userData.role !== undefined)
        user.role = userData.role;

    if (userData.profileImage !== undefined)
        user.profileImage = userData.profileImage || null;

    if (userData.isActive !== undefined)
        user.isActive = userData.isActive;

    user.updatedBy = loggedInUser._id;
    await user.save();

    await user.populate("branch", "branchCode branchName");
    await user.populate("createdBy", "employeeId firstName lastName");
    await user.populate("updatedBy", "employeeId firstName lastName");

    return mapUser(user);
};

exports.updateOwnProfile = async (userId, profileData) => {

    /* To update own profile, it may contain only firstName, lastName, phone, profileImage */

    const user = await User.findOne({_id: userId, deletedAt: null});
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const newFirstName = profileData.firstName ?? user.firstName;
    const newLastName = profileData.lastName ?? user.lastName;
    if (newFirstName.trim().toLowerCase() === newLastName.trim().toLowerCase()) {
        throw new ApiError(400, "Last name cannot be identical to first name");
    }

    // Update only allowed fields
    if (profileData.firstName !== undefined) {
        user.firstName = profileData.firstName.trim();
    }

    if (profileData.lastName !== undefined) {
        user.lastName = profileData.lastName.trim();
    }

    if (profileData.phone !== undefined) {
        user.phone = profileData.phone?.trim() || null;
    }

    if (profileData.profileImage !== undefined) {
        user.profileImage = profileData.profileImage || null;
    }

    user.updatedBy = user._id;
    await user.save();

    await user.populate("branch", "branchCode branchName");
    await user.populate("createdBy", "employeeId firstName lastName");
    await user.populate("updatedBy", "employeeId firstName lastName");

    return mapUser(user);
};

exports.changeUserStatus = async (userId, isActive, loggedInUser) => {

    const user = await User.findOne({_id: userId,deletedAt: null });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Prevent self deactivation
    if (user._id.toString() === loggedInUser._id.toString()) {
        throw new ApiError(400, "You cannot change your own account status.");
    }

    // Prevent deactivate of users in other branch 
    if (loggedInUser.role === ROLES.BRANCH_ADMIN) {

        if (user.branch.toString() !== loggedInUser.branch.toString()) {
            throw new ApiError(
                403, "You can change status only for users in your own branch.");
        }

        if (!BRANCH_ADMIN_ALLOWED_USER_ROLES.includes(user.role)) {
            throw new ApiError(403, "You cannot change the status of this user.");
        }
    }

    user.isActive = isActive;
    user.updatedBy = loggedInUser._id;
    await user.save();

    return mapUser(user);
};

exports.deleteUser = async (userId, loggedInUser) => {

    const user = await User.findOne({_id: userId,deletedAt: null });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Prevent self deletion
    if (user._id.toString() === loggedInUser._id.toString()) {
        throw new ApiError(400, "You cannot delete your own account.");
    }

    if (loggedInUser.role !== ROLES.SUPER_ADMIN) {
        throw new ApiError(403, "Only Super Admin can delete users.");
    }

    user.deletedAt = new Date();
    user.isActive = false;
    user.updatedBy = loggedInUser._id;
    await user.save();

    return;
};