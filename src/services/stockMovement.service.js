const mongoose = require("mongoose");
const Inventory = require("../models/inventory.model");
const StockMovement = require("../models/stockMovement.model");
const Branch = require("../models/branch.model");
const ApiError = require("../utils/apiError.util");
const { ROLES } = require("../constants/roles");
const { logActivity } = require("./activity.service");
const { STOCK_MOVEMENT_REASONS, STOCK_MOVEMENT_TYPES } = require("../constants/stockMovement.constants");
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require("../constants/activity.constants");


// Stock In
const stockIn = async (movementData, user, requestInfo, session = null) => {

    const ownSession = !session;
    if (ownSession) {
        session = await mongoose.startSession();
        session.startTransaction();
    }
    try {
        const inventory = await Inventory.findOne({
            _id: movementData.inventory,
            isDeleted: false,
            isActive: true,
        }).session(session);

        if (!inventory) {
            throw new ApiError(404, "Inventory not found.");
        }

        // Branch Admin restriction
        if (user.role === ROLES.BRANCH_ADMIN && inventory.branch.toString() !== user.branch.toString()) {
            throw new ApiError(403, "Not authorized for this branch.");
        }

        const previousStock = inventory.currentStock;
        const newStock = previousStock + movementData.quantity;

        inventory.currentStock = newStock;
        // Update latest purchase price when stock comes from a purchase
        if (movementData.reason === STOCK_MOVEMENT_REASONS.PURCHASE && movementData.purchasePrice != null) {
            inventory.purchasePrice = movementData.purchasePrice;
        }
        await inventory.save({ session });

        const movement = await StockMovement.create(
            [
                {
                    inventory: inventory._id,
                    branch: inventory.branch,
                    movementType: STOCK_MOVEMENT_TYPES.STOCK_IN,
                    quantity: movementData.quantity,
                    previousStock,
                    newStock,
                    reason: movementData.reason,
                    remarks: movementData.remarks,
                    performedBy: user._id,
                },
            ],
            { session },
        );

        await logActivity(
            {
                user: user._id,
                module: ACTIVITY_MODULES.INVENTORY,
                action: ACTIVITY_ACTIONS.STOCK_IN,
                recordId: inventory._id,
                recordCode: inventory.sku,
                description: `Added ${movement.quantity} units to inventory ${inventory.sku}.`,
                metadata: {
                    stockMovementId: movement[0]._id,
                    quantity: movement.quantity,
                    previousStock,
                    newStock,
                    reason: movement.reason,
                },
                ...requestInfo,
            },
            session,
        );

        if (ownSession) {
            await session.commitTransaction();
        }
        return movement[0];
    } catch (error) {
        if (ownSession) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        if (ownSession) {
            await session.endSession();
        }
    }
};

// Stock Out
const stockOut = async (movementData, user, requestInfo, session = null) => {

    const ownSession = !session;
    if (ownSession) {
        session = await mongoose.startSession();
        session.startTransaction();
    }
    try {
        const inventory = await Inventory.findOne({
            _id: movementData.inventory,
            isDeleted: false,
            isActive: true,
        }).session(session);

        if (!inventory) {
            throw new ApiError(404, "Inventory not found.");
        }

        if (
            user.role === ROLES.BRANCH_ADMIN &&
            inventory.branch.toString() !== user.branch.toString()
        ) {
            throw new ApiError(403, "Not authorized for this branch.");
        }

        if (inventory.currentStock < movementData.quantity) {
            throw new ApiError(400, "Insufficient stock.");
        }

        const previousStock = inventory.currentStock;
        const newStock = previousStock - movementData.quantity;

        inventory.currentStock = newStock;
        await inventory.save({ session });

        const movement = await StockMovement.create(
          [
            {
              inventory: inventory._id,
              branch: inventory.branch,
              movementType: STOCK_MOVEMENT_TYPES.STOCK_OUT,
              quantity: movementData.quantity,
              previousStock,
              newStock,
              reason: movementData.reason,
              remarks: movementData.remarks,
              performedBy: user._id,
            },
          ],
          { session },
        );
        
        await logActivity(
            {
                user: user._id,
                module: ACTIVITY_MODULES.INVENTORY,
                action: ACTIVITY_ACTIONS.STOCK_OUT,
                recordId: inventory._id,
                recordCode: inventory.sku,
                description: `Removed ${movement.quantity} units from inventory ${inventory.sku}.`,
                metadata: {
                    stockMovementId: movement[0]._id,
                    quantity: movement.quantity,
                    previousStock,
                    newStock,
                    reason: movement.reason,
                },
                ...requestInfo,
            },
            session
        );

        if (ownSession) {
            await session.commitTransaction();
        }
        return movement[0];

    } catch(error){
        if (ownSession) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        if (ownSession) {
            await session.endSession();
        }
    }
};

// Transfer Stock
const transferStock = async (movementData, user, requestInfo, session = null) => {

    const ownSession = !session;
    if (ownSession) {
        session = await mongoose.startSession();
        session.startTransaction();
    }
    try {
        const sourceInventory =
            await Inventory.findOne({
                _id: movementData.inventory,
                isDeleted: false,
                isActive: true,
            }).session(session);

        if (!sourceInventory) {
            throw new ApiError(404, "Source inventory not found.");
        }

        if (sourceInventory.currentStock < movementData.quantity) {
            throw new ApiError(400, "Insufficient stock.");
        }

        const destinationInventory =
            await Inventory.findOne({
                itemName: sourceInventory.itemName,
                branch: movementData.toBranch,
                isDeleted: false,
            }).session(session);

        if (!destinationInventory) {
            throw new ApiError(404, "Destination inventory item not found.");
        }

        // Remove from source
        const sourcePrevious = sourceInventory.currentStock;
        sourceInventory.currentStock -= movementData.quantity;
        await sourceInventory.save({ session });

        // Add to destination
        const destinationPrevious = destinationInventory.currentStock;
        destinationInventory.currentStock += movementData.quantity;
        await destinationInventory.save({ session });

        // Source movement
        await StockMovement.create(
          [
            {
              inventory: sourceInventory._id,
              branch: sourceInventory.branch,
              movementType: STOCK_MOVEMENT_TYPES.TRANSFER,
              quantity: movementData.quantity,
              previousStock: sourcePrevious,
              newStock: sourceInventory.currentStock,
              fromBranch: sourceInventory.branch,
              toBranch: movementData.toBranch,
              reason: "Transfer",
              remarks: movementData.remarks,
              performedBy: user._id,
            },
          ],
          { session },
        );

        // Destination movement
        await StockMovement.create(
          [
            {
              inventory: destinationInventory._id,
              branch: destinationInventory.branch,
              movementType: STOCK_MOVEMENT_TYPES.TRANSFER,
              quantity: movementData.quantity,
              previousStock: destinationPrevious,
              newStock: destinationInventory.currentStock,
              fromBranch: sourceInventory.branch,
              toBranch: movementData.toBranch,
              reason: "Transfer",
              remarks: movementData.remarks,
              performedBy: user._id,
            },
          ],
          { session },
        );

        await logActivity(
            {
                user: user._id,
                module: ACTIVITY_MODULES.INVENTORY,
                action: ACTIVITY_ACTIONS.STOCK_TRANSFER,
                recordId: sourceInventory._id,
                recordCode: sourceInventory.sku,
                description:
                    `Transferred ${quantity} units from ${sourceInventory.sku} to ${destinationInventory.sku}.`,
                metadata: {
                    sourceInventory: sourceInventory.sku,
                    destinationInventory: destinationInventory.sku,
                    quantity,
                    stockMovementId: movement[0]._id,
                },
                ...requestInfo,
            },
            session
        );

        if (ownSession) {
            await session.commitTransaction();
        }
        return true;

    } catch(error){
        if (ownSession) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        if (ownSession) {
            await session.endSession();
        }
    }
};

// Stock Adjustment
const adjustStock = async (movementData, user, requestInfo, session = null) => {

    const ownSession = !session;
    if (ownSession) {
        session = await mongoose.startSession();
        session.startTransaction();
    }
    try {
        const inventory =
            await Inventory.findOne({
                _id: movementData.inventory,
                isDeleted: false,
                isActive: true,
            }).session(session);

        if (!inventory) {
            throw new ApiError(404, "Inventory not found.");
        }

        const previousStock = inventory.currentStock;
        const newStock = previousStock + movementData.quantity;

        if (newStock < 0) {
            throw new ApiError(400, "Stock cannot become negative.");
        }

        inventory.currentStock = newStock;
        await inventory.save({ session });

        const movement = await StockMovement.create(
          [
            {
              inventory: inventory._id,
              branch: inventory.branch,
              movementType: STOCK_MOVEMENT_TYPES.ADJUSTMENT,
              quantity: Math.abs(movementData.quantity),
              previousStock,
              newStock,
              reason: movementData.reason,
              remarks: movementData.remarks,
              performedBy: user._id,
            },
          ],
          { session },
        );
        
        await logActivity(
            {
                user: user._id,
                module: ACTIVITY_MODULES.INVENTORY,
                action: ACTIVITY_ACTIONS.STOCK_ADJUSTMENT,
                recordId: inventory._id,
                recordCode: inventory.sku,
                description: `Adjusted inventory ${inventory.sku}.`,
                metadata: {
                    stockMovementId: movement[0]._id,
                    previousStock,
                    newStock,
                    adjustment: newStock - previousStock,
                    reason: movement.reason,
                },
                ...requestInfo,
            },
            session
        );

        if (ownSession) {
            await session.commitTransaction();
        }
        return movement[0];

    } catch(error){
        if (ownSession) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        if (ownSession) {
            await session.endSession();
        }
    }
};

const getStockMovements = async (query, user) => {

    const {
        page = 1,
        limit = 10,
        inventory,
        branch,
        movementType,
        startDate,
        endDate,
    } = query;

    const filter = {};

    // Inventory filter
    if (inventory) {
        filter.inventory = inventory;
    }

    // Movement type filter
    if (movementType) {
        filter.movementType = movementType;
    }

    // Date filter
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
            filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            filter.createdAt.$lte = new Date(endDate);
        }
    }

    // Branch restriction
    if (user.role === ROLES.BRANCH_ADMIN || user.role === ROLES.INVENTORY_STAFF) {
        filter.branch = user.branch;
    }else if (branch) {
        filter.branch = branch;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [movements, total] =
        await Promise.all([
            StockMovement.find(filter)
                .populate("inventory", "sku itemName")
                .populate("branch", "branchName")
                .populate("performedBy", "firstName lastName")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),

            StockMovement.countDocuments(filter)
        ]);

    return {
        movements,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

const getStockMovement = async (movementId, user) => {

    const movement = await StockMovement.findById(movementId)
        .populate("inventory", "sku itemName")
        .populate("branch", "branchName")
        .populate("fromBranch", "branchName")
        .populate("toBranch", "branchName")
        .populate("performedBy", "firstName lastName");


    if (!movement) {
        throw new ApiError(404, "Stock movement not found.");
    }

    // Branch restriction
    if (
        (user.role === ROLES.BRANCH_ADMIN || user.role === ROLES.INVENTORY_STAFF)
        &&
        movement.branch._id.toString() !== user.branch.toString()
    ) {
        throw new ApiError(403, "You are not authorized to view this movement.");
    }

    return movement;
};

module.exports = {
    stockIn,
    stockOut,
    transferStock,
    adjustStock,
    getStockMovements,
    getStockMovement,
};