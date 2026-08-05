const mongoose = require("mongoose");
const User = require("../models/user.model");
const Branch = require("../models/branch.model");
const ApiError = require("../utils/apiError.util");
const { hashPassword } = require("./auth.service");
const generateEmployeeId = require("../utils/generateEmployeeId.util");
const { ROLES, BRANCH_ADMIN_ALLOWED_USER_ROLES } = require("../constants/roles");
const Activity = require("../models/activity.model");
const { logActivity } = require("./activity.service");
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require("../constants/activity.constants");
const { mapUser, mapUsers } = require("../utils/userResponse.util");
const { uploadToCloudinary, deleteFromCloudinary } = require("../utils/cloudinary");


exports.createUser = async (userData, loggedInUser, requestInfo) => {
    const { firstName, lastName, email, password, phone, role, branch, profileImage} = userData;

    // Validate role
    if (!Object.values(ROLES).includes(role)) {
        throw new ApiError(400, "Invalid role.");
    }

    // Only Super Admin & Branch Admin can create users
    if (![ROLES.SUPER_ADMIN,ROLES.BRANCH_ADMIN].includes(loggedInUser.role)) {
        throw new ApiError(403, "You are not allowed to create users.");
    }

    // Branch Admin restrictions
    if (loggedInUser.role === ROLES.BRANCH_ADMIN) {
        // Can create users only in own branch
        if (branch.toString() !== loggedInUser.branch.toString()) {
            throw new ApiError(403, "Branch Admin can create users only in their own branch.");
        }

        // Can create only allowed roles
        if (!BRANCH_ADMIN_ALLOWED_USER_ROLES.includes(role)) {
            throw new ApiError(403, "Branch Admin can create only Inventory Staff, Maintenance Staff and Auditor.");
        }
    }

    // Validate branch
    const branchExists = await Branch.exists({ _id: branch, isActive: true,});
    if (!branchExists) {
        throw new ApiError(404, "Branch not found");
    }

    // Only one Branch Admin per branch
    if (role === ROLES.BRANCH_ADMIN) {
        const existingBranchAdmin = await User.findOne({
            role: ROLES.BRANCH_ADMIN,
            branch,
            deletedAt: null,
        });

        if (existingBranchAdmin) {
            throw new ApiError(409, "This branch already has a Branch Admin.");
        }
    }

    // Email uniqueness
    const existingUser = await User.findOne({email: email.toLowerCase().trim(), deletedAt: null });
    if (existingUser) {
        throw new ApiError(409, "Email already exists");
    }

    // Identical First name & Last name
    if (firstName.trim().toLowerCase() === lastName.trim().toLowerCase()) {
        throw new ApiError(400, "Last name cannot be identical to first name");
    }

    // Generate Employee ID
    const employeeId = await generateEmployeeId(role);

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Transaction starts here
    const session = await mongoose.startSession();
    let user;
    try {
        session.startTransaction();

        // Create user
        user = await User.create(
            [{
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                employeeId,
                email: email.trim().toLowerCase(),
                password: hashedPassword,
                phone: phone?.trim() || null,
                role,
                branch,
                profileImage: profileImage ?? null,

                isActive: true,
                mustChangePassword: true,

                createdBy: loggedInUser._id,
                updatedBy: loggedInUser._id,
            }],
            { session }
        );
        user = user[0];

        // Update(Synchronize) Branch Manager
        if (role === ROLES.BRANCH_ADMIN) {
            await Branch.findByIdAndUpdate(branch,{
                manager: user._id,
            },{ session });
        }

        await session.commitTransaction();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
    
    await user.populate([
        { path: "branch", select: "branchCode branchName" },
        { path: "createdBy", select: "employeeId firstName lastName" },
        { path: "updatedBy", select: "employeeId firstName lastName" },
    ]);

    try {
        await logActivity({
            user: loggedInUser._id,
            module: ACTIVITY_MODULES.USER,
            action: ACTIVITY_ACTIONS.CREATE,
            recordId: user._id,
            recordCode: user.employeeId,
            description: `Created user ${user.firstName} ${user.lastName}.`,
            ...requestInfo,
        });
    } catch (err) {
        console.error("Activity logging failed:", err);
    }

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

exports.updateUser = async (userId, userData, loggedInUser, requestInfo) => {

    /* To update user, it may contain only firstName, lastName, email, password, 
     phone, role, branch, profileImage, isActive */
    
    const session = await mongoose.startSession();    
    try {
        session.startTransaction();

        const user = await User.findOne({_id: userId, deletedAt: null}).session(session);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Save old values for synchronization
        const oldRole = user.role;
        const oldBranch = user.branch?.toString();

        // Branch Admin restrictions
        if (loggedInUser.role === ROLES.BRANCH_ADMIN) {

            // Can update only users in own branch
            if (user.branch.toString() !== loggedInUser.branch.toString()) {
                throw new ApiError(403, "You can update only users in your own branch.");
            }

            // Cannot update another Branch Admin or Super Admin
            if ([ROLES.SUPER_ADMIN, ROLES.BRANCH_ADMIN].includes(user.role)) {
                throw new ApiError(403,"You cannot update this user.");
            }

            // Cannot assign restricted users
            if (userData.role && !BRANCH_ADMIN_ALLOWED_USER_ROLES.includes(userData.role)) {
                throw new ApiError(403, "Branch Admin cannot assign this role.");
            }

            // Cannot move user to another branch
            if (userData.branch && userData.branch.toString() !== loggedInUser.branch.toString()) {
                throw new ApiError(403, "Users can only belong to your own branch.");
            }
        }

        // Email uniqueness 
        // if (userData.email && userData.email.trim().toLowerCase() !== user.email) {
        //     const emailExists = await User.exists({
        //         email: userData.email.trim().toLowerCase(),
        //         deletedAt: null,
        //         _id: { $ne: userId },
        //     }).session(session);

        //     if (emailExists) {
        //         throw new ApiError(409, "Email already exists");
        //     }
        // }
        //  FIXED: Added type checking and safe string trimming
        if (userData.email && typeof userData.email === "string" && userData.email.trim()) {
            const trimmedEmail = userData.email.trim().toLowerCase();
            
            if (trimmedEmail !== user.email) {
                const emailExists = await User.exists({
                    email: trimmedEmail,
                    deletedAt: null,
                    _id: { $ne: userId },
                }).session(session);

                if (emailExists) {
                    throw new ApiError(409, "Email already exists");
                }
            }
        }


        // Branch  Validation
        if (userData.branch) {
            const branchExists = await Branch.exists({
                _id: userData.branch,
                isActive: true,
            }).session(session);

            if (!branchExists) {
                throw new ApiError(404, "Branch not found");
            }
        }

        // Branch Admin uniqueness
        const newRole = userData.role ?? user.role;
        const newBranch = userData.branch ?? user.branch;

        if (newRole === ROLES.BRANCH_ADMIN) {
            const existingBranchAdmin = await User.findOne({
                role: ROLES.BRANCH_ADMIN,
                branch: newBranch,
                deletedAt: null,
                _id: { $ne: userId },
            }).session(session);

            if (existingBranchAdmin) {
                throw new ApiError(409, "This branch already has a Branch Admin.");
            }
        }

        // First & Last name validation
        const newFirstName = userData.firstName ?? user.firstName;
        const newLastName = userData.lastName ?? user.lastName;
        // Dangerous (Crashes if fields are missing or not strings
        // FIXED: Added type checking and safe string trimming        
        if (
            typeof newFirstName === 'string' && typeof newLastName === 'string' &&
            newFirstName.trim().toLowerCase() === newLastName.trim().toLowerCase()
        ) {
            throw new ApiError(400, "Last name cannot be identical to first name");
        }

        
        // Role changed -> Generate new Employee ID
        if (userData.role && userData.role !== oldRole) {
            user.employeeId = await generateEmployeeId(userData.role);
        }

        // Update allowed fields only
        if (userData.firstName !== undefined)
            user.firstName = userData.firstName.trim();

        if (userData.lastName !== undefined)
            user.lastName = userData.lastName.trim();

        if (userData.email !== undefined)
            user.email = userData.email.trim().toLowerCase();

        if (userData.phone !== undefined)
            user.phone = userData.phone?.trim() || null;

        if (userData.role !== undefined)
            user.role = userData.role;

        if (userData.branch !== undefined)
            user.branch = userData.branch;    

        if (userData.profileImage !== undefined)
            user.profileImage = userData.profileImage || null;

        if (userData.isActive !== undefined)
            user.isActive = userData.isActive;

        user.updatedBy = loggedInUser._id;
        await user.save({ session });

        /* -----------------------------
        ** Synchronize Branch.manager
        ----------------------------- */

        // Demoted or moved away from old branch
        if (
            oldRole === ROLES.BRANCH_ADMIN &&
            (newRole !== ROLES.BRANCH_ADMIN || oldBranch !== newBranch.toString())
        ) {
            await Branch.findByIdAndUpdate(oldBranch, {
                manager: null,
            },{ session });
        }

        // Assigned or moved as Branch Admin
        if (newRole === ROLES.BRANCH_ADMIN) {
            await Branch.findByIdAndUpdate(newBranch, {
                manager: user._id,
            },{ session });
        }

        await session.commitTransaction();

        await user.populate("branch", "branchCode branchName");
        await user.populate("createdBy", "employeeId firstName lastName");
        await user.populate("updatedBy", "employeeId firstName lastName");

        await logActivity({
            user: loggedInUser._id,
            module: ACTIVITY_MODULES.USER,
            action: ACTIVITY_ACTIONS.UPDATE,
            recordId: user._id,
            recordCode: user.employeeId,
            description: `Updated user ${user.firstName} ${user.lastName}.`,
            ...requestInfo,
        });

        return mapUser(user);
                
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

exports.updateOwnProfile = async (userId, file, profileData) => {

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

    if (file) {
        await deleteFromCloudinary(user.profileImagePublicId);

        const photo = await uploadToCloudinary(
            file.path,
            "edu-stock-store/users"
        );

        user.profileImage = photo.url;
        user.profileImagePublicId = photo.publicId;
    }

    user.updatedBy = user._id;
    await user.save();

    await user.populate("branch", "branchCode branchName");
    await user.populate("createdBy", "employeeId firstName lastName");
    await user.populate("updatedBy", "employeeId firstName lastName");

    return mapUser(user);
};

exports.getProfileActivity = async (userId) => {

    return await Activity.find({user: userId, module: ACTIVITY_MODULES.AUTH, })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("action description ipAddress userAgent createdAt");
};

exports.changeUserStatus = async (userId, isActive, loggedInUser, requestInfo) => {

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const user = await User.findOne({_id: userId,deletedAt: null }).session(session);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Prevent self status change
        if (user._id.toString() === loggedInUser._id.toString()) {
            throw new ApiError(400, "You cannot change your own account status.");
        }

        // Branch Admin restrictions
        if (loggedInUser.role === ROLES.BRANCH_ADMIN) {

            // Can manage only users in own branch
            if (user.branch.toString() !== loggedInUser.branch.toString()) {
                throw new ApiError(403, "You can change status only for users in your own branch.");
            }

            // Cannot change Super Admin or Branch Admin
            if (!BRANCH_ADMIN_ALLOWED_USER_ROLES.includes(user.role)) {
                throw new ApiError(403, "You cannot change the status of this user.");
            }
        }

        // Already in requested status
        if (user.isActive === isActive) {
            throw new ApiError(400, `User is already ${isActive ? "active" : "inactive"}.` );
        }

        user.isActive = isActive;
        user.updatedBy = loggedInUser._id;
        await user.save({ session });

        // Synchronize Branch Manager 
        if (user.role === ROLES.BRANCH_ADMIN) {
            if (!isActive) {                
                // Remove manager when Branch Admin is deactivated
                await Branch.findByIdAndUpdate(user.branch,{
                    manager: null,
                },{ session });
            } else {
                // Ensure another active Branch Admin doesn't exist
                const existingBranchAdmin = await User.findOne({
                    _id: { $ne: user._id },
                    role: ROLES.BRANCH_ADMIN,
                    branch: user.branch,
                    isActive: true,
                    deletedAt: null,
                }).session(session);

                if (existingBranchAdmin) {
                    throw new ApiError(409, "This branch already has an active Branch Admin.");
                }
                await Branch.findByIdAndUpdate(user.branch,{
                    manager: user._id,
                },{ session });
            }
        }

        await session.commitTransaction();

        await user
            .populate("branch", "branchCode branchName")
            .populate("createdBy", "employeeId firstName lastName")
            .populate("updatedBy", "employeeId firstName lastName");
        
        await logActivity({
            user: loggedInUser._id,
            module: ACTIVITY_MODULES.USER,
            action: ACTIVITY_ACTIONS.STATUS_CHANGE,
            recordId: user._id,
            recordCode: user.employeeId,
            description: `${user.firstName} ${user.lastName} was ${
                user.isActive ? "activated" : "deactivated"
            }.`,
            metadata: {
                isActive: user.isActive,
            },
            ...requestInfo,
        });

        return mapUser(user);

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

exports.deleteUser = async (userId, loggedInUser, requestInfo) => {

    const user = await User.findOne({_id: userId, deletedAt: null });
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

    await logActivity({
        user: loggedInUser._id,
        module: ACTIVITY_MODULES.USER,
        action: ACTIVITY_ACTIONS.DELETE,
        recordId: user._id,
        recordCode: user.employeeId,
        description: `Deleted user ${user.firstName} ${user.lastName}.`,
        ...requestInfo,
    });

    return;
};