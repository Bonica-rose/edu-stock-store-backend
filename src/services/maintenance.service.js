const Maintenance = require("../models/maintenance.model");
const Asset = require("../models/asset.model");
const ApiError = require("../utils/apiError.util");
const { ASSET_CONDITION, } = require("../constants/asset.constants");
const { MAINTENANCE_STATUS, } = require("../constants/maintenance.constants");
const { ROLES } = require("../constants/roles");
const { logActivity } = require("./activity.service");
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require("../constants/activity.constants");

const generateMaintenanceId = async () => {
    const lastMaintenance = await Maintenance.findOne()
        .sort({ maintenanceId: -1 })
        .select("maintenanceId");

    if (!lastMaintenance || !lastMaintenance.maintenanceId) {
        return "MTN00001";
    }

    const lastNumber = parseInt(lastMaintenance.maintenanceId.replace("MTN", ""), 10);
    const nextNumber = lastNumber + 1;

    return `MTN${String(nextNumber).padStart(5, "0")}`;
};

const getMaintenances = async (query) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const search = query.search?.trim();

    const filter = {
        isDeleted: false,
    };

    // Filters
    if (query.status) {
        filter.status = query.status;
    }

    if (query.priority) {
        filter.priority = query.priority;
    }

    if (query.assignedTo) {
        filter.assignedTo = query.assignedTo;
    }

    if (query.reportedBy) {
        filter.reportedBy = query.reportedBy;
    }

    // Search
    if (search) {
        filter.$or = [
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
        ];
    }

    // Sorting
    let sort = { createdAt: -1 };

    if (query.sortBy) {
        const order = query.sortOrder === "asc" ? 1 : -1;
        sort = {
            [query.sortBy]: order,
        };
    }

    let maintenanceQuery = Maintenance.find(filter)
        .populate({
            path: "asset",
            select: "assetId assetName branch",
            populate: {
                path: "branch",
                select: "branchName",
            },
        })
        .populate("reportedBy", "firstName lastName email")
        .populate("assignedTo", "firstName lastName email")
        .populate("vendor", "vendorName")
        .sort(sort);

    const maintenances = await maintenanceQuery
        .skip(skip)
        .limit(limit)
        .lean();

    // Search Asset Name & Filter Branch after populate
    let filteredMaintenances = maintenances;

    if (search) {
        filteredMaintenances = filteredMaintenances.filter((maintenance) => {
            const assetName = maintenance.asset?.assetName || "";

            return (
                assetName.toLowerCase().includes(search.toLowerCase()) ||
                maintenance.maintenanceId
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                maintenance.issueTitle
                    .toLowerCase()
                    .includes(search.toLowerCase())
            );
        });
    }

    if (query.branch) {
        filteredMaintenances = filteredMaintenances.filter(
            (maintenance) =>
                maintenance.asset?.branch?._id?.toString() === query.branch
        );
    }

    const total = await Maintenance.countDocuments(filter);

    return {
        maintenances: filteredMaintenances,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getMaintenance = async (id) => {
    const maintenance = await Maintenance.findOne({
        _id: id,
        isDeleted: false,
    })
        .populate({
            path: "asset",
            select: "assetId assetName assetCode assetType serialNumber branch condition",
            populate: {
                path: "branch",
                select: "branchName branchCode",
            },
        })
        .populate("reportedBy", "firstName lastName email")
        .populate("assignedBy", "firstName lastName email")
        .populate("assignedTo", "firstName lastName email")
        .populate("vendor", "vendorName vendorCode contactPerson phone email");

    if (!maintenance) {
        throw new ApiError(404, "Maintenance record not found.");
    }

    return maintenance;
};

const createMaintenance = async (maintenanceData, userId, requestInfo) => {
    // Check asset exists
    const asset = await Asset.findOne({_id: maintenanceData.asset, isDeleted: false });
    if (!asset) {
        throw new ApiError(404, "Asset not found.");
    }

    // Check asset is active (if your Asset model has isActive)
    if (asset.isActive === false) {
        throw new ApiError(400, "Maintenance cannot be created for an inactive asset.");
    }

    // Prevent duplicate open maintenance requests
    const existingMaintenance = await Maintenance.findOne({
        asset: asset._id,
        status: {
            $in: [
                MAINTENANCE_STATUS.PENDING,
                MAINTENANCE_STATUS.IN_PROGRESS,
            ],
        },
        isDeleted: false,
    });

    if (existingMaintenance) {
        throw new ApiError(409, "An active maintenance request already exists for this asset.");
    }

    // Generate Maintenance ID
    const maintenanceId = await generateMaintenanceId();

    // Create maintenance record
    const maintenance = await Maintenance.create({
        ...maintenanceData,
        maintenanceId,
        reportedBy: userId,
        status: MAINTENANCE_STATUS.PENDING,
    });

    // Update asset condition
    asset.condition = ASSET_CONDITION.UNDER_MAINTENANCE;

    // Optional: Add maintenance history
    if (Array.isArray(asset.maintenanceHistory)) {
        asset.maintenanceHistory.push({
            maintenance: maintenance._id,
            createdAt: new Date(),
        });
    }

    await asset.save();

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.MAINTENANCE,
        action: ACTIVITY_ACTIONS.CREATE,
        recordId: maintenance._id,
        recordCode: maintenance.maintenanceId,
        description: `Created maintenance request ${maintenance.maintenanceId}.`,
        ...requestInfo,
    });

    return await Maintenance.findById(maintenance._id)
        .populate({
            path: "asset",
            select: "assetId assetName assetCode",
        })
        .populate("reportedBy", "firstName lastName email");
};

const assignMaintenance = async (id, assignData, userId, requestInfo) => {
    // Find maintenance
    const maintenance = await Maintenance.findOne({ _id: id, isDeleted: false });
    if (!maintenance) {
        throw new ApiError(404, "Maintenance record not found.");
    }

    // Ensure maintenance is pending
    if (maintenance.status !== MAINTENANCE_STATUS.PENDING) {
        throw new ApiError(400, "Only pending maintenance requests can be assigned.");
    }

    // Validate assigned user
    const assignedUser = await User.findOne({ _id: assignData.assignedTo, isDeleted: false, isActive: true });
    if (!assignedUser) {
        throw new ApiError(404, "Assigned user not found.");
    }

    // Ensure assigned user is Maintenance Staff
    if (assignedUser.role !== ROLES.MAINTENANCE_STAFF) {
        throw new ApiError(400, "Selected user is not a Maintenance Staff.");
    }

    // Update maintenance
    maintenance.assignedTo = assignedUser._id;
    maintenance.assignedBy = userId;
    maintenance.assignedDate = new Date();
    maintenance.status = MAINTENANCE_STATUS.IN_PROGRESS;

    await maintenance.save();

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.MAINTENANCE,
        action: ACTIVITY_ACTIONS.ASSIGN,
        recordId: maintenance._id,
        recordCode: maintenance.maintenanceId,
        description:
            `Assigned maintenance ${maintenance.maintenanceId} to ${assignedUser.firstName} ${assignedUser.lastName}.`,
        metadata: {
            assignedTo: assignedUser._id,
            assignedEmployeeId: assignedUser.employeeId,
            assignedDate: maintenance.assignedDate,
        },
        ...requestInfo,
    });   

    return await Maintenance.findById(maintenance._id)
        .populate({
            path: "asset",
            select: "assetId assetName assetCode",
        })
        .populate("reportedBy", "firstName lastName email")
        .populate("assignedBy", "firstName lastName email")
        .populate("assignedTo", "firstName lastName email");
};

const updateMaintenanceStatus = async (id, statusData, userId, requestinfo) => {
    const { status } = statusData;

    // Find maintenance
    const maintenance = await Maintenance.findOne({ _id: id,  isDeleted: false });

    if (!maintenance) {
        throw new ApiError(404, "Maintenance record not found.");
    }

    const currentStatus = maintenance.status;

    // Allow only valid status transitions
    const validTransitions = {
        [MAINTENANCE_STATUS.PENDING]: [
            MAINTENANCE_STATUS.IN_PROGRESS,
            MAINTENANCE_STATUS.CANCELLED,
        ],
        [MAINTENANCE_STATUS.IN_PROGRESS]: [],
        [MAINTENANCE_STATUS.COMPLETED]: [],
        [MAINTENANCE_STATUS.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(status)) {
        throw new ApiError(400, `Cannot change maintenance status from "${currentStatus}" to "${status}".`);
    }

    maintenance.status = status;

    if (status === MAINTENANCE_STATUS.COMPLETED) {
        maintenance.completedDate = new Date();

        await Asset.findByIdAndUpdate(maintenance.asset, {
            condition: ASSET_CONDITION.GOOD,
        });
    }

    if (status === MAINTENANCE_STATUS.CANCELLED) {
        await Asset.findByIdAndUpdate(maintenance.asset, {
            condition: ASSET_CONDITION.GOOD,
        });
    }

    await maintenance.save();

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.MAINTENANCE,
        action: ACTIVITY_ACTIONS.STATUS_CHANGE,
        recordId: maintenance._id,
        recordCode: maintenance.maintenanceId,
        description: `Changed maintenance ${maintenance.maintenanceId} status to ${maintenance.status}.`,
        metadata: {
            previousStatus: currentStatus,
            currentStatus: maintenance.status,
        },
        ...requestInfo,
    });

    return await Maintenance.findById(maintenance._id)
        .populate({
            path: "asset",
            select: "assetId assetName assetCode",
        })
        .populate("reportedBy", "firstName lastName email")
        .populate("assignedBy", "firstName lastName email")
        .populate("assignedTo", "firstName lastName email")
        .populate("vendor", "vendorName");
};

const completeMaintenance = async (id, completeData, userId, requestinfo) => {
    // Find maintenance
    const maintenance = await Maintenance.findOne({ _id: id, isDeleted: false })
        .populate("vendor", "vendorName");;
    if (!maintenance) {
        throw new ApiError(404, "Maintenance record not found.");
    }

    // Only In Progress maintenance can be completed
    if (maintenance.status !== MAINTENANCE_STATUS.IN_PROGRESS) {
        throw new ApiError(400, "Only maintenance in progress can be completed.");
    }

    // Save completion details
    maintenance.repairNotes = completeData.repairNotes;
    maintenance.repairCost = completeData.repairCost || 0;
    maintenance.partsReplaced = completeData.partsReplaced || "";
    maintenance.vendor = completeData.vendor || null;

    maintenance.completedDate = new Date();
    maintenance.status = MAINTENANCE_STATUS.COMPLETED;

    await maintenance.save();

    // Update asset condition
    await Asset.findByIdAndUpdate(maintenance.asset, {
        condition: completeData.assetCondition,
    });

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.MAINTENANCE,
        action: ACTIVITY_ACTIONS.COMPLETE_MAINTENANCE,
        recordId: maintenance._id,
        recordCode: maintenance.maintenanceId,
        description: `Completed maintenance ${maintenance.maintenanceId}.`,
        metadata: {
            repairCost: maintenance.repairCost,
            vendor: maintenance.vendor.vendorName,
            completedDate: maintenance.completedDate,
        },
        ...requestInfo,
    });

    return await Maintenance.findById(maintenance._id)
        .populate({
            path: "asset",
            select: "assetId assetName assetCode condition",
        })
        .populate("reportedBy", "firstName lastName email")
        .populate("assignedBy", "firstName lastName email")
        .populate("assignedTo", "firstName lastName email")
        .populate("vendor", "vendorName");
};

const deleteMaintenance = async (id, userId, requestinfo) => {
    // Find maintenance
    const maintenance = await Maintenance.findOne({ _id: id,  isDeleted: false });
    if (!maintenance) {
        throw new ApiError(404, "Maintenance record not found.");
    }

    // Allow only delete if maintenance is in pending
    if (maintenance.status !== MAINTENANCE_STATUS.PENDING) {
        throw new ApiError(400, "Only pending maintenance requests can be deleted.");
    }

    // Soft delete
    maintenance.isDeleted = true;
    await maintenance.save();

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.MAINTENANCE,
        action: ACTIVITY_ACTIONS.DELETE,
        recordId: maintenance._id,
        recordCode: maintenance.maintenanceId,
        description: `Deleted maintenance ${maintenance.maintenanceId}.`,
        ...requestInfo,
    });

    return;
};

module.exports = {
    getMaintenances,
    getMaintenance,
    createMaintenance,
    assignMaintenance,
    updateMaintenanceStatus,
    completeMaintenance,
    deleteMaintenance,
};