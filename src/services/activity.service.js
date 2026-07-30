const Activity = require("../models/activity.model");
const ApiError = require("../utils/apiError.util");

const logActivity = async ({
    user,
    module,
    action,
    recordId,
    recordCode,
    description,
    metadata = {},
    ipAddress = null,
    userAgent = null,
}, session = null) => {
    return await Activity.create([{
        user,
        module,
        action,
        recordId,
        recordCode,
        description,
        metadata,
        ipAddress,
        userAgent,
    }],{ session });
};

const getActivities = async (query) => {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    if (query.module) {
        filter.module = query.module;
    }

    if (query.action) {
        filter.action = query.action;
    }

    if (query.user) {
        filter.user = query.user;
    }

    if (query.startDate || query.endDate) {
        filter.createdAt = {};

        if (query.startDate) {
            filter.createdAt.$gte = new Date(query.startDate);
        }

        if (query.endDate) {
            filter.createdAt.$lte = new Date(query.endDate);
        }
    }

    if (query.search?.trim()) {
        const search = query.search.trim();

        filter.$or = [
            {
                recordCode: {
                    $regex: search,
                    $options: "i",
                },
            },
            {
                description: {
                    $regex: search,
                    $options: "i",
                },
            },
        ];
    }

    const sort = {
        [query.sortBy || "createdAt"]:
            query.sortOrder === "asc" ? 1 : -1,
    };

    const activities = await Activity.find(filter)
        .populate("user", "firstName lastName email")
        .sort(sort)
        .skip(skip)
        .limit(limit);

    const total = await Activity.countDocuments(filter);

    return {
        activities,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getActivity = async (id) => {
    const activity = await Activity.findById(id)
        .populate("user", "firstName lastName email");

    if (!activity) {
        throw new ApiError(404, "Activity log not found.");
    }

    return activity;
};

module.exports = {
    logActivity,
    getActivities,
    getActivity,
};