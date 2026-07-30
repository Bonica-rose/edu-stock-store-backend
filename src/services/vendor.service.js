const Vendor = require("../models/vendor.model");
const Purchase = require("../models/purchase.model");
const ApiError = require("../utils/apiError.util");
const { logActivity } = require("./activity.service");
const { ACTIVITY_MODULES, ACTIVITY_ACTIONS } = require("../constants/activity.constants");

const getVendors = async (query) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        isActive,
        sortBy = "createdAt",
        sortOrder = "desc",
    } = query;

    const filter = {};

    // Search
    if (search) {
        filter.$or = [
            { vendorName: { $regex: search, $options: "i" } },
            { vendorCode: { $regex: search, $options: "i" } },
            { contactPerson: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
        ];
    }

    // Status Filter
    if (isActive !== undefined) {
        filter.isActive = isActive === "true";
    }

    // Sorting
    const sort = {
        [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const skip = (Number(page) - 1) * Number(limit);

    const [vendors, total] = await Promise.all([
        Vendor.find(filter)
            .populate("createdBy", "employeeId firstName lastName email")
            .populate("updatedBy", "employeeId firstName lastName email")
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .lean(),

        Vendor.countDocuments(filter),
    ]);

    return {
        vendors,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
        },
    };
};

const getVendor = async (vendorId) => {
    const vendor = await Vendor.findById(vendorId)
        .populate("createdBy", "employeeId firstName lastName email")
        .populate("updatedBy", "employeeId firstName lastName email")
        .lean();

    if (!vendor) {
        throw new ApiError(404, "Vendor not found.");
    }

    return vendor;
};

const createVendor = async (vendorData, userId, requestInfo) => {
    const {
        vendorCode,
        vendorName,
        contactPerson,
        email,
        phone,
        alternatePhone,
        address,
        city,
        state,
        country,
        postalCode,
        gstNumber,
        website,
        notes,
    } = vendorData;

    // Check duplicate vendor name (case-insensitive)
    const existingVendorName = await Vendor.findOne({
        vendorName: {
            $regex: new RegExp(`^${vendorName.trim()}$`, "i"),
        },
    });

    if (existingVendorName) {
        throw new ApiError(409, "Vendor name already exists.");
    }

    // Check duplicate vendor code
    const existingVendorCode = await Vendor.findOne({
        vendorCode: vendorCode.trim().toUpperCase(),
    });

    if (existingVendorCode) {
        throw new ApiError(409, "Vendor code already exists.");
    }

    const vendor = await Vendor.create({
        vendorCode: vendorCode.trim().toUpperCase(),
        vendorName: vendorName.trim(),
        contactPerson: contactPerson?.trim() || "",
        email: email?.trim().toLowerCase() || "",
        phone: phone.trim(),
        alternatePhone: alternatePhone?.trim() || "",
        address: address?.trim() || "",
        city: city?.trim() || "",
        state: state?.trim() || "",
        country: country?.trim() || "India",
        postalCode: postalCode?.trim() || "",
        gstNumber: gstNumber?.trim().toUpperCase() || "",
        website: website?.trim() || "",
        notes: notes?.trim() || "",
        createdBy: userId,
    });

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.VENDOR,
        action: ACTIVITY_ACTIONS.CREATE,
        recordId: vendor._id,
        recordCode: vendor.vendorCode,
        description: `Created vendor ${vendor.vendorName}.`,
        ...requestInfo,
    });

    return await Vendor.findById(vendor._id)
        .populate("createdBy", "employeeId firstName lastName email")
        .lean();
};

const updateVendor = async (vendorId, vendorData, userId, requestInfo) => {
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
        throw new ApiError(404, "Vendor not found.");
    }

    const {
        vendorCode,
        vendorName,
        contactPerson,
        email,
        phone,
        alternatePhone,
        address,
        city,
        state,
        country,
        postalCode,
        gstNumber,
        website,
        notes,
    } = vendorData;

    // Check duplicate vendor name
    if (vendorName) {
        const existingVendor = await Vendor.findOne({
            _id: { $ne: vendorId },
            vendorName: {
                $regex: new RegExp(`^${vendorName.trim()}$`, "i"),
            },
        });

        if (existingVendor) {
            throw new ApiError(409, "Vendor name already exists.");
        }

        vendor.vendorName = vendorName.trim();
    }

    // Check duplicate vendor code
    if (vendorCode) {
        const code = vendorCode.trim().toUpperCase();

        const existingVendor = await Vendor.findOne({
            _id: { $ne: vendorId },
            vendorCode: code,
        });

        if (existingVendor) {
            throw new ApiError(409, "Vendor code already exists.");
        }

        vendor.vendorCode = code;
    }

    if (contactPerson !== undefined) {
        vendor.contactPerson = contactPerson.trim();
    }

    if (email !== undefined) {
        vendor.email = email.trim().toLowerCase();
    }

    if (phone !== undefined) {
        vendor.phone = phone.trim();
    }

    if (alternatePhone !== undefined) {
        vendor.alternatePhone = alternatePhone.trim();
    }

    if (address !== undefined) {
        vendor.address = address.trim();
    }

    if (city !== undefined) {
        vendor.city = city.trim();
    }

    if (state !== undefined) {
        vendor.state = state.trim();
    }

    if (country !== undefined) {
        vendor.country = country.trim();
    }

    if (postalCode !== undefined) {
        vendor.postalCode = postalCode.trim();
    }

    if (gstNumber !== undefined) {
        vendor.gstNumber = gstNumber.trim().toUpperCase();
    }

    if (website !== undefined) {
        vendor.website = website.trim();
    }

    if (notes !== undefined) {
        vendor.notes = notes.trim();
    }

    vendor.updatedBy = userId;
    await vendor.save();

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.VENDOR,
        action: ACTIVITY_ACTIONS.UPDATE,
        recordId: vendor._id,
        recordCode: vendor.vendorCode,
        description: `Updated vendor ${vendor.vendorName}.`,
        ...requestInfo,
    });

    return await Vendor.findById(vendor._id)
        .populate("createdBy", "employeeId firstName lastName email")
        .populate("updatedBy", "employeeId firstName lastName email")
        .lean();
};

const changeVendorStatus = async (vendorId, userId, requestInfo) => {
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
        throw new ApiError(404, "Vendor not found.");
    }

    // Toggle status
    vendor.isActive = !vendor.isActive;
    vendor.updatedBy = userId;
    await vendor.save();

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.VENDOR,
        action: ACTIVITY_ACTIONS.STATUS_CHANGE,
        recordId: vendor._id,
        recordCode: vendor.vendorCode,
        description: `${vendor.vendorName} vendor was ${
            vendor.isActive ? "activated" : "deactivated"
        }.`,
        metadata: {
            isActive: vendor.isActive,
        },
        ...requestInfo,
    });

    return await Vendor.findById(vendor._id)
        .populate("createdBy", "employeeId firstName lastName email")
        .populate("updatedBy", "employeeId firstName lastName email")
        .lean();
};

const deleteVendor = async (vendorId, userId, requestInfo) => {
    
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
        throw new ApiError(404, "Vendor not found.");
    }

    // Before deleting, check whether this vendor is referenced in Purchase Orders or GRNs.
    const purchaseExists = await Purchase.exists({vendor: vendorId});
    if (purchaseExists) {
        throw new ApiError(
            409, "Vendor cannot be deleted because it is used in purchase records. Deactivate it instead.");
    }

    await vendor.deleteOne();

    await logActivity({
        user: userId,
        module: ACTIVITY_MODULES.VENDOR,
        action: ACTIVITY_ACTIONS.DELETE,
        recordId: vendor._id,
        recordCode: vendor.vendorCode,
        description: `Deleted vendor ${vendor.vendorName}.`,
        ...requestInfo,
    });

    return;
};

module.exports = {
    getVendors,
    getVendor,
    createVendor,
    updateVendor,
    changeVendorStatus,
    deleteVendor,
};