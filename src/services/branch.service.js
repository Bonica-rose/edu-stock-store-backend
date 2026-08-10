const User = require("../models/user.model");
const Branch = require("../models/branch.model");
const ApiError = require("../utils/apiError.util");
const Inventory = require("../models/inventory.model");
const Asset = require("../models/asset.model");
const { logActivity } = require("./activity.service");
const { ROLES } = require("../constants/roles");
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require("../constants/activity.constants");

const createBranch = async (branchData, userId, requestInfo) => {
    // Check duplicate branch code
    const existingBranchCode = await Branch.findOne({
        branchCode: branchData.branchCode.toUpperCase(),
    });
    if (existingBranchCode) {
        throw new ApiError(409, "Branch code already exists.");
    }

    // Check duplicate branch name
    const existingBranchName = await Branch.findOne({
        branchName: {
            $regex: new RegExp(`^${branchData.branchName}$`, "i"),
        },
    });
    if (existingBranchName) {
        throw new ApiError(409, "Branch name already exists.");
    }

    const branch = await Branch.create({
        branchCode: branchData.branchCode.trim().toUpperCase(),
        branchName: branchData.branchName.trim(),
        address: branchData.address.trim(),
        city: branchData.city.trim(),
        state: branchData.state.trim(),
        country: branchData.country,
        phone: branchData.phone?.trim() || null,
        email: branchData.email?.trim().toLowerCase() || null,
        createdBy: userId,
        updatedBy: userId,
    });

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.BRANCH,
        action: ACTIVITY_ACTIONS.CREATE,
        recordId: branch._id,
        recordCode: branch.branchCode,
        description: `Created branch ${branch.branchName}.`,
        ...requestInfo,
    });

    return branch;
};

const getBranches = async (query) => {
    const {
        page = 1,
        limit = 10,
        search,
        city,
        state,
        isActive,
        sort = "-createdAt",
    } = query;

    const filter = {};

    if (search) {
        filter.$or = [
            { branchCode: { $regex: search, $options: "i" } },
            { branchName: { $regex: search, $options: "i" } },
            { city: { $regex: search, $options: "i" } },
            { state: { $regex: search, $options: "i" } },
        ];
    }

    if (city) {
        filter.city = city;
    }

    if (state) {
        filter.state = state;
    }

    if (typeof isActive !== "undefined") {
        filter.isActive = isActive === "true";
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [branches, total] = await Promise.all([
        Branch.find(filter)
            .populate("manager", "firstName lastName email")
            .populate("createdBy", "employeeId firstName lastName")
            .populate("updatedBy", "employeeId firstName lastName")
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .lean(),

        Branch.countDocuments(filter),
    ]);

    return {
        data: branches,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
};

const getBranchById = async (branchId) => {
    const branch = await Branch.findById(branchId)
        .populate("manager", "firstName lastName email phone")
        .populate("createdBy", "employeeId firstName lastName")
        .populate("updatedBy", "employeeId firstName lastName")
        .lean();

    if (!branch) {
        throw new ApiError(404, "Branch not found.");
    }

    return branch;
};

const updateBranch = async (branchId, branchData, userId, requestInfo) => {
    const branch = await Branch.findById(branchId);

    if (!branch) {
        throw new ApiError(404, "Branch not found.");
    }

    // Check duplicate branch name (if changed)
    if (
        branchData.branchName &&
        branchData.branchName.trim().toLowerCase() !==
            branch.branchName.toLowerCase()
    ) {
        const existingBranch = await Branch.findOne({
            branchName: {
                $regex: new RegExp(`^${branchData.branchName.trim()}$`, "i"),
            },
            _id: { $ne: branchId },
        });

        if (existingBranch) {
            throw new ApiError(409, "Branch name already exists.");
        }
    }

    // Validate and update manager
    if (branchData.manager !== undefined) {
        // Remove manager
        if (!branchData.manager) {
            branch.manager = null;
        } else {
            const manager = await User.findById(branchData.manager);

            if (!manager) {
                throw new ApiError(404, "Branch manager not found.");
            }

            if (!manager.isActive) {
                throw new ApiError(400, "Branch manager must be active.");
            }

            if (manager.role !== ROLES.BRANCH_ADMIN) {
                throw new ApiError(400, "Only Branch Admin can be assigned as Branch Manager.");
            }

            if (!manager.branch) {
                throw new ApiError(400, "Branch Admin is not assigned to any branch.");
            }

            if (!manager.branch.equals(branch._id)) {
                throw new ApiError(400, "Manager must belong to this branch.");
            }

            branch.manager = manager._id;
        }
    }

    // Update allowed fields
    if (branchData.branchName !== undefined) {
        branch.branchName = branchData.branchName.trim();
    }

    if (branchData.address !== undefined) {
        branch.address = branchData.address.trim();
    }

    if (branchData.city !== undefined) {
        branch.city = branchData.city.trim();
    }

    if (branchData.state !== undefined) {
        branch.state = branchData.state.trim();
    }

    if (branchData.country !== undefined) {
        branch.country = branchData.country?.trim() || "India";
    }

    if (branchData.phone !== undefined) {
        branch.phone = branchData.phone?.trim() || null;
    }

    if (branchData.email !== undefined) {
        branch.email = branchData.email?.trim().toLowerCase() || null;
    }

    branch.updatedBy = userId;
    await branch.save();

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.BRANCH,
        action: ACTIVITY_ACTIONS.UPDATE,
        recordId: branch._id,
        recordCode: branch.branchCode,
        description: `Updated branch ${branch.branchName}.`,
        ...requestInfo,
    });

    return await Branch.findById(branch._id)
        .populate("manager", "employeeId firstName lastName email phone")
        .populate("createdBy", "employeeId firstName lastName")
        .populate("updatedBy", "employeeId firstName lastName")
        .lean();
};

const changeBranchStatus = async (branchId, isActive, userId, requestInfo) => {
    const branch = await Branch.findById(branchId);

    if (!branch) {
        throw new ApiError(404, "Branch not found.");
    }

    // Prevent deactivating if active users exist
    if (!isActive) {
        const activeUsers = await User.exists({
            branch: branchId,
            isActive: true,
        });

        if (activeUsers) {
            throw new ApiError(400, "Cannot deactivate branch. Active users are assigned to this branch.");
        }

        // Check Inventory
        const inventoryExists = await Inventory.exists({ branch: branchId });
        if (inventoryExists) {
            throw new ApiError(400, "Cannot deactivate branch. Inventory exists.");
        }

        // Check Assets
        const assetExists = await Asset.exists({ branch: branchId, isActive: true });
        if (assetExists) {
            throw new ApiError(400, "Cannot deactivate branch. Active assets exist.");
        }
    }

    branch.isActive = isActive;
    branch.updatedBy = userId;

    await branch.save();

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.BRANCH,
        action: ACTIVITY_ACTIONS.STATUS_CHANGE,
        recordId: branch._id,
        recordCode: branch.branchCode,
        description: `${branch.branchName} branch was ${
            branch.isActive ? "activated" : "deactivated"
        }.`,
        metadata: {
            isActive: branch.isActive,
        },
        ...requestInfo,
    });

    return await Branch.findById(branch._id)
        .populate("manager", "employeeId firstName lastName")
        .populate("createdBy", "employeeId firstName lastName")
        .populate("updatedBy", "employeeId firstName lastName")
        .lean();
};

module.exports = {
    createBranch,
    getBranches,
    getBranchById,
    updateBranch,
    changeBranchStatus,
}
