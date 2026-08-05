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
const { getSettings } = require("./settings.service");

const getAuditorDashboard = async (branchId) => {
    const [
        inventory,
        assets,
        movements,
        activities
    ] = await Promise.all([
        Inventory.countDocuments({
            branch: branchId,
            isDeleted: null
        }),

        Asset.countDocuments({
            branch: branchId,
            isDeleted: null
        }),

        StockMovement.countDocuments({
            branch: branchId
        }),

        Activity.find({ branch: branchId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("user", "firstName lastName")
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

    const settings = await getSettings();

    const [
        inventory,
        lowStock,
        stockInToday,
        stockOutToday
    ] = await Promise.all([
        Inventory.countDocuments({
            branch: branchId,
            isDeleted: null
        }),

        Inventory.countDocuments({
            branch: branchId,
            isDeleted: null,
            $expr: {
                $lte: ["$currentStock", settings.lowStockQuantityThreshold]
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
    const settings = await getSettings();

    const [
        inventory,
        assets,
        users,
        maintenance,
        lowStock,
        recentActivities
    ] = await Promise.all([
        Inventory.countDocuments({ branch: branchId, isDeleted: null }),
        Asset.countDocuments({ branch: branchId, isDeleted: null }),
        User.countDocuments({ branch: branchId, isDeleted: null }),
        Maintenance.countDocuments({ branch: branchId }),
        Inventory.countDocuments({
            branch: branchId,
            isDeleted: null,
            $expr: { $lte: ["$currentStock", settings.lowStockQuantityThreshold] }
        }),
        Activity.find({ branch: branchId })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("user", "firstName lastName")
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

    const settings = await getSettings();

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
        Branch.countDocuments({ isDeleted: null }),
        User.countDocuments({ isDeleted: null }),
        Vendor.countDocuments({ isDeleted: null }),
        Inventory.countDocuments({ isDeleted: null }),
        Asset.countDocuments({ isDeleted: null }),
        Inventory.countDocuments({
            isDeleted: null,
            $expr: { $lte: ["$currentStock", settings.lowStockQuantityThreshold] }
        }),
        Maintenance.countDocuments({
            status: { $in: ["Pending", "In Progress"] }
        }),
        Activity.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("user", "firstName lastName")
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