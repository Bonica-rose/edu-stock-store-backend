const Inventory = require("../models/inventory.model");
const Asset = require("../models/asset.model");
const Vendor = require("../models/vendor.model");
const Branch = require("../models/branch.model");
const Maintenance = require("../models/maintenance.model");
const StockMovement = require("../models/stockMovement.model");
const { ROLES } = require("../constants/roles");
const { MAINTENANCE_STATUS } = require("../constants/maintenance.constants");
const { getBranchFilter } = require("../utils/reportFilter.util");
const { getReportQuery } = require("../utils/reportQuery.util");
const { buildPagination } = require("../utils/pagination.util");

const getDashboardSummary = async (user) => {

    const branchFilter = getBranchFilter(user);

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

        branchFilter.branch ? Promise.resolve(1) : Branch.countDocuments(),

        StockMovement.countDocuments(branchFilter),

        Inventory.countDocuments({
            ...branchFilter,
            $expr: {
                $lte: ["$currentStock", "$minimumStock"],
            },
        }),

        Maintenance.countDocuments({
            ...branchFilter,
            status: MAINTENANCE_STATUS.PENDING,
        }),
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
    const { page, limit, skip, search, sortBy, sortOrder } = getReportQuery(query);

    const { category, vendor, branch, status } = query;

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
    if (branch && !branchFilter.branch && mongoose.Types.ObjectId.isValid(branch)) {
        match.branch = new mongoose.Types.ObjectId(branch);
    }

    // Status Filter
    if (status === "true" || status === "false") {
        match.isActive = status === "true";
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
                    $multiply: [
                        "$currentStock",
                        "$purchasePrice",
                    ],
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

const getLowStockReport = async (query, user) => {
    const { page, limit, skip, search, sortBy, sortOrder } = getReportQuery(query);

    const { category, vendor, branch, status } = query;

    const branchFilter = getBranchFilter(user);

    const match = {
        ...branchFilter,
        isDeleted: false,

        $expr: {
            $lte: ["$currentStock", "$minimumStock"],
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

    // Status Filter
    if (status !== undefined) {
        match.isActive = status === "true";
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
                    $subtract: [
                        "$minimumStock",
                        "$currentStock",
                    ],
                },

                purchasePrice: 1,

                stockValue: {
                    $multiply: [
                        "$currentStock",
                        "$purchasePrice",
                    ],
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

const getAssetReport = async (query, user) => {
    const { page, limit, skip, search, sortBy, sortOrder } = getReportQuery(query);

    const { category, vendor, branch, status, condition } = query;

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

    // Asset Status
    if (status) {
        match.status = status;
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

        // Filter by Inventory Category
        ...(category && mongoose.Types.ObjectId.isValid(category)
            ? [{
                $match: {
                    "inventory.category": new mongoose.Types.ObjectId(category),
                },
            }]
            : []),

        // Filter by Inventory Vendor
        ...(vendor && mongoose.Types.ObjectId.isValid(vendor)
            ? [{
                $match: {
                    "inventory.vendor": new mongoose.Types.ObjectId(vendor),
                },
            }]
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

                category: "$category.categoryName",

                vendor: "$vendor.vendorName",

                branch: "$branch.branchName",

                purchasePrice: "$inventory.purchasePrice",

                unit: "$inventory.unit",

                status: 1,

                condition: 1,

                assignedTo: "$assignedUser.name",

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

const getStockMovementReport = async (query, user) => {
    const { page, limit, skip, search, sortBy, sortOrder, from, to } = getReportQuery(query);

    const { movementType, category, branch } = query;

    const branchFilter = getBranchFilter(user);

    const match = {
        ...branchFilter,
    };

    // Movement Type
    if (movementType) {
        match.movementType = movementType;
    }

    // Branch Filter (Super Admin / Auditor)
    if (
        branch &&
        !branchFilter.branch &&
        mongoose.Types.ObjectId.isValid(branch)
    ) {
        match.branch = new mongoose.Types.ObjectId(branch);
    }

    // Date Range
    if (from || to) {
        match.createdAt = {};

        if (from) {
            match.createdAt.$gte = new Date(from);
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
            ? [{
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
            }]
            : []),

        // Category Filter
        ...(category &&
        mongoose.Types.ObjectId.isValid(category)
            ?   [{
                    $match: {
                        "inventory.category":
                            new mongoose.Types.ObjectId(category),
                    },
                }]
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

                performedBy: "$performedBy.name",
            },
        },

        {
            $sort: {
                [sortBy]: sortOrder,
            },
        },
    ];

    const [rows, totalResult] = await Promise.all([
        StockMovement.aggregate([
            ...pipeline,
            { $skip: skip },
            { $limit: limit },
        ]),

        StockMovement.aggregate([
            ...pipeline,
            { $count: "total" },
        ]),
    ]);

    const totalRecords = totalResult[0]?.total || 0;

    return {
        rows,
        pagination: buildPagination(page, limit, totalRecords),
    };
};

const getPurchaseSummary = async (query, user) => {
    const { page, limit, skip, search, sortBy, sortOrder, from, to } = getReportQuery(query);

    const { vendor, branch } = query;

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
    if (from || to) {
        match.purchaseDate = {};

        if (from) {
            match.purchaseDate.$gte = new Date(from);
        }

        if (to) {
            const endDate = new Date(to);
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

                createdBy: "$createdBy.name",
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

const getMaintenanceReport = async (query, user) => {
    const { page, limit, skip, search, sortBy, sortOrder, from, to } =
        getReportQuery(query);

    const { status, priority, vendor, branch } = query;

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

    // Date Range
    if (from || to) {
        match.createdAt = {};

        if (from) {
            match.createdAt.$gte = new Date(from);
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
            ? [{
                $match: {
                    "asset.branch": branchFilter.branch,
                },
            }]
            : []),

        // Branch filter (Super Admin / Auditor)
        ...(branch &&
        !branchFilter.branch &&
        mongoose.Types.ObjectId.isValid(branch)
            ? [{
                $match: {
                    "asset.branch": new mongoose.Types.ObjectId(branch),
                },
            }]
            : []),

        // Search
        ...(search
            ? [{
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
            }]
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

                reportedBy: "$reportedBy.name",

                assignedTo: "$assignedTo.name",

                vendor: "$vendor.vendorName",
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

    return {
        rows,
        pagination: buildPagination(page, limit, totalRecords),
    };
};

const getVendorReport = async (query) => {
    const {
        page,
        limit,
        skip,
        search,
        sortBy,
        sortOrder,
    } = getReportQuery(query);

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

module.exports = {
    getDashboardSummary,
    getInventoryReport,
    getLowStockReport,
    getAssetReport,
    getStockMovementReport,
    getPurchaseSummary,
    getMaintenanceReport,
    getVendorReport,
};