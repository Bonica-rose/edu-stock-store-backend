const Category = require("../models/category.model");
const ApiError = require("../utils/apiError.util");
const Inventory = require("../models/inventory.model");
const Asset = require("../models/asset.model");
const { CATEGORY_TYPES } = require("../constants/category.constants");

const getCategories = async (query) => {
    const {
        page = 1,
        limit = 10,
        search = "",
        type,
        isActive,
        sortBy = "createdAt",
        sortOrder = "desc",
    } = query;

    const filter = {};

    // Search
    if (search) {
        filter.$or = [
            { categoryName: { $regex: search, $options: "i" } },
            { categoryCode: { $regex: search, $options: "i" } },
        ];
    }

    // Type Filter
    if (type) {
        filter.type = type;
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

    const [categories, total] = await Promise.all([
        Category.find(filter)
            .populate("createdBy", "employeeId firstName lastName email")
            .populate("updatedBy", "employeeId firstName lastName email")
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .lean(),

        Category.countDocuments(filter),
    ]);

    return {
        categories,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getCategory = async (categoryId) => {
    const category = await Category.findById(categoryId)
        .populate("createdBy", "employeeId firstName lastName email")
        .populate("updatedBy", "employeeId firstName lastName email")
        .lean();

    if (!category) {
        throw new ApiError(404, "Category not found.");
    }

    return category;
};

const createCategory = async (categoryData, userId) => {
    const { categoryName, categoryCode, description, type } = categoryData;

    // Check duplicate category name (case-insensitive)
    const existingCategoryName = await Category.findOne({
        categoryName: {
            $regex: new RegExp(`^${categoryName.trim()}$`, "i"),
        },
    });

    if (existingCategoryName) {
        throw new ApiError(409, "Category name already exists.");
    }

    // Check duplicate category code (case-insensitive)
    const existingCategoryCode = await Category.findOne({
        categoryCode: categoryCode.trim().toUpperCase(),
    });

    if (existingCategoryCode) {
        throw new ApiError(409, "Category code already exists.");
    }

    // Validate category type
    if (!Object.values(CATEGORY_TYPES).includes(type)) {
        throw new ApiError(400, "Invalid category type.");
    }

    const category = await Category.create({
        categoryName: categoryName.trim(),
        categoryCode: categoryCode.trim().toUpperCase(),
        description: description?.trim() || "",
        type,
        createdBy: userId,
    });

    return await Category.findById(category._id)
        .populate("createdBy", "employeeId firstName lastName email")
        .lean();
};

const updateCategory = async (categoryId, categoryData) => {
    const category = await Category.findById(categoryId);

    if (!category) {
        throw new ApiError(404, "Category not found.");
    }

    const { categoryName, categoryCode, description, type } = categoryData;

    // Check duplicate category name
    if (categoryName) {
        const existingCategory = await Category.findOne({
            _id: { $ne: categoryId },
            categoryName: {
                $regex: new RegExp(`^${categoryName.trim()}$`, "i"),
            },
        });

        if (existingCategory) {
            throw new ApiError(409, "Category name already exists.");
        }

        category.categoryName = categoryName.trim();
    }

    // Check duplicate category code
    if (categoryCode) {
        const code = categoryCode.trim().toUpperCase();

        const existingCategory = await Category.findOne({
            _id: { $ne: categoryId },
            categoryCode: code,
        });

        if (existingCategory) {
            throw new ApiError(409, "Category code already exists.");
        }

        category.categoryCode = code;
    }

    if (type) {
        if (!Object.values(CATEGORY_TYPES).includes(type)) {
            throw new ApiError(400, "Invalid category type.");
        }
        category.type = type;
    }
    

    if (description !== undefined) {
        category.description = description.trim();
    }

    await category.save();

    return await Category.findById(category._id)
        .populate("createdBy", "employeeId firstName lastName email")
        .populate("updatedBy", "employeeId firstName lastName email")
        .lean();
};

const changeCategoryStatus = async (categoryId, userId) => {
    
    const category = await Category.findById(categoryId);
    if (!category) {
        throw new ApiError(404, "Category not found.");
    }

    // Toggle status
    category.isActive = !category.isActive;
    category.updatedBy = userId;
    await category.save();

    return await Category.findById(category._id)
        .populate("createdBy", "employeeId firstName lastName email")
        .populate("updatedBy", "employeeId firstName lastName email")
        .lean();
};

const deleteCategory = async (categoryId) => {
    
    const category = await Category.findById(categoryId);
    if (!category) {
        throw new ApiError(404, "Category not found.");
    }

    // Check Inventory
    const inventoryExists = await Inventory.exists({category: categoryId});
    if (inventoryExists) {
        throw new ApiError(409, "Cannot delete category because it is assigned to inventory items.");
    }

    // Check Assets
    const assetExists = await Asset.exists({category: categoryId});
    if (assetExists) {
        throw new ApiError(409, "Cannot delete category because it is assigned to assets.");
    }

    await category.deleteOne();
    return;
};

module.exports = {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    changeCategoryStatus,
    deleteCategory,
};