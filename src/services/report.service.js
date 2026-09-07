const mongoose = require("mongoose");
const Inventory = require("../models/inventory.model");
const Asset = require("../models/asset.model");
const Vendor = require("../models/vendor.model");
const Branch = require("../models/branch.model");
const Maintenance = require("../models/maintenance.model");
const StockMovement = require("../models/stockMovement.model");
const Purchase = require("../models/purchase.model");
const { ROLES } = require("../constants/roles");
const { MAINTENANCE_STATUS } = require("../constants/maintenance.constants");
const { getBranchFilter } = require("../utils/reportFilter.util");
const { getReportQuery } = require("../utils/reportQuery.util");
const { buildPagination } = require("../utils/pagination.util");
const { exportToExcel } = require("../utils/exportExcel.util");
const { getSettings } = require("./settings.service");

const getPendingMaintenanceCount = async (branchFilter) => {
  const match = {
    status: MAINTENANCE_STATUS.PENDING,
  };

  if (branchFilter.branch) {
    return Maintenance.aggregate([
      {
        $lookup: {
          from: "assets",
          localField: "asset",
          foreignField: "_id",
          as: "asset",
        },
      },
      { $unwind: "$asset" },
      {
        $match: {
          "asset.branch": branchFilter.branch,
          status: MAINTENANCE_STATUS.PENDING,
        },
      },
      { $count: "total" },
    ]).then((result) => result[0]?.total || 0);
  }

  return Maintenance.countDocuments(match);
};

const getDashboardSummary = async (user) => {
  const branchFilter = getBranchFilter(user);
  const settings = await getSettings();

  const [
    inventoryItems,
    assets,
    vendors,
    branches,
    stockMovements,
    lowStockItems,
    pendingMaintenance,
  ] = await Promise.all([
    Inventory.countDocuments(branchFilter),
    Asset.countDocuments(branchFilter),
    Vendor.countDocuments(),
    // branchFilter.branch ? Promise.resolve(1) : Branch.countDocuments(),
    Branch.countDocuments(
      branchFilter.branch ? { _id: branchFilter.branch } : {},
    ),
    StockMovement.countDocuments(branchFilter),
    Inventory.countDocuments({
      ...branchFilter,
      $expr: {
        $lte: [
          "$currentStock",
          {
            $add: ["$minimumStock", settings.lowStockQuantityThreshold],
          },
        ],
      },
    }),

    // Maintenance → Asset → Branch
    getPendingMaintenanceCount(branchFilter),

    // Maintenance.countDocuments({
    //   ...branchFilter,
    //   status: MAINTENANCE_STATUS.PENDING,
    // }),
  ]);

  return {
    inventoryItems,
    assets,
    vendors,
    branches,
    stockMovements,
    lowStockItems,
    pendingMaintenance,
  };
};

const getInventoryReport = async (query, user) => {
  const { page, limit, skip, search, sortBy, sortOrder } =
    getReportQuery(query);

  const { category, vendor, branch, isActive } = query;

  const branchFilter = getBranchFilter(user);

  const match = {
    ...branchFilter,
    isDeleted: false,
  };

  // Search
  if (search) {
    match.$or = [
      {
        itemName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        sku: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // Category Filter
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    match.category = new mongoose.Types.ObjectId(category);
  }

  // Vendor Filter
  if (vendor && mongoose.Types.ObjectId.isValid(vendor)) {
    match.vendor = new mongoose.Types.ObjectId(vendor);
  }

  // Branch Filter (Super Admin / Auditor only)
  if (
    branch &&
    !branchFilter.branch &&
    mongoose.Types.ObjectId.isValid(branch)
  ) {
    match.branch = new mongoose.Types.ObjectId(branch);
  }

  // Inventory Status Filter
  if (isActive === "true" || isActive === "false") {
    match.isActive = isActive === "true";
  }

  const pipeline = [
    {
      $match: match,
    },

    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },

    {
      $unwind: "$category",
    },

    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "_id",
        as: "vendor",
      },
    },

    {
      $unwind: {
        path: "$vendor",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "branches",
        localField: "branch",
        foreignField: "_id",
        as: "branch",
      },
    },

    {
      $unwind: "$branch",
    },

    {
      $project: {
        sku: 1,
        itemName: 1,
        currentStock: 1,
        minimumStock: 1,
        purchasePrice: 1,
        unit: 1,
        isActive: 1,
        createdAt: 1,

        stockValue: {
          $multiply: ["$currentStock", "$purchasePrice"],
        },

        category: "$category.categoryName",
        vendor: "$vendor.vendorName",
        branch: "$branch.branchName",
      },
    },

    {
      $sort: {
        [sortBy]: sortOrder,
      },
    },
  ];

  const [rows, totalResult] = await Promise.all([
    Inventory.aggregate([
      ...pipeline,
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]),

    Inventory.aggregate([
      ...pipeline,
      {
        $count: "total",
      },
    ]),
  ]);

  const totalRecords = totalResult[0]?.total || 0;

  return {
    rows,
    pagination: buildPagination(page, limit, totalRecords),
  };
};

const exportInventoryReport = async (query, user, res) => {
  query.export = "true";

  const { rows } = await getInventoryReport(query, user);

  const exportRows = rows.map((row) => ({
    ...row,
    status: row.isActive ? "Active" : "Inactive",
  }));

  await exportToExcel(
    res,
    "inventory-report",
    "Inventory Report",
    [
      { header: "SKU", key: "sku" },
      { header: "Item Name", key: "itemName" },
      { header: "Category", key: "category" },
      { header: "Vendor", key: "vendor" },
      { header: "Branch", key: "branch" },
      { header: "Current Stock", key: "currentStock" },
      { header: "Minimum Stock", key: "minimumStock" },
      { header: "Purchase Price", key: "purchasePrice" },
      { header: "Stock Value", key: "stockValue" },
      { header: "Unit", key: "unit" },
      { header: "Status", key: "status" },
    ],
    exportRows,
  );
};

const getLowStockReport = async (query, user) => {
  const { page, limit, skip, search, sortBy, sortOrder } =
    getReportQuery(query);

  const { category, vendor, branch, isActive } = query;

  const branchFilter = getBranchFilter(user);

  const settings = await getSettings();

  const match = {
    ...branchFilter,
    isDeleted: false,

    $expr: {
      $lte: [
        "$currentStock",
        {
          $add: ["$minimumStock", settings.lowStockQuantityThreshold],
        },
      ],
    },
  };

  // Search
  if (search) {
    match.$or = [
      {
        itemName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        sku: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // Category Filter
  if (category && mongoose.Types.ObjectId.isValid(category)) {
    match.category = new mongoose.Types.ObjectId(category);
  }

  // Vendor Filter
  if (vendor && mongoose.Types.ObjectId.isValid(vendor)) {
    match.vendor = new mongoose.Types.ObjectId(vendor);
  }

  // Branch Filter (Super Admin / Auditor)
  if (
    branch &&
    !branchFilter.branch &&
    mongoose.Types.ObjectId.isValid(branch)
  ) {
    match.branch = new mongoose.Types.ObjectId(branch);
  }

  // Inventory Status Filter
  if (isActive === "true" || isActive === "false") {
    match.isActive = isActive === "true";
  }

  const pipeline = [
    {
      $match: match,
    },

    {
      $lookup: {
        from: "categories",
        localField: "category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: "$category",
    },

    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $unwind: {
        path: "$vendor",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $lookup: {
        from: "branches",
        localField: "branch",
        foreignField: "_id",
        as: "branch",
      },
    },
    {
      $unwind: "$branch",
    },

    {
      $project: {
        sku: 1,
        itemName: 1,
        currentStock: 1,
        minimumStock: 1,

        shortage: {
          $max: [
            {
              $subtract: ["$minimumStock", "$currentStock"],
            },
            0,
          ],
        },

        purchasePrice: 1,

        stockValue: {
          $multiply: ["$currentStock", "$purchasePrice"],
        },

        unit: 1,
        isActive: 1,
        createdAt: 1,

        category: "$category.categoryName",
        vendor: "$vendor.vendorName",
        branch: "$branch.branchName",
      },
    },

    {
      $sort: {
        [sortBy]: sortOrder,
      },
    },
  ];

  const [rows, totalResult] = await Promise.all([
    Inventory.aggregate([
      ...pipeline,
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]),

    Inventory.aggregate([
      ...pipeline,
      {
        $count: "total",
      },
    ]),
  ]);

  const totalRecords = totalResult[0]?.total || 0;

  return {
    rows,
    pagination: buildPagination(page, limit, totalRecords),
  };
};

const exportLowStockReport = async (query, user, res) => {
  query.export = "true";

  const { rows } = await getLowStockReport(query, user);

  const exportRows = rows.map((row) => ({
    ...row,
    status: row.isActive ? "Active" : "Inactive",
  }));

  await exportToExcel(
    res,
    "low-stock-report",
    "Low Stock Report",
    [
      { header: "SKU", key: "sku" },
      { header: "Item Name", key: "itemName" },
      { header: "Category", key: "category" },
      { header: "Vendor", key: "vendor" },
      { header: "Branch", key: "branch" },
      { header: "Current Stock", key: "currentStock" },
      { header: "Minimum Stock", key: "minimumStock" },
      { header: "Shortage", key: "shortage" },
      { header: "Purchase Price", key: "purchasePrice" },
      { header: "Stock Value", key: "stockValue" },
      { header: "Unit", key: "unit" },
      { header: "Status", key: "status" },
    ],
    exportRows,
  );
};

const getAssetReport = async (query, user) => {
  const { page, limit, skip, search, sortBy, sortOrder } =
    getReportQuery(query);

  const { assignedTo, branch, isActive, condition } = query;

  const branchFilter = getBranchFilter(user);

  const match = {
    ...branchFilter,
    isDeleted: false,
  };

  // Search
  if (search) {
    match.$or = [
      {
        assetCode: {
          $regex: search,
          $options: "i",
        },
      },
      {
        serialNumber: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // AssignedTo Filter
  if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
    match.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  }

  // Asset Status Filter
  if (isActive !== undefined) {
    match.isActive = isActive === "true";
  }

  // Asset Condition
  if (condition) {
    match.condition = condition;
  }

  // Branch Filter (Super Admin / Auditor)
  if (
    branch &&
    !branchFilter.branch &&
    mongoose.Types.ObjectId.isValid(branch)
  ) {
    match.branch = new mongoose.Types.ObjectId(branch);
  }

  const pipeline = [
    {
      $match: match,
    },

    // Inventory
    {
      $lookup: {
        from: "inventories",
        localField: "inventory",
        foreignField: "_id",
        as: "inventory",
      },
    },
    {
      $unwind: "$inventory",
    },

    // Category
    {
      $lookup: {
        from: "categories",
        localField: "inventory.category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: "$category",
    },

    // Vendor
    {
      $lookup: {
        from: "vendors",
        localField: "inventory.vendor",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $unwind: "$vendor",
    },

    // Branch
    {
      $lookup: {
        from: "branches",
        localField: "branch",
        foreignField: "_id",
        as: "branch",
      },
    },
    {
      $unwind: "$branch",
    },

    // Assigned User
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedUser",
      },
    },
    {
      $unwind: {
        path: "$assignedUser",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        assetCode: 1,
        itemName: "$inventory.itemName",
        sku: "$inventory.sku",
        serialNumber: 1,
        itemType: "$inventory.itemType",
        category: "$category.categoryName",
        vendor: "$vendor.vendorName",
        branch: "$branch.branchName",
        purchasePrice: "$inventory.purchasePrice",
        unit: "$inventory.unit",
        status: 1,
        isActive: 1,
        condition: 1,
        assignedTo: {
          $concat: ["$assignedUser.firstName", " ", "$assignedUser.lastName"],
        },
        assignedEmployeeId: "$assignedUser.employeeId",
        assignedDate: 1,
        createdAt: 1,
      },
    },

    {
      $sort: {
        [sortBy]: sortOrder,
      },
    },
  ];

  const [rows, totalResult] = await Promise.all([
    Asset.aggregate([
      ...pipeline,
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]),

    Asset.aggregate([
      ...pipeline,
      {
        $count: "total",
      },
    ]),
  ]);

  const totalRecords = totalResult[0]?.total || 0;

  return {
    rows,
    pagination: buildPagination(page, limit, totalRecords),
  };
};

const exportAssetReport = async (query, user, res) => {
  query.export = "true";

  const { rows } = await getAssetReport(query, user);

  await exportToExcel(
    res,
    "asset-report",
    "Asset Report",
    [
      { header: "Asset Code", key: "assetCode" },
      { header: "Inventory / Item Name", key: "itemName" },
      { header: "SKU", key: "sku" },
      { header: "Item Type", key: "itemType" },
      { header: "Category", key: "category" },
      { header: "Vendor", key: "vendor" },
      { header: "Serial Number", key: "serialNumber" },
      { header: "Branch", key: "branch" },
      { header: "Asset Assigned To", key: "assignedTo" },
      { header: "Assigned Employee ID", key: "assignedEmployeeId" },
      { header: "Asset Assigned On", key: "assignedDate" },
      { header: "Asset Status", key: "status" },
      { header: "Asset Condition", key: "condition" },
      { header: "Unit / Purchase Price", key: "purchasePrice" },
      { header: "Unit", key: "unit" },
      { header: "Asset Creation", key: "createdAt" },
    ],
    rows,
  );
};

const getStockMovementReport = async (query, user) => {
  const { page, limit, skip, search, sortBy, sortOrder } =
    getReportQuery(query);

  console.log("getStockMovementReport query:", query);

  const { inventory, movementType, performedBy, branch, fromDate, toDate } =
    query;

  const branchFilter = getBranchFilter(user);

  const match = {
    ...branchFilter,
  };

  // Inventory Filter
  if (inventory && mongoose.Types.ObjectId.isValid(inventory)) {
    match.inventory = new mongoose.Types.ObjectId(inventory);
  }

  // Movement Type Filter
  if (movementType) {
    match.movementType = movementType;
  }

  // performedBy Filter
  if (performedBy && mongoose.Types.ObjectId.isValid(performedBy)) {
    match.performedBy = new mongoose.Types.ObjectId(performedBy);
  }

  // Branch Filter (Super Admin / Auditor)
  if (
    branch &&
    !branchFilter.branch &&
    mongoose.Types.ObjectId.isValid(branch)
  ) {
    match.branch = new mongoose.Types.ObjectId(branch);
  }

  // Date filter
  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      match.createdAt.$gte = start;
    }

    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      match.createdAt.$lte = end;
    }
  }

  const pipeline = [
    {
      $match: match,
    },

    // Inventory
    {
      $lookup: {
        from: "inventories",
        localField: "inventory",
        foreignField: "_id",
        as: "inventory",
      },
    },
    {
      $unwind: "$inventory",
    },

    // Search
    ...(search
      ? [
          {
            $match: {
              $or: [
                {
                  "inventory.itemName": {
                    $regex: search,
                    $options: "i",
                  },
                },
                {
                  "inventory.sku": {
                    $regex: search,
                    $options: "i",
                  },
                },
              ],
            },
          },
        ]
      : []),

    // Category
    {
      $lookup: {
        from: "categories",
        localField: "inventory.category",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: "$category",
    },

    // Branch
    {
      $lookup: {
        from: "branches",
        localField: "branch",
        foreignField: "_id",
        as: "branch",
      },
    },
    {
      $unwind: "$branch",
    },

    // From Branch
    {
      $lookup: {
        from: "branches",
        localField: "fromBranch",
        foreignField: "_id",
        as: "fromBranch",
      },
    },
    {
      $unwind: {
        path: "$fromBranch",
        preserveNullAndEmptyArrays: true,
      },
    },

    // To Branch
    {
      $lookup: {
        from: "branches",
        localField: "toBranch",
        foreignField: "_id",
        as: "toBranch",
      },
    },
    {
      $unwind: {
        path: "$toBranch",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Performed By
    {
      $lookup: {
        from: "users",
        localField: "performedBy",
        foreignField: "_id",
        as: "performedBy",
      },
    },
    {
      $unwind: "$performedBy",
    },

    {
      $project: {
        movementType: 1,
        quantity: 1,
        previousStock: 1,
        newStock: 1,
        reason: 1,
        remarks: 1,
        createdAt: 1,

        sku: "$inventory.sku",
        itemName: "$inventory.itemName",
        category: "$category.categoryName",
        branch: "$branch.branchName",
        fromBranch: "$fromBranch.branchName",
        toBranch: "$toBranch.branchName",
        performedBy: {
          $concat: ["$performedBy.firstName", " ", "$performedBy.lastName"],
        },
      },
    },

    {
      $sort: {
        [sortBy]: sortOrder,
      },
    },
  ];

  const [rows, totalResult] = await Promise.all([
    StockMovement.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),

    StockMovement.aggregate([...pipeline, { $count: "total" }]),
  ]);

  const totalRecords = totalResult[0]?.total || 0;

  return {
    rows,
    pagination: buildPagination(page, limit, totalRecords),
  };
};

const exportStockMovementReport = async (query, user, res) => {
  query.export = "true";

  const { rows } = await getStockMovementReport(query, user);

  const exportRows = rows.map((row) => ({
    ...row,
    fromBranch: row.fromBranch || "-",
    toBranch: row.toBranch || "-",
    remarks: row.remarks || "-",
  }));

  await exportToExcel(
    res,
    "stock-movement-report",
    "Stock Movement Report",
    [
      { header: "Date", key: "createdAt" },
      { header: "SKU", key: "sku" },
      { header: "Item Name", key: "itemName" },
      { header: "Category", key: "category" },
      { header: "Movement Type", key: "movementType" },
      { header: "Quantity", key: "quantity" },
      { header: "Previous Stock", key: "previousStock" },
      { header: "New Stock", key: "newStock" },
      { header: "Branch", key: "branch" },
      { header: "From Branch", key: "fromBranch" },
      { header: "To Branch", key: "toBranch" },
      { header: "Reason", key: "reason" },
      { header: "Remarks", key: "remarks" },
      { header: "Performed By", key: "performedBy" },
    ],
    exportRows,
  );
};

const getPurchaseSummary = async (query, user) => {
  const { page, limit, skip, search, sortBy, sortOrder } =
    getReportQuery(query);

  const { vendor, branch, fromDate, toDate } = query;

  const branchFilter = getBranchFilter(user);

  const match = {
    ...branchFilter,
  };

  // Vendor Filter
  if (vendor && mongoose.Types.ObjectId.isValid(vendor)) {
    match.vendor = new mongoose.Types.ObjectId(vendor);
  }

  // Branch Filter (Super Admin / Auditor)
  if (
    branch &&
    !branchFilter.branch &&
    mongoose.Types.ObjectId.isValid(branch)
  ) {
    match.branch = new mongoose.Types.ObjectId(branch);
  }

  // Date Filter
  if (fromDate || toDate) {
    match.purchaseDate = {};

    if (fromDate) {
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      match.purchaseDate.$gte = startDate;
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      match.purchaseDate.$lte = endDate;
    }
  }

  // Search
  if (search) {
    match.purchaseNo = {
      $regex: search,
      $options: "i",
    };
  }

  const pipeline = [
    {
      $match: match,
    },

    // Vendor
    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $unwind: "$vendor",
    },

    // Branch
    {
      $lookup: {
        from: "branches",
        localField: "branch",
        foreignField: "_id",
        as: "branch",
      },
    },
    {
      $unwind: "$branch",
    },

    // Created By
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $unwind: "$createdBy",
    },

    {
      $project: {
        purchaseNo: 1,
        purchaseDate: 1,
        vendor: "$vendor.vendorName",
        branch: "$branch.branchName",
        totalAmount: 1,
        totalItems: {
          $size: "$items",
        },
        totalQuantity: {
          $sum: "$items.quantity",
        },
        createdBy: {
          $concat: ["$createdBy.firstName", " ", "$createdBy.lastName"],
        },
      },
    },

    {
      $sort: {
        [sortBy]: sortOrder,
      },
    },
  ];

  const [rows, totalResult] = await Promise.all([
    Purchase.aggregate([
      ...pipeline,
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]),

    Purchase.aggregate([
      ...pipeline,
      {
        $count: "total",
      },
    ]),
  ]);

  const totalRecords = totalResult[0]?.total || 0;

  return {
    rows,
    pagination: buildPagination(page, limit, totalRecords),
  };
};

const exportPurchaseSummary = async (query, user, res) => {
  query.export = "true";

  const { rows } = await getPurchaseSummary(query, user);

  const exportRows = rows.map((row) => ({
    ...row,
    vendor: row.vendor || "-",
    branch: row.branch || "-",
    createdBy: row.createdBy || "-",
    purchaseDate: row.purchaseDate || "-",
  }));

  await exportToExcel(
    res,
    "purchase-summary-report",
    "Purchase Summary",
    [
      { header: "Purchase No", key: "purchaseNo" },
      { header: "Purchase Date", key: "purchaseDate" },
      { header: "Vendor", key: "vendor" },
      { header: "Branch", key: "branch" },
      { header: "Total Items", key: "totalItems" },
      { header: "Total Quantity", key: "totalQuantity" },
      { header: "Total Amount", key: "totalAmount" },
      { header: "Created By", key: "createdBy" },
    ],
    exportRows,
  );
};

const getMaintenanceReport = async (query, user) => {
  const { page, limit, skip, search, sortBy, sortOrder } =
    getReportQuery(query);

  const { status, priority, vendor, branch, from, to } = query;

  const branchFilter = getBranchFilter(user);

  const match = {
    isDeleted: false,
  };

  // Status
  if (status) {
    match.status = status;
  }

  // Priority
  if (priority) {
    match.priority = priority;
  }

  // Vendor
  if (vendor && mongoose.Types.ObjectId.isValid(vendor)) {
    match.vendor = new mongoose.Types.ObjectId(vendor);
  }

  // Date Range Filter
  if (from || to) {
    match.createdAt = {};

    if (from) {
      const startDate = new Date(from);
      startDate.setHours(0, 0, 0, 0);
      match.createdAt.$gte = startDate;
    }

    if (to) {
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      match.createdAt.$lte = endDate;
    }
  }

  const pipeline = [
    {
      $match: match,
    },

    // Asset
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

    // Branch restriction
    ...(branchFilter.branch
      ? [
          {
            $match: {
              "asset.branch": branchFilter.branch,
            },
          },
        ]
      : []),

    // Branch filter (Super Admin / Auditor)
    ...(branch &&
    !branchFilter.branch &&
    mongoose.Types.ObjectId.isValid(branch)
      ? [
          {
            $match: {
              "asset.branch": new mongoose.Types.ObjectId(branch),
            },
          },
        ]
      : []),

    // Search
    ...(search
      ? [
          {
            $match: {
              $or: [
                {
                  maintenanceId: {
                    $regex: search,
                    $options: "i",
                  },
                },
                {
                  issueTitle: {
                    $regex: search,
                    $options: "i",
                  },
                },
                {
                  "asset.assetCode": {
                    $regex: search,
                    $options: "i",
                  },
                },
              ],
            },
          },
        ]
      : []),

    // Inventory
    {
      $lookup: {
        from: "inventories",
        localField: "asset.inventory",
        foreignField: "_id",
        as: "inventory",
      },
    },
    {
      $unwind: "$inventory",
    },

    // Vendor
    {
      $lookup: {
        from: "vendors",
        localField: "vendor",
        foreignField: "_id",
        as: "vendor",
      },
    },
    {
      $unwind: {
        path: "$vendor",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Reported By
    {
      $lookup: {
        from: "users",
        localField: "reportedBy",
        foreignField: "_id",
        as: "reportedBy",
      },
    },
    {
      $unwind: "$reportedBy",
    },

    // Assigned To
    {
      $lookup: {
        from: "users",
        localField: "assignedTo",
        foreignField: "_id",
        as: "assignedTo",
      },
    },
    {
      $unwind: {
        path: "$assignedTo",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $project: {
        maintenanceId: 1,
        issueTitle: 1,
        priority: 1,
        status: 1,
        repairCost: 1,
        createdAt: 1,
        completedDate: 1,
        assetCode: "$asset.assetCode",
        itemName: "$inventory.itemName",
        reportedBy: {
          $concat: ["$reportedBy.firstName", " ", "$reportedBy.lastName"],
        },
        assignedTo: {
          $concat: ["$assignedTo.firstName", " ", "$assignedTo.lastName"],
        },
        vendor: {
            $ifNull: ["$vendor.vendorName", null],
        },
      },
    },

    {
      $sort: {
        [sortBy]: sortOrder,
      },
    },
  ];

  const [rows, totalResult] = await Promise.all([
    Maintenance.aggregate([
      ...pipeline,
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]),

    Maintenance.aggregate([
      ...pipeline,
      {
        $count: "total",
      },
    ]),
  ]);

  const totalRecords = totalResult[0]?.total || 0;

  console.log("getMaintenanceReport rows:", rows);

  return {
    rows,
    pagination: buildPagination(page, limit, totalRecords),
  };
};

const exportMaintenanceReport = async (query, user, res) => {
  query.export = "true";

  const { rows } = await getMaintenanceReport(query, user);

  const exportRows = rows.map((row) => ({
    ...row,
    itemName: row.itemName || "-",
    vendor: row.vendor || "-",
    assignedTo: row.assignedTo || "-",
    repairCost: row.repairCost ?? 0,
    createdAt: row.createdAt
      ? new Date(row.createdAt).toLocaleDateString("en-IN")
      : "-",
    completedDate: row.completedDate
      ? new Date(row.completedDate).toLocaleDateString("en-IN")
      : "-",
  }));

  await exportToExcel(
    res,
    "maintenance-report",
    "Maintenance Report",
    [
      { header: "Maintenance ID", key: "maintenanceId" },
      { header: "Asset Code", key: "assetCode" },
      { header: "Item Name", key: "itemName" },
      { header: "Issue Title", key: "issueTitle" },
      { header: "Priority", key: "priority" },
      { header: "Status", key: "status" },
      { header: "Reported By", key: "reportedBy" },
      { header: "Assigned To", key: "assignedTo" },
      { header: "Vendor", key: "vendor" },
      { header: "Repair Cost", key: "repairCost" },
      { header: "Created Date", key: "createdAt" },
      { header: "Completed Date", key: "completedDate" },
    ],
    exportRows,
  );
};

const getVendorReport = async (query) => {
  const { page, limit, skip, search, sortBy, sortOrder } =
    getReportQuery(query);

  const { status } = query;

  const match = {};

  // Search
  if (search) {
    match.$or = [
      {
        vendorName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        vendorCode: {
          $regex: search,
          $options: "i",
        },
      },
      {
        contactPerson: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  // Status Filter
  if (status === "true" || status === "false") {
    match.isActive = status === "true";
  }

  const pipeline = [
    {
      $match: match,
    },

    // Inventory Count
    {
      $lookup: {
        from: "inventories",
        localField: "_id",
        foreignField: "vendor",
        as: "inventoryItems",
      },
    },

    // Purchases
    {
      $lookup: {
        from: "purchases",
        localField: "_id",
        foreignField: "vendor",
        as: "purchases",
      },
    },

    {
      $project: {
        vendorCode: 1,
        vendorName: 1,
        contactPerson: 1,
        phone: 1,
        email: 1,
        city: 1,
        state: 1,
        isActive: 1,
        createdAt: 1,

        inventoryCount: {
          $size: "$inventoryItems",
        },

        purchaseCount: {
          $size: "$purchases",
        },

        totalPurchaseAmount: {
          $sum: "$purchases.totalAmount",
        },
      },
    },

    {
      $sort: {
        [sortBy]: sortOrder,
      },
    },
  ];

  const [rows, totalResult] = await Promise.all([
    Vendor.aggregate([
      ...pipeline,
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]),

    Vendor.aggregate([
      ...pipeline,
      {
        $count: "total",
      },
    ]),
  ]);

  const totalRecords = totalResult[0]?.total || 0;

  return {
    rows,
    pagination: buildPagination(page, limit, totalRecords),
  };
};

const exportVendorReport = async (query, user, res) => {
  query.export = "true";

  const { rows } = await getVendorReport(query, user);

  const exportRows = rows.map((row) => ({
    ...row,
    contactPerson: row.contactPerson || "-",
    phone: row.phone || "-",
    email: row.email || "-",
    city: row.city || "-",
    state: row.state || "-",
    inventoryCount: row.inventoryCount ?? 0,
    purchaseCount: row.purchaseCount ?? 0,
    totalPurchaseAmount: row.totalPurchaseAmount ?? 0,
    status: row.isActive ? "Active" : "Inactive",
    createdAt: row.createdAt
      ? new Date(row.createdAt).toLocaleDateString("en-IN")
      : "-",
  }));

  await exportToExcel(
    res,
    "vendor-report",
    "Vendor Report",
    [
      { header: "Vendor Code", key: "vendorCode" },
      { header: "Vendor Name", key: "vendorName" },
      { header: "Contact Person", key: "contactPerson" },
      { header: "Phone", key: "phone" },
      { header: "Email", key: "email" },
      { header: "City", key: "city" },
      { header: "State", key: "state" },
      { header: "Inventory Items", key: "inventoryCount" },
      { header: "Purchase Count", key: "purchaseCount" },
      { header: "Total Purchase Amount", key: "totalPurchaseAmount" },
      { header: "Status", key: "status" },
      { header: "Created Date", key: "createdAt" },
    ],
    exportRows,
  );
};

module.exports = {
  // reports
  getDashboardSummary,
  getInventoryReport,
  getLowStockReport,
  getAssetReport,
  getStockMovementReport,
  getPurchaseSummary,
  getMaintenanceReport,
  getVendorReport,

  // exports
  exportInventoryReport,
  exportLowStockReport,
  exportAssetReport,
  exportStockMovementReport,
  exportPurchaseSummary,
  exportMaintenanceReport,
  exportVendorReport,
};
