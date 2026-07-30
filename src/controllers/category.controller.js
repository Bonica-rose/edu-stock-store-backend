const asyncHandler = require("../middleware/asyncHandler.middleware");
const categoryService = require("../services/category.service");
const { successResponse } = require("../utils/apiResponse.util");

exports.getCategories = asyncHandler(async (req, res) => {

    const result = await categoryService.getCategories(req.query);

    successResponse(res, 200, "Categories retrieved successfully", result.categories, result.pagination);
});

exports.getCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.getCategory(req.params.id);

    successResponse(res, 200, "Category retrieved successfully", category);
});

exports.createCategory = asyncHandler(async (req, res) => {

    const category = await categoryService.createCategory(req.body, req.user._id, req.requestInfo);

    successResponse(res, 200, "Category created successfully", category);
});

exports.updateCategory = asyncHandler(async (req, res) => {

    const category = await categoryService.updateCategory(
        req.params.id,
        req.body,
        req.user._id,
        req.requestInfo
    );

    successResponse(res, 200, "Category updated successfully", category);
});

exports.changeCategoryStatus = asyncHandler(async (req, res) => {

    const category = await categoryService.changeCategoryStatus(req.params.id, req.user._id, req.requestInfo);

    successResponse(res, 200, "Category status updated successfully", category);
});

exports.deleteCategory = asyncHandler(async (req, res) => {

    await categoryService.deleteCategory(req.params.id, req.user._id, req.requestInfo);

    successResponse(res, 200, "Category deleted successfully");
});