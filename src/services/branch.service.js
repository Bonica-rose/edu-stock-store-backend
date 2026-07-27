const Branch = require("../models/branch.model");
const ApiError = require("../utils/apiError.util");

const createBranch = async (branchData, userId) => {
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
        country: branchData.country.trim(),
        phone: branchData.phone?.trim() || null,
        email: branchData.email?.trim().toLowerCase() || null,
        manager: null,
        createdBy: userId,
        updatedBy: userId,
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

const updateBranch = async (branchId, branchData, userId) => {
    const branch = await Branch.findById(branchId);
    if (!branch) {
        throw new ApiError(404, "Branch not found.");
    }

    // Check duplicate branch name (if changed)
    if (branchData.branchName && branchData.branchName !== branch.branchName) {
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

    // Update only allowed fields
    if (branchData.branchName !== undefined)
        branch.branchName = branchData.branchName.trim();

    if (branchData.address !== undefined)
        branch.address = branchData.address.trim();

    if (branchData.city !== undefined)
        branch.city = branchData.city.trim();

    if (branchData.state !== undefined)
        branch.state = branchData.state.trim();

    if (branchData.country !== undefined)
        branch.country = branchData.country.trim();

    if (branchData.phone !== undefined)
        branch.phone = branchData.phone?.trim() || null;

    if (branchData.email !== undefined)
        branch.email = branchData.email?.trim().toLowerCase() || null;

    branch.updatedBy = userId;
    await branch.save();

    return await Branch.findById(branch._id)
        .populate("manager", "firstName lastName email phone")
        .populate("createdBy", "employeeId firstName lastName")
        .populate("updatedBy", "employeeId firstName lastName")
        .lean();
};

const changeBranchStatus = async (branchId, isActive, userId) => {
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

        // Future checks
        // const inventoryExists = await Inventory.exists({ branch: branchId });
        // if (inventoryExists) {
        //     throw new ApiError(
        //         400,
        //         "Cannot deactivate branch. Inventory exists."
        //     );
        // }

        // const assetExists = await Asset.exists({ branch: branchId, isActive: true });
        // if (assetExists) {
        //     throw new ApiError(
        //         400,
        //         "Cannot deactivate branch. Active assets exist."
        //     );
        // }
    }

    branch.isActive = isActive;
    branch.updatedBy = userId;

    await branch.save();

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
