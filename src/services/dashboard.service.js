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
const {
  STOCK_MOVEMENT_TYPES,
} = require("../constants/stockMovement.constants");

const getRecentActivities = async ({
  branchId = null,
  modules = null,
} = {}) => {
  const filter = {};

  // Branch restriction
  if (branchId) {
    filter.branch = branchId;
  }

  // Module restriction
  if (modules?.length) {
    filter.module = {
      $in: modules,
    };
  }

  return Activity.find(filter)
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("user", "firstName lastName")
    .lean();
};

const getAuditorDashboard = async (branchId) => {
  const [inventory, assets, movements, activities] = await Promise.all([
    Inventory.countDocuments({
      branch: branchId,
      isDeleted: false,
    }),

    Asset.countDocuments({
      branch: branchId,
      isDeleted: false,
    }),

    StockMovement.countDocuments({
      branch: branchId,
    }),

    getRecentActivities({ branchId }),
  ]);

  return {
    summary: {
      inventory,
      assets,
      movements,
    },
    recentActivities: activities,
  };
};

const getMaintenanceDashboard = async (branchId) => {
  const [maintenanceResult, recentActivities] = await Promise.all([
    Maintenance.aggregate([
      {
        $lookup: {
          from: "assets",
          localField: "asset",
          foreignField: "_id",
          as: "asset",
        },
      },

      {
        $unwind: "$asset",
      },

      {
        $match: {
          "asset.branch": branchId,
        },
      },

      {
        $group: {
          _id: "$status",
          total: {
            $sum: 1,
          },
        },
      },
    ]),

    getRecentActivities({
      branchId,
      modules: ["Asset", "Maintenance"],
    }),
  ]);

  const maintenance = {
    pending: 0,
    inProgress: 0,
    completed: 0,
  };

  maintenanceResult.forEach((item) => {
    if (item._id === "Pending") {
      maintenance.pending = item.total;
    }

    if (item._id === "In Progress") {
      maintenance.inProgress = item.total;
    }

    if (item._id === "Completed") {
      maintenance.completed = item.total;
    }
  });

  return {
    summary: maintenance,
    recentActivities,
  };
};

const getInventoryDashboard = async (branchId) => {
  const settings = await getSettings();

  const [inventory, lowStock, stockInToday, stockOutToday, recentActivities] =
    await Promise.all([
      Inventory.countDocuments({
        branch: branchId,
        isDeleted: false,
      }),

      Inventory.countDocuments({
        branch: branchId,
        isDeleted: false,
        $expr: {
          $lte: ["$currentStock", settings.lowStockQuantityThreshold],
        },
      }),

      StockMovement.countDocuments({
        branch: branchId,
        movementType: STOCK_MOVEMENT_TYPES.STOCK_IN,
      }),

      StockMovement.countDocuments({
        branch: branchId,
        movementType: STOCK_MOVEMENT_TYPES.STOCK_OUT,
      }),

      getRecentActivities({
        branchId,
        modules: ["Inventory", "Purchase"],
      }),
    ]);

  return {
    summary: {
      inventory,
      lowStock,
      stockInToday,
      stockOutToday,
    },
    recentActivities,
  };
};

const getBranchAdminDashboard = async (branchId) => {
  const settings = await getSettings();

  const [
    inventory,
    assets,
    users,
    maintenanceResult,
    lowStock,
    recentActivities,
  ] = await Promise.all([
    Inventory.countDocuments({ branch: branchId, isDeleted: false }),
    Asset.countDocuments({ branch: branchId, isDeleted: false }),
    User.countDocuments({ branch: branchId }),
    Maintenance.aggregate([
      {
        $lookup: {
          from: "assets",
          localField: "asset",
          foreignField: "_id",
          as: "asset",
        },
      },
      {
        $unwind: "$asset",
      },
      {
        $match: {
          "asset.branch": branchId,
        },
      },
      {
        $count: "total",
      },
    ]),
    Inventory.countDocuments({
      branch: branchId,
      isDeleted: false,
      $expr: { $lte: ["$currentStock", settings.lowStockQuantityThreshold] },
    }),
    getRecentActivities({ branchId }),
  ]);

  const maintenance = maintenanceResult[0]?.total || 0;

  return {
    summary: {
      inventory,
      assets,
      users,
      maintenance,
      lowStock,
    },
    recentActivities,
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
    recentActivities,
  ] = await Promise.all([
    Branch.countDocuments({}),
    User.countDocuments({}),
    Vendor.countDocuments({}),
    Inventory.countDocuments({ isDeleted: false }),
    Asset.countDocuments({ isDeleted: false }),
    Inventory.countDocuments({
      isDeleted: false,
      $expr: { $lte: ["$currentStock", settings.lowStockQuantityThreshold] },
    }),
    Maintenance.countDocuments({
      status: { $in: ["Pending", "In Progress"] },
    }),
    getRecentActivities(),
  ]);

  return {
    summary: {
      totalBranches,
      totalUsers,
      totalVendors,
      totalInventory,
      totalAssets,
      lowStock,
      maintenance,
    },
    recentActivities,
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

const getStockMovementTrend = async (user) => {
  const match = {};

  if (user.role !== ROLES.SUPER_ADMIN) {
    match.branch = user.branch;
  }

  const data = await StockMovement.aggregate([
    { $match: match },

    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
          movementType: "$movementType",
        },
        quantity: { $sum: "$quantity" },
      },
    },

    {
      $group: {
        _id: {
          month: "$_id.month",
          year: "$_id.year",
        },

        stockIn: {
          $sum: {
            $cond: [{ $eq: ["$_id.movementType", "Stock In"] }, "$quantity", 0],
          },
        },

        stockOut: {
          $sum: {
            $cond: [
              { $eq: ["$_id.movementType", "Stock Out"] },
              "$quantity",
              0,
            ],
          },
        },
      },
    },

    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    },

    {
      $project: {
        _id: 0,
        month: {
          $concat: [
            {
              $arrayElemAt: [
                [
                  "",
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                ],
                "$_id.month",
              ],
            },
            " ",
            { $toString: "$_id.year" },
          ],
        },
        stockIn: 1,
        stockOut: 1,
      },
    },
  ]);

  return data;
};

const getInventoryByCategory = async (user) => {
  const match = {
    isDeleted: false,
  };

  if (user.role !== ROLES.SUPER_ADMIN) {
    match.branch = user.branch;
  }

  return Inventory.aggregate([
    { $match: match },

    {
      $group: {
        _id: "$category",
        quantity: { $sum: "$currentStock" },
      },
    },

    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category",
      },
    },

    {
      $unwind: {
        path: "$category",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        _id: 0,
        category: "$category.categoryName",
        quantity: 1,
      },
    },

    { $sort: { quantity: -1 } },
  ]);
};

const getStockHealth = async (user) => {
  const settings = await getSettings();

  const match = {
    isDeleted: false,
  };

  if (user.role !== ROLES.SUPER_ADMIN) {
    match.branch = user.branch;
  }

  const result = await Inventory.aggregate([
    { $match: match },

    {
      $group: {
        _id: null,

        healthy: {
          $sum: {
            $cond: [
              {
                $gt: ["$currentStock", settings.lowStockQuantityThreshold],
              },
              1,
              0,
            ],
          },
        },

        lowStock: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: ["$currentStock", 0] },
                  {
                    $lte: ["$currentStock", settings.lowStockQuantityThreshold],
                  },
                ],
              },
              1,
              0,
            ],
          },
        },

        outOfStock: {
          $sum: {
            $cond: [{ $eq: ["$currentStock", 0] }, 1, 0],
          },
        },
      },
    },

    {
      $project: {
        _id: 0,
        healthy: 1,
        lowStock: 1,
        outOfStock: 1,
      },
    },
  ]);

  return (
    result[0] || {
      healthy: 0,
      lowStock: 0,
      outOfStock: 0,
    }
  );
};

module.exports = {
  getDashboard,
  getStockMovementTrend,
  getInventoryByCategory,
  getStockHealth,
};
