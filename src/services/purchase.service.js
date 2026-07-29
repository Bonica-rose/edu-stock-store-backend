const mongoose = require("mongoose");

const Purchase = require("../models/purchase.model");
const Vendor = require("../models/vendor.model");
const Branch = require("../models/branch.model");
const Inventory = require("../models/inventory.model");

const stockMovementService = require("./stockMovement.service");

const ApiError = require("../utils/apiError.util");
const { ROLES } = require("../constants/roles");
const {
    STOCK_MOVEMENT_REASONS,
} = require("../constants/stockMovement.constants");

const createPurchase = async (purchaseData, user) => {

    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        const { vendor, branch, items, purchaseDate, notes } = purchaseData;

        // Branch Admin can purchase only for own branch
        if (user.role === ROLES.BRANCH_ADMIN && user.branch.toString() !== branch) {
            throw new ApiError(403, "You are not authorized to create purchases for another branch.");
        }

        // Validate Vendor
        const vendorExists = await Vendor.findOne({
            _id: vendor,
            isDeleted: false,
            isActive: true,
        }).session(session);
        if (!vendorExists) {
            throw new ApiError(404, "Vendor not found.");
        }

        // Validate Branch
        const branchExists = await Branch.findOne({
            _id: branch,
            isDeleted: false,
            isActive: true,
        }).session(session);
        if (!branchExists) {
            throw new ApiError(404, "Branch not found.");
        }

        let totalAmount = 0;

        // Validate every inventory item
        for (const item of items) {
            const inventory = await Inventory.findOne({
                _id: item.inventory,
                isDeleted: false,
                isActive: true,
            }).session(session);

            if (!inventory) {
                throw new ApiError(404, `Inventory not found: ${item.inventory}`);
            }

            // Inventory should belong to purchase(selected) branch
            if (inventory.branch.toString() !== branch.toString()) {
                throw new ApiError(400, `${inventory.itemName} does not belong to selected branch.`);
            }

            totalAmount += item.quantity * item.purchasePrice;
        }

        // Generate Purchase Number
        const lastPurchase = await Purchase
            .findOne()
            .sort({ createdAt: -1 })
            .session(session);

        let purchaseNo = "PO-000001";

        if (lastPurchase?.purchaseNo) {
            const lastNumber = parseInt(lastPurchase.purchaseNo.replace("PO-", ""), 10);
            purchaseNo = `PO-${String(lastNumber + 1).padStart(6, "0")}`;
        }

        // Create Purchase
        const purchase = await Purchase.create([{
            purchaseNo,
            vendor,
            branch,
            items,
            totalAmount,
            purchaseDate: purchaseDate ?? new Date(),
            notes,
            createdBy: user._id,
        },],{ session });

        // Stock In for each item
        for (const item of items) {
            await stockMovementService.stockIn(
                {
                    inventory: item.inventory,
                    quantity: item.quantity,
                    reason: STOCK_MOVEMENT_REASONS.PURCHASE,
                    remarks: `Purchase ${purchaseNo}`,
                },
                user,
                session
            );
        }

        await session.commitTransaction();

        return purchase[0];

    } catch (error) {
        if (session?.inTransaction()) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

const getPurchases = async (query, user) => {
    const {
        page = 1,
        limit = 10,
        vendor,
        branch,
        startDate,
        endDate,
    } = query;

    const filter = {};

    // Vendor filter
    if (vendor) {
        filter.vendor = vendor;
    }

    // Branch restriction
    if (
        user.role === ROLES.BRANCH_ADMIN ||
        user.role === ROLES.INVENTORY_STAFF
    ) {
        filter.branch = user.branch;
    } else if (branch) {
        filter.branch = branch;
    }

    // Purchase date filter
    if (startDate || endDate) {
        filter.purchaseDate = {};

        if (startDate) {
            filter.purchaseDate.$gte = new Date(startDate);
        }

        if (endDate) {
            filter.purchaseDate.$lte = new Date(endDate);
        }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [purchases, total] = await Promise.all([
        Purchase.find(filter)
            .populate("vendor", "vendorName")
            .populate("branch", "branchName")
            .populate("createdBy", "firstName lastName")
            .sort({ purchaseDate: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(),

        Purchase.countDocuments(filter),
    ]);

    return {
        purchases,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
};

const getPurchase = async (purchaseId, user) => {

    const purchase = await Purchase.findById(purchaseId)
        .populate("vendor", "vendorName")
        .populate("branch", "branchName")
        .populate("items.inventory", "sku itemName")
        .populate("createdBy", "firstName lastName")
        .populate("updatedBy", "firstName lastName");

    if (!purchase) {
        throw new ApiError(404, "Purchase not found.");
    }

    // Branch restriction
    if (
        (user.role === ROLES.BRANCH_ADMIN || user.role === ROLES.INVENTORY_STAFF) &&
        purchase.branch._id.toString() !== user.branch.toString()
    ) {
        throw new ApiError(403, "You are not authorized to view this purchase.");
    }

    return purchase;
};

module.exports = {
    createPurchase,
    getPurchases,
    getPurchase,
};