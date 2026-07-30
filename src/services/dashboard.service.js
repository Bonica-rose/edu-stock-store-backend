const User = require("../models/user.model");
const Branch = require("../models/branch.model");
const Vendor = require("../models/vendor.model");
const Inventory = require("../models/inventory.model");
const Asset = require("../models/asset.model");
const StockMovement = require("../models/stockMovement.model");
const Maintenance = require("../models/maintenance.model");
const Activity = require("../models/activity.model");
const ApiError = require("../utils/apiError.util");
const { ROLES } = require("../constants/roles");

const getAuditorDashboard = async (branchId) => {
    const [
        inventory,
        assets,
        movements,
        activities
    ] = await Promise.all([
        Inventory.countDocuments({
            branch: branchId,
            isDeleted: false
        }),

        Asset.countDocuments({
            branch: branchId,
            isDeleted: false
        }),

        StockMovement.countDocuments({
            branch: branchId
        }),

        Activity.find({ branch: branchId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("performedBy", "firstName lastName")
            .lean()
    ]);

    return {
        summary: {
            inventory,
            assets,
            movements
        },
        recentActivities: activities
    };
};

const getMaintenanceDashboard = async (branchId) => {
    const [
        pending,
        inProgress,
        completed
    ] = await Promise.all([
        Maintenance.countDocuments({
            branch: branchId,
            status: "Pending"
        }),

        Maintenance.countDocuments({
            branch: branchId,
            status: "In Progress"
        }),

        Maintenance.countDocuments({
            branch: branchId,
            status: "Completed"
        })
    ]);

    return {
        summary: {
            pending,
            inProgress,
            completed
        }
    };
};

const getInventoryDashboard = async (branchId) => {
    const [
        inventory,
        lowStock,
        stockInToday,
        stockOutToday
    ] = await Promise.all([
        Inventory.countDocuments({
            branch: branchId,
            isDeleted: false
        }),

        Inventory.countDocuments({
            branch: branchId,
            isDeleted: false,
            $expr: {
                $lte: ["$currentStock", "$minimumStock"]
            }
        }),

        StockMovement.countDocuments({
            branch: branchId,
            movementType: "STOCK_IN"
        }),

        StockMovement.countDocuments({
            branch: branchId,
            movementType: "STOCK_OUT"
        })
    ]);

    return {
        summary: {
            inventory,
            lowStock,
            stockInToday,
            stockOutToday
        }
    };
};

const getBranchAdminDashboard = async (branchId) => {
    const [
        inventory,
        assets,
        users,
        maintenance,
        lowStock,
        recentActivities
    ] = await Promise.all([
        Inventory.countDocuments({ branch: branchId, isDeleted: false }),
        Asset.countDocuments({ branch: branchId, isDeleted: false }),
        User.countDocuments({ branch: branchId, isDeleted: false }),
        Maintenance.countDocuments({ branch: branchId }),
        Inventory.countDocuments({
            branch: branchId,
            isDeleted: false,
            $expr: { $lte: ["$currentStock", "$minimumStock"] }
        }),
        Activity.find({ branch: branchId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("performedBy", "firstName lastName")
            .lean()
    ]);

    return {
        summary: {
            inventory,
            assets,
            users,
            maintenance,
            lowStock
        },
        recentActivities
    };
};

const getSuperAdminDashboard = async () => {
    const [
        totalBranches,
        totalUsers,
        totalVendors,
        totalInventory,
        totalAssets,
        lowStock,
        maintenance,
        recentActivities
    ] = await Promise.all([
        Branch.countDocuments({ isDeleted: false }),
        User.countDocuments({ isDeleted: false }),
        Vendor.countDocuments({ isDeleted: false }),
        Inventory.countDocuments({ isDeleted: false }),
        Asset.countDocuments({ isDeleted: false }),
        Inventory.countDocuments({
            isDeleted: false,
            $expr: { $lte: ["$currentStock", "$minimumStock"] }
        }),
        Maintenance.countDocuments({
            status: { $in: ["Pending", "In Progress"] }
        }),
        Activity.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("performedBy", "firstName lastName")
            .lean()
    ]);

    return {
        summary: {
            totalBranches,
            totalUsers,
            totalVendors,
            totalInventory,
            totalAssets,
            lowStock,
            maintenance
        },
        recentActivities
    };
};

const getDashboard = async (user) => {
    switch (user.role) {
        case ROLES.SUPER_ADMIN:
            return getSuperAdminDashboard();

        case ROLES.BRANCH_ADMIN:
            return getBranchAdminDashboard(user.branch);

        case ROLES.INVENTORY_STAFF:
            return getInventoryDashboard(user.branch);

        case ROLES.MAINTENANCE_STAFF:
            return getMaintenanceDashboard(user.branch);

        case ROLES.AUDITOR:
            return getAuditorDashboard(user.branch);

        default:
            throw new ApiError(403, "Unauthorized access.");
    }
};

module.exports = {
    getDashboard,
};