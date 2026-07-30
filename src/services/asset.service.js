const mongoose = require("mongoose");

const Branch = require("../models/branch.model");
const Inventory = require("../models/inventory.model");
const Asset = require("../models/asset.model");
const Maintenance = require("../models/maintenance.model");
const stockMovementService = require("./stockMovement.service");
const ApiError = require("../utils/apiError.util");
const { ROLES } = require("../constants/roles");
const { STOCK_MOVEMENT_REASONS } = require("../constants/stockMovement.constants");
const { ASSET_STATUS } = require("../constants/asset.constants");
const { logActivity } = require("./activity.service");
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require("../constants/activity.constants");

const getAssets = async (query, user) => {
    const {
        page = 1,
        limit = 10,
        inventory,
        branch,
        status,
        assignedTo,
        isActive,
    } = query;

    const filter = {
        isDeleted: false,
    };

    // Inventory filter
    if (inventory) {
        filter.inventory = inventory;
    }

    // Status filter
    if (status) {
        filter.status = status;
    }

    // Assigned User filter
    if (assignedTo) {
        filter.assignedTo = assignedTo;
    }

    // Active filter
    if (isActive !== undefined) {
        filter.isActive = isActive === "true";
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

    const skip = (Number(page) - 1) * Number(limit);

    const [assets, total] = await Promise.all([
        Asset.find(filter)
            .populate("inventory", "sku itemName")
            .populate("branch", "branchName")
            .populate("assignedTo", "firstName lastName email")
            .sort({createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(),

        Asset.countDocuments(filter),
    ]);

    return {
        assets,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
};

const getAsset = async (assetId, user) => {

    const asset = await Asset.findOne({_id: assetId, isDeleted: false })
        .populate("inventory", "sku itemName unit purchasePrice itemImage")
        .populate("branch", "branchName")
        .populate("assignedTo", "firstName lastName email")
        .populate("assignmentHistory.assignedTo", "firstName lastName")
        .populate("assignmentHistory.assignedBy", "firstName lastName")
        .populate("assignmentHistory.returnedBy", "firstName lastName")
        .populate("createdBy", "firstName lastName")
        .populate("updatedBy", "firstName lastName");

    if (!asset) {
        throw new ApiError(404, "Asset not found.");
    }

    // Branch restriction
    if (
        (user.role === ROLES.BRANCH_ADMIN ||user.role === ROLES.INVENTORY_STAFF) &&
        asset.branch._id.toString() !== user.branch.toString()
    ) {
        throw new ApiError(403, "You are not authorized to view this asset.");
    }

    return asset;
};

const generateAssetCode = async () => {
    const latestAsset = await Asset.findOne()
        .sort({ createdAt: -1 })
        .select("assetCode");

    let nextNumber = 1;

    if (latestAsset?.assetCode) {
        const currentNumber = parseInt(latestAsset.assetCode.replace("AST-", ""), 10);
        nextNumber = currentNumber + 1;
    }

    return `AST-${String(nextNumber).padStart(6, "0")}`;
};

const createAsset = async (assetData, user, requestInfo) => {

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const inventory = await Inventory.findOne({
            _id: assetData.inventory,
            isDeleted: false,
            isActive: true,
        }).session(session);

        if (!inventory) {
            throw new ApiError(404, "Inventory not found.");
        }

        if (inventory.currentStock < 1) {
            throw new ApiError(400, "No stock available to create an asset.");
        }

        // Branch restriction
        if (user.role === ROLES.BRANCH_ADMIN && inventory.branch.toString() !== user.branch.toString()) {
            throw new ApiError(403, "Not authorized for this branch." );
        }

        const assetCode = await generateAssetCode();

        const asset = await Asset.create([{
            assetCode,
            inventory: inventory._id,
            serialNumber: assetData.serialNumber,
            branch: inventory.branch,
            remarks: assetData.remarks,
            createdBy: user._id,
        }, ],{ session });

        await stockMovementService.stockOut(
            {
                inventory: inventory._id,
                quantity: 1,
                reason: STOCK_MOVEMENT_REASONS.ASSET_CREATION,
                remarks: `Asset ${assetCode} created`,
            },
            user,
            session
        );

        await logActivity({
            user: user._id,
            module: ACTIVITY_MODULES.ASSET,
            action: ACTIVITY_ACTIONS.CREATE,
            recordId: asset[0]._id,
            recordCode: asset[0].assetCode,
            description: `Created asset ${asset[0].assetCode}.`,
            ...requestInfo,
        });

        await session.commitTransaction();

        return asset[0];

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        await session.endSession();
    }
};

const updateAsset = async (assetId, assetData, user, requestInfo) => {

    const asset = await Asset.findOne({_id: assetId, isDeleted: false });
    if (!asset) {
        throw new ApiError(404, "Asset not found.");
    }

    if (user.role === ROLES.BRANCH_ADMIN && asset.branch.toString() !== user.branch.toString()) {
        throw new ApiError(403, "You are not authorized to update this asset.");
    }

    asset.serialNumber = assetData.serialNumber ?? asset.serialNumber;
    asset.remarks = assetData.remarks ?? asset.remarks;
    asset.updatedBy = user._id;
    await asset.save();

    await logActivity({
        user: user._id,
        module: ACTIVITY_MODULES.ASSET,
        action: ACTIVITY_ACTIONS.UPDATE,
        recordId: asset._id,
        recordCode: asset.assetCode,
        description: `Updated asset ${asset.assetCode}.`,
        ...requestInfo,
    });

    return asset;
};

const changeAssetStatus = async (assetId, user, requestInfo) => {

    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
        throw new ApiError(404, "Asset not found.");
    }

    if (user.role === ROLES.BRANCH_ADMIN && asset.branch.toString() !== user.branch.toString()) {
        throw new ApiError(403, "You are not authorized.");
    }

    asset.isActive = !asset.isActive;
    asset.updatedBy = user._id;
    await asset.save();

    await logActivity({
        user: user._id,
        module: ACTIVITY_MODULES.ASSET,
        action: ACTIVITY_ACTIONS.STATUS_CHANGE,
        recordId: asset._id,
        recordCode: asset.assetCode,
        description: `Asset ${asset.assetCode} was ${
            asset.isActive ? "activated" : "deactivated"
        }.`,
        metadata: {
            isActive: asset.isActive,
        },
        ...requestInfo,
    });

    return asset;
};

const deleteAsset = async (assetId, user, requestInfo) => {

    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
        throw new ApiError(404, "Asset not found.");
    }

    if (user.role === ROLES.BRANCH_ADMIN && asset.branch.toString() !== user.branch.toString()) {
        throw new ApiError(403, "You are not authorized.");
    }

    if (asset.assignedTo) {
        throw new ApiError(400, "Assigned assets cannot be deleted.");
    }

    const maintenanceExists = await Maintenance.exists({asset: assetId });
    if (maintenanceExists) {
        throw new ApiError(400, "Cannot delete an asset with maintenance history.");
    }

    asset.isDeleted = true;
    asset.deletedBy = user._id;
    asset.updatedBy = user._id;
    await asset.save();

    await logActivity({
        user: user._id,
        module: ACTIVITY_MODULES.ASSET,
        action: ACTIVITY_ACTIONS.DELETE,
        recordId: asset._id,
        recordCode: asset.assetCode,
        description: `Deleted asset ${asset.assetCode}.`,
        ...requestInfo,
    });    

    return;
};

const assignAsset = async (assetId, assignmentData, user, requestInfo) => {

    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
        throw new ApiError(404, "Asset not found.");
    }

    if (!asset.isActive) {
        throw new ApiError(400, "Asset is inactive.");
    }

    // Branch restriction
    if (
        (user.role === ROLES.BRANCH_ADMIN || user.role === ROLES.INVENTORY_STAFF) &&
        asset.branch.toString() !== user.branch.toString()
    ) {
        throw new ApiError(403, "You are not authorized to assign this asset.");
    }

    if (asset.status !== ASSET_STATUS.AVAILABLE) {
        throw new ApiError(400, "Only available assets can be assigned.");
    }

    const assignedUser = await User.findOne({ _id: assignmentData.assignedTo, isDeleted: false, isActive: true });
    if (!assignedUser) {
        throw new ApiError(404, "Assigned user not found.");
    }

    // Optional: Restrict assignment to same branch
    if (assignedUser.branch && assignedUser.branch.toString() !== asset.branch.toString()) {
        throw new ApiError(400, "Asset can only be assigned to a user in the same branch.");
    }

    const assignedDate = new Date();

    // Current assignment
    asset.assignedTo = assignedUser._id;
    asset.assignedDate = assignedDate;
    asset.status = ASSET_STATUS.ASSIGNED;
    asset.updatedBy = user._id;

    // Assignment history
    asset.assignmentHistory.push({
        assignedTo: assignedUser._id,
        assignedBy: user._id,
        assignedDate,
        assignmentRemarks: assignmentData.remarks,
    });

    await logActivity({
        user: user._id,
        module: ACTIVITY_MODULES.ASSET,
        action: ACTIVITY_ACTIONS.ASSIGN,
        recordId: asset._id,
        recordCode: asset.assetCode,
        description: `Assigned asset ${asset.assetCode} to ${assignedUser.firstName} ${assignedUser.lastName}.`,
        metadata: {
            assignedTo: assignedUser._id,
            assignedEmployeeId: assignedUser.employeeId,
            assignedDate: assignmentData.assignedDate,
        },
        ...requestInfo,
    });

    await asset.save();

    return asset;
};

const returnAsset = async (assetId, returnData, user, requestInfo) => {
    
    const asset = await Asset.findOne({ _id: assetId, isDeleted: false });
    if (!asset) {
        throw new ApiError(404, "Asset not found.");
    }

    if (!asset.isActive) {
        throw new ApiError(400, "Asset is inactive.");
    }

    // Branch restriction
    if (
        (user.role === ROLES.BRANCH_ADMIN || user.role === ROLES.INVENTORY_STAFF) &&
        asset.branch.toString() !== user.branch.toString()
    ) {
        throw new ApiError(403, "You are not authorized to return this asset.");
    }

    if (asset.status !== ASSET_STATUS.ASSIGNED || !asset.assignedTo) {
        throw new ApiError(400, "Asset is not currently assigned.");
    }

    // Find the latest open assignment
    const history = [...asset.assignmentHistory]
        .reverse()
        .find(entry => !entry.returnedDate);

    if (!history) {
        throw new ApiError(400, "Assignment history not found.");
    }

    history.returnedBy = user._id;
    history.returnedDate = new Date();

    if (returnData.remarks) {
        history.returnRemarks = returnData.remarks;
    }

    // Clear current assignment
    asset.assignedTo = null;
    asset.assignedDate = null;
    asset.status = ASSET_STATUS.AVAILABLE;
    asset.updatedBy = user._id;
    await asset.save();

    await logActivity({
        user: user._id,
        module: ACTIVITY_MODULES.ASSET,
        action: ACTIVITY_ACTIONS.RETURN,
        recordId: asset._id,
        recordCode: asset.assetCode,
        description: `Returned asset ${asset.assetCode}.`,
        metadata: {
            returnedBy: asset.assignmentHistory.returnedBy,
            returnedDate: asset.assignmentHistory.returnedDate,
            assetCondition: asset.condition,
        },
        ...requestInfo,
    });

    return asset;
};

module.exports = {
    getAssets,
    getAsset,
    createAsset,
    updateAsset,
    changeAssetStatus,
    deleteAsset,
    assignAsset,
    returnAsset,
}