const mongoose = require("mongoose");

const Inventory = require("../models/inventory.model");
const StockMovement = require("../models/stockMovement.model");
const Branch = require("../models/branch.model");
const ApiError = require("../utils/apiError.util");

const { ROLES } = require("../constants/roles");
const { logActivity } = require("./activity.service");

const {
  STOCK_MOVEMENT_REASONS,
  STOCK_MOVEMENT_TYPES,
} = require("../constants/stockMovement.constants");

const {
  ACTIVITY_MODULES,
  ACTIVITY_ACTIONS,
} = require("../constants/activity.constants");

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
    if (
      user.role === ROLES.BRANCH_ADMIN &&
      inventory.branch.toString() !== user.branch.toString()
    ) {
      throw new ApiError(403, "Not authorized for this branch.");
    }

    const previousStock = inventory.currentStock;
    const newStock = previousStock + movementData.quantity;

    inventory.currentStock = newStock;

    // Update latest purchase price when stock comes from a purchase
    if (
      movementData.reason === STOCK_MOVEMENT_REASONS.PURCHASE &&
      movementData.purchasePrice != null
    ) {
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
        description: `Added ${movement[0].quantity} units to inventory ${inventory.sku}.`,
        metadata: {
          stockMovementId: movement[0]._id,
          quantity: movement[0].quantity,
          previousStock,
          newStock,
          reason: movement[0].reason,
        },
        ...requestInfo,
        branch: movement[0].branch,
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

    // Branch Admin restriction
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
        description: `Removed ${movement[0].quantity} units from inventory ${inventory.sku}.`,
        metadata: {
          stockMovementId: movement[0]._id,
          quantity: movement[0].quantity,
          previousStock,
          newStock,
          reason: movement[0].reason,
        },
        ...requestInfo,
        branch: movement[0].branch,
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

/*
|
| Transfer Stock
|
| Rules:
|
| 1. Source inventory must exist.
| 2. Source inventory must be active and not deleted.
| 3. Destination branch must exist and be active.
| 4. Source and destination branches must be different.
| 5. Source must have enough stock.
| 6. Destination inventory is searched by SKU + branch.
| 7. If destination inventory does not exist, it is automatically created.
| 8. Source stock is decreased.
| 9. Destination stock is increased.
| 10. Two transfer movements are recorded.
| 11. Everything runs inside one MongoDB transaction.
|
*/

const transferStock = async (
  movementData,
  user,
  requestInfo,
  session = null,
) => {
  const ownSession = !session;

  if (ownSession) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    // Validate source inventory
    const sourceInventory = await Inventory.findOne({
      _id: movementData.inventory,
      isDeleted: false,
      isActive: true,
    }).session(session);

    if (!sourceInventory) {
      throw new ApiError(404, "Source inventory not found.");
    }

    // Branch Admin restriction
    if (
      user.role === ROLES.BRANCH_ADMIN &&
      sourceInventory.branch.toString() !== user.branch.toString()
    ) {
      throw new ApiError(403, "Not authorized for this branch.");
    }

    // Validate destination branch
    if (!movementData.toBranch) {
      throw new ApiError(400, "Destination branch is required.");
    }

    const destinationBranch = await Branch.findOne({
      _id: movementData.toBranch,
      isActive: true,
    }).session(session);

    if (!destinationBranch) {
      throw new ApiError(404, "Destination branch not found or inactive.");
    }

    // Prevent transfer to the same branch
    if (sourceInventory.branch.toString() === movementData.toBranch.toString()) {
      throw new ApiError(400, "Source and destination branches must be different.");
    }

    // Validate quantity
    if (
      !Number.isFinite(Number(movementData.quantity)) ||
      Number(movementData.quantity) <= 0
    ) {
      throw new ApiError(400, "Transfer quantity must be greater than zero.");
    }

    const quantity = Number(movementData.quantity);

    // Check source stock
    if (sourceInventory.currentStock < quantity) {
      throw new ApiError(400, "Insufficient stock.");
    }

    /*
    |
    | Find destination inventory
    |
    | IMPORTANT:
    | Do not search by itemName.
    |
    | SKU identifies the same inventory item across branches.
    |
    */

    let destinationInventoryCreated = false;
    let destinationInventory = await Inventory.findOne({
      sku: sourceInventory.sku,
      branch: movementData.toBranch,
      isDeleted: false,
      isActive: true,
    }).session(session);

    // Create destination inventory automatically if necessary
    if (!destinationInventory) {
      const destinationInventoryData = {
        sku: sourceInventory.sku,
        itemName: sourceInventory.itemName,

        /*
        Barcode is copied because it identifies the same item.
        The inventory model now makes barcode unique per branch.
        */
        barcode: sourceInventory.barcode,

        category: sourceInventory.category,
        vendor: sourceInventory.vendor,

        branch: movementData.toBranch,

        itemType: sourceInventory.itemType,

        currentStock: 0,

        /*
        | Keep the source branch's threshold as the initial value.
        | It can be changed later for the destination branch.
        */
        minimumStock: sourceInventory.minimumStock,

        unit: sourceInventory.unit,
        purchasePrice: sourceInventory.purchasePrice,

        description: sourceInventory.description,

        itemImage: sourceInventory.itemImage,
        itemImagePublicId: sourceInventory.itemImagePublicId,

        isActive: true,
        isDeleted: false,

        createdBy: user._id,
        updatedBy: null,
        deletedBy: null,
      };

      const createdDestinationInventory = await Inventory.create(
        [destinationInventoryData],
        { session },
      );

      destinationInventory = createdDestinationInventory[0];
      destinationInventoryCreated = true;
    }

    // Remove stock from source
    const sourcePrevious = sourceInventory.currentStock;
    const sourceNew = sourcePrevious - quantity;
    sourceInventory.currentStock = sourceNew;
    sourceInventory.updatedBy = user._id;
    await sourceInventory.save({ session });

    // Add stock to destination
    const destinationPrevious = destinationInventory.currentStock;
    const destinationNew = destinationPrevious + quantity;
    destinationInventory.currentStock = destinationNew;
    destinationInventory.updatedBy = user._id;
    await destinationInventory.save({ session });

    // Source transfer movement
    const sourceMovement = await StockMovement.create(
      [
        {
          inventory: sourceInventory._id,
          branch: sourceInventory.branch,

          movementType: STOCK_MOVEMENT_TYPES.TRANSFER,

          quantity,

          previousStock: sourcePrevious,
          newStock: sourceNew,

          fromBranch: sourceInventory.branch,
          toBranch: movementData.toBranch,

          reason: "Transfer",
          remarks: movementData.remarks,

          performedBy: user._id,
        },
      ],
      { session },
    );

    // Destination transfer movement
    const destinationMovement = await StockMovement.create(
      [
        {
          inventory: destinationInventory._id,
          branch: destinationInventory.branch,

          movementType: STOCK_MOVEMENT_TYPES.TRANSFER,

          quantity,

          previousStock: destinationPrevious,
          newStock: destinationNew,

          fromBranch: sourceInventory.branch,
          toBranch: movementData.toBranch,

          reason: "Transfer",
          remarks: movementData.remarks,

          performedBy: user._id,
        },
      ],
      { session },
    );

    // Activity log
    await logActivity(
      {
        user: user._id,
        module: ACTIVITY_MODULES.INVENTORY,
        action: ACTIVITY_ACTIONS.STOCK_TRANSFER,
        recordId: sourceInventory._id,
        recordCode: sourceInventory.sku,
        description:
          `Transferred ${quantity} units from ` +
          `${sourceInventory.branch} to ` +
          `${destinationInventory.branch}.`,

        metadata: {
          sourceInventoryId: sourceInventory._id,
          sourceInventory: sourceInventory.sku,
          sourcePreviousStock: sourcePrevious,
          sourceNewStock: sourceNew,
          sourceMovementId: sourceMovement[0]._id,

          destinationInventoryId: destinationInventory._id,
          destinationInventory: destinationInventory.sku,
          destinationPreviousStock: destinationPrevious,
          destinationNewStock: destinationNew,
          destinationMovementId: destinationMovement[0]._id,

          fromBranch: sourceInventory.branch,
          quantity,
          toBranch: movementData.toBranch,

          destinationInventoryCreated,
        },

        ...requestInfo,
        branch: sourceMovement[0].branch,
      },
      session,
    );

    // Commit transaction
    if (ownSession) {
      await session.commitTransaction();
    }

    return {
      success: true,
      sourceInventory: sourceInventory._id,
      destinationInventory: destinationInventory._id,
      quantity,
      sourcePreviousStock: sourcePrevious,
      sourceNewStock: sourceNew,
      destinationPreviousStock: destinationPrevious,
      destinationNewStock: destinationNew,
      sourceMovement: sourceMovement[0],
      destinationMovement: destinationMovement[0],
    };
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

// Stock Adjustment
const adjustStock = async (movementData, user, requestInfo, session = null) => {
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
          reason: movement[0].reason,
        },
        ...requestInfo,
        branch: movement[0].branch,
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

// Get Stock Movements
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
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // Branch restriction
  if (user.role === ROLES.BRANCH_ADMIN || user.role === ROLES.INVENTORY_STAFF) {
    filter.branch = user.branch;
  } else if (branch) {
    filter.branch = branch;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [movements, total] = await Promise.all([
    StockMovement.find(filter)
      .populate("inventory", "sku itemName")
      .populate("branch", "branchName")
      .populate("performedBy", "firstName lastName")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(Number(limit))
      .lean(),

    StockMovement.countDocuments(filter),
  ]);

  return {
    movements,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

// Get Single Stock Movement
const getStockMovement = async (movementId, user) => {
  const movement = await StockMovement.findById(movementId)
    .populate("inventory", "sku itemName unit createdAt")
    .populate("branch", "branchName")
    .populate("fromBranch", "branchName")
    .populate("toBranch", "branchName")
    .populate("performedBy", "firstName lastName");

  if (!movement) {
    throw new ApiError(404, "Stock movement not found.");
  }

  // Branch restriction
  if (
    (user.role === ROLES.BRANCH_ADMIN || user.role === ROLES.INVENTORY_STAFF) &&
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